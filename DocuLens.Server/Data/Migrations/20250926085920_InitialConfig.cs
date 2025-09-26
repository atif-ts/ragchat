using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocuLens.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Configuration",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DocumentPath = table.Column<string>(type: "TEXT", nullable: false),
                    Endpoint = table.Column<string>(type: "TEXT", nullable: false),
                    Model = table.Column<string>(type: "TEXT", nullable: false),
                    EmbeddingModel = table.Column<string>(type: "TEXT", nullable: false),
                    ApiKey = table.Column<string>(type: "TEXT", nullable: false),
                    Icon = table.Column<string>(type: "TEXT", nullable: false),
                    AppName = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    ConfigurationName = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Configuration", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Configuration",
                columns: new[] { "Id", "ApiKey", "AppName", "ConfigurationName", "CreatedAt", "Description", "DocumentPath", "EmbeddingModel", "Endpoint", "Icon", "IsActive", "Model", "UpdatedAt" },
                values: new object[] { 1, "EUs1YP1vOlKKrQE9E7Kz6tIGvYpTGuHeKisFZ9rJsb2gPat4iskeJQQJ99BIACPV0roXJ3w3AAAAACOGsZ4O", "Docu Lens", "Azure DevOps", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chat with your documents", "", "text-embedding-3-small", "https://atif-2277-resource.cognitiveservices.azure.com/openai/v1/", "🗂️", true, "gpt-4o-mini", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Configuration");
        }
    }
}
