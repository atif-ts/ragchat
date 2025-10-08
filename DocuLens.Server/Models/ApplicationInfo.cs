namespace DocuLens.Server.Models;

public class ApplicationInfo
{
    public int Id { get; set; }
    public string AppName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}