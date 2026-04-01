# Advanced Capabilities

Highlights gathered from `03-Advanced-Features/01-advanced-features.md`. The goal is to preserve the concrete patterns and sample code without repeating the entire narrative.

## Lifecycle Extensions

### Install/Uninstall Hooks

```csharp
public class MyPlugin : Plugin
{
    public override Boolean Install()
    {
        try
        {
            CreateConfigurationFiles();
            RegisterSystemServices();
            PluginLog.Info("Plugin installed successfully");
            return true;
        }
        catch (Exception ex)
        {
            PluginLog.Error(ex, "Plugin installation failed");
            return false;
        }
    }

    public override Boolean Uninstall()
    {
        try
        {
            RemoveConfigurationFiles();
            UnregisterSystemServices();
            PluginLog.Info("Plugin uninstalled successfully");
            return true;
        }
        catch (Exception ex)
        {
            PluginLog.Error(ex, "Plugin uninstall failed");
            return false;
        }
    }
}
```

### Timers & Background Tasks

```csharp
private readonly System.Timers.Timer _periodicTimer = new();

public override void Load()
{
    _periodicTimer.Interval = 60_000;
    _periodicTimer.AutoReset = true;
    _periodicTimer.Elapsed += this.OnPeriodicTimerElapsed;
    _periodicTimer.Start();
}

public override void Unload()
{
    _periodicTimer.Stop();
    _periodicTimer.Elapsed -= this.OnPeriodicTimerElapsed;
    _periodicTimer.Dispose();
}
```

Timers typically raise plugin events (`this.PluginEvents.RaiseEvent("periodic60")`) or trigger command refreshes (`this.ActionImageChanged()`).

## Plugin Event System

- Use `this.PluginEvents.RaiseEvent("event-id", payload)` from services or timers.  
- Commands subscribe through `this.Plugin.PluginEvents.AddEventHandler("event-id", OnEvent)`.  
- Useful for broadcasting data refreshes, online/offline status, or configuration changes.

## Multistate Commands

```csharp
public class ProfileMultistateDynamicCommand : PluginMultistateDynamicCommand
{
    private readonly String[] _states = { "State A", "State B", "State C" };

    protected override Boolean OnWillChangeToState(String actionParameter, String state)
    {
        PluginLog.Info($"Switching to {state}");
        return true; // Allow transition
    }

    protected override String GetCommandDisplayName(String actionParameter, String state, PluginImageSize imageSize)
        => $"{state}\nActive";
}
```

- Define states in the constructor or by overriding `GetButtonPressActions`.  
- Override `OnWillChangeToState` and `OnDidChangeToState` to validate or react to transitions.  
- Combine with `PluginDynamicAdjustment` when you need rotational input plus discrete states.

## Dynamic Folders

```csharp
public class TestDynamicFolder : PluginDynamicFolder
{
    protected override PluginDynamicFolderNavigation GetNavigation()
        => PluginDynamicFolderNavigation.SubfoldersThenActions;

    protected override IEnumerable<String> GetChildren()
        => new[] { "GroupA", "GroupB" };

    protected override IEnumerable<String> GetActions(String parent)
        => parent == "GroupA" ? new[] { "Action1", "Action2" } : Array.Empty<String>();
}
```

Dynamic folders let you populate navigation trees at runtime. Call `this.Plugin.DynamicFoldersChanged()` when refreshing the structure.

## Action Editors

- `ActionEditorCommand` subclasses (e.g., `ActionEditorSliderCommand`, `ActionEditorKeyboardKeyCommand`) provide custom UI inside the Loupedeck configuration software.  
- Expose editor parameters through `GetParameters()` and persist them via JSON or XML.  
- When combined with action parameters, editor values can serialise into the final `actionParameter` string.

## Plugin Status & Notifications

```csharp
this.OnPluginStatusChanged(
    PluginStatus.Error,
    "Data refresh failed",
    "Check network connection",
    "https://example.com/status");
```

- Status messages appear in the UI and persist until cleared with a `PluginStatus.Normal` update.  
- Use the optional URL to open troubleshooting guides or configuration pages.

## Settings & Online Configuration

Examples from the source material demonstrate:

- Storing JSON settings under `Path.Combine(this.GetPluginDataDirectory(), "settings.json")`.  
- Watching configuration files with `FileSystemWatcher` to support live reload.  
- Mirroring settings between local JSON and hosted web interfaces to keep devices in sync.

## Embedded Web Applications

Stock and advanced examples illustrate running lightweight HTTP servers inside the plugin:

```csharp
var listener = new HttpListener();
listener.Prefixes.Add($"http://localhost:{_port}/");
listener.Start();
```

- Bind to `localhost` only, validate requests, and implement port discovery with retries.  
- Serve static HTML/JS for configuration dashboards or chart viewers.  
- Dispose listeners and cancel background tasks during `Unload()` or when the plugin stops.

## Cleanup Patterns

```csharp
public void Dispose()
{
    if (_disposed) return;
    _cancellationTokenSource?.Cancel();
    _httpListener?.Stop();
    _serverTask?.Wait(TimeSpan.FromSeconds(5));
    _disposed = true;
}
```

Apply the pattern to timers, HTTP listeners, and any long-running tasks to avoid resource leaks when the plugin reloads.

## Further Reading

- XML layouts: `./02-xml-configuration.md`  
- Stock ticker architecture: `../04-Examples/02-stock-ticker-plugin.md`  
- Display guidance: `../05-Best-Practices/02-display-modes.md`
