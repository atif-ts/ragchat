using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Microsoft.Extensions.AI;
using System.Diagnostics;
using System.Text.Json;

namespace DocuLens.Server.Providers.Bedrock;

internal sealed partial class BedrockEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
{
    private readonly IAmazonBedrockRuntime _runtime;
    private readonly string? _modelId;
    private readonly int? _dimensions;
    private readonly EmbeddingGeneratorMetadata _metadata;

    public BedrockEmbeddingGenerator(IAmazonBedrockRuntime runtime, string? defaultModelId, int? defaultModelDimensions)
    {
        Debug.Assert(runtime is not null);

        _runtime = runtime!;
        _modelId = defaultModelId;
        _dimensions = defaultModelDimensions;

        _metadata = new(AmazonBedrockRuntimeExtensions.ProviderName, defaultModelId: defaultModelId, defaultModelDimensions: defaultModelDimensions);
    }

    public void Dispose()
    {
    }

    public object? GetService(Type serviceType, object? serviceKey)
    {
        if (serviceType is null)
        {
            throw new ArgumentNullException(nameof(serviceType));
        }

        return
            serviceKey is not null ? null :
            serviceType == typeof(EmbeddingGeneratorMetadata) ? _metadata :
            serviceType.IsInstanceOfType(_runtime) ? _runtime :
            serviceType.IsInstanceOfType(this) ? this :
            null;
    }

    public async Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
        IEnumerable<string> values, EmbeddingGenerationOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (values is null)
        {
            throw new ArgumentNullException(nameof(values));
        }

        GeneratedEmbeddings<Embedding<float>> embeddings = [];
        int? totaltokens = null;

        foreach (string value in values)
        {
            InvokeModelRequest request = options?.RawRepresentationFactory?.Invoke(this) as InvokeModelRequest ?? new();
            request.ModelId ??= options?.ModelId ?? _modelId;
            request.Accept ??= "application/json";
            request.ContentType ??= "application/json";
            request.Body ??= new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(new()
            {
                InputText = value,
                Dimensions = options?.Dimensions ?? _dimensions,
            }, BedrockJsonContext.Default.EmbeddingRequest));

            var response = await _runtime.InvokeModelAsync(request, cancellationToken).ConfigureAwait(false);

            var er = JsonSerializer.Deserialize(response.Body, BedrockJsonContext.Default.EmbeddingResponse);
            if (er?.Embedding is not null)
            {
                embeddings.Add(new(er.Embedding));

                if (er.InputTextTokenCount is int inputTokens)
                {
                    totaltokens ??= 0;
                    totaltokens += inputTokens;
                }
            }
        }

        if (totaltokens is not null)
        {
            embeddings.Usage = new()
            {
                InputTokenCount = totaltokens.Value,
                TotalTokenCount = totaltokens.Value,
            };
        }

        return embeddings;
    }
}