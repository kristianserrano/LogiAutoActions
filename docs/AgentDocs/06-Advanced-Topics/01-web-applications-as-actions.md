# Web Applications as Actions

Condensed from the original advanced topic paper about running browser-based interfaces from a plugin.

## Use Cases

- Configuration dashboards  
- Interactive charts and data visualisations  
- Rich forms that exceed on-device UI capabilities

## Command Pattern

```csharp
public class WebApplicationCommand : PluginDynamicCommand
{
    protected override void RunCommand(String actionParameter)
    {
        var service = WebService.Instance;

        if (!service.IsRunning)
        {
            _ = service.StartAsync();
        }

        OpenBrowser($"http://localhost:{service.Port}/");
    }
}
```

## Singleton Service Skeleton

```csharp
public class WebService : IDisposable
{
    private static WebService _instance;
    private static readonly Object _lock = new();
    private HttpListener _listener;

    public Int32 Port { get; private set; }
    public Boolean IsRunning { get; private set; }

    private WebService()
    {
        Port = FindAvailablePort(8080);
    }

    public static WebService Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    _instance ??= new WebService();
                }
            }
            return _instance;
        }
    }
}
```

## Port Management

- Assign distinct port ranges per service (configuration, viewer, API, dashboard) to avoid collisions.  
- Perform robust discovery: iterate through a range, skip reserved ports, and attempt to bind with `HttpListener`.  
- Log successes/failures so conflicts are easy to diagnose.

```csharp
private Int32 FindAvailablePort(Int32 startPort)
{
    for (var port = startPort; port < startPort + 200; port++)
    {
        if (IsReservedPort(port)) continue;

        try
        {
            using var probe = new HttpListener();
            probe.Prefixes.Add($"http://localhost:{port}/");
            probe.Start();
            probe.Stop();
            return port;
        }
        catch
        {
            // Try next port
        }
    }

    PluginLog.Warning($"No free port found from {startPort}");
    return startPort;
}
```

## HTTP Handling Essentials

- Bind to `localhost` only and validate the `Host` header before serving requests.  
- Maintain a routing table for static content (`index.html`, CSS, JS) and API endpoints.  
- Use async handlers and response caching to keep services responsive.

## Browser Launch Strategies

```
Windows: Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
macOS:   Process.Start("open", url);
Linux:   Process.Start("xdg-open", url);
```

Provide fallbacks when the default method fails (for example, logging instructions to copy the URL manually).

## Disposal Pattern

```csharp
public void Dispose()
{
    if (_disposed) return;

    _cancellationTokenSource?.Cancel();
    _listener?.Stop();
    _serverTask?.Wait(TimeSpan.FromSeconds(5));

    _disposed = true;
}
```

- Remove the service from any tracking dictionaries when disposing.  
- Cancel outstanding tasks to avoid keeping the plugin alive during unload.

## Troubleshooting Checklist

- Port conflicts → widen search range and skip reserved ports.  
- Memory leaks → ensure `Dispose()` stops listeners and clears timers.  
- Cross-platform browser issues → implement OS-specific fallbacks.  
- Security → reject non-local requests and sanitise inputs before processing.

## Reference Implementation

The StocksPlugin_v2 example shows two cooperating services (configuration + chart viewer) using the patterns above, including:

- Port allocation with retry logic  
- Localhost-only listeners with request validation  
- Shared response caching  
- Health-check endpoints and web tester utilities
