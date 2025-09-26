using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace DocuLens.Server.Controllers;

[ApiController]
[Route("[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatController> _logger;
    private readonly IChatHistoryService _history;

    public ChatController(IChatService chatService, IChatHistoryService history, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
        _history = history;
    }

    [HttpPost(Name = "PostChat")]
    public async Task<ActionResult<ChatResponse>> Post([FromBody] ChatRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest("Question is required.");
            }

            var session = await _history.GetSessionAsync(request.SessionId)
                 ?? await _history.CreateSessionAsync("dummy-user",
                       request.Question.Length > 50
                         ? request.Question[..47] + "..."
                         : request.Question);

            await _history.AddMessageAsync(session.Id, "user", request.Question);

            var response = await _chatService.Chat(request);

            await _history.AddMessageAsync(session.Id, "assistant", response.Answer);

            response.SessionId = session.Id;

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            return StatusCode(500, "An error occurred while processing your request.");
        }
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<ChatSessionDto>>> GetHistory()
    {
        var sessions = await _history.GetSessionsAsync("sk-user");
        return Ok(sessions.Select(s => new ChatSessionDto
        {
            Id = s.Id,
            Title = s.Title,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            MessageCount = s.Messages.Count
        }));
    }

    [HttpGet("history/{sessionId:guid}")]
    public async Task<ActionResult<ChatSession>> GetSession(Guid sessionId)
    {
        var session = await _history.GetSessionAsync(sessionId);
        return session is null ? NotFound() : Ok(session);
    }

    [HttpDelete("history/{sessionId:guid}")]
    public async Task<IActionResult> DeleteSession(Guid sessionId)
    {
        await _history.DeleteSessionAsync(sessionId);
        return NoContent();
    }
}