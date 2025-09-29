using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocuLens.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeparateApplicationInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppName",
                table: "Configuration");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Configuration");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "Configuration");

            migrationBuilder.CreateTable(
                name: "ApplicationInfo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AppName = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Icon = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationInfo", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ApplicationInfo",
                columns: new[] { "Id", "AppName", "CreatedAt", "Description", "Icon", "UpdatedAt" },
                values: new object[] { 1, "Docu Lens", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chat with your documents", "🗂️", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationInfo");

            migrationBuilder.AddColumn<string>(
                name: "AppName",
                table: "Configuration",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Configuration",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "Configuration",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Configuration",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AppName", "Description", "Icon" },
                values: new object[] { "Docu Lens", "Chat with your documents", "🗂️" });
        }
    }
}
