using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace DocuLens.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigurationController : ControllerBase
{
    private readonly IConfigurationService _configurationService;
    private readonly IIngestionManager _ingestionManager;
    private readonly ILogger<ConfigurationController> _logger;

    public ConfigurationController(
        IConfigurationService configurationService,
        IIngestionManager ingestionManager,
        ILogger<ConfigurationController> logger)
    {
        _configurationService = configurationService;
        _ingestionManager = ingestionManager;
        _logger = logger;
    }

    /// <summary>
    /// Get the current active configuration
    /// </summary>
    [HttpGet]
    public ActionResult<AppConfiguration> Get()
    {
        try
        {
            var config = _configurationService.CurrentConfiguration;
            return Ok(config);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active configuration");
            return StatusCode(500, "An error occurred while retrieving configuration");
        }
    }

    /// <summary>
    /// Get all configurations
    /// </summary>
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<AppConfiguration>>> GetAll()
    {
        try
        {
            var configurations = await _configurationService.GetAllConfigurationsAsync();
            return Ok(configurations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all configurations");
            return StatusCode(500, "An error occurred while retrieving configurations");
        }
    }

    /// <summary>
    /// Get a specific configuration by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<AppConfiguration>> GetById(int id)
    {
        try
        {
            var configuration = await _configurationService.GetConfigurationByIdAsync(id);
            if (configuration == null)
            {
                return NotFound($"Configuration with ID {id} not found");
            }
            return Ok(configuration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving configuration {ConfigurationId}", id);
            return StatusCode(500, "An error occurred while retrieving the configuration");
        }
    }

    /// <summary>
    /// Create a new configuration
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AppConfiguration configuration)
    {
        try
        {
            if (configuration == null)
            {
                return BadRequest("Configuration is required");
            }

            if (string.IsNullOrWhiteSpace(configuration.ConfigurationName))
            {
                return BadRequest("Configuration name is required");
            }

            var createdConfig = await _configurationService.CreateConfigurationAsync(configuration);

            _logger.LogInformation("Configuration '{ConfigurationName}' created successfully with ID {ConfigurationId}",
                createdConfig.ConfigurationName, createdConfig.Id);

            return CreatedAtAction(nameof(GetById), new { id = createdConfig.Id }, createdConfig);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create configuration due to business rule violation");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating configuration");
            return StatusCode(500, "An error occurred while creating the configuration");
        }
    }

    /// <summary>
    /// Update an existing configuration
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AppConfiguration configuration)
    {
        try
        {
            if (configuration == null)
            {
                return BadRequest("Configuration is required");
            }

            if (configuration.Id != id)
            {
                return BadRequest("Configuration ID in URL does not match the configuration object");
            }

            if (string.IsNullOrWhiteSpace(configuration.ConfigurationName))
            {
                return BadRequest("Configuration name is required");
            }

            await _configurationService.UpdateConfigurationAsync(configuration);

            _logger.LogInformation("Configuration {ConfigurationId} updated successfully", id);
            return Ok(new { Message = "Configuration updated successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Configuration {ConfigurationId} not found for update", id);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating configuration {ConfigurationId}", id);
            return StatusCode(500, "An error occurred while updating the configuration");
        }
    }

    /// <summary>
    /// Set a configuration as active
    /// </summary>
    [HttpPost("{id}/activate")]
    public async Task<IActionResult> SetActive(int id)
    {
        try
        {
            var success = await _configurationService.SetActiveConfigurationAsync(id);
            if (!success)
            {
                return NotFound($"Configuration with ID {id} not found");
            }

            _logger.LogInformation("Configuration {ConfigurationId} set as active", id);
            return Ok(new { Message = "Configuration activated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating configuration {ConfigurationId}", id);
            return StatusCode(500, "An error occurred while activating the configuration");
        }
    }

    /// <summary>
    /// Delete a configuration
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var success = await _configurationService.DeleteConfigurationAsync(id);
            if (!success)
            {
                return NotFound($"Configuration with ID {id} not found");
            }

            _logger.LogInformation("Configuration {ConfigurationId} deleted successfully", id);
            return Ok(new { Message = "Configuration deleted successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Cannot delete configuration {ConfigurationId}", id);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting configuration {ConfigurationId}", id);
            return StatusCode(500, "An error occurred while deleting the configuration");
        }
    }

    /// <summary>
    /// Get ingestion status
    /// </summary>
    [HttpGet("ingestion-status")]
    public ActionResult<object> GetIngestionStatus()
    {
        try
        {
            return Ok(new
            {
                IsIngestionInProgress = _ingestionManager.IsIngestionInProgress,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ingestion status");
            return StatusCode(500, "An error occurred while retrieving ingestion status");
        }
    }

    /// <summary>
    /// Trigger data ingestion for the active configuration's document path
    /// </summary>
    [HttpPost("trigger-ingestion")]
    public async Task<IActionResult> TriggerIngestion([FromBody] TriggerIngestionRequest? request = null)
    {
        try
        {
            string documentPath;

            if (request != null && !string.IsNullOrWhiteSpace(request.DocumentPath))
            {
                documentPath = request.DocumentPath;
            }
            else
            {
                // Use the active configuration's document path
                var activeConfig = _configurationService.CurrentConfiguration;
                documentPath = activeConfig.DocumentPath;
            }

            if (string.IsNullOrWhiteSpace(documentPath))
            {
                return BadRequest("Document path is required (either in request or in active configuration)");
            }

            if (!Directory.Exists(documentPath))
            {
                return BadRequest($"Directory does not exist: {documentPath}");
            }

            if (_ingestionManager.IsIngestionInProgress)
            {
                return Conflict("Ingestion is already in progress");
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    await _ingestionManager.TriggerIngestionAsync(documentPath);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background ingestion failed for path: {DocumentPath}", documentPath);
                }
            });

            return Accepted(new { Message = "Ingestion started", DocumentPath = documentPath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering ingestion");
            return StatusCode(500, "An error occurred while triggering ingestion");
        }
    }
}