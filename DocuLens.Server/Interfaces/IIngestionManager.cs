namespace DocuLens.Server.Interfaces;

public interface IIngestionManager
{
    Task TriggerIngestionAsync(string documentPath);
    bool IsIngestionInProgress { get; }
}