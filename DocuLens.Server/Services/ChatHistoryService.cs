using DocuLens.Server.Database;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace DocuLens.Server.Services;

public class ChatHistoryService : IChatHistoryService
{
    private readonly ConfigDbContext _db;
    public ChatHistoryService(ConfigDbContext db) => _db = db;

    public async Task<ChatSession> CreateSessionAsync(string userId, string title)
    {
        var session = new ChatSession { UserId = userId, Title = title };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    public async Task AddMessageAsync(Guid sessionId, string role, string content)
    {
        var msg = new ChatMessageDb
        {
            SessionId = sessionId,
            Role = role,
            Content = content
        };
        _db.ChatMessages.Add(msg);
        await _db.SaveChangesAsync();
    }

    public async Task<List<ChatSession>> GetSessionsAsync(string userId) =>
        await _db.ChatSessions
                 .AsNoTracking()
                 .Include(s => s.Messages)
                 .Where(s => s.UserId == userId)
                 .OrderByDescending(s => s.UpdatedAt)                 
                 .ToListAsync();

    public async Task<ChatSession?> GetSessionAsync(Guid sessionId) =>
        await _db.ChatSessions
               .AsNoTracking()
                 .Include(s => s.Messages.OrderBy(m => m.Timestamp))
                 .FirstOrDefaultAsync(s => s.Id == sessionId);

    public async Task DeleteSessionAsync(Guid sessionId)
    {
        await _db.ChatSessions
                 .Where(s => s.Id == sessionId)
                 .ExecuteDeleteAsync();
    }

    public async Task UpdateSessionTitleAsync(Guid sessionId, string title)
    {
        await _db.ChatSessions
                 .Where(s => s.Id == sessionId)
                 .ExecuteUpdateAsync(s => s
                     .SetProperty(p => p.Title, title)
                     .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
    }
}