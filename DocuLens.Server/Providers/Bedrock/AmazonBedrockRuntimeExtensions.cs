using Amazon.BedrockRuntime;
using Microsoft.Extensions.AI;

namespace DocuLens.Server.Providers.Bedrock;

public static class AmazonBedrockRuntimeExtensions
{
    internal const string ProviderName = "aws.bedrock";

    public static IChatClient AsIChatClient(this IAmazonBedrockRuntime runtime, string? defaultModelId = null) =>
        runtime is not null ? new BedrockChatClient(runtime, defaultModelId) :
        throw new ArgumentNullException(nameof(runtime));

    public static IEmbeddingGenerator<string, Embedding<float>> AsIEmbeddingGenerator(
        this IAmazonBedrockRuntime runtime, string? defaultModelId = null, int? defaultModelDimensions = null) =>
        runtime is not null ? new BedrockEmbeddingGenerator(runtime, defaultModelId, defaultModelDimensions) :
        throw new ArgumentNullException(nameof(runtime));
}