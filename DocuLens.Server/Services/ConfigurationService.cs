using DocuLens.Server.Database;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;

namespace DocuLens.Server.Services;

public class ConfigurationService : IConfigurationService
{
    private readonly ConfigDbContext _db;
    private readonly object _lock = new();
    private AppConfiguration? _cachedActiveConfiguration;

    public ConfigurationService(ConfigDbContext db)
    {
        _db = db;
        EnsureDefaultConfigurationExists();
    }

    public AppConfiguration CurrentConfiguration
    {
        get
        {
            lock (_lock)
            {
                if (_cachedActiveConfiguration != null)
                    return _cachedActiveConfiguration;

                var cfg = _db.Configuration.FirstOrDefault(c => c.IsActive);

                if (cfg == null)
                {
                    cfg = _db.Configuration.FirstOrDefault();
                    if (cfg != null)
                    {
                        cfg.IsActive = true;
                        _db.SaveChanges();
                    }
                    else
                    {
                        throw new InvalidOperationException("No configuration found in database");
                    }
                }

                _cachedActiveConfiguration = MapToAppConfiguration(cfg);
                return _cachedActiveConfiguration;
            }
        }
    }

    public event EventHandler<ConfigurationChangedEventArgs>? ConfigurationChanged;

    public async Task<IEnumerable<AppConfiguration>> GetAllConfigurationsAsync()
    {
        return await Task.Run(() =>
        {
            lock (_lock)
            {
                return _db.Configuration
                    .OrderByDescending(c => c.IsActive)
                    .ThenBy(c => c.ConfigurationName)
                    .Select(MapToAppConfiguration)
                    .ToList();
            }
        });
    }

    public async Task<AppConfiguration?> GetConfigurationByIdAsync(int id)
    {
        return await Task.Run(() =>
        {
            lock (_lock)
            {
                var cfg = _db.Configuration.Find(id);
                return cfg != null ? MapToAppConfiguration(cfg) : null;
            }
        });
    }

    public async Task<AppConfiguration> CreateConfigurationAsync(AppConfiguration configuration)
    {
        lock (_lock)
        {
            var existingName = _db.Configuration
                .Any(c => c.ConfigurationName == configuration.ConfigurationName);

            if (existingName)
            {
                throw new InvalidOperationException($"Configuration with name '{configuration.ConfigurationName}' already exists");
            }

            var newConfig = new ConfigurationDb
            {
                DocumentPath = configuration.DocumentPath,
                Provider = configuration.Provider,
                Endpoint = configuration.Endpoint,
                Model = configuration.Model,
                EmbeddingModel = configuration.EmbeddingModel,
                ApiKey = configuration.ApiKey,
                IsActive = false,
                ConfigurationName = configuration.ConfigurationName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Configuration.Add(newConfig);
            _db.SaveChanges();

            return MapToAppConfiguration(newConfig);
        }
    }

    public async Task UpdateConfigurationAsync(AppConfiguration configuration)
    {
        AppConfiguration? old = null;
        string[] changed;
        bool wasActiveConfigurationChanged = false;

        lock (_lock)
        {
            var cfg = _db.Configuration.Find(configuration.Id);
            if (cfg == null)
            {
                throw new ArgumentException($"Configuration with ID {configuration.Id} not found");
            }

            wasActiveConfigurationChanged = cfg.IsActive;
            if (wasActiveConfigurationChanged)
            {
                old = CurrentConfiguration;
            }

            changed = configuration.GetChangedProperties(MapToAppConfiguration(cfg));
            if (changed.Length == 0) return;

            cfg.DocumentPath = configuration.DocumentPath;
            cfg.Provider = configuration.Provider;
            cfg.Endpoint = configuration.Endpoint;
            cfg.Model = configuration.Model;
            cfg.EmbeddingModel = configuration.EmbeddingModel;
            cfg.ApiKey = configuration.ApiKey;
            cfg.ConfigurationName = configuration.ConfigurationName;
            cfg.UpdatedAt = DateTime.UtcNow;

            _db.SaveChanges();

            if (wasActiveConfigurationChanged)
            {
                _cachedActiveConfiguration = null;
            }
        }

        if (wasActiveConfigurationChanged && old != null)
        {
            var newConfig = CurrentConfiguration;
            ConfigurationChanged?.Invoke(this, new ConfigurationChangedEventArgs
            {
                OldConfiguration = old,
                NewConfiguration = newConfig,
                ChangedProperties = changed
            });
        }

        await Task.CompletedTask;
    }

    public async Task<bool> SetActiveConfigurationAsync(int configurationId)
    {
        AppConfiguration? old = null;
        AppConfiguration? newConfig = null;

        lock (_lock)
        {
            var targetConfig = _db.Configuration.Find(configurationId);
            if (targetConfig == null)
                return false;

            var currentActive = _db.Configuration.FirstOrDefault(c => c.IsActive);
            if (currentActive != null && currentActive.Id == configurationId)
                return true;

            old = currentActive != null ? MapToAppConfiguration(currentActive) : null;

            foreach (var config in _db.Configuration.Where(c => c.IsActive))
            {
                config.IsActive = false;
            }

            targetConfig.IsActive = true;
            targetConfig.UpdatedAt = DateTime.UtcNow;

            _db.SaveChanges();

            _cachedActiveConfiguration = null;
            newConfig = CurrentConfiguration;
        }

        if (old != null && newConfig != null)
        {
            ConfigurationChanged?.Invoke(this, new ConfigurationChangedEventArgs
            {
                OldConfiguration = old,
                NewConfiguration = newConfig,
                ChangedProperties = new[] { "IsActive", "Provider", "ApiKey", "Endpoint", "Model", "EmbeddingModel", "DocumentPath" }
            });
        }

        return await Task.FromResult(true);
    }

    public async Task<bool> DeleteConfigurationAsync(int id)
    {
        return await Task.Run(() =>
        {
            lock (_lock)
            {
                var cfg = _db.Configuration.Find(id);
                if (cfg == null)
                    return false;

                if (cfg.IsActive && _db.Configuration.Count() == 1)
                {
                    throw new InvalidOperationException("Cannot delete the only configuration");
                }

                if (cfg.IsActive)
                {
                    var nextActive = _db.Configuration
                        .Where(c => c.Id != id)
                        .FirstOrDefault();

                    if (nextActive != null)
                    {
                        nextActive.IsActive = true;
                        nextActive.UpdatedAt = DateTime.UtcNow;
                    }
                }

                _db.Configuration.Remove(cfg);
                _db.SaveChanges();

                _cachedActiveConfiguration = null;

                return true;
            }
        });
    }

    private void EnsureDefaultConfigurationExists()
    {
        lock (_lock)
        {
            if (_db.Configuration.Any()) return;

            _db.Configuration.Add(new ConfigurationDb
            {
                DocumentPath = string.Empty,
                Provider = string.Empty,
                Endpoint = string.Empty,
                Model = string.Empty,
                EmbeddingModel = string.Empty,
                ApiKey = string.Empty,
                IsActive = true,
                ConfigurationName = "Default Configuration",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            _db.SaveChanges();
        }
    }

    private static AppConfiguration MapToAppConfiguration(ConfigurationDb cfg)
    {
        return new AppConfiguration
        {
            Id = cfg.Id,
            Provider = cfg.Provider,
            DocumentPath = cfg.DocumentPath,
            Endpoint = cfg.Endpoint,
            Model = cfg.Model,
            EmbeddingModel = cfg.EmbeddingModel,
            ApiKey = cfg.ApiKey,
            IsActive = cfg.IsActive,
            ConfigurationName = cfg.ConfigurationName,
            CreatedAt = cfg.CreatedAt,
            UpdatedAt = cfg.UpdatedAt
        };
    }
}