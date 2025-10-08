using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.Extensions.AI;
using System.Text;
using System.Text.RegularExpressions;

namespace DocuLens.Server.Services;

public class ChatService : IChatService
{
    private readonly SemanticSearch _search;
    private readonly IChatClient _chatClient;

    private const string SystemPrompt = @"
        You are an assistant who answers questions about information you retrieve.
        Do not answer questions about anything else.
        Use only simple markdown to format your responses.

        Use the search tool to find relevant information. When you do this, end your
        reply with citations in the special XML format:

        <citation filename='string' page_number='number'>exact quote here</citation>

        Always include the citation in your response if there are results, and filename should be file name with complete path.

        The quote must be max 5 words, taken word-for-word from the search result, and is the basis for why the citation is relevant.
        Don't refer to the presence of citations; just emit these tags right at the end, with no surrounding text.
        ";

    public ChatService(IChatClient chatClient, SemanticSearch search)
    {
        _chatClient = chatClient;
        _search = search;
    }

    public async Task<Models.ChatResponse> Chat(ChatRequest request)
    {
        var chunks = await _search.SearchAsync(request.Question, null, maxResults: 5);

        var context = new StringBuilder();
        context.AppendLine("Here is the relevant context from the documents:");
        context.AppendLine();

        foreach (var c in chunks)
        {
            context.AppendLine($"Document: {c.FileName}, Page: {c.PageNumber}");
            context.AppendLine(c.Text);
            context.AppendLine();
        }

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, SystemPrompt),
            new(ChatRole.User, $"Context:\n{context}\n\nQuestion: {request.Question}")
        };

        var reply = new StringBuilder();
        await foreach (var delta in _chatClient.GetStreamingResponseAsync(messages))
            if (delta.Text != null) reply.Append(delta.Text);

        var answer = reply.ToString();

        foreach (var c in chunks)
        {
            answer = answer.Replace($"filename='{c.FileName}'", $"filename='file:///{c.FilePath.Replace('\\', '/')}'");
        }

        var citationMatches = Regex.Matches( answer, @"<citation[^>]*>.*?</citation>", RegexOptions.IgnoreCase);
        var sources = citationMatches.Cast<Match>().Select(m => m.Value).ToArray();

        return new Models.ChatResponse
        {
            Answer = answer,
            Sources = sources
        };
    }
}