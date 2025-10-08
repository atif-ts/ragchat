using DocuLens.Server.Database;
using DocuLens.Server.Interfaces;
using DocuLens.Server.Models;
using DocuLens.Server.Providers;
using DocuLens.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

const string vectorDbFile = "vector-store.db";
const string configurationDbFile = "configuration.db";

var configurationPath = Path.Combine(AppContext.BaseDirectory, configurationDbFile);
Directory.CreateDirectory(Path.GetDirectoryName(configurationPath)!);

builder.Services.AddDbContextFactory<ConfigDbContext>(
    o => o.UseSqlite($"Data Source={configurationPath}"),
    ServiceLifetime.Singleton);
//builder.Services.AddSingleton(sp => sp.GetRequiredService<IDbContextFactory<ConfigDbContext>>().CreateDbContext());

builder.Services.AddSingleton<AzureAIWrapper>();
builder.Services.AddSingleton<BedrockWrapper>();

builder.Services.AddSingleton<IApplicationInfoService, ApplicationInfoService>();
builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();
builder.Services.AddScoped<IChatHistoryService, ChatHistoryService>();
builder.Services.AddSingleton<IChatClientFactory, AIProviderFactory>();
builder.Services.AddSingleton<IEmbeddingGeneratorFactory, AIProviderFactory>();

var vectorPath = Path.Combine(AppContext.BaseDirectory, vectorDbFile);
Directory.CreateDirectory(Path.GetDirectoryName(vectorPath)!);
var vectorConn = $"Data Source={vectorPath}";

builder.Services.AddSqliteCollection<string, IngestedChunk>("data-graniterag-chunks", vectorConn);
builder.Services.AddSqliteCollection<string, IngestedDocument>("data-graniterag-documents", vectorConn);

builder.Services.AddSingleton<DataIngestor>();
builder.Services.AddSingleton<SemanticSearch>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddSingleton<IIngestionManager, IngestionManager>();
builder.Services.AddHostedService<ConfigurationBackgroundService>();

builder.Services.AddChatClient(sp =>
{
    var cfgSvc = sp.GetRequiredService<IConfigurationService>();
    var cfg = cfgSvc.CurrentConfiguration;

    var factory = sp.GetRequiredService<IChatClientFactory>();
    return factory.CreateChatClient(cfg);
});

builder.Services.AddEmbeddingGenerator(sp =>
{
    var cfgSvc = sp.GetRequiredService<IConfigurationService>();
    var cfg = cfgSvc.CurrentConfiguration;

    var factory = sp.GetRequiredService<IEmbeddingGeneratorFactory>();
    return factory.CreateEmbeddingGenerator(cfg);
});

builder.Services.AddControllers()
        .AddJsonOptions(opt =>
        {
            opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
            opt.JsonSerializerOptions.WriteIndented = false;
        });
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowReactApp", pol =>
        pol.WithOrigins("https://localhost:65413")
           .AllowAnyHeader()
           .AllowAnyMethod());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ConfigDbContext>();
    context.Database.Migrate();
}

app.UseRouting();
app.UseCors("AllowReactApp");
app.UseDefaultFiles();
app.UseStaticFiles();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();