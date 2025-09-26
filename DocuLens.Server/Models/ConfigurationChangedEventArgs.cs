namespace DocuLens.Server.Models;

public class ConfigurationChangedEventArgs : EventArgs
{
    public AppConfiguration OldConfiguration { get; set; } = null!;
    public AppConfiguration NewConfiguration { get; set; } = null!;
    public string[] ChangedProperties { get; set; } = Array.Empty<string>();
}