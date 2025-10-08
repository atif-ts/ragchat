using DocuLens.Server.Models;

namespace DocuLens.Server.Interfaces;

public interface IApplicationInfoService
{
    ApplicationInfo CurrentApplicationInfo { get; }
    Task<ApplicationInfo> GetApplicationInfoAsync();
    Task UpdateApplicationInfoAsync(ApplicationInfo applicationInfo);
}