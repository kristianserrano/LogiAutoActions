# Extended Capabilities Reference

Key features collected from `advanced-plugin-features-guide.md` that are not covered elsewhere in this curated set.

## Action Editors & External Editors

- `ActionEditor` subclasses add custom UI inside the Loupedeck configuration software (`ActionEditorSliderCommand`, `ActionEditorKeyboardKeyCommand`, etc.).  
- Provide editor parameters via `GetParameters()` and persist selections to the action parameter string.  
- External editors can launch standalone windows or workflows while still writing back configuration values.

## Localization Support

- Store translations in `.resx` or `.xliff` files (as demonstrated in Test4Plugin).  
- Load language-specific resources at runtime and expose commands for switching locales (`SetLanguageDynamicCommand`).  
- Keep fallback strings in `Localization.resx` to cover unsupported languages.

## Profile Actions & Dynamic Lists

- `DynamicListProfileAction` and `DynamicTreeProfileAction` allow you to populate profile pages with runtime-generated entries.  
- Use them to expose hierarchical data (e.g., playlists, scenes, ticker groups) created from JSON or service calls.

## URL Callbacks

- Implement command handlers that respond to `loupedeck:plugin/<PluginName>/<Action>` URLs, enabling deep linking from browsers or other plugins.  
- Handle callback parameters to trigger specific actions or open configuration screens.

## Variable Parameters & Auto-Repeat

- Variable parameters let commands adjust behaviour continuously (see the auto-repeat examples in Test6Plugin).  
- Use timers or repeated event callbacks to execute while a button is held down, respecting the SDK’s auto-repeat intervals.

## Native API & Thread Management

- Reference platform-specific APIs through P/Invoke when necessary, but always guard with OS checks.  
- Offload heavy work to background threads; marshal back to the main thread only for UI-sensitive operations (`ExecuteOnMainThread`).  
- Follow the dispose pattern to clean up native handles during `Unload()`.

## Application Detection

- `ClientApplication` subclasses can monitor process names (`GetProcessName`) and macOS bundle identifiers (`GetBundleName`).  
- Use `IsProcessNameSupported` to emit plugin events when focus changes or to enable/disable state-aware commands.

## Preferences & Accounts

- Store persistent plugin preferences in JSON under the plugin data directory.  
- Use secure storage for credentials and account tokens (the Test4Plugin samples demonstrate login flows).  
- Provide status updates or prompts through `OnPluginStatusChanged` when authentication expires.

## Reference Implementations

- **Test4Plugin** – Focuses on action editors, localization, multistate actions, and online configuration.  
- **Test6Plugin** – Demonstrates auto-repeat commands, dynamic adjustments with hidden states, and plugin status integration.

For deeper snippets, inspect the corresponding source folders under `docs/LogitechActionSDK/04-Examples/Test4Plugin` and `Test6Plugin`.
