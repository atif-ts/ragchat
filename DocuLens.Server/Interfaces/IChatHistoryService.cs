using DocuLens.Server.Models;

namespace DocuLens.Server.Interfaces;

public interface IChatHistoryService
{
    Task<ChatSession> CreateSessionAsync(string userId, string title);
    Task AddMessageAsync(Guid sessionId, string role, string content);
    Task<List<ChatSession>> GetSessionsAsync(string userId);
    Task<ChatSession?> GetSessionAsync(Guid sessionId);
    Task DeleteSessionAsync(Guid sessionId);
    Task UpdateSessionTitleAsync(Guid sessionId, string title);
}