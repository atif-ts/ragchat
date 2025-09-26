namespace DocuLens.Server.Models;

public class ChatRequest
{
    public Guid SessionId { get; set; }
    public string Question { get; set; } = string.Empty;
}

public class ChatResponse
{
    public Guid SessionId { get; set; }
    public string Answer { get; set; } = string.Empty;
    public string[] Sources { get; set; } = [];
}