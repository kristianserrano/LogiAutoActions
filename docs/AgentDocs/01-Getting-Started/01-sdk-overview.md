# Logitech Actions SDK Overview

Summary of the Logi Actions SDK combining the original agent docs structure with updates from the official [Logi Actions SDK documentation](https://logitech.github.io/actions-sdk-docs/). Focus on core concepts, supported devices, development workflow, and essential code patterns for building C# plugins that extend Logitech MX Creative Console, MX Master 4 (via [Actions Ring](https://support.logi.com/hc/en-us/articles/17844647906967-Actions-Ring)), Loupedeck CT, Live, Live S, and Razer Stream Controller X devices.

## Supported Devices

- Logitech MX Creative Console
- Logitech MX Master 4 (via [Actions Ring](https://support.logi.com/hc/en-us/articles/17844647906967-Actions-Ring))
- Loupedeck CT
- Loupedeck Live
- Loupedeck Live S
- Razer Stream Controller X

## Documentation Scope

This documentation covers:

- Plugin project creation and development environment setup
- Core components, APIs, and plugin lifecycle workflows
- Packaging, distribution, and Logitech Marketplace submission
- [Haptics integration](https://logitech.github.io/actions-sdk-docs/csharp/Haptics-Overview/) for tactile feedback (MX Master 4)

## Declare Device Support

Declare device support in `LoupedeckPackage.yaml`:

```yaml
supportedDevices:
    - LoupedeckCtFamily
    # - LoupedeckPlusFamily  # Uncomment to target Loupedeck+
```

## Key Features

- **Custom Plugin Creation** – Implement actions, adjustments, widgets, and workflows tailored to creative software or automation tasks.
- **C# Development Flow** – Build on .NET 8.0 with full Visual Studio or VS Code tooling, logging, and debugging support.
- **Cross-Platform Delivery** – Develop on Windows or macOS and deploy to both platforms without changing code.
- **Rich UI Output** – Render text overlays or custom images with `BitmapBuilder`, including PNG, SVG, and animated assets.
- **Complete Toolchain** – Use `LogiPluginTool` for project scaffolding, hot-reload builds, packaging, verification, and installation.
- **Advanced Integrations** – Combine application detection, native API calls, or external web services to drive device feedback.

## Development Workflow

### 1. Setup

```bash
dotnet tool install --global LogiPluginTool
LogiPluginTool generate MyAwesomePlugin
```

### 2. Iteration

```bash
cd MyAwesomePlugin/src
dotnet build            # Triggers hot reload through the generated link file
```

### 3. Packaging

```bash
LogiPluginTool pack ./bin/Release ./MyAwesomePlugin.lplug4
LogiPluginTool verify ./MyAwesomePlugin.lplug4
LogiPluginTool install ./MyAwesomePlugin.lplug4
```

## Project Layout Snapshot

```text
MyPlugin/
├── src/
│   ├── MyPlugin.cs                # Main plugin class (inherits Plugin)
│   ├── Actions/                   # Button commands (PluginDynamicCommand)
│   ├── Actions/MyAdjustment.cs    # Dial/slider adjustments (PluginDynamicAdjustment)
│   ├── Helpers/PluginLog.cs       # Logging helper
│   ├── Helpers/PluginResources.cs # Resource loader
│   └── package/metadata/
│       ├── Icon256x256.png
│       └── LoupedeckPackage.yaml
└── bin/                           # Auto-generated build output
```

## Core Inheritance Points

```csharp
public class MyPlugin : Plugin
{
    public override Boolean UsesApplicationApiOnly => true;
    public override Boolean HasNoApplication => true;

    public MyPlugin()
    {
        PluginLog.Init(this.Log);
        PluginResources.Init(this.Assembly);
    }

    public override void Load() { /* Initialization */ }
    public override void Unload() { /* Cleanup */ }
}
```

```csharp
public class MyCommand : PluginDynamicCommand
{
    public MyCommand()
        : base("Command Name", "Description", "Group") { }

    protected override void RunCommand(String actionParameter) { /* Button press */ }
    protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize size) { /* Icon */ }
}
```

```csharp
public class MyAdjustment : PluginDynamicAdjustment
{
    public MyAdjustment()
        : base("Adjustment Name", "Description", "Group", hasReset: true) { }

    protected override void ApplyAdjustment(String actionParameter, Int32 diff) { /* Dial rotation */ }
    protected override void RunCommand(String actionParameter) { /* Dial press */ }
}
```

## Technology Stack

- .NET 8.0 runtime and SDK
- C# with nullable reference types and implicit usings enabled
- Embedded resource model for icons, images, and data files
- `.lplug4` packaging handled by `LogiPluginTool`
- Logi Plugin Service for hot-reload and device communication

## Continue Learning

1. **Quick Start:** `./02-quick-start.md`
2. **Project Structure Deep Dive:** `./03-project-structure.md`
3. **API Fundamentals:** `../02-Core-Concepts/01-api-fundamentals.md`
