# Project Structure Guide

This guide describes the canonical layout for Logitech Actions SDK plugin projects, covering both the development project structure and the final plugin package structure.

## Development Project Layout

```text
MyPlugin/
├── MyPlugin.sln
├── src/
│   ├── .editorconfig
│   ├── Directory.Build.props
│   ├── MyPlugin.cs
│   ├── MyPlugin.csproj
│   ├── MyApplication.cs            # Optional application integration
│   ├── Actions/
│   │   ├── MyCommand.cs
│   │   └── MyAdjustment.cs
│   ├── Helpers/
│   │   ├── PluginLog.cs
│   │   └── PluginResources.cs
│   ├── Resources/                  # Embedded assets (icons, images, data)
│   └── package/
│       └── metadata/
│           ├── Icon256x256.png
│           └── LoupedeckPackage.yaml
└── bin/
    ├── Debug/
    └── Release/
```

## Core Files

### `MyPlugin.cs`

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

    public override void Load()    { /* Subscribe, start timers */ }
    public override void Unload()  { /* Dispose, unsubscribe */ }
    public override Boolean Install()  => true;
    public override Boolean Uninstall() => true;
}
```

### `MyPlugin.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>disable</Nullable>
    <RootNamespace>Loupedeck.MyPlugin</RootNamespace>

    <PluginApiDir Condition="$(OS) == 'Windows_NT'">
      C:\Program Files\Logi\LogiPluginService\
    </PluginApiDir>
    <PluginApiDir Condition="$(OS) != 'Windows_NT'">
      /Applications/Utilities/LogiPluginService.app/Contents/MonoBundle/
    </PluginApiDir>

    <BaseOutputPath>$([System.IO.Path]::GetFullPath('$(MSBuildThisFileDirectory)..\bin\'))</BaseOutputPath>
    <OutputPath>$(BaseOutputPath)$(Configuration)\bin\</OutputPath>
    <PluginShortName>MyPlugin</PluginShortName>
  </PropertyGroup>

  <ItemGroup>
    <Reference Include="PluginApi">
      <HintPath>$(PluginApiDir)PluginApi.dll</HintPath>
    </Reference>
  </ItemGroup>

  <Target Name="CopyPackage" AfterTargets="PostBuildEvent">
    <ItemGroup>
      <PackageFiles Include="package\**\*" />
    </ItemGroup>
    <Copy SourceFiles="@(PackageFiles)" DestinationFolder="$(OutputPath)..\%(RecursiveDir)" />
  </Target>

  <Target Name="PostBuild" AfterTargets="PostBuildEvent">
    <Exec Condition="$(OS) == 'Windows_NT'"
          Command="echo $(BaseOutputPath)$(Configuration)\ &gt; &quot;$(LocalAppData)\Logi\LogiPluginService\Plugins\$(ProjectName).link&quot;" />
    <Exec Condition="$(OS) != 'Windows_NT'"
          Command="echo $(BaseOutputPath)$(Configuration)\ &gt; ~/Library/Application\ Support/Logi/LogiPluginService/Plugins/$(ProjectName).link" />
    <Exec Condition="$(OS) == 'Windows_NT'" Command="start loupedeck:plugin/$(PluginShortName)/reload" ContinueOnError="true" />
    <Exec Condition="$(OS) != 'Windows_NT'" Command="open loupedeck:plugin/$(PluginShortName)/reload" ContinueOnError="true" />
  </Target>
</Project>
```

### `LoupedeckPackage.yaml` Essentials

```yaml
pluginName: MyPlugin
displayName: "My Plugin"
version: 1.0.0
author: "Developer"
supportedDevices:
    - LoupedeckCtFamily
minimumLoupedeckVersion: 6.0
license: MIT
homepageUrl: https://example.com
```

Include the file under `src/package/metadata/` so the post-build target copies it into the output folder alongside your DLL.

## Resource Organisation

- Store icons under `Resources/icons`, larger imagery under `Resources/images`, and supplementary assets (JSON, XML) inside `Resources/data`.
- Mark assets as `EmbeddedResource` in the project file to load them via `EmbeddedResources.ReadImage` or standard stream APIs.
- Maintain consistent namespaces such as `Loupedeck.MyPlugin.Actions.Commands` and `Loupedeck.MyPlugin.Services` to mirror folder layout.

## Build Modes

- `dotnet build` (Debug) keeps hot-reload enabled and writes `.link` files for iterative testing.
- `dotnet build --configuration Release` produces optimized binaries for packaging.
- Both configurations reuse the same `package/metadata` files through the `CopyPackage` target.

## Organisation Tips

Pulled directly from the original guide:

- Group related functionality into folders, keep files concise, and separate concerns.
- Cache frequently used resources, dispose timers and watchers in `Unload()`, and log context-rich error messages.
- Use `HasNoApplication`/`UsesApplicationApiOnly` to describe scope accurately and wire optional `ClientApplication` subclasses only when you need process detection.

## Plugin Package Structure

`.lplug4` packages consist of the following folders:

### Required

**`metadata/`** - Essential configuration and assets:

- `LoupedeckPackage.yaml` - Plugin configuration
- `Icon256x256.png` - Plugin icon ([Plugin icon](https://logitech.github.io/actions-sdk-docs/csharp/Plugin-Icon/))
- `DefaultIconTemplate.ict` - Optional branding template ([Icon Templates](https://logitech.github.io/actions-sdk-docs/csharp/Icon-Templates/))

### Optional

**`win/`** - Windows binaries (if supported)

**`mac/`** - macOS binaries (if supported)

**`actionicons/`** - Auto-discovered action icons:

- `.png` (raster, transparent background, device-optimized resolution)
- `.svg` (vector)
- See [Vector Images](https://logitech.github.io/actions-sdk-docs/csharp/Vector-Images/)

**`icontemplates/`** - Action-specific `.ict` files:

- Named using action class full name: `Loupedeck.DemoPlugin.ToggleMuteCommand.ict`
- Created via [Icon Editor developer mode](https://logitech.github.io/actions-sdk-docs/csharp/Icon-Editor/#developer-mode)
- See [Icon Templates](https://logitech.github.io/actions-sdk-docs/csharp/Icon-Templates/)

**`actionsymbols/`** - Small SVG icons for action picker UI (auto-discovered)

**`profiles/`** - Default `.lp5` profiles with button mappings, action configs, layouts:

- Applied on: first installation, new profile creation, profile reset, device addition
- See [Default Application Profiles](https://logitech.github.io/actions-sdk-docs/csharp/Default-Application-Profiles/)

**`localization/`** - XLIFF translation files (`languagecode-countrycode` format):

- Generate: `loupedeck://plugin/<plugin-name>/xliff` or `LogiPluginTool xliff <plugin-name> <directory-path>`
- Name: `<PluginName>_<language-id>.xliff` (e.g., `MyPlugin_en-US.xliff`)
- See [Plugin Localization](https://logitech.github.io/actions-sdk-docs/csharp/Plugin-Localization/)

**`events/`** - Event definitions for custom triggers:

- See [Haptics Getting Started](https://logitech.github.io/actions-sdk-docs/csharp/Haptics-Getting-Started/)

## Related Reading

- API fundamentals: `../02-Core-Concepts/01-api-fundamentals.md`
- Packaging details: `../02-Core-Concepts/03-package-and-metadata.md`
- XML configuration options: `../03-Advanced-Features/02-xml-configuration.md`
