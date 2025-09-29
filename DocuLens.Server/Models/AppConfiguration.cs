namespace DocuLens.Server.Models;

public class AppConfiguration
{
    public int Id { get; set; }
    public string DocumentPath { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;    
    public bool IsActive { get; set; } = false;
    public string ConfigurationName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AppConfiguration Clone()
    {
        return new AppConfiguration
        {
            Id = Id,
            DocumentPath = DocumentPath,
            Endpoint = Endpoint,
            Model = Model,
            EmbeddingModel = EmbeddingModel,
            ApiKey = ApiKey,
            IsActive = IsActive,
            ConfigurationName = ConfigurationName,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt
        };
    }

    public string[] GetChangedProperties(AppConfiguration other)
    {
        var changes = new List<string>();

        if (DocumentPath != other.DocumentPath) changes.Add(nameof(DocumentPath));
        if (Endpoint != other.Endpoint) changes.Add(nameof(Endpoint));
        if (Model != other.Model) changes.Add(nameof(Model));
        if (EmbeddingModel != other.EmbeddingModel) changes.Add(nameof(EmbeddingModel));
        if (ApiKey != other.ApiKey) changes.Add(nameof(ApiKey));
        if (IsActive != other.IsActive) changes.Add(nameof(IsActive));
        if (ConfigurationName != other.ConfigurationName) changes.Add(nameof(ConfigurationName));

        return changes.ToArray();
    }
}