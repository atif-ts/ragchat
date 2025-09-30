using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.Extensions.AI;
using OpenAI;
using OpenAI.Chat;
using OpenAI.Embeddings;
using System.ClientModel;

namespace DocuLens.Server.Providers;

public sealed class AzureAIWrapper : IChatClientFactory, IEmbeddingGeneratorFactory
{
    public IChatClient CreateChatClient(AppConfiguration cfg)
    {
        var cred = new ApiKeyCredential(cfg.ApiKey);
        var opts = new OpenAIClientOptions { Endpoint = new Uri(cfg.Endpoint) };

        var client = new ChatClient(cfg.Model, cred, opts);
        return client.AsIChatClient();
    }

    public IEmbeddingGenerator<string, Embedding<float>>
        CreateEmbeddingGenerator(AppConfiguration cfg)
    {
        var cred = new ApiKeyCredential(cfg.ApiKey);
        var opts = new OpenAIClientOptions { Endpoint = new Uri(cfg.Endpoint) };

        var client = new EmbeddingClient(cfg.EmbeddingModel, cred, opts);
        return client.AsIEmbeddingGenerator();
    }
}