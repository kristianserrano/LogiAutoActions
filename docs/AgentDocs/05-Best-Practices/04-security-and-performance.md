# Security & Performance Notes

Collected from the advanced features guide and stock ticker example.

## Web Service Security

- Bind `HttpListener` instances to `http://localhost:<port>/` only; reject external hosts (as shown in `IsValidRequest` from the advanced guide).  
- Validate every incoming request before processing payloads.  
- Generate ports dynamically and retry on conflicts to avoid clashing with other local services.  
- Dispose listeners, cancel tokens, and stop background tasks during `Unload()` or service shutdown to prevent resource leakage.

## Data Handling

- Store configuration in JSON under the plugin data directory and guard file access with try/catch blocks (see `TickerConfigService`).  
- Use `FileSystemWatcher` carefully—unsubscribe and dispose when the plugin unloads.  
- Cache frequently accessed data (stock quotes, computed images) to reduce API calls and draw operations.

## Performance Considerations

- Refresh action images only when underlying data changes rather than on tight timers.  
- Keep timers lightweight and avoid running heavy work on the main thread.  
- Leverage asynchronous patterns (`async/await`, `Task.Run`) for network calls and file IO.  
- Reuse `HttpClient` instances with sensible timeouts to avoid socket exhaustion.

## Logging & Monitoring

- Log successes and failures around network interactions to aid troubleshooting (the Yahoo Finance client demonstrates structured logging).  
- Surface long-running issues via `OnPluginStatusChanged(PluginStatus.Error, "...")` so users know when attention is required.  
- Use verbose logging switches (e.g., `LogiPluginTool pack ... --verbose`) when packaging issues arise.

## Related Material

- Web application integration guide: `../06-Advanced-Topics/01-web-applications-as-actions.md`  
- Stock ticker architecture: `../04-Examples/02-stock-ticker-plugin.md`
