# XML Configuration Guide

Derived from `03-Advanced-Features/02-xml-configuration.md`, capturing the actionable XML snippets and implementation notes.

## When to Use XML

- Define layouts, command groups, function layers, and device-specific pages without recompiling code.  
- Separate presentation (arrangement of controls) from logic implemented in C#.  
- Provide alternate layouts per device (round vs square buttons, touchscreen, profiles).

## Core Files

### `PluginConfiguration.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <plugin displayName="My Plugin" homepage="https://example.com" />

  <aliases>
    <alias name="AllButtons" controls="Crop" />
    <alias name="MainButtons" controls="Button1,Button2,Button3,Button4" />
  </aliases>

  <modes>
    <mode name="Main" />
    <mode name="Advanced" />
  </modes>

  <actions>
    <group displayName="">
      <command name="InRootFolder" />
    </group>
    <group displayName="Media###Volume">
      <command name="VolumeUp" displayName="Volume Up" />
      <command name="VolumeDown" displayName="Volume Down" />
    </group>
  </actions>

  <layouts>
    <layout name="Main">
      <command name="InRootFolder" otherControls="AllButtons" />
      <command name="VolumeUp" otherControls="MainButtons" />
    </layout>
  </layouts>
</configuration>
```

### `PluginConfiguration2.xml`

Demonstrates device-specific pages, options, and binding to keyboard shortcuts:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration pluginName="MyAdvancedPlugin">
  <plugin_info
      name="MyAdvancedPlugin"
      displayName="My Advanced Plugin"
      author="Developer Name"
      version="1.2.0"
      homepage="https://github.com/developer/plugin"
      isUserPlugin="False" />

  <options>
    <option name="autoStart" value="true" />
    <option name="refreshInterval" value="5000" />
  </options>

  <round_page name="MainRound">
    <commands>
      <action actionName="PlayPause" />
      <action actionName="@KeyboardShortcut" actionParameter="Control+KeyZ" />
    </commands>
    <commands_fn>
      <action actionName="@KeyboardShortcut" actionParameter="Control+KeyY" />
    </commands_fn>
  </round_page>

  <square_page name="MainSquare">
    <commands>
      <action actionName="MediaFolder" />
      <action actionName="VolumeUp" />
    </commands>
  </square_page>
</configuration>
```

## Binding XML to Code

- Each `<command name="...">` maps to a class inheriting `PluginDynamicCommand` (or adjustment) with a matching `Name`.  
- Keyboard shortcuts use the built-in `@KeyboardShortcut` handler; other built-ins include `@OpenUrl` and `@OpenFile`.  
- Use `<controls>` and `<aliases>` to target specific buttons or encoders on devices.

## Debugging Checklist

From the original guidance:

1. Validate XML structure and closing tags.  
2. Ensure every referenced command has a corresponding implementation.  
3. Confirm control aliases point to valid hardware identifiers.  
4. Log command execution to verify actions triggered from XML reach your code:

```csharp
public override void RunCommand(String commandName, String parameter)
{
    PluginLog.Info($"XML Command: {commandName}, Parameter: {parameter}");
}
```

## Best Practices

- Use descriptive names and consistent casing for commands and pages.  
- Document parameter formats within XML comments.  
- Test layouts on all target devices (round vs square vs touch).  
- Cache parsed XML data if you need to inspect it at runtime.  
- Pair XML layouts with runtime checks to guard against missing resources.

## Related Sections

- Advanced lifecycle support: `./01-advanced-capabilities.md`  
- Project packaging info: `../02-Core-Concepts/03-package-and-metadata.md`
