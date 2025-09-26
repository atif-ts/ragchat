using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Text;

namespace DocuLens.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly ILogger<DocumentsController> _logger;
    private readonly IConfiguration _configuration;

    public DocumentsController(ILogger<DocumentsController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    [HttpGet("download")]
    public async Task<IActionResult> Download([FromQuery] string path)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return BadRequest("File path is required.");
            }

            var decodedPath = Uri.UnescapeDataString(path);

            if (!IsValidFilePath(decodedPath))
            {
                _logger.LogWarning("Invalid file path attempted: {Path}", decodedPath);
                return BadRequest("Invalid file path.");
            }

            // Check if file exists
            if (!System.IO.File.Exists(decodedPath))
            {
                _logger.LogWarning("File not found: {Path}", decodedPath);
                return NotFound("File not found.");
            }

            var fileInfo = new FileInfo(decodedPath);

            const long maxFileSize = 100 * 1024 * 1024; // 100MB
            if (fileInfo.Length > maxFileSize)
            {
                return BadRequest("File too large to download.");
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(decodedPath);

            var contentType = GetContentType(fileInfo.Extension);

            return File(
                fileBytes,
                contentType,
                fileInfo.Name,
                enableRangeProcessing: true
            );
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Unauthorized access to file: {Path}", path);
            return Forbid("Access denied to the requested file.");
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "IO error accessing file: {Path}", path);
            return StatusCode(500, "Error reading the requested file.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error downloading file: {Path}", path);
            return StatusCode(500, "An unexpected error occurred while downloading the file.");
        }
    }

    private bool IsValidFilePath(string filePath)
    {
        try
        {
            var allowedBasePath = _configuration["DocumentSettings:BasePath"] ?? string.Empty;

            var normalizedFilePath = Path.GetFullPath(filePath);
            var normalizedBasePath = string.IsNullOrEmpty(allowedBasePath)
                ? string.Empty
                : Path.GetFullPath(allowedBasePath);

            if (filePath.Contains("..") || filePath.Contains("~"))
                return false;

            if (!string.IsNullOrEmpty(normalizedBasePath) &&
                !normalizedFilePath.StartsWith(normalizedBasePath, StringComparison.OrdinalIgnoreCase))
                return false;

            var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".md" };
            var fileExtension = Path.GetExtension(filePath).ToLowerInvariant();

            if (!allowedExtensions.Contains(fileExtension))
                return false;

            return true;
        }
        catch
        {
            return false;
        }
    }

    private string GetContentType(string fileExtension)
    {
        return fileExtension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt" => "text/plain",
            ".rtf" => "application/rtf",
            ".odt" => "application/vnd.oasis.opendocument.text",
            ".md" => "text/markdown",
            _ => "application/octet-stream"
        };
    }
}