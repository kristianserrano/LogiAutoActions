# API Fundamentals

This condensed reference draws from the `01-api-reference.md` and `loupedeck-api-reference.md` files. It keeps the canonical class signatures, lifecycle notes, and usage patterns while removing duplicated prose.

## Plugin Base Class

```csharp
public class YourPlugin : Plugin
{
    public override Boolean UsesApplicationApiOnly => true;
    public override Boolean HasNoApplication => true;

    public YourPlugin()
    {
        PluginLog.Init(this.Log);
        PluginResources.Init(this.Assembly);
    }

    public override void Load()
    {
        // Register commands, start services, subscribe to events
    }

    public override void Unload()
    {
        // Dispose timers, unsubscribe events, release resources
    }

    public override Boolean Install()  { return true; }
    public override Boolean Uninstall() { return true; }
}
```

Key members (all documented in the original reference):

- `Load()` / `Unload()` – core lifecycle hooks.  
- `Install()` / `Uninstall()` – optional one-time setup and teardown.  
- `UsesApplicationApiOnly` / `HasNoApplication` – declare scope of application bindings.  
- `PluginEvents`, `Log`, and `Assembly` – access to event bus, logging, and embedded resources.

## Dynamic Commands

```csharp
public class YourCommand : PluginDynamicCommand
{
    public YourCommand()
        : base(displayName: "Command Name", description: "Command Description", groupName: "Group")
    {
        this.AddParameter("preset1", "Preset 1", "Presets");
    }

    protected override void RunCommand(String actionParameter)
    {
        PluginLog.Info($"Command executed with parameter: {actionParameter}");
    }

    protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
    {
        using var builder = new BitmapBuilder(imageSize);
        builder.Clear(BitmapColor.Black);
        builder.DrawText("Button", BitmapColor.White);
        return builder.ToImage();
    }

    protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        => $"Dynamic\n{actionParameter}";
}
```

- Use `RunCommand` for button presses.  
- Refresh visuals with `ActionImageChanged()`.  
- Register predefined parameters through `AddParameter(...)`.  
- Pick a **single display mode**: text-only (override `GetCommandDisplayName`) or icon-only (override `GetCommandImage` and set `IsWidget = true`). See `../05-Best-Practices/02-display-modes.md` for the full guidance taken from the source docs.

## Dynamic Adjustments

```csharp
public class YourAdjustment : PluginDynamicAdjustment
{
    private Int32 _value = 0;

    public YourAdjustment()
        : base("Adjustment Name", "Description", "Group", hasReset: true)
    {
    }

    protected override void ApplyAdjustment(String actionParameter, Int32 diff)
    {
        _value += diff;
        this.AdjustmentValueChanged();
    }

    protected override void RunCommand(String actionParameter)
    {
        _value = 0;
        this.AdjustmentValueChanged();
    }

    protected override String GetAdjustmentValue(String actionParameter)
        => _value.ToString();
}
```

- `ApplyAdjustment` receives the rotation delta (`diff`).  
- `RunCommand` handles dial presses (commonly used for reset when `hasReset` is true).  
- `GetAdjustmentValue` returns the inline display text; optionally override `GetAdjustmentImage` for icon widgets.

## Event and Status Handling

From the original advanced sections:

- Raise plugin-scoped events with `this.PluginEvents.RaiseEvent("event-id")` and subscribe inside commands or services.  
- Use `this.OnPluginStatusChanged(PluginStatus.Normal, "Ready")` (or `PluginStatus.Error`) to surface state to the Loupedeck software.  
- When timers or background tasks are involved, create them during `Load()` and stop/dispose them in `Unload()` to avoid leaking resources.

## Image Utilities

`BitmapBuilder` examples lifted from the source files:

```csharp
protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
{
    using var builder = new BitmapBuilder(imageSize);
    builder.Clear(BitmapColor.Black);
    builder.DrawText("OK", BitmapColor.White);
    return builder.ToImage();
}
```

For embedded PNG/SVG assets:

```csharp
return EmbeddedResources.ReadImage(EmbeddedResources.FindFile("icons/play.png"));
```

## Client Applications

The API references include the `ClientApplication` pattern for process detection:

```csharp
public class MyApplication : ClientApplication
{
    protected override String GetProcessName() => "myapp";
    protected override String GetBundleName() => "com.company.myapp";

    protected override Boolean IsProcessNameSupported(String processName)
        => processName.Equals("myapp", StringComparison.OrdinalIgnoreCase);
}
```

Bind it by overriding `GetSupportedApplications()` in your plugin or by returning the instance via the constructor depending on the template you started from.

## Execution Helpers

- `this.ExecuteOnMainThread(Action)` – run UI-sensitive work on the main thread (use sparingly).  
- `this.PluginScheduleTimer(...)` (from sample snippets) – schedule repeating work without blocking plugin threads.  
- Logging helpers are provided through `PluginLog.Info`, `PluginLog.Warning`, and `PluginLog.Error(Exception ex, string message)`.

## Next Topics

- Detailed parameter patterns: `./02-action-parameters.md`  
- Packaging and metadata: `./03-package-and-metadata.md`  
- Advanced lifecycle patterns: `../03-Advanced-Features/01-advanced-capabilities.md`
