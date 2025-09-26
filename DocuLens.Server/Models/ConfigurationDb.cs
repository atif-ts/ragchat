namespace DocuLens.Server.Models;

public class ConfigurationDb
{
    public int Id { get; set; }
    public string DocumentPath { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string AppName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = false;
    public string ConfigurationName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}