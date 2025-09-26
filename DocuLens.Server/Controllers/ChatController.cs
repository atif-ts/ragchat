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

    public ChatController(IChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
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

            var response = await _chatService.Chat(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            return StatusCode(500, "An error occurred while processing your request.");
        }
    }
}