using DocuLens.Server.Database;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace DocuLens.Server.Services;

public class ApplicationInfoService : IApplicationInfoService
{
    private readonly IDbContextFactory<ConfigDbContext> _dbFactory;
    private readonly object _lock = new();
    private ApplicationInfo? _cachedApplicationInfo;

    public ApplicationInfoService(IDbContextFactory<ConfigDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
        EnsureDefaultApplicationInfoExists();
    }

    public ApplicationInfo CurrentApplicationInfo
    {
        get
        {
            lock (_lock)
            {
                if (_cachedApplicationInfo != null)
                    return _cachedApplicationInfo;

                using var db = _dbFactory.CreateDbContext();
                var appInfo = db.ApplicationInfo.FirstOrDefault();

                if (appInfo == null)
                {
                    throw new InvalidOperationException("No application info found in database");
                }

                _cachedApplicationInfo = appInfo;
                return _cachedApplicationInfo;
            }
        }
    }

    public async Task<ApplicationInfo> GetApplicationInfoAsync()
    {
        return await Task.Run(() =>
        {
            lock (_lock)
            {
                return CurrentApplicationInfo;
            }
        });
    }

    public async Task UpdateApplicationInfoAsync(ApplicationInfo applicationInfo)
    {
        await Task.Run(() =>
        {
            lock (_lock)
            {
                using var db = _dbFactory.CreateDbContext();

                var appInfo = db.ApplicationInfo.Find(applicationInfo.Id);
                if (appInfo == null)
                {
                    throw new ArgumentException($"Application info with ID {applicationInfo.Id} not found");
                }

                appInfo.AppName = applicationInfo.AppName;
                appInfo.Description = applicationInfo.Description;
                appInfo.Icon = applicationInfo.Icon;
                appInfo.UpdatedAt = DateTime.UtcNow;

                db.SaveChanges();

                _cachedApplicationInfo = null;
            }
        });
    }

    private void EnsureDefaultApplicationInfoExists()
    {
        lock (_lock)
        {
            using var db = _dbFactory.CreateDbContext();

            if (db.ApplicationInfo.Any()) return;

            db.ApplicationInfo.Add(new ApplicationInfo
            {
                AppName = "DocuLens",
                Description = "Chat with your documents",
                Icon = "🗂️",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            db.SaveChanges();
        }
    }
}