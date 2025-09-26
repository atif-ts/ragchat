using DocuLens.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace DocuLens.Server.Database;

public class ConfigDbContext : DbContext
{
    public DbSet<ConfigurationDb> Configuration => Set<ConfigurationDb>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessageDb> ChatMessages => Set<ChatMessageDb>();

    public ConfigDbContext(DbContextOptions<ConfigDbContext> opts) : base(opts) { }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ConfigurationDb>().HasKey(c => c.Id);

        b.Entity<ChatSession>()
         .HasMany(s => s.Messages)
         .WithOne(m => m.Session)
         .HasForeignKey(m => m.SessionId)
         .OnDelete(DeleteBehavior.Cascade);

        b.Entity<ChatSession>()
         .HasIndex(s => s.UserId);

        b.Entity<ChatMessageDb>()
         .HasIndex(m => m.SessionId);

        var seedDateTime = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        b.Entity<ConfigurationDb>().HasData(new ConfigurationDb
        {
            Id = 1,
            DocumentPath = string.Empty,
            Endpoint = "https://atif-2277-resource.cognitiveservices.azure.com/openai/v1/",
            Model = "gpt-4o-mini",
            EmbeddingModel = "text-embedding-3-small",
            ApiKey = "EUs1YP1vOlKKrQE9E7Kz6tIGvYpTGuHeKisFZ9rJsb2gPat4iskeJQQJ99BIACPV0roXJ3w3AAAAACOGsZ4O",

            Icon = "🗂️",
            AppName = "Docu Lens",
            Description = "Chat with your documents",

            IsActive = true,
            ConfigurationName = "Azure DevOps",
            CreatedAt = seedDateTime,
            UpdatedAt = seedDateTime
        });
    }
}