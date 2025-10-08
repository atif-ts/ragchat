using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Amazon.Runtime.Documents;
using Amazon.Runtime.Internal.Util;
using Microsoft.Extensions.AI;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DocuLens.Server.Providers.Bedrock;

internal sealed partial class BedrockChatClient : IChatClient
{
    private static readonly Amazon.Runtime.Internal.Util.ILogger DefaultLogger = Logger.GetLogger(typeof(BedrockChatClient));

    private readonly IAmazonBedrockRuntime _runtime;
    private readonly string? _modelId;
    private readonly ChatClientMetadata _metadata;

    public BedrockChatClient(IAmazonBedrockRuntime runtime, string? defaultModelId)
    {
        Debug.Assert(runtime is not null);

        _runtime = runtime!;
        _modelId = defaultModelId;

        _metadata = new(AmazonBedrockRuntimeExtensions.ProviderName, defaultModelId: defaultModelId);
    }

    public void Dispose()
    {
    }

    public async Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (messages is null)
        {
            throw new ArgumentNullException(nameof(messages));
        }

        ConverseRequest request = options?.RawRepresentationFactory?.Invoke(this) as ConverseRequest ?? new();
        request.ModelId ??= options?.ModelId ?? _modelId;
        request.Messages = CreateMessages(request.Messages, messages);
        request.System = CreateSystem(request.System, messages, options);
        request.ToolConfig = CreateToolConfig(request.ToolConfig, options);
        request.InferenceConfig = CreateInferenceConfiguration(request.InferenceConfig, options);
        request.AdditionalModelRequestFields = CreateAdditionalModelRequestFields(request.AdditionalModelRequestFields, options);

        var response = await _runtime.ConverseAsync(request, cancellationToken).ConfigureAwait(false);

        ChatMessage result = new()
        {
            CreatedAt = DateTimeOffset.UtcNow,
            RawRepresentation = response.Output?.Message,
            Role = ChatRole.Assistant,
            MessageId = Guid.NewGuid().ToString("N"),
        };

        if (response.Output?.Message?.Content is { } contents)
        {
            foreach (var content in contents)
            {
                if (content.Text is string text)
                {
                    result.Contents.Add(new TextContent(text) { RawRepresentation = content });
                }

                if (content.CitationsContent is { } citations &&
                    citations.Citations is { Count: > 0 } &&
                    citations.Content is { Count: > 0 })
                {
                    int count = Math.Min(citations.Citations.Count, citations.Content.Count);
                    for (int i = 0; i < count; i++)
                    {
                        TextContent tc = new(citations.Content[i]?.Text) { RawRepresentation = citations.Content[i] };
                        tc.Annotations = [new CitationAnnotation()
                        {
                            Title = citations.Citations[i].Title,
                            Snippet = citations.Citations[i].SourceContent?.Select(c => c.Text).FirstOrDefault(),
                        }];
                        result.Contents.Add(tc);
                    }
                }

                if (content.ReasoningContent is { ReasoningText.Text: not null } reasoningContent)
                {
                    TextReasoningContent trc = new(reasoningContent.ReasoningText.Text) { RawRepresentation = content };

                    if (reasoningContent.ReasoningText.Signature is string signature)
                    {
                        (trc.AdditionalProperties ??= [])[nameof(reasoningContent.ReasoningText.Signature)] = signature;
                    }

                    if (reasoningContent.RedactedContent is { } redactedContent)
                    {
                        (trc.AdditionalProperties ??= [])[nameof(reasoningContent.RedactedContent)] = redactedContent.ToArray();
                    }

                    result.Contents.Add(trc);
                }

                if (content.Image is { Source.Bytes: { } imageBytes, Format: { } imageFormat })
                {
                    result.Contents.Add(new DataContent(imageBytes.ToArray(), GetMimeType(imageFormat)) { RawRepresentation = content });
                }

                if (content.Video is { Source.Bytes: { } videoBytes, Format: { } videoFormat })
                {
                    result.Contents.Add(new DataContent(videoBytes.ToArray(), GetMimeType(videoFormat)) { RawRepresentation = content });
                }

                if (content.Document is { Source.Bytes: { } documentBytes, Format: { } documentFormat })
                {
                    result.Contents.Add(new DataContent(documentBytes.ToArray(), GetMimeType(documentFormat))
                    {
                        RawRepresentation = content,
                        Name = content.Document.Name
                    });
                }

                if (content.ToolUse is { } toolUse)
                {
                    result.Contents.Add(new FunctionCallContent(toolUse.ToolUseId, toolUse.Name, DocumentToDictionary(toolUse.Input)) { RawRepresentation = content });
                }
            }
        }

        if (DocumentToDictionary(response.AdditionalModelResponseFields) is { } responseFieldsDictionary)
        {
            result.AdditionalProperties = new(responseFieldsDictionary);
        }

        return new(result)
        {
            CreatedAt = result.CreatedAt,
            FinishReason = response.StopReason is not null ? GetChatFinishReason(response.StopReason) : null,
            RawRepresentation = response,
            ResponseId = Guid.NewGuid().ToString("N"),
            Usage = response.Usage is TokenUsage usage ? CreateUsageDetails(usage) : null,
        };
    }

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages, ChatOptions? options = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (messages is null)
        {
            throw new ArgumentNullException(nameof(messages));
        }

        ConverseStreamRequest request = options?.RawRepresentationFactory?.Invoke(this) as ConverseStreamRequest ?? new();
        request.ModelId ??= options?.ModelId ?? _modelId;
        request.Messages = CreateMessages(request.Messages, messages);
        request.System = CreateSystem(request.System, messages, options);
        request.ToolConfig = CreateToolConfig(request.ToolConfig, options);
        request.InferenceConfig = CreateInferenceConfiguration(request.InferenceConfig, options);
        request.AdditionalModelRequestFields = CreateAdditionalModelRequestFields(request.AdditionalModelRequestFields, options);

        var result = await _runtime.ConverseStreamAsync(request, cancellationToken).ConfigureAwait(false);

        string? toolName = null;
        string? toolId = null;
        StringBuilder? toolInput = null;
        ChatFinishReason? finishReason = null;
        string messageId = Guid.NewGuid().ToString("N");
        string responseId = Guid.NewGuid().ToString("N");
        await foreach (var update in result.Stream.ConfigureAwait(false))
        {
            switch (update)
            {
                case MessageStartEvent messageStart:
                    yield return new()
                    {
                        CreatedAt = DateTimeOffset.UtcNow,
                        MessageId = messageId,
                        RawRepresentation = update,
                        ResponseId = responseId,
                        Role = ChatRole.Assistant,
                        FinishReason = finishReason,
                    };
                    break;

                case ContentBlockStartEvent contentBlockStart when contentBlockStart?.Start?.ToolUse is ToolUseBlockStart tubs:
                    toolName ??= tubs.Name;
                    toolId ??= tubs.ToolUseId;
                    break;

                case ContentBlockDeltaEvent contentBlockDelta when contentBlockDelta.Delta is not null:
                    if (contentBlockDelta.Delta.ToolUse is ToolUseBlockDelta tubd)
                    {
                        (toolInput ??= new()).Append(tubd.Input);
                    }

                    if (contentBlockDelta.Delta.Text is string text)
                    {
                        ChatResponseUpdate textUpdate = new(ChatRole.Assistant, text)
                        {
                            CreatedAt = DateTimeOffset.UtcNow,
                            MessageId = messageId,
                            RawRepresentation = update,
                            FinishReason = finishReason,
                            ResponseId = responseId,
                        };

                        if (contentBlockDelta.Delta.Citation is { } citation &&
                            (citation.Title is not null || citation.SourceContent is { Count: > 0 }))
                        {
                            textUpdate.Contents[0].Annotations = [new CitationAnnotation()
                            {
                                Title = citation.Title,
                                Snippet = citation.SourceContent?.Select(c => c.Text).FirstOrDefault(),
                            }];
                        }

                        yield return textUpdate;
                    }

                    if (contentBlockDelta.Delta.ReasoningContent is { Text: not null } reasoningContent)
                    {
                        TextReasoningContent trc = new(reasoningContent.Text);

                        if (reasoningContent.Signature is not null)
                        {
                            (trc.AdditionalProperties ??= [])[nameof(reasoningContent.Signature)] = reasoningContent.Signature;
                        }

                        if (reasoningContent.RedactedContent is { } redactedContent)
                        {
                            (trc.AdditionalProperties ??= [])[nameof(reasoningContent.RedactedContent)] = redactedContent.ToArray();
                        }

                        yield return new(ChatRole.Assistant, [trc])
                        {
                            CreatedAt = DateTimeOffset.UtcNow,
                            MessageId = messageId,
                            FinishReason = finishReason,
                            RawRepresentation = update,
                            ResponseId = responseId,
                        };
                    }
                    break;

                case ContentBlockStopEvent contentBlockStop:
                    if (toolName is not null && toolId is not null)
                    {
                        Dictionary<string, object?>? inputs = ParseToolInputs(toolInput?.ToString(), out Exception? parseError);
                        yield return new()
                        {
                            Contents = [new FunctionCallContent(toolId, toolName, inputs) { Exception = parseError }],
                            CreatedAt = DateTimeOffset.UtcNow,
                            MessageId = messageId,
                            FinishReason = finishReason,
                            RawRepresentation = update,
                            ResponseId = responseId,
                            Role = ChatRole.Assistant,
                        };
                    }

                    toolName = null;
                    toolId = null;
                    toolInput = null;
                    break;

                case MessageStopEvent messageStop:
                    if (messageStop.StopReason is not null)
                    {
                        finishReason ??= GetChatFinishReason(messageStop.StopReason);
                    }

                    AdditionalPropertiesDictionary? additionalProps = null;
                    if (DocumentToDictionary(messageStop.AdditionalModelResponseFields) is { } responseFieldsDictionary)
                    {
                        additionalProps = new(responseFieldsDictionary);
                    }

                    yield return new()
                    {
                        AdditionalProperties = additionalProps,
                        CreatedAt = DateTimeOffset.UtcNow,
                        MessageId = messageId,
                        FinishReason = finishReason,
                        RawRepresentation = update,
                        ResponseId = responseId,
                        Role = ChatRole.Assistant,
                    };
                    break;

                case ConverseStreamMetadataEvent metadata when metadata.Usage is TokenUsage usage:
                    yield return new(ChatRole.Assistant, [new UsageContent(CreateUsageDetails(usage))])
                    {
                        CreatedAt = DateTimeOffset.UtcNow,
                        FinishReason = finishReason,
                        MessageId = messageId,
                        RawRepresentation = update,
                        ResponseId = responseId,
                    };
                    break;
            }
        }
    }

    public object? GetService(Type serviceType, object? serviceKey)
    {
        if (serviceType is null)
        {
            throw new ArgumentNullException(nameof(serviceType));
        }

        return
            serviceKey is not null ? null :
            serviceType == typeof(ChatClientMetadata) ? _metadata :
            serviceType.IsInstanceOfType(_runtime) ? _runtime :
            serviceType.IsInstanceOfType(this) ? this :
            null;
    }

    private static UsageDetails CreateUsageDetails(TokenUsage usage)
    {
        UsageDetails ud = new()
        {
            InputTokenCount = usage.InputTokens,
            OutputTokenCount = usage.OutputTokens,
            TotalTokenCount = usage.TotalTokens,
        };

        if (usage.CacheReadInputTokens is int cacheReadTokens)
        {
            (ud.AdditionalCounts ??= []).Add(nameof(usage.CacheReadInputTokens), cacheReadTokens);
        }

        if (usage.CacheWriteInputTokens is int cacheWriteTokens)
        {
            (ud.AdditionalCounts ??= []).Add(nameof(usage.CacheWriteInputTokens), cacheWriteTokens);
        }

        return ud;
    }

    private static ChatFinishReason GetChatFinishReason(StopReason stopReason) =>
        stopReason.Value switch
        {
            "content_filtered" => ChatFinishReason.ContentFilter,
            "guardrail_intervened" => ChatFinishReason.ContentFilter,
            "end_turn" => ChatFinishReason.Stop,
            "max_tokens" => ChatFinishReason.Length,
            "stop_sequence" => ChatFinishReason.Stop,
            "tool_use" => ChatFinishReason.ToolCalls,
            _ => new(stopReason.Value),
        };

    private static List<SystemContentBlock> CreateSystem(List<SystemContentBlock>? rawMessages, IEnumerable<ChatMessage> messages, ChatOptions? options)
    {
        List<SystemContentBlock> system = rawMessages ?? [];

        if (options?.Instructions is { } instructions)
        {
            system.Add(new SystemContentBlock() { Text = instructions });
        }

        system.AddRange(messages
            .Where(m => m.Role == ChatRole.System && m.Contents.Any(c => c is TextContent))
            .Select(m => new SystemContentBlock() { Text = string.Concat(m.Contents.OfType<TextContent>()) }));

        return system;
    }

    private static Dictionary<string, object?>? ParseToolInputs(string? jsonInput, out Exception? parseError)
    {
        parseError = null;
        if (jsonInput is not null)
        {
            try
            {
                return (Dictionary<string, object?>?)JsonSerializer.Deserialize(jsonInput, BedrockJsonContext.DefaultOptions.GetTypeInfo(typeof(Dictionary<string, object?>)));
            }
            catch (Exception e)
            {
                parseError = new InvalidOperationException($"Unable to parse input: {jsonInput}", e);
            }
        }

        return null;
    }

    private static List<Message> CreateMessages(List<Message>? rawMessages, IEnumerable<ChatMessage> chatMessages)
    {
        List<Message> messages = rawMessages ?? [];

        foreach (ChatMessage chatMessage in chatMessages)
        {
            if (chatMessage.Role != ChatRole.System &&
                CreateContents(chatMessage) is { Count: > 0 } contents)
            {
                messages.Add(new()
                {
                    Role = chatMessage.Role == ChatRole.Assistant ? ConversationRole.Assistant : ConversationRole.User,
                    Content = contents,
                });
            }
        }

        return messages;
    }

    private static List<ContentBlock> CreateContents(ChatMessage message)
    {
        List<ContentBlock> contents = [];

        foreach (AIContent content in message.Contents)
        {
            switch (content)
            {
                case TextContent tc:
                    if (message.Role == ChatRole.Assistant)
                    {
                        string text = tc.Text.TrimEnd();
                        if (text.Length != 0)
                        {
                            contents.Add(new() { Text = text });
                        }
                    }
                    else
                    {
                        contents.Add(new() { Text = tc.Text });
                    }
                    break;

                case TextReasoningContent trc:
                    contents.Add(new()
                    {
                        ReasoningContent = new()
                        {
                            ReasoningText = new()
                            {
                                Text = trc.Text,
                                Signature = trc.AdditionalProperties?[nameof(ReasoningContentBlock.ReasoningText.Signature)] as string,
                            },
                            RedactedContent = trc.AdditionalProperties?[nameof(ReasoningContentBlock.RedactedContent)] is byte[] array ? new(array) : null,
                        }
                    });
                    break;

                case DataContent dc:
                    if (GetImageFormat(dc.MediaType) is ImageFormat imageFormat)
                    {
                        contents.Add(new()
                        {
                            Image = new()
                            {
                                Source = new() { Bytes = new(dc.Data.ToArray()) },
                                Format = imageFormat,
                            }
                        });
                    }
                    else if (GetVideoFormat(dc.MediaType) is VideoFormat videoFormat)
                    {
                        contents.Add(new()
                        {
                            Video = new()
                            {
                                Source = new() { Bytes = new(dc.Data.ToArray()) },
                                Format = videoFormat,
                            }
                        });
                    }
                    else if (GetDocumentFormat(dc.MediaType) is Amazon.BedrockRuntime.DocumentFormat docFormat)
                    {
                        contents.Add(new()
                        {
                            Document = new()
                            {
                                Source = new() { Bytes = new(dc.Data.ToArray()) },
                                Format = docFormat,
                                Name = dc.Name ?? "file",
                            }
                        });
                    }
                    break;

                case FunctionCallContent fcc:
                    contents.Add(new()
                    {
                        ToolUse = new()
                        {
                            ToolUseId = fcc.CallId,
                            Name = fcc.Name,
                            Input = DictionaryToDocument(fcc.Arguments),
                        }
                    });
                    break;

                case FunctionResultContent frc:
                    Document result = frc.Result switch
                    {
                        int i => i,
                        long l => l,
                        float f => f,
                        double d => d,
                        string s => s,
                        bool b => b,
                        JsonElement json => ToDocument(json),
                        { } other => ToDocument(JsonSerializer.SerializeToElement(other, BedrockJsonContext.DefaultOptions.GetTypeInfo(other.GetType()))),
                        _ => default,
                    };

                    contents.Add(new()
                    {
                        ToolResult = new()
                        {
                            ToolUseId = frc.CallId,
                            Content = [new() { Json = new Document(new Dictionary<string, Document>() { ["result"] = result }) }],
                        },
                    });
                    break;
            }
        }

        return contents;
    }

    private static Amazon.BedrockRuntime.DocumentFormat? GetDocumentFormat(string? mediaType) =>
        mediaType switch
        {
            "text/csv" => Amazon.BedrockRuntime.DocumentFormat.Csv,
            "text/html" => Amazon.BedrockRuntime.DocumentFormat.Html,
            "text/markdown" => Amazon.BedrockRuntime.DocumentFormat.Md,
            "text/plain" => Amazon.BedrockRuntime.DocumentFormat.Txt,
            "application/pdf" => Amazon.BedrockRuntime.DocumentFormat.Pdf,
            "application/msword" => Amazon.BedrockRuntime.DocumentFormat.Doc,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => Amazon.BedrockRuntime.DocumentFormat.Docx,
            "application/vnd.ms-excel" => Amazon.BedrockRuntime.DocumentFormat.Xls,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => Amazon.BedrockRuntime.DocumentFormat.Xlsx,
            _ => null,
        };

    private static string GetMimeType(Amazon.BedrockRuntime.DocumentFormat? format) =>
        format?.Value switch
        {
            "csv" => "text/csv",
            "html" => "text/html",
            "md" => "text/markdown",
            "pdf" => "application/pdf",
            "doc" => "application/msword",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls" => "application/vnd.ms-excel",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "text/plain",
        };

    private static ImageFormat? GetImageFormat(string? mediaType) =>
        mediaType switch
        {
            "image/jpeg" => ImageFormat.Jpeg,
            "image/png" => ImageFormat.Png,
            "image/gif" => ImageFormat.Gif,
            "image/webp" => ImageFormat.Webp,
            _ => null,
        };

    private static string GetMimeType(ImageFormat? format) =>
        format?.Value switch
        {
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            _ => "image/jpeg",
        };

    private static VideoFormat? GetVideoFormat(string? mediaType) =>
        mediaType switch
        {
            "video/x-flv" => VideoFormat.Flv,
            "video/x-matroska" => VideoFormat.Mkv,
            "video/quicktime" => VideoFormat.Mov,
            "video/mp4" => VideoFormat.Mp4,
            "video/mpeg" => VideoFormat.Mpeg,
            "video/3gpp" => VideoFormat.Three_gp,
            "video/webm" => VideoFormat.Webm,
            "video/x-ms-wmv" => VideoFormat.Wmv,
            _ => null,
        };

    private static string GetMimeType(VideoFormat? format) =>
        format?.Value switch
        {
            "flv" => "video/x-flv",
            "mkv" => "video/x-matroska",
            "mov" => "video/quicktime",
            "mpeg" or "mpg" => "video/mpeg",
            "three_gp" => "video/3gpp",
            "webm" => "video/webm",
            "wmv" => "video/x-ms-wmv",
            _ => "video/mp4",
        };

    private static Document DictionaryToDocument(IDictionary<string, object?>? arguments)
    {
        Document inputs = new Document(new Dictionary<string, Document>());
        if (arguments is not null)
        {
            foreach (KeyValuePair<string, object?> argument in arguments)
            {
                switch (argument.Value)
                {
                    case bool argumentBool: inputs.Add(argument.Key, argumentBool); break;
                    case int argumentInt32: inputs.Add(argument.Key, argumentInt32); break;
                    case long argumentInt64: inputs.Add(argument.Key, argumentInt64); break;
                    case float argumentSingle: inputs.Add(argument.Key, argumentSingle); break;
                    case double argumentDouble: inputs.Add(argument.Key, argumentDouble); break;
                    case string argumentString: inputs.Add(argument.Key, argumentString); break;
                    case JsonElement json: inputs.Add(argument.Key, ToDocument(json)); break;
                }
            }
        }

        return inputs;
    }

    private static Dictionary<string, object?>? DocumentToDictionary(Document d)
    {
        if (d.IsDictionary())
        {
            return (Dictionary<string, object?>?)
                DocumentDictionaryToNode(d.AsDictionary())
                .Deserialize(BedrockJsonContext.DefaultOptions.GetTypeInfo(typeof(Dictionary<string, object?>)));
        }

        return null;
    }

    private static JsonObject DocumentDictionaryToNode(Dictionary<string, Document> documentDictionary) =>
        new(documentDictionary.Select(entry => new KeyValuePair<string, JsonNode?>(entry.Key, DocumentToNode(entry.Value))));

    private static JsonNode? DocumentToNode(Document value) =>
        value.IsBool() ? value.AsBool() :
        value.IsInt() ? value.AsInt() :
        value.IsLong() ? value.AsLong() :
        value.IsDouble() ? value.AsDouble() :
        value.IsString() ? value.AsString() :
        value.IsList() ? new JsonArray(value.AsList().Select(DocumentToNode).ToArray()) :
        value.IsDictionary() ? DocumentDictionaryToNode(value.AsDictionary()) :
        null;

    /// <summary>Converts a <see cref="JsonElement"/> to a <see cref="Document"/>.</summary>
    private static Document ToDocument(JsonElement json)
    {
        switch (json.ValueKind)
        {
            case JsonValueKind.String:
                return json.GetString();

            case JsonValueKind.Number:
                return json.GetDouble();

            case JsonValueKind.True:
                return true;

            case JsonValueKind.False:
                return false;

            case JsonValueKind.Array:
                var elements = new Document[json.GetArrayLength()];
                for (int i = 0; i < elements.Length; i++)
                {
                    elements[i] = ToDocument(json[i]);
                }
                return elements;

            case JsonValueKind.Object:
                Dictionary<string, Document> props = [];
                foreach (var prop in json.EnumerateObject())
                {
                    props.Add(prop.Name, ToDocument(prop.Value));
                }
                return props;

            case JsonValueKind.Null:
            default:
                return string.Empty;
        }
    }

    private static ToolConfiguration? CreateToolConfig(ToolConfiguration? toolConfig, ChatOptions? options)
    {
        if (options?.Tools is { Count: > 0 } tools)
        {
            foreach (AITool tool in tools)
            {
                if (tool is not AIFunctionDeclaration f)
                {
                    continue;
                }

                Document inputs = default;
                List<Document> required = [];

                if (f.JsonSchema.TryGetProperty("properties", out JsonElement properties))
                {
                    foreach (JsonProperty parameter in properties.EnumerateObject())
                    {
                        inputs.Add(parameter.Name, ToDocument(parameter.Value));
                    }
                }

                if (f.JsonSchema.TryGetProperty("required", out JsonElement requiredProperties))
                {
                    foreach (JsonElement requiredProperty in requiredProperties.EnumerateArray())
                    {
                        required.Add(requiredProperty.GetString());
                    }
                }

                Dictionary<string, Document> schemaDictionary = new()
                {
                    ["type"] = new Document("object"),
                };

                if (inputs != default)
                {
                    schemaDictionary["properties"] = inputs;
                }

                if (required.Count > 0)
                {
                    schemaDictionary["required"] = new Document(required);
                }

                toolConfig ??= new();
                toolConfig.Tools ??= [];
                toolConfig.Tools.Add(new()
                {
                    ToolSpec = new ToolSpecification()
                    {
                        Name = f.Name,
                        Description = !string.IsNullOrEmpty(f.Description) ? f.Description : f.Name,
                        InputSchema = new()
                        {
                            Json = new(schemaDictionary)
                        },
                    },
                });
            }
        }

        if (toolConfig?.Tools is { Count: > 0 } && toolConfig.ToolChoice is null)
        {
            switch (options!.ToolMode)
            {
                case RequiredChatToolMode r:
                    toolConfig.ToolChoice = !string.IsNullOrWhiteSpace(r.RequiredFunctionName) ?
                        new ToolChoice() { Tool = new() { Name = r.RequiredFunctionName } } :
                        new ToolChoice() { Any = new() };
                    break;
            }
        }

        return toolConfig;
    }

    private static InferenceConfiguration CreateInferenceConfiguration(InferenceConfiguration config, ChatOptions? options)
    {
        config ??= new();

        config.MaxTokens ??= options?.MaxOutputTokens;
        config.Temperature ??= options?.Temperature;
        config.TopP ??= options?.TopP;

        if (options?.StopSequences is { Count: > 0 } stopOptions)
        {
            if (config.StopSequences is null)
            {
                config.StopSequences = stopOptions.ToList();
            }
            else
            {
                config.StopSequences.AddRange(stopOptions);
            }
        }

        return config;
    }

    private static Document CreateAdditionalModelRequestFields(Document d, ChatOptions? options)
    {
        if (options is not null)
        {
            if (options.TopK is int topK)
            {
                d.Add("k", topK);
            }

            if (options.FrequencyPenalty is float frequencyPenalty)
            {
                d.Add("frequency_penalty", frequencyPenalty);
            }

            if (options.PresencePenalty is float presencePenalty)
            {
                d.Add("presence_penalty", presencePenalty);
            }

            if (options.Seed is long seed)
            {
                d.Add("seed", seed);
            }

            if (options.AdditionalProperties is { } props)
            {
                foreach (KeyValuePair<string, object?> prop in props)
                {
                    switch (prop.Value)
                    {
                        case bool propBool: d.Add(prop.Key, propBool); break;
                        case int propInt32: d.Add(prop.Key, propInt32); break;
                        case long propInt64: d.Add(prop.Key, propInt64); break;
                        case float propSingle: d.Add(prop.Key, propSingle); break;
                        case double propDouble: d.Add(prop.Key, propDouble); break;
                        case string propString: d.Add(prop.Key, propString); break;
                        case null: d.Add(prop.Key, default); break;
                        case JsonElement json: d.Add(prop.Key, ToDocument(json)); break;
                        default:
                            try
                            {
                                d.Add(prop.Key, ToDocument(JsonSerializer.SerializeToElement(prop.Value, BedrockJsonContext.DefaultOptions.GetTypeInfo(prop.Value.GetType()))));
                            }
                            catch (Exception e)
                            {
                                DefaultLogger.Debug(e, "Unable to serialize ChatOptions.AdditionalProperties[\"{0}\"] of type {1}", prop.Key, prop.Value?.GetType());
                            }
                            break;
                    }
                }
            }
        }

        return d;
    }
}