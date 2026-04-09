using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tasky.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskNotifyAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "NotifyAt",
                table: "Tasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationsQueue_TaskId",
                table: "NotificationsQueue",
                column: "TaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_NotificationsQueue_Tasks_TaskId",
                table: "NotificationsQueue",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NotificationsQueue_Tasks_TaskId",
                table: "NotificationsQueue");

            migrationBuilder.DropIndex(
                name: "IX_NotificationsQueue_TaskId",
                table: "NotificationsQueue");

            migrationBuilder.DropColumn(
                name: "NotifyAt",
                table: "Tasks");
        }
    }
}
