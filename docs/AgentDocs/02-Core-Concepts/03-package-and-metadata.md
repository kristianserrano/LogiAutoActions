# Package & Metadata Essentials

Highlights from the original project structure, API reference, and example documentation that relate to packaging and metadata.

## LoupedeckPackage.yaml

Place the file under `src/package/metadata/`. Minimum fields pulled from the source examples:

```yaml
pluginName: MyPlugin
displayName: "My Plugin"
version: 1.0.0
author: "Developer Name"
shortDescription: "Concise marketplace summary"
category: Productivity
keywords:
  - automation
  - workflow
supportedDevices:
  - LoupedeckCtFamily
minimumLoupedeckVersion: 6.0
license: MIT
licenseUrl: https://opensource.org/licenses/MIT
homepageUrl: https://example.com
pluginFolderWin: bin
pluginFolderMac: bin
```

Other fields demonstrated in the Stocks plugin documentation include `longDescription`, `productId`, `marketplaceStatus`, and regional metadata. Retain only the entries that apply to your distribution plan.

## Default Assets

- `Icon256x256.png` – Square PNG used by the marketplace and device UI.  
- Optional `tickers.json`, `rssfeeds.json`, or similar data files packaged alongside the DLL.  
- Additional assets (SVG icons, `.ict` icon templates) can be nested under `package/metadata/` or embedded as resources.

**Updating the icon:** Locate the existing `Icon256x256.png` under your plugin’s metadata folder (for example, `docs/LogiActionSDK_agent_doc/04-Examples/ExampleStocksPlugin/src/package/metadata/Icon256x256.png`). Replace it with another PNG that uses the same filename and a 256×256 canvas so the build scripts continue to copy the asset without additional changes.

## Build Integration

The generated project copies metadata into the output directory:

```xml
<Target Name="CopyPackage" AfterTargets="PostBuildEvent">
  <ItemGroup>
    <PackageFiles Include="package\**\*" />
  </ItemGroup>
  <Copy SourceFiles="@(PackageFiles)" DestinationFolder="$(OutputPath)..\%(RecursiveDir)" />
</Target>
```

The post-build target writes a `.link` file inside the Logi plugin folder and triggers a reload command so your device picks up changes immediately.

## Packaging Commands

Taken directly from the quick-start and example docs:

```bash
# Build for release
dotnet build --configuration Release

# Generate package
LogiPluginTool pack ./bin/Release ./MyPlugin.lplug4

# Validate package integrity
LogiPluginTool verify ./MyPlugin.lplug4

# Install locally
LogiPluginTool install ./MyPlugin.lplug4
```

Use `LogiPluginTool metadata <package.lplug4>` to inspect the packaged manifest when debugging issues.

## Versioning & Distribution Checklist

- Update `version` in `LoupedeckPackage.yaml` before each release.  
- Verify the plugin on every supported device (list derived from the original overview: Logitech MX Creative Console, Loupedeck CT/Live/Live S).  
- Confirm the `.lplug4` archive includes the DLL, metadata files, and resources.  
- For marketplace submissions, provide a homepage URL, license, category, keywords, and localized descriptions as shown in the Stocks example.

## Related References

- Project layout details: `../01-Getting-Started/03-project-structure.md`  
- Deployment best practices: `../05-Best-Practices/03-deployment-readiness.md`  
- Stock plugin metadata sample: `../04-Examples/02-stock-ticker-plugin.md#package-metadata-snapshot`
