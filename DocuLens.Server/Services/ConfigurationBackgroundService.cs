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
                _logger.LogInformation("Triggering ingestion for new path: {DocumentPath}", newPath);
                await _ingestionManager.TriggerIngestionAsync(newPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling configuration change");
        }
    }
}