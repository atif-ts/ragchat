using DocuLens.Server.Models;
using Microsoft.Extensions.AI;

namespace DocuLens.Server.Interfaces;

public interface IChatClientFactory
{
    IChatClient CreateChatClient(AppConfiguration cfg);
}

public interface IEmbeddingGeneratorFactory
{
    IEmbeddingGenerator<string, Embedding<float>>
        CreateEmbeddingGenerator(AppConfiguration cfg);
}