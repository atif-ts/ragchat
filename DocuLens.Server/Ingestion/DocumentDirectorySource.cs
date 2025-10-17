using DocuLens.Server.Hubs;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.SemanticKernel.Text;
using System.Diagnostics;
using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.DocumentLayoutAnalysis.PageSegmenter;
using UglyToad.PdfPig.DocumentLayoutAnalysis.WordExtractor;

namespace DocuLens.Server.Ingestion;

public sealed class DocumentDirectorySource : IIngestionSource
{
    private readonly string _directoryPath;
    private readonly SearchOption _searchOption;
    private readonly int _chunkSize;
    private readonly int _chunkOverlap;
    private readonly string[] _supportedExtensions = { "*.docx", "*.doc", "*.pdf", "*.txt" };

    private readonly IServiceProvider? _serviceProvider;

    public DocumentDirectorySource(
        string directoryPath,
        SearchOption searchOption = SearchOption.AllDirectories,
        int chunkSize = 1000,
        int chunkOverlap = 200,
        IServiceProvider? serviceProvider = null)
    {
        _directoryPath = directoryPath ?? throw new ArgumentNullException(nameof(directoryPath));
        _searchOption = searchOption;
        _chunkSize = chunkSize;
        _chunkOverlap = chunkOverlap;
        _serviceProvider = serviceProvider;
    }

    public string SourceId => $"DocumentDirectory_{Path.GetFileName(_directoryPath)}_{_searchOption}";

    #region Progress helper
    private async Task ReportAsync(string fileName, string status, string? error = null, long? elapsedMs = null)
    {
        if (_serviceProvider == null) return;

        using var scope = _serviceProvider.CreateScope();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<IngestionProgressHub>>();
        await hub.Clients.All.SendAsync("FileProgress",
            new FileProgressDto(fileName, status, error, elapsedMs));
    }
    #endregion

    public async Task<IEnumerable<IngestedDocument>> GetNewOrModifiedDocumentsAsync(
        IReadOnlyList<IngestedDocument> existingDocuments)
    {
        if (!Directory.Exists(_directoryPath))
            throw new DirectoryNotFoundException($"Directory not found: {_directoryPath}");

        var documentFiles = _supportedExtensions
            .SelectMany(ext => Directory.EnumerateFiles(_directoryPath, ext, _searchOption))
            .Where(f => !Path.GetFileName(f).StartsWith("~$"))
            .ToList();

        await ReportDiscoveredFilesAsync(documentFiles);

        var existingLookup = existingDocuments?.ToDictionary(d => d.DocumentId) ?? new();
        var output = new List<IngestedDocument>();

        foreach (var filePath in documentFiles)
        {
            try
            {
                var fileInfo = new FileInfo(filePath);
                var docId = GenerateDocumentId(filePath);
                var version = fileInfo.LastWriteTimeUtc.ToString("o");

                if (!existingLookup.TryGetValue(docId, out var existing) || existing.DocumentVersion != version)
                {
                    if (await CanProcessFileAsync(filePath))
                    {
                        output.Add(new IngestedDocument
                        {
                            Key = GenerateDocumentKey(docId),
                            SourceId = SourceId,
                            DocumentId = docId,
                            DocumentVersion = version
                        });

                        await ReportAsync(Path.GetFileName(filePath), "Waiting");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error evaluating {filePath}: {ex.Message}");
            }
        }
        return output;
    }

    public Task<IEnumerable<IngestedDocument>> GetDeletedDocumentsAsync(
        IReadOnlyList<IngestedDocument> existingDocuments)
    {
        if (!Directory.Exists(_directoryPath))
            return Task.FromResult(existingDocuments?
                .Where(d => d.SourceId == SourceId) ?? Enumerable.Empty<IngestedDocument>());

        var currentIds = _supportedExtensions
            .SelectMany(ext => Directory.EnumerateFiles(_directoryPath, ext, _searchOption))
            .Where(f => !Path.GetFileName(f).StartsWith("~$"))
            .Select(GenerateDocumentId)
            .ToHashSet();

        var deleted = existingDocuments?
            .Where(d => d.SourceId == SourceId && !currentIds.Contains(d.DocumentId))
            .ToList() ?? new();

        return Task.FromResult<IEnumerable<IngestedDocument>>(deleted);
    }

    public async Task<IEnumerable<IngestedChunk>> CreateChunksForDocumentAsync(IngestedDocument document)
    {
        var filePath = GetFilePathFromDocumentId(document.DocumentId);
        if (!File.Exists(filePath)) return Enumerable.Empty<IngestedChunk>();

        var fileName = Path.GetFileName(filePath);
        var sw = Stopwatch.StartNew();

        await ReportAsync(fileName, "Ingesting");

        try
        {
            var chunks = Path.GetExtension(filePath).ToLowerInvariant() switch
            {
                ".docx" or ".doc" => await CreateDocxChunksAsync(document, filePath),
                ".pdf" => await CreatePdfChunksAsync(document, filePath),
                ".txt" => await CreateTxtChunksAsync(document, filePath),
                _ => Array.Empty<IngestedChunk>()
            };

            await ReportAsync(fileName, "Done", elapsedMs: sw.ElapsedMilliseconds);
            return chunks;
        }
        catch (Exception ex)
        {
            await ReportAsync(fileName, "Failed", error: ex.Message, elapsedMs: sw.ElapsedMilliseconds);
            throw;
        }
    }

    #region Existing chunking helpers (unchanged)
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
        if (string.IsNullOrWhiteSpace(content)) return Array.Empty<IngestedChunk>();

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
                return Array.Empty<IngestedChunk>();
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
            return TextChunker.SplitPlainTextParagraphs(new[] { pageText }, 200)
                .Select((text, index) => (pdfPage.Number, index, text));
#pragma warning restore SKEXP0050
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error extracting text from PDF page {pdfPage.Number}: {ex.Message}");
            return Enumerable.Empty<(int, int, string)>();
        }
    }
    #endregion

    #region Existing utility helpers (unchanged)

    private async Task<bool> CanProcessFileAsync(string filePath) =>
        Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".docx" => await CanProcessDocxAsync(filePath),
            ".pdf" => await CanProcessPdfAsync(filePath),
            _ => true
        };

    private async Task<bool> CanProcessDocxAsync(string filePath) => await Task.Run(() =>
    {
        try
        {
            using var doc = WordprocessingDocument.Open(filePath, false);
            return doc.MainDocumentPart?.Document?.Body != null;
        }
        catch { return false; }
    });

    private async Task<bool> CanProcessPdfAsync(string filePath) => await Task.Run(() =>
    {
        try
        {
            using var pdf = PdfDocument.Open(filePath);
            return pdf.NumberOfPages > 0;
        }
        catch { return false; }
    });

    private string GenerateDocumentId(string filePath)
    {
        var rel = Path.GetRelativePath(_directoryPath, filePath);
        var ext = Path.GetExtension(rel).ToLowerInvariant();
        var noExt = Path.ChangeExtension(rel, null);
        var prefix = ext switch
        {
            ".docx" => "docx_",
            ".pdf" => "pdf_",
            _ => "doc_"
        };
        return $"{prefix}{noExt.Replace(Path.DirectorySeparatorChar, '_')}";
    }

    private string GetFilePathFromDocumentId(string documentId)
    {
        var clean = documentId.StartsWith("docx_") || documentId.StartsWith("pdf_")
            ? documentId[5..]
            : documentId.StartsWith("doc_") ? documentId[4..] : documentId;

        var rel = clean.Replace('_', Path.DirectorySeparatorChar);
        var candidates = new[]
        {
            Path.Combine(_directoryPath, rel + ".docx"),
            Path.Combine(_directoryPath, rel + ".pdf"),
            Path.Combine(_directoryPath, rel)
        };
        return candidates.FirstOrDefault(File.Exists) ?? candidates[0];
    }

    private string GenerateDocumentKey(string documentId) => $"doc_{documentId}";

    private async Task<string> ExtractTextFromDocxAsync(string filePath) => await Task.Run(() =>
    {
        try
        {
            using var doc = WordprocessingDocument.Open(filePath, false);
            var body = doc.MainDocumentPart?.Document?.Body;
            return body == null ? string.Empty : ExtractTextFromBody(body);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DOCX extract error {filePath}: {ex.Message}");
            return string.Empty;
        }
    });

    private string ExtractTextFromBody(Body body)
    {
        var parts = new List<string>();
        foreach (var el in body.Elements())
        {
            switch (el)
            {
                case Paragraph p:
                    var t = ExtractTextFromParagraph(p);
                    if (!string.IsNullOrWhiteSpace(t)) parts.Add(t);
                    break;
                case Table table:
                    var tbl = ExtractTextFromTable(table);
                    if (!string.IsNullOrWhiteSpace(tbl)) parts.Add(tbl);
                    break;
            }
        }
        return string.Join("\n\n", parts);
    }

    private string ExtractTextFromParagraph(Paragraph p) =>
        string.Join("", p.Elements<Run>().SelectMany(r => r.Elements<Text>()).Select(t => t.Text));

    private string ExtractTextFromTable(Table table)
    {
        var rows = table.Elements<TableRow>()
            .Select(r => string.Join(" | ", r.Elements<TableCell>()
                .Select(c => string.Join(" ", c.Elements<Paragraph>()
                    .Select(ExtractTextFromParagraph)
                    .Where(s => !string.IsNullOrWhiteSpace(s))))));
        return string.Join("\n", rows.Where(s => !string.IsNullOrWhiteSpace(s)));
    }

    private async Task ReportDiscoveredFilesAsync(IEnumerable<string> filePaths)
    {
        if (_serviceProvider == null) return;

        using var scope = _serviceProvider.CreateScope();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<IngestionProgressHub>>();

        foreach (var fp in filePaths)
        {
            var fileName = Path.GetFileName(fp);
            await hub.Clients.All.SendAsync("FileProgress",
                new FileProgressDto(fileName, "Waiting", null, null));
        }
    }

    #endregion
}