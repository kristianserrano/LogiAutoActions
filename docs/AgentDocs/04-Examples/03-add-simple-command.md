# Add a Simple Command

Reference implementation lifted from the official [Logi Actions SDK documentation](https://logitech.github.io/actions-sdk-docs/csharp/Add-a-simple-command/) and the [ToggleMuteCommand.cs](https://github.com/Logitech/actions-sdk/blob/master/DemoPlugin/DemoPlugin/ToggleMuteCommand.cs) example.

## Concept

- Commands inherit from `PluginDynamicCommand` and respond to button presses.
- Override `RunCommand(String actionParameter)` to execute logic when the user presses a button.
- Commands appear in the configuration UI under the group name you specify.
- Use `SendKeyboardShortcut()` to trigger system-level actions cross-platform.

## Basic Implementation

```csharp
public class ToggleMuteCommand : PluginDynamicCommand
{
    public ToggleMuteCommand()
        : base(displayName: "Toggle Mute",
               description: "Toggles audio mute state",
               groupName: "Audio")
    {
    }

    protected override void RunCommand(String actionParameter)
    {
        this.Plugin.ClientApplication.SendKeyboardShortcut(VirtualKeyCode.VolumeMute);
    }
}
```

**Key points:**
- Constructor sets display name, description, and group visible in configuration UI
- `RunCommand` receives `actionParameter` (unused in this simple case)
- `SendKeyboardShortcut` works cross-platform (Windows + macOS)

## Testing Steps

From the official documentation:

1. Add the class to your plugin project (e.g., `ToggleMuteCommand.cs`)
2. Build and start debugging
3. Open configuration UI and disable "Adapt to App"
4. Navigate to your plugin → Audio group → Toggle Mute
5. Drag to a button, verify it appears on the device
6. Press to toggle system mute

## Action Grouping Pattern

Commands support hierarchical organization in the UI using `###` separators:

```csharp
public ToggleMuteCommand()
    : base(displayName: "Toggle Mute",
           description: "Toggles audio mute state",
           groupName: "Level1###Level2###Level3")
{
}
```

- Maximum 3 nesting levels
- Works for all action types (commands, adjustments, folders)

## Related Topics

- API fundamentals: [../02-Core-Concepts/01-api-fundamentals.md](../02-Core-Concepts/01-api-fundamentals.md)
- Encoder actions: [./04-add-simple-adjustment.md](./04-add-simple-adjustment.md)
- Action parameters: [../02-Core-Concepts/02-action-parameters.md](../02-Core-Concepts/02-action-parameters.md)
- Official reference: [Add a Simple Command](https://logitech.github.io/actions-sdk-docs/csharp/Add-a-simple-command/)
