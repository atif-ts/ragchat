using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using DocuLens.Server.Providers;
using Microsoft.Extensions.AI;

namespace DocuLens.Server.Services;

public sealed class AIProviderFactory : IChatClientFactory, IEmbeddingGeneratorFactory
{
    private readonly IServiceProvider _sp;
    public AIProviderFactory(IServiceProvider sp) => _sp = sp;

    public IChatClient CreateChatClient(AppConfiguration cfg)
        => Resolve<IChatClientFactory>(cfg.Provider).CreateChatClient(cfg);

    public IEmbeddingGenerator<string, Embedding<float>>
        CreateEmbeddingGenerator(AppConfiguration cfg)
        => Resolve<IEmbeddingGeneratorFactory>(cfg.Provider)
               .CreateEmbeddingGenerator(cfg);

    private T Resolve<T>(string provider) where T : class
    {
        var name = provider switch
        {
            "Azure" => nameof(AzureAIWrapper),
            "Bedrock" => nameof(BedrockWrapper),
            _ => throw new NotSupportedException($"Provider {provider}")
        };
        return (T)_sp.GetRequiredService(
                 Type.GetType($"DocuLens.Server.Providers.{name}")
               ?? throw new InvalidOperationException($"Wrapper {name} not registered"));
    }
}