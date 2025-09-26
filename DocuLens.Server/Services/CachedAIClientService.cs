using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.Extensions.AI;
using OpenAI;
using OpenAI.Chat;
using OpenAI.Embeddings;
using System.ClientModel;

namespace DocuLens.Server.Services;

public class CachedAIClientService : IDisposable
{
    private readonly IConfigurationService _configurationService;
    private readonly object _lock = new();

    private IChatClient? _cachedChatClient;
    private IEmbeddingGenerator<string, Embedding<float>>? _cachedEmbeddingGenerator;
    private string? _lastChatConfig;
    private string? _lastEmbeddingConfig;

    public CachedAIClientService(IConfigurationService configurationService)
    {
        _configurationService = configurationService;

        _configurationService.ConfigurationChanged += OnConfigurationChanged;
    }

    public IChatClient GetChatClient()
    {
        lock (_lock)
        {
            var cfg = _configurationService.CurrentConfiguration;
            var currentConfig = $"{cfg.ApiKey}|{cfg.Endpoint}|{cfg.Model}";

            if (_cachedChatClient == null || _lastChatConfig != currentConfig)
            {
                _cachedChatClient = CreateChatClient(cfg);
                _lastChatConfig = currentConfig;
            }

            return _cachedChatClient;
        }
    }

    public IEmbeddingGenerator<string, Embedding<float>> GetEmbeddingGenerator()
    {
        lock (_lock)
        {
            var cfg = _configurationService.CurrentConfiguration;
            var currentConfig = $"{cfg.ApiKey}|{cfg.Endpoint}|{cfg.EmbeddingModel}";

            if (_cachedEmbeddingGenerator == null || _lastEmbeddingConfig != currentConfig)
            {
                _cachedEmbeddingGenerator = CreateEmbeddingGenerator(cfg);
                _lastEmbeddingConfig = currentConfig;
            }

            return _cachedEmbeddingGenerator;
        }
    }

    private void OnConfigurationChanged(object? sender, ConfigurationChangedEventArgs e)
    {
        lock (_lock)
        {
            var chatRelatedProperties = new[] { "ApiKey", "Endpoint", "Model" };
            if (e.ChangedProperties.Any(p => chatRelatedProperties.Contains(p)))
            {
                _cachedChatClient = null;
                _lastChatConfig = null;
            }

            var embeddingRelatedProperties = new[] { "ApiKey", "Endpoint", "EmbeddingModel" };
            if (e.ChangedProperties.Any(p => embeddingRelatedProperties.Contains(p)))
            {
                _cachedEmbeddingGenerator = null;
                _lastEmbeddingConfig = null;
            }
        }
    }

    private IChatClient CreateChatClient(AppConfiguration cfg)
    {
        if (string.IsNullOrWhiteSpace(cfg.ApiKey) ||
            string.IsNullOrWhiteSpace(cfg.Endpoint) ||
            string.IsNullOrWhiteSpace(cfg.Model))
        {
            throw new InvalidOperationException(
                "AI configuration is missing. Please save the settings in the UI.");
        }

        var apiCredentials = new ApiKeyCredential(cfg.ApiKey);
        var openAIOptions = new OpenAIClientOptions
        {
            Endpoint = new Uri(cfg.Endpoint)
        };

        var chatClient = new ChatClient(
            credential: apiCredentials,
            model: cfg.Model,
            options: openAIOptions);

        return chatClient.AsIChatClient();
    }

    private IEmbeddingGenerator<string, Embedding<float>> CreateEmbeddingGenerator(AppConfiguration cfg)
    {
        if (string.IsNullOrWhiteSpace(cfg.ApiKey) ||
            string.IsNullOrWhiteSpace(cfg.Endpoint) ||
            string.IsNullOrWhiteSpace(cfg.EmbeddingModel))
        {
            throw new InvalidOperationException(
                "Embedding configuration is missing. Please save the settings in the UI.");
        }

        var apiCredentials = new ApiKeyCredential(cfg.ApiKey);
        var openAIOptions = new OpenAIClientOptions
        {
            Endpoint = new Uri(cfg.Endpoint)
        };

        var embeddingClient = new EmbeddingClient(
            credential: apiCredentials,
            model: cfg.EmbeddingModel,
            options: openAIOptions);

        return embeddingClient.AsIEmbeddingGenerator();
    }

    public void Dispose()
    {
        _configurationService.ConfigurationChanged -= OnConfigurationChanged;

        if (_cachedChatClient is IDisposable disposableChatClient)
            disposableChatClient.Dispose();

        if (_cachedEmbeddingGenerator is IDisposable disposableEmbeddingGenerator)
            disposableEmbeddingGenerator.Dispose();
    }
}