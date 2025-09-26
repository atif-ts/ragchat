using DocuLens.Server.Ingestion;
using DocuLens.Server.Interfaces;
using Microsoft.Extensions.AI;

namespace DocuLens.Server.Services;

public class IngestionManager : IIngestionManager
{
    private readonly IServiceProvider _serviceProvider;
    private readonly CachedAIClientService _cachedAIClientService;
    private readonly ILogger<IngestionManager> _logger;
    private readonly SemaphoreSlim _semaphore;
    private volatile bool _isIngestionInProgress;

    public IngestionManager(
        IServiceProvider serviceProvider,
        CachedAIClientService cachedAIClientService,
        ILogger<IngestionManager> logger)
    {
        _serviceProvider = serviceProvider;
        _cachedAIClientService = cachedAIClientService;
        _logger = logger;
        _semaphore = new SemaphoreSlim(1, 1);
        _isIngestionInProgress = false;
    }

    public bool IsIngestionInProgress => _isIngestionInProgress;

    public async Task TriggerIngestionAsync(string documentPath)
    {
        if (string.IsNullOrWhiteSpace(documentPath))
        {
            _logger.LogWarning("Document path is empty, skipping ingestion");
            return;
        }

        if (!await _semaphore.WaitAsync(TimeSpan.FromSeconds(1)))
        {
            _logger.LogInformation("Ingestion is already in progress, skipping new request");
            return;
        }

        try
        {
            _isIngestionInProgress = true;
            _logger.LogInformation("Starting data ingestion for path: {DocumentPath}", documentPath);

            if (!Directory.Exists(documentPath))
            {
                _logger.LogWarning("Document path does not exist: {DocumentPath}", documentPath);
                return;
            }

            var embed = _cachedAIClientService.GetEmbeddingGenerator();

            var documentSource = new DocumentDirectorySource(documentPath);
            await DataIngestor.IngestDataAsync(_serviceProvider, documentSource);

            _logger.LogInformation("Data ingestion completed successfully for path: {DocumentPath}", documentPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during data ingestion for path: {DocumentPath}", documentPath);
            throw;
        }
        finally
        {
            _isIngestionInProgress = false;
            _semaphore.Release();
        }
    }
}