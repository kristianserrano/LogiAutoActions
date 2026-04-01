# Quick Start Guide

Streamlined quick start combining the original agent docs with the official [Logi Actions SDK Getting Started](https://logitech.github.io/actions-sdk-docs/csharp/Getting-started/) guide. Focus on essential setup, build, installation verification, and testing steps without inventing new guidance.

## Prerequisites

- .NET 8.0 SDK and C# knowledge
- IDE (Visual Studio 2022, VS Code, or Rider)
- Supported device (MX Creative Console, MX Master 4, Loupedeck, or Razer Stream Controller)
- Logitech Options+ or Loupedeck software installed

Verify environment:

```bash
dotnet --version
LogiPluginTool --help
```

## Install LogiPluginTool

```bash
dotnet tool install --global LogiPluginTool
```

If needed, add tool directory to PATH:

```bash
# macOS / Linux
echo 'export PATH="$PATH:$HOME/.dotnet/tools"' >> ~/.zshrc
source ~/.zshrc

# Windows
setx PATH "$env:PATH;$env:USERPROFILE\.dotnet\tools"
```

## Scaffold a Plugin

```bash
LogiPluginTool generate MyFirstPlugin
cd MyFirstPlugin/src
```

The generated project includes a plugin class, sample command, adjustment, helpers, and preconfigured packaging metadata.

## Inspect the Generated Code

### Plugin

```csharp
public class MyFirstPlugin : Plugin
{
    public override Boolean UsesApplicationApiOnly => true;
    public override Boolean HasNoApplication => true;

    public MyFirstPlugin()
    {
        PluginLog.Init(this.Log);
        PluginResources.Init(this.Assembly);
    }
}
```

### Command

```csharp
public class CounterCommand : PluginDynamicCommand
{
    private Int32 _counter = 0;

    public CounterCommand()
        : base("Press Counter", "Counts button presses", "Commands")
    {
    }

    protected override void RunCommand(String actionParameter)
    {
        this._counter++;
        this.ActionImageChanged();
    }

    protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        => $"Press Counter{Environment.NewLine}{this._counter}";
}
```

### Adjustment

```csharp
public class CounterAdjustment : PluginDynamicAdjustment
{
    private Int32 _counter = 0;

    public CounterAdjustment()
        : base("Tick Counter", "Counts rotation ticks", "Adjustments", hasReset: true)
    {
    }

    protected override void ApplyAdjustment(String actionParameter, Int32 diff)
    {
        this._counter += diff;
        this.AdjustmentValueChanged();
    }

    protected override void RunCommand(String actionParameter)
    {
        this._counter = 0;
        this.AdjustmentValueChanged();
    }
}
```

## Build and Test

```bash
dotnet build
```

Post-build steps copy `package/metadata` assets, create a `.link` file in the Logi Plugin Service folder, and trigger hot-reload via `loupedeck:plugin/<PluginName>/reload`.

### Hot Reload Pattern

Enable automatic rebuild and reload on file save:

```bash
cd MyFirstPlugin\src\
dotnet watch build
```

See [.NET Hot Reload documentation](https://devblogs.microsoft.com/dotnet/introducing-net-hot-reload/) for details.

### Debugging Pattern

The generated project includes pre-configured Visual Studio launch settings:

1. Switch to Debug configuration
2. Press F5 or Debug > Start Debugging
3. Logi Plugin Service launches automatically with debugger attached
4. Set breakpoints, inspect variables, step through code

See [C# debugging in Visual Studio](https://docs.microsoft.com/en-us/visualstudio/get-started/csharp/tutorial-debugger) for standard debugging workflows.

## Package and Verify

```bash
dotnet build --configuration Release
LogiPluginTool pack ./bin/Release ./MyFirstPlugin.lplug4
LogiPluginTool verify ./MyFirstPlugin.lplug4
LogiPluginTool install ./MyFirstPlugin.lplug4
```

## Extend the Samples

### Custom Images

```csharp
protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
{
    using var builder = new BitmapBuilder(imageSize);
    builder.Clear(BitmapColor.Black);
    builder.DrawText($"Count\n{this._counter}", BitmapColor.White);
    return builder.ToImage();
}
```

### Action Parameters

```csharp
protected override void RunCommand(String actionParameter)
{
    var parameter = String.IsNullOrEmpty(actionParameter) ? "default" : actionParameter;
    PluginLog.Info($"Action executed with parameter: {parameter}");
}
```

### Embedded Resource Pattern

```csharp
protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
    => EmbeddedResources.ReadImage(EmbeddedResources.FindFile("myicon.png"));
```

## Troubleshooting Checklist

- Loupedeck software must be running for linking/installation
- Re-run `dotnet build` after metadata changes
- Force reload: `open loupedeck:plugin/MyFirstPlugin/reload` (macOS) or `start loupedeck:plugin/MyFirstPlugin/reload` (Windows)
- Verify `.NET 8.0` installation for compilation failures
- Confirm `PluginApi.dll` reference in MSBuild properties

---

## Related Topics

### Getting Started

- [SDK Overview](./01-sdk-overview.md) - Platform introduction and capabilities
- [Project Structure](./03-project-structure.md) - File organization details

### Core Concepts

- [API Fundamentals](../02-Core-Concepts/01-api-fundamentals.md) - Plugin lifecycle and structure
- [Action Parameters](../02-Core-Concepts/02-action-parameters.md) - Dynamic configuration
- [Package and Metadata](../02-Core-Concepts/03-package-and-metadata.md) - Distribution format
- [Action Icons](../02-Core-Concepts/06-action-icons.md) - Device button icons

### Advanced Features

- [Haptics Integration](../03-Advanced-Features/03-haptics-integration.md) - Tactile feedback on MX Master 4
- [Icon Templates](../02-Core-Concepts/04-icon-templates.md) - Dynamic button icons

### Best Practices

- [Testing and Debugging](../05-Best-Practices/05-testing-status.md) - Comprehensive debugging guide
- [Code Architecture](../05-Best-Practices/01-code-architecture.md) - Design patterns

### Examples

- [Basic Plugin Template](../04-Examples/01-basic-plugin-template.md) - Detailed template walkthrough

### Online Resources

- [Getting Started](https://logitech.github.io/actions-sdk-docs/csharp/Getting-started/) - Official getting started guide
- [Testing and Debugging the Plugin](https://logitech.github.io/actions-sdk-docs/csharp/Testing-and-debugging-the-plugin/) - Official debugging guide
- [Plugin API Reference](https://logitech.github.io/actions-sdk-docs/csharp/) - Complete API documentation
- [Logi Options+ Download](https://www.logitech.com/options-plus) - Required host application
- [Logi Options+ Download](https://www.logitech.com/options-plus) - Required host application
