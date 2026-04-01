# Add a Simple Adjustment

Reference implementation lifted from the official [Logi Actions SDK documentation](https://logitech.github.io/actions-sdk-docs/csharp/Add-a-simple-adjustment/) and the [CounterAdjustment.cs](https://github.com/Logitech/actions-sdk/blob/master/DemoPlugin/DemoPlugin/CounterAdjustment.cs) example.

## Concept

- Adjustments inherit from `PluginDynamicAdjustment` and respond to encoder rotation/press.
- Override `ApplyAdjustment(String actionParameter, Int32 diff)` for rotation events.
- Override `RunCommand(String actionParameter)` for encoder press (typically reset functionality).
- Call `AdjustmentValueChanged()` to notify the Plugin Service when the displayed value updates.
- Set `hasReset: true` in constructor to enable encoder press functionality.

## Basic Implementation

```csharp
public class CounterAdjustment : PluginDynamicAdjustment
{
    private Int32 _counter = 0;

    public CounterAdjustment()
        : base(displayName: "Counter",
               description: "Counts rotation ticks",
               groupName: "Adjustments",
               hasReset: true)
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

    protected override String GetAdjustmentValue(String actionParameter)
        => this._counter.ToString();
}
```

**Key points:**

**Key points:**

- `diff` parameter contains rotation delta (positive = clockwise, negative = counter-clockwise)
- `GetAdjustmentValue()` returns the string displayed on/near the encoder
- Always call `AdjustmentValueChanged()` after modifying state to update the UI
- `hasReset: true` enables encoder press; omit or set `false` to disable

## Testing Steps

From the official documentation:

1. Add the class to your plugin project (e.g., `CounterAdjustment.cs`)
2. Build and start debugging
3. Open configuration UI and disable "Adapt to App"
4. Navigate to your plugin → Adjustments group → Counter
5. Drag to an encoder, verify it appears on the device
6. Rotate encoder to change value
7. Press encoder to reset to `0`

## Related Topics

- Button actions: [./03-add-simple-command.md](./03-add-simple-command.md)
- Action parameters: [../02-Core-Concepts/02-action-parameters.md](../02-Core-Concepts/02-action-parameters.md)
- API fundamentals: [../02-Core-Concepts/01-api-fundamentals.md](../02-Core-Concepts/01-api-fundamentals.md)
- Official reference: [Add a Simple Adjustment](https://logitech.github.io/actions-sdk-docs/csharp/Add-a-simple-adjustment/)
