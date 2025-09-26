using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;

namespace DocuLens.Server.Services;

public class ConfigurationBackgroundService : BackgroundService
{
    private readonly IConfigurationService _configurationService;
    private readonly IIngestionManager _ingestionManager;
    private readonly ILogger<ConfigurationBackgroundService> _logger;

    public ConfigurationBackgroundService(
        IConfigurationService configurationService,
        IIngestionManager ingestionManager,
        ILogger<ConfigurationBackgroundService> logger)
    {
        _configurationService = configurationService;
        _ingestionManager = ingestionManager;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _configurationService.ConfigurationChanged += OnConfigurationChanged;

        _logger.LogInformation("Configuration background service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }

        _configurationService.ConfigurationChanged -= OnConfigurationChanged;
        _logger.LogInformation("Configuration background service stopped");
    }

    private async void OnConfigurationChanged(object? sender, ConfigurationChangedEventArgs e)
    {
        try
        {
            _logger.LogInformation("Configuration changed. Changed properties: {ChangedProperties}",
                string.Join(", ", e.ChangedProperties));

            if (e.ChangedProperties.Contains(nameof(AppConfiguration.DocumentPath)))
            {
                var newPath = e.NewConfiguration.DocumentPath;
                var oldPath = e.OldConfiguration.DocumentPath;

                _logger.LogInformation("Document path changed from '{OldPath}' to '{NewPath}'", oldPath, newPath);

                if (!string.IsNullOrWhiteSpace(newPath) && Directory.Exists(newPath))
                {
                    _logger.LogInformation("Triggering data ingestion for new path: {DocumentPath}", newPath);
                    await _ingestionManager.TriggerIngestionAsync(newPath);
                }
                else
                {
                    _logger.LogWarning("New document path is invalid or doesn't exist: {DocumentPath}", newPath);
                }
            }

            if (e.ChangedProperties.Contains(nameof(AppConfiguration.Model)) ||
                e.ChangedProperties.Contains(nameof(AppConfiguration.EmbeddingModel)) ||
                e.ChangedProperties.Contains(nameof(AppConfiguration.Endpoint)) ||
                e.ChangedProperties.Contains(nameof(AppConfiguration.ApiKey)))
            {
                _logger.LogInformation("AI service configuration changed, services will use new settings on next request");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling configuration change");
        }
    }
}