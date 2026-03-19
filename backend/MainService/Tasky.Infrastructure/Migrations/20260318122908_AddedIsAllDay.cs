using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tasky.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddedIsAllDay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAllDay",
                table: "Tasks",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAllDay",
                table: "Tasks");
        }
    }
}
