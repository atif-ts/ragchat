using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.SemanticKernel.Text;
using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.DocumentLayoutAnalysis.PageSegmenter;
using UglyToad.PdfPig.DocumentLayoutAnalysis.WordExtractor;

namespace DocuLens.Server.Ingestion;

public class DocumentDirectorySource : IIngestionSource
{
    private readonly string _directoryPath;
    private readonly SearchOption _searchOption;
    private readonly int _chunkSize;
    private readonly int _chunkOverlap;
    private readonly string[] _supportedExtensions = { "*.docx", "*.doc", "*.pdf", "*.txt" };

    public DocumentDirectorySource(string directoryPath, SearchOption searchOption = SearchOption.AllDirectories,
        int chunkSize = 1000, int chunkOverlap = 200)
    {
        _directoryPath = directoryPath ?? throw new ArgumentNullException(nameof(directoryPath));
        _searchOption = searchOption;
        _chunkSize = chunkSize;
        _chunkOverlap = chunkOverlap;
    }

    public string SourceId => $"DocumentDirectory_{Path.GetFileName(_directoryPath)}_{_searchOption}";

    public async Task<IEnumerable<IngestedDocument>> GetNewOrModifiedDocumentsAsync(IReadOnlyList<IngestedDocument> existingDocuments)
    {
        if (!Directory.Exists(_directoryPath))
        {
            throw new DirectoryNotFoundException($"Directory not found: {_directoryPath}");
        }

        var documentFiles = new List<string>();

        foreach (var extension in _supportedExtensions)
        {
            documentFiles.AddRange(Directory.GetFiles(_directoryPath, extension, _searchOption)
                .Where(file => !Path.GetFileName(file).StartsWith("~$")));
        }

        var existingDocumentLookup = existingDocuments?.ToDictionary(d => d.DocumentId, d => d) ?? new Dictionary<string, IngestedDocument>();
        var newOrModifiedDocuments = new List<IngestedDocument>();

        foreach (var filePath in documentFiles)
        {
            try
            {
                var fileInfo = new FileInfo(filePath);
                var documentId = GenerateDocumentId(filePath);
                var documentVersion = fileInfo.LastWriteTimeUtc.ToString("o");

                if (!existingDocumentLookup.TryGetValue(documentId, out var existingDoc) ||
                    existingDoc.DocumentVersion != documentVersion)
                {
                    if (await CanProcessFileAsync(filePath))
                    {
                        var document = new IngestedDocument
                        {
                            Key = GenerateDocumentKey(documentId),
                            SourceId = SourceId,
                            DocumentId = documentId,
                            DocumentVersion = documentVersion
                        };

                        newOrModifiedDocuments.Add(document);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing document file {filePath}: {ex.Message}");
            }
        }

        return newOrModifiedDocuments;
    }

    public async Task<IEnumerable<IngestedDocument>> GetDeletedDocumentsAsync(IReadOnlyList<IngestedDocument> existingDocuments)
    {
        if (!Directory.Exists(_directoryPath))
        {
            return existingDocuments?.Where(d => d.SourceId == SourceId) ?? Enumerable.Empty<IngestedDocument>();
        }

        var currentFiles = new List<string>();
        foreach (var extension in _supportedExtensions)
        {
            currentFiles.AddRange(Directory.GetFiles(_directoryPath, extension, _searchOption)
                .Where(file => !Path.GetFileName(file).StartsWith("~$")));
        }

        var currentFileIds = currentFiles.Select(GenerateDocumentId).ToHashSet();

        var deletedDocuments = existingDocuments?
            .Where(d => d.SourceId == SourceId && !currentFileIds.Contains(d.DocumentId))
            .ToList() ?? new List<IngestedDocument>();

        return await Task.FromResult(deletedDocuments);
    }

    public async Task<IEnumerable<IngestedChunk>> CreateChunksForDocumentAsync(IngestedDocument document)
    {
        var filePath = GetFilePathFromDocumentId(document.DocumentId);
        if (!File.Exists(filePath)) return Enumerable.Empty<IngestedChunk>();

        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".docx" => await CreateDocxChunksAsync(document, filePath),
            ".doc" => await CreateDocxChunksAsync(document, filePath),
            ".pdf" => await CreatePdfChunksAsync(document, filePath),
            ".txt" => await CreateTxtChunksAsync(document, filePath),
            _ => Enumerable.Empty<IngestedChunk>()
        };
    }

    private async Task<IEnumerable<IngestedChunk>> CreateTxtChunksAsync(IngestedDocument document, string filePath)
    {
        return await Task.Run(() =>
        {
            var text = File.ReadAllText(filePath, Encoding.UTF8);
            var paragraphs = text.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);

            return paragraphs.Select((p, idx) => new IngestedChunk
            {
                Key = $"{document.DocumentId}_chunk_{idx}",
                DocumentId = document.DocumentId,
                PageNumber = idx + 1,
                Text = p.Trim(),
                FileName = Path.GetFileName(filePath),
                FilePath = Path.GetFullPath(filePath)
            });
        });
    }

    private async Task<IEnumerable<IngestedChunk>> CreateDocxChunksAsync(IngestedDocument document, string filePath)
    {
        var content = await ExtractTextFromDocxAsync(filePath);
        if (string.IsNullOrWhiteSpace(content)) return Enumerable.Empty<IngestedChunk>();

        var chunks = new List<IngestedChunk>();
        int chunkIndex = 0;

        for (int i = 0; i < content.Length; i += _chunkSize - _chunkOverlap)
        {
            var chunkEnd = Math.Min(i + _chunkSize, content.Length);
            var chunkText = content.Substring(i, chunkEnd - i);

            if (chunkEnd < content.Length && !char.IsWhiteSpace(content[chunkEnd]))
            {
                var lastPeriod = chunkText.LastIndexOf('.');
                var lastNewline = chunkText.LastIndexOf('\n');
                var breakPoint = Math.Max(lastPeriod, lastNewline);
                if (breakPoint > chunkText.Length * 0.7)
                {
                    chunkText = chunkText[..(breakPoint + 1)];
                    chunkEnd = i + breakPoint + 1;
                }
            }

            if (!string.IsNullOrWhiteSpace(chunkText))
            {
                chunks.Add(new IngestedChunk
                {
                    Key = $"{document.DocumentId}_chunk_{chunkIndex}",
                    DocumentId = document.DocumentId,
                    PageNumber = chunkIndex + 1,
                    Text = chunkText.Trim(),
                    FileName = Path.GetFileName(filePath),
                    FilePath = Path.GetFullPath(filePath)
                });
                chunkIndex++;
            }

            i = chunkEnd - _chunkOverlap;
        }

        return chunks;
    }

    private async Task<IEnumerable<IngestedChunk>> CreatePdfChunksAsync(IngestedDocument document, string filePath)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var pdf = PdfDocument.Open(filePath);
                var paragraphs = pdf.GetPages().SelectMany(GetPageParagraphs).ToList();

                return paragraphs.Select(p => new IngestedChunk
                {
                    Key = Guid.NewGuid().ToString(),
                    DocumentId = document.DocumentId,
                    PageNumber = p.PageNumber,
                    Text = p.Text,
                    FileName = Path.GetFileName(filePath),
                    FilePath = Path.GetFullPath(filePath)
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PDF chunk error {filePath}: {ex.Message}");
                return Enumerable.Empty<IngestedChunk>();
            }
        });
    }

    private static IEnumerable<(int PageNumber, int IndexOnPage, string Text)> GetPageParagraphs(Page pdfPage)
    {
        try
        {
            var letters = pdfPage.Letters;
            var words = NearestNeighbourWordExtractor.Instance.GetWords(letters);
            var textBlocks = DocstrumBoundingBoxes.Instance.GetBlocks(words);
            var pageText = string.Join(Environment.NewLine + Environment.NewLine,
                textBlocks.Select(t => t.Text.ReplaceLineEndings(" ")));

#pragma warning disable SKEXP0050
            return TextChunker.SplitPlainTextParagraphs([pageText], 200)
                .Select((text, index) => (pdfPage.Number, index, text));
#pragma warning restore SKEXP0050
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error extracting text from PDF page {pdfPage.Number}: {ex.Message}");
            return Enumerable.Empty<(int, int, string)>();
        }
    }

    private async Task<bool> CanProcessFileAsync(string filePath)
    {
        try
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();

            return extension switch
            {
                ".docx" => await CanProcessDocxAsync(filePath),
                ".pdf" => await CanProcessPdfAsync(filePath),
                _ => false
            };
        }
        catch
        {
            return false;
        }
    }

    private async Task<bool> CanProcessDocxAsync(string filePath)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var wordDoc = WordprocessingDocument.Open(filePath, false);
                return wordDoc.MainDocumentPart?.Document?.Body != null;
            }
            catch
            {
                return false;
            }
        });
    }

    private async Task<bool> CanProcessPdfAsync(string filePath)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var pdf = PdfDocument.Open(filePath);
                return pdf.NumberOfPages > 0;
            }
            catch
            {
                return false;
            }
        });
    }

    private string GenerateDocumentKey(string documentId)
    {
        return $"doc_{documentId}";
    }

    private string GetFilePathFromDocumentId(string documentId)
    {
        var cleanId = documentId;

        if (cleanId.StartsWith("docx_"))
            cleanId = cleanId.Substring(5);
        else if (cleanId.StartsWith("pdf_"))
            cleanId = cleanId.Substring(4);

        var relativePath = cleanId.Replace('_', Path.DirectorySeparatorChar);

        var possiblePaths = new[]
        {
                Path.Combine(_directoryPath, relativePath + ".docx"),
                Path.Combine(_directoryPath, relativePath + ".pdf"),
                Path.Combine(_directoryPath, relativePath)
            };

        return possiblePaths.FirstOrDefault(File.Exists) ?? possiblePaths[0];
    }

    private string GenerateDocumentId(string filePath)
    {
        var relativePath = Path.GetRelativePath(_directoryPath, filePath);
        var extension = Path.GetExtension(relativePath).ToLowerInvariant();
        var pathWithoutExtension = Path.ChangeExtension(relativePath, null);

        var prefix = extension switch
        {
            ".docx" => "docx_",
            ".pdf" => "pdf_",
            _ => "doc_"
        };

        return $"{prefix}{pathWithoutExtension.Replace(Path.DirectorySeparatorChar, '_')}";
    }

    private async Task<string> ExtractTextFromDocxAsync(string filePath)
    {
        return await Task.Run(() =>
        {
            try
            {
                using (var wordDoc = WordprocessingDocument.Open(filePath, false))
                {
                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        return string.Empty;

                    return ExtractTextFromBody(body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error extracting text from {filePath}: {ex.Message}");
                return string.Empty;
            }
        });
    }

    private string ExtractTextFromBody(Body body)
    {
        var textParts = new List<string>();

        foreach (var element in body.Elements())
        {
            switch (element)
            {
                case Paragraph paragraph:
                    var paragraphText = ExtractTextFromParagraph(paragraph);
                    if (!string.IsNullOrWhiteSpace(paragraphText))
                        textParts.Add(paragraphText);
                    break;

                case Table table:
                    var tableText = ExtractTextFromTable(table);
                    if (!string.IsNullOrWhiteSpace(tableText))
                        textParts.Add(tableText);
                    break;
            }
        }

        return string.Join("\n\n", textParts);
    }

    private string ExtractTextFromParagraph(Paragraph paragraph)
    {
        var textParts = new List<string>();

        foreach (var run in paragraph.Elements<Run>())
        {
            foreach (var text in run.Elements<Text>())
            {
                textParts.Add(text.Text);
            }
        }

        return string.Join("", textParts);
    }

    private string ExtractTextFromTable(Table table)
    {
        var tableParts = new List<string>();

        foreach (var row in table.Elements<TableRow>())
        {
            var cellTexts = new List<string>();

            foreach (var cell in row.Elements<TableCell>())
            {
                var cellText = string.Join(" ",
                    cell.Elements<Paragraph>()
                        .Select(p => ExtractTextFromParagraph(p))
                        .Where(text => !string.IsNullOrWhiteSpace(text)));

                cellTexts.Add(cellText);
            }

            if (cellTexts.Any(c => !string.IsNullOrWhiteSpace(c)))
            {
                tableParts.Add(string.Join(" | ", cellTexts));
            }
        }

        return string.Join("\n", tableParts);
    }
}
