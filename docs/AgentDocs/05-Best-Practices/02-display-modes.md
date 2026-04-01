# Display Modes Best Practices

Reproduced from the original `04-display-modes.md` with updated cross-references.

## Overview

Actions present either **text-only** or **icon-only** content. Choose one mode per action to ensure predictable rendering.

## Text-Only Display

- Implement `GetCommandDisplayName()` and omit `GetCommandImage()`.  
- Ideal for dynamic data (stock quotes, status values, system metrics).  
- Use `\r\n` line breaks to structure multi-line output.

```csharp
protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
{
    return $"AAPL\r\n$150.25\r\n+2.15 ↑";
}
```

## Icon-Only Display

- Implement `GetCommandImage()` and set `this.IsWidget = true` in the constructor.  
- Suitable for static controls (play/pause, launchers) or branded icons.  
- Ensure icons remain legible at device resolutions and test on multiple devices.

```csharp
public class IconOnlyCommand : PluginDynamicCommand
{
    public IconOnlyCommand()
    {
        this.IsWidget = true;
    }

    protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
        => LoadCustomIcon();
}
```

## Do Not Mix Modes

Avoid providing both text and images for the same action; the SDK does not support overlaying text on custom bitmaps.

```csharp
// Incorrect: mixing text and image overrides
protected override String GetCommandDisplayName(String actionParameter, PluginImageSize size)
    => "Play";

protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize size)
    => playIcon;
```

## Practical Guidelines

- Cache static icons; refresh text displays only when data changes.  
- Keep icon styles consistent across the plugin.  
- Consider accessibility: high contrast colours and readable text sizes.  
- Test behaviour on Loupedeck CT, Live, Live S, and MX Creative Console devices.

## Related Topics

- API foundations (display overrides): `../02-Core-Concepts/01-api-fundamentals.md`  
- Stock ticker example (text-only): `../04-Examples/02-stock-ticker-plugin.md`
