using System.Text.Json.Serialization;

namespace DocuLens.Server.Providers.Bedrock;

internal sealed class EmbeddingRequest
{
    [JsonPropertyName("inputText")]
    public string? InputText { get; set; }

    [JsonPropertyName("dimensions")]
    public int? Dimensions { get; set; }
}

internal sealed class EmbeddingResponse
{
    [JsonPropertyName("embedding")]
    public float[]? Embedding { get; set; }

    [JsonPropertyName("inputTextTokenCount")]
    public int? InputTextTokenCount { get; set; }
}