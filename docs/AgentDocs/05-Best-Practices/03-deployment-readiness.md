# Deployment Readiness Checklist

Adapted from the packaging sections of the quick-start guide, project structure notes, and the stock ticker documentation.

## Build & Package

```bash
dotnet build --configuration Release
LogiPluginTool pack ./bin/Release ./MyPlugin.lplug4
LogiPluginTool verify ./MyPlugin.lplug4
LogiPluginTool install ./MyPlugin.lplug4
```

- Use `LogiPluginTool metadata ./MyPlugin.lplug4` to inspect the packaged manifest when troubleshooting.  
- Confirm `package/metadata` files (including `LoupedeckPackage.yaml` and icons) appear in the output directory after builds.

## Manifest Essentials

Ensure `LoupedeckPackage.yaml` contains:

- `pluginName`, `displayName`, and semantic `version`.  
- `supportedDevices` aligned with Logitech MX Creative Console, Loupedeck CT, Live, Live S (as listed in the SDK overview).  
- `minimumLoupedeckVersion`, `license`, and marketplace fields (`category`, `keywords`, `homepageUrl`).  
- Optional metadata (`productId`, regional descriptions) when preparing marketplace submissions, as demonstrated by the Stocks plugin.

## Pre-Release Verification

Replicating the distribution checklist from the Logitech Action SDK guide:

- [ ] Build in Release configuration and verify package integrity.  
- [ ] Test on each target device and operating system.  
- [ ] Update version numbers and changelog.  
- [ ] Confirm installation via `.lplug4` works on a clean machine.  
- [ ] Include documentation or help links referenced by `OnPluginStatusChanged`.  
- [ ] Validate embedded configuration files (`tickers.json`, etc.) load without modification.

## Maintenance Notes

- Use `LogiPluginTool install` for local testing; remove old `.link` files if you migrate build output locations.  
- Keep an eye on `LogiPluginTool verify` output for missing DLLs or resources.  
- Maintain backwards-compatible configuration migrations when updating JSON/XML formats.

## Related References

- Packaging details: `../02-Core-Concepts/03-package-and-metadata.md`  
- Troubleshooting tips: `../01-Getting-Started/02-quick-start.md#7-troubleshooting-checklist`
