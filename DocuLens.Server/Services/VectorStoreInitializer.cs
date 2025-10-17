using DocuLens.Server.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.VectorData;
using Microsoft.SemanticKernel.Connectors.SqliteVec;

namespace DocuLens.Server.Services;

public sealed class VectorStoreInitializer : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<VectorStoreInitializer> _log;

    public VectorStoreInitializer(IServiceProvider services, ILogger<VectorStoreInitializer> log)
    {
        _services = services;
        _log = log;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var sp = scope.ServiceProvider;

        _log.LogInformation("Ensuring vector-store collections exist");

        var chunks = sp.GetRequiredService<VectorStoreCollection<string, IngestedChunk>>();
        var docs = sp.GetRequiredService<VectorStoreCollection<string, IngestedDocument>>();

        await chunks.EnsureCollectionExistsAsync(cancellationToken);
        await docs.EnsureCollectionExistsAsync(cancellationToken);

        _log.LogInformation("Vector-store collections ready");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}