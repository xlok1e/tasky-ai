using Tasky.Application.DTOs;
namespace Tasky.Application.Interfaces
{
    public interface IAiAssistantService
    {
		Task<string> ChatAsync(string message);
    }
}
