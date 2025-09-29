using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace DocuLens.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationInfoController : ControllerBase
{
    private readonly IApplicationInfoService _applicationInfoService;
    private readonly ILogger<ApplicationInfoController> _logger;

    public ApplicationInfoController(
        IApplicationInfoService applicationInfoService,
        ILogger<ApplicationInfoController> logger)
    {
        _applicationInfoService = applicationInfoService;
        _logger = logger;
    }

    /// <summary>
    /// Get application information
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApplicationInfo>> Get()
    {
        try
        {
            var appInfo = await _applicationInfoService.GetApplicationInfoAsync();
            return Ok(appInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving application info");
            return StatusCode(500, "An error occurred while retrieving application info");
        }
    }

    /// <summary>
    /// Update application information
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ApplicationInfo applicationInfo)
    {
        try
        {
            if (applicationInfo == null)
            {
                return BadRequest("Application info is required");
            }

            if (string.IsNullOrWhiteSpace(applicationInfo.AppName))
            {
                return BadRequest("App name is required");
            }

            await _applicationInfoService.UpdateApplicationInfoAsync(applicationInfo);

            _logger.LogInformation("Application info updated successfully");
            return Ok(new { Message = "Application info updated successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Application info not found for update");
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating application info");
            return StatusCode(500, "An error occurred while updating application info");
        }
    }
}