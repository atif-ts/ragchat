using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocuLens.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "Configuration",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Configuration",
                keyColumn: "Id",
                keyValue: 1,
                column: "Provider",
                value: "Azure");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Provider",
                table: "Configuration");
        }
    }
}
