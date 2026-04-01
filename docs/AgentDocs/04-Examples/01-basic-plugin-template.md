# Basic Plugin Template

Condensed from the original example to showcase the minimum viable Logitech Actions SDK plugin.

## Project Snapshot

```
BasicPlugin/
├── src/
│   ├── BasicPlugin.cs
│   ├── Commands/HelloWorldCommand.cs
│   ├── Adjustments/CounterAdjustment.cs
│   ├── Resources/hello.png
│   └── package/metadata/LoupedeckPackage.yaml
└── README.md
```

## Main Plugin

```csharp
public class BasicPlugin : Plugin
{
    public override Boolean UsesApplicationApiOnly => true;
    public override Boolean HasNoApplication => true;

    public override void Load()
    {
        PluginLog.Info("BasicPlugin: Loaded successfully");
        this.OnPluginStatusChanged(PluginStatus.Normal, "Plugin ready");
    }

    public override void Unload()
    {
        PluginLog.Info("BasicPlugin: Unloaded successfully");
    }

    public override void Install()
        => PluginLog.Info("BasicPlugin: Installing plugin");

    public override void Uninstall()
        => PluginLog.Info("BasicPlugin: Uninstalling plugin");
}
```

## Command Example

```csharp
public class HelloWorldCommand : PluginDynamicCommand
{
    public HelloWorldCommand()
        : base("Hello World", "Simple greeting command", "Examples")
    {
        this.IsWidget = true; // Use custom image mode
    }

    protected override void RunCommand(String actionParameter)
    {
        PluginLog.Info($"Hello World pressed ({actionParameter})");
    }

    protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
    {
        using var builder = new BitmapBuilder(imageSize);
        builder.Clear(BitmapColor.DarkBlue);
        builder.DrawText("Hello", BitmapColor.White);
        return builder.ToImage();
    }
}
```

## Adjustment Example

```csharp
public class CounterAdjustment : PluginDynamicAdjustment
{
    private Int32 _counter;
    private readonly Object _lock = new();

    public CounterAdjustment()
        : base("Counter", "Counts rotation ticks", "Examples", hasReset: true)
    {
    }

    protected override void ApplyAdjustment(String actionParameter, Int32 diff)
    {
        lock (_lock)
        {
            _counter += diff;
            this.AdjustmentValueChanged();
        }
    }

    protected override void RunCommand(String actionParameter)
    {
        lock (_lock)
        {
            _counter = 0;
            this.AdjustmentValueChanged();
        }
    }

    protected override String GetAdjustmentValue(String actionParameter)
        => _counter.ToString();
}
```

## Packaging Snippet

```yaml
pluginName: BasicPlugin
displayName: "Basic Plugin Template"
version: 1.0.0
supportedDevices:
  - LoupedeckCtFamily
minimumLoupedeckVersion: 6.0
```

## Best Practices Demonstrated

- Initialise `PluginLog` and `PluginResources` in the constructor (as shown in the quick-start scaffolding).  
- Guard shared state in adjustments (`lock` around `_counter`).  
- Use try/catch around installation or long-running tasks to log failures.  
- Generate dynamic images through `BitmapBuilder` instead of storing multiple PNG variants when the output is text-driven.  
- Keep resources embedded and request them via `EmbeddedResources.FindFile(...)` if you need static icons.

## Next Steps

- Add configurable parameters: `../02-Core-Concepts/02-action-parameters.md`  
- Introduce multistate commands or dynamic folders: `../03-Advanced-Features/01-advanced-capabilities.md`
