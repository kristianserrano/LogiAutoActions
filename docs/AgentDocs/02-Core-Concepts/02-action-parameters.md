# Action Parameters

Summary of the original `03-action-parameters.md`, focusing on actionable guidance and representative snippets.

## Concept

- Every placed action instance in the Loupedeck software can carry a text `actionParameter`.  
- Your command or adjustment receives that value in every override (`RunCommand`, `ApplyAdjustment`, display methods).  
- Parameters enable multiple customised copies of the same action without duplicating code.

## Basic Usage

```csharp
public class ConfigurableCommand : PluginDynamicCommand
{
    public ConfigurableCommand()
        : base("Configurable Action", "Action with user parameter", "Examples") { }

    protected override void RunCommand(String actionParameter)
    {
        if (String.IsNullOrEmpty(actionParameter))
        {
            PluginLog.Warning("No parameter provided");
            return;
        }

        PluginLog.Info($"Action executed with parameter: {actionParameter}");
    }

    protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        => String.IsNullOrEmpty(actionParameter)
            ? "Configurable\nNo Config"
            : $"Config\n{actionParameter}";
}
```

## Stock Ticker Pattern

Lifted from the full example in the source document:

- Cache ticker data keyed by symbol (`Dictionary<string, StockData>`).  
- Trigger network refresh when `RunCommand` fires with a valid parameter.  
- Display cached values with arrow indicators (▲ / ▼) inside `GetCommandDisplayName`.  
- Periodically refresh the cache using timers started in `Load()`, then call `ActionImageChanged()` for every affected parameter.

## Parameter Helpers

### Predefined Options

```csharp
public class PresetCommand : PluginDynamicCommand
{
    public PresetCommand()
        : base("Preset Action", "Predefined configurations", "Presets")
    {
        this.AddParameter("preset1", "Preset 1: Quick Action", "Presets");
        this.AddParameter("preset2", "Preset 2: Detailed Action", "Presets");
        this.AddParameter("preset3", "Preset 3: Advanced Action", "Presets");
    }
}
```

### Validation and Normalisation

```csharp
private Boolean TryParseStep(String actionParameter, out Int32 step)
{
    step = 1;
    if (String.IsNullOrWhiteSpace(actionParameter)) return true;
    if (!Int32.TryParse(actionParameter, out var parsed)) return false;

    step = Math.Clamp(parsed, 1, 100);
    return true;
}
```

Use helper methods to keep parsing separate from command logic.

## Best Practices (verbatim from the original guide)

1. **Parameter Validation** – Check for empties, enforce formats, and sanitise user input.  
2. **User Experience** – Describe expected values, surface the current parameter in display text, and provide meaningful feedback.  
3. **Performance** – Cache processed data, run network calls asynchronously, and refresh displays only when the underlying data changes.  
4. **Maintainability** – Document accepted formats, centralise parsing utilities, and capture context in log messages.

## Testing Ideas

```csharp
[Test]
public void TestParameterValidation()
{
    var command = new StockTickerCommand();
    Assert.IsTrue(command.IsValidParameter("AAPL"));
    Assert.IsFalse(command.IsValidParameter("TOOLONGSYMBOL"));
}
```

Manual tests should also cover:

- Empty or malformed parameters  
- Multiple action instances using different values  
- Parameter edits while the plugin is running  
- Persistence of user inputs after restarting the software

## Related Material

- API foundations: `./01-api-fundamentals.md`  
- Advanced timers and data refresh strategies: `../03-Advanced-Features/01-advanced-capabilities.md`  
- Stock ticker implementation walkthrough: `../04-Examples/02-stock-ticker-plugin.md`
