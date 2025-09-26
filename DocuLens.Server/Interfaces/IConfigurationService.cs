using DocuLens.Server.Models;

namespace DocuLens.Server.Interfaces;

public interface IConfigurationService
{
    AppConfiguration CurrentConfiguration { get; }
    Task<IEnumerable<AppConfiguration>> GetAllConfigurationsAsync();
    Task<AppConfiguration?> GetConfigurationByIdAsync(int id);
    Task<AppConfiguration> CreateConfigurationAsync(AppConfiguration configuration);
    Task UpdateConfigurationAsync(AppConfiguration configuration);
    Task<bool> SetActiveConfigurationAsync(int configurationId);
    Task<bool> DeleteConfigurationAsync(int id);
    event EventHandler<ConfigurationChangedEventArgs>? ConfigurationChanged;
}