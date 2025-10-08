namespace DocuLens.Server.Models;

public sealed record ChatSessionDetailDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<ChatMessageDto> Messages
);

public sealed record ChatMessageDto(
    Guid Id,
    string Role,
    string Content,
    DateTime Timestamp
);