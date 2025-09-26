using DocuLens.Server.Models;

namespace DocuLens.Server.Interfaces;

public interface IChatService
{
    Task<ChatResponse> Chat(ChatRequest request);
}
