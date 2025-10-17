using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DocuLens.Server.Hubs;

[AllowAnonymous]
public record FileProgressDto(
    string FileName,
    string Status,
    string? Error,
    long? ElapsedMs
);

public class IngestionProgressHub : Hub
{
    public async Task SendProgress(FileProgressDto dto)
        => await Clients.All.SendAsync("FileProgress", dto);
}