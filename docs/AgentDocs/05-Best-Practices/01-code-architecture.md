# Code Architecture Guidelines

Compiled from the best-practice callouts in the original project structure guide and advanced features chapter.

## Namespace & Folder Consistency

- Mirror folder layout in namespaces (`Loupedeck.MyPlugin.Actions.Commands`, `...Adjustments`, `...Services`, `...Helpers`).  
- Group related functionality together, keep files concise, and separate concerns (commands vs services vs models).  
- Maintain descriptive file names and avoid files exceeding 500 lines where possible.

## Resource Management

- Store icons under `Resources/icons`, larger imagery under `Resources/images`, and data assets under `Resources/data`.  
- Mark assets as `EmbeddedResource` and load them through `EmbeddedResources.FindFile(...)` to keep packaging straightforward.  
- Cache frequently used resources and dispose of timers, HTTP listeners, and watchers inside `Unload()` (examples appear throughout `StockPlugin` and the advanced features guide).

## Error Handling & Logging

- Wrap critical sections in try/catch blocks, log exceptions with context using `PluginLog.Error(ex, "...")`, and fall back gracefully.  
- Surface user-visible issues via `OnPluginStatusChanged(PluginStatus.Error, "...")`, then clear them with a normal status once resolved.  
- Use structured log messages (e.g., include action parameter or state names) for easier troubleshooting.

## Thread Safety

- Guard shared state in adjustments or background services with locks or thread-safe collections (see the counter adjustment pattern and stock caching dictionary).  
- Always stop timers, cancel tasks, and dispose resources during `Unload()` to prevent race conditions on reload.

## Parameter & Configuration Hygiene

- Centralise parsing/validation helpers for action parameters (derived from the action parameter guide).  
- Document expected formats via display text or configuration UI, and sanitise incoming strings before use.  
- Version configuration files (JSON/XML) and provide sensible defaults when loading fails.

## When to Split Code

- Keep business logic in services (`StockService`, `YahooFinanceClient`, etc.) instead of embedding it inside action classes.  
- Use helper classes for cross-cutting concerns such as logging, path handling, or resource lookup.  
- Reserve plugin subclasses for orchestration: loading services, exposing settings, and managing lifecycle hooks.
