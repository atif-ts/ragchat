using Amazon;
using Amazon.BedrockRuntime;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using DocuLens.Server.Providers.Bedrock;
using Microsoft.Extensions.AI;

namespace DocuLens.Server.Providers;

public sealed class BedrockWrapper : IChatClientFactory, IEmbeddingGeneratorFactory
{
    public IChatClient CreateChatClient(AppConfiguration cfg)
    {
        var client = CreateBedrockClient(cfg);
        return new BedrockChatClient(client, cfg.Model);
    }

    public IEmbeddingGenerator<string, Embedding<float>> CreateEmbeddingGenerator(AppConfiguration cfg)
    {
        var client = CreateBedrockClient(cfg);
        return new BedrockEmbeddingGenerator(client, cfg.EmbeddingModel, null);
    }

    private static IAmazonBedrockRuntime CreateBedrockClient(AppConfiguration cfg)
    {
        if (!string.IsNullOrEmpty(cfg.ApiKey))
        {
            var credentials = new Amazon.Runtime.BasicAWSCredentials(
                cfg.ApiKey,
                cfg.Endpoint
            );

            var region = RegionEndpoint.GetBySystemName("us-east-1");
            return new AmazonBedrockRuntimeClient(credentials, region);
        }

        var defaultRegion = RegionEndpoint.GetBySystemName("us-east-1");
        return new AmazonBedrockRuntimeClient(defaultRegion);
    }
}
