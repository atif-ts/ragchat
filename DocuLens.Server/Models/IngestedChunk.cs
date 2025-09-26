using Microsoft.Extensions.VectorData;

namespace DocuLens.Server.Models;

public class IngestedChunk
{
    private const int VectorDimensions = 1536;
    private const string VectorDistanceFunction = DistanceFunction.CosineDistance;

    [VectorStoreKey]
    public required string Key { get; set; }

    [VectorStoreData(IsIndexed = true)]
    public required string DocumentId { get; set; }

    [VectorStoreData]
    public int PageNumber { get; set; }

    [VectorStoreData]
    public required string Text { get; set; }

    [VectorStoreData]
    public string FileName { get; set; } = string.Empty;

    [VectorStoreData]
    public string FilePath { get; set; } = string.Empty;

    [VectorStoreVector(VectorDimensions, DistanceFunction = VectorDistanceFunction)]
    public string? Vector => Text;
}