# Link the Plugin to an Application

Reference implementation lifted from the official [Logi Actions SDK documentation](https://logitech.github.io/actions-sdk-docs/csharp/Link-the-plugin-to-an-application/) and the [DemoApplication.cs](https://github.com/Logitech/actions-sdk/blob/master/DemoPlugin/DemoPlugin/DemoApplication.cs) example.

## Concept

- Plugins can activate when a specific application comes to the foreground.
- Override `GetProcessName()` in your `ClientApplication` subclass to specify the target app.
- Enables automatic profile switching based on active application.
- Works with "Adapt to App" feature in Logitech Options+ and Loupedeck Software.

## Basic Implementation

```csharp
public class DemoApplication : ClientApplication
{
    protected override String GetProcessName() => "YourApplicationName";
}
```

**Testing:**

1. Build plugin with updated `GetProcessName()`
2. Open configuration UI with "Adapt to App" enabled
3. Launch target application → device automatically switches to plugin's profile
4. Use `Alt+Tab` (Windows) or `Cmd+Tab` (macOS) to verify profile switching

## Multiple Process Names Pattern

For applications with variant executable names:

## Multiple Process Names Pattern

For applications with variant executable names:

```csharp
protected override String[] GetProcessNames()
    => new[] { "Ableton Live 10 Lite", "Ableton Live 10 Standard" };
```

## Fuzzy Matching Pattern

For flexible process name matching:

```csharp
protected override Boolean IsProcessNameSupported(String processName)
    => processName.ContainsNoCase("CaptureOne");
```

Use when application version numbers or editions make exact matching impractical.

## Related Topics

- Application detection: [../02-Core-Concepts/01-api-fundamentals.md](../02-Core-Concepts/01-api-fundamentals.md)
- Project structure: [../01-Getting-Started/03-project-structure.md](../01-Getting-Started/03-project-structure.md)
- Official reference: [Link the Plugin to an Application](https://logitech.github.io/actions-sdk-docs/csharp/Link-the-plugin-to-an-application/)
