namespace DocuLens.Server.Models;

public class ChatRequest
{
    public string Question { get; set; } = string.Empty;
}

public class ChatResponse
{
    public string Answer { get; set; } = string.Empty;
    public string[] Sources { get; set; } = [];
}