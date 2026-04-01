# Generator Contract: LogiPlugin Architect

Status: Approved baseline contract for Node.js generator behavior.

## Purpose

Define the exact contract between the web app and the generated C# Logitech Actions SDK plugin artifacts. This document is implementation-facing and should be treated as the source of truth for generator behavior unless superseded by SDK constraints from local AgentDocs.

Primary references:

- Local docs: /docs/AgentDocs/
- Deep clarification fallback: <https://logitech.github.io/actions-sdk-docs/>

## Canonical Decisions

1. Local AgentDocs are authoritative; online docs are secondary for ambiguity resolution.
2. Generated plugin language is C# targeting net8.0.
3. Packaging output target is .lplug4.
4. Icon selection defaults to regular icons first, but allows solid when semantic score is stronger.
5. Toggle shortcut pairs generate one toggle action class, not two classes.
6. Three or more states generate a multistate action class.
7. Install and Uninstall signatures are treated as bool-returning in generated code.

## Input Contract

The generator accepts one request object with normalized fields.

### Request Schema

- projectName: string, required, PascalCase-safe name for plugin and namespaces.
- displayName: string, required, human-readable plugin title.
- author: string, required.
- version: string, required, semantic version.
- description: string, optional short summary.
- category: string, optional, default Productivity.
- homepageUrl: string, optional.
- license: string, optional, default MIT.
- supportedDevices: string array, optional, default [LoupedeckCtFamily].
- minimumLoupedeckVersion: string, optional, default 6.0.
- appLinking:
  - enabled: boolean.
  - processNames: string array, optional.
  - bundleNames: string array, optional.
  - fuzzyContains: string array, optional.
- actions: array, required, at least one item.

Each action item:

- id: string, required, stable identifier.
- name: string, required, display name.
- description: string, optional.
- groupPath: string, optional, supports Level1###Level2###Level3.
- actionKind: enum, required:
  - command
  - adjustment
  - toggle
  - multistate
- intent:
  - sourceShortcuts: string array, optional.
  - states: string array, optional for toggle and multistate.
  - parameterHints: string array, optional.
- behavior:
  - keyboardShortcuts: string array, optional.
  - resetOnPress: boolean, optional for adjustment.
  - defaultValue: number or string, optional.
- icon:
  - preferred: string, optional exact icon path hint.
  - selected: object, optional pre-selected icon from ranking output.

### Validation Rules

1. projectName must be filesystem-safe and namespace-safe.
2. actions array cannot be empty.
3. toggle requires exactly 2 states if states are provided.
4. multistate requires at least 3 states.
5. action ids must be unique.
6. keyboard shortcut strings must be normalized before codegen.

## Internal Pipeline Contract

### Intake

- Merge URL extraction, file extraction, and pasted text into one normalized shortcut list.

### Action Inference

- Infer actionKind from shortcut intent.
- If opposing pair detected, force actionKind to toggle unless user explicitly overrides.

### Icon Selection

- Rank candidates using configured scoring weights from /config/icon-scoring.json.
- Store top candidates and selected icon for verification.

### C# Generation

- Generate plugin shell, action classes, optional application-link class, helpers, and metadata.

### Packaging Prep

- Emit package metadata and icon assets into package/metadata.

### Build and Package

- Build release, pack to .lplug4, verify package integrity.

## Output Contract

Given a successful generation, the tool must emit the following structure:

- <PluginRoot>/
  - <PluginName>.sln
  - src/
    - <PluginName>.csproj
    - <PluginName>.cs
    - Actions/
      - Generated action class files
    - Helpers/
      - PluginLog.cs
      - PluginResources.cs
      - ShortcutParser.cs
      - IconMapRegistry.cs
    - Resources/
      - Embedded static assets if needed
    - package/
      - metadata/
        - LoupedeckPackage.yaml
        - Icon256x256.png
        - optional DefaultIconTemplate.ict
        - optional actionicons/
        - optional actionsymbols/
        - optional localization/

Generator response object:

- ok: boolean
- pluginName: string
- outputPath: string
- generatedFiles: string array
- selectedIcons: array of { actionId, iconPath, pack, score }
- warnings: string array
- build:
  - attempted: boolean
  - succeeded: boolean
  - logPath: string optional
- package:
  - filePath: string optional
  - verifyPassed: boolean optional

## C# Code Generation Rules

### Plugin Class

Generate a plugin class deriving from Plugin with:

- UsesApplicationApiOnly and HasNoApplication set per appLinking mode.
- Constructor initializes PluginLog and PluginResources.
- Load and Unload hooks for subscriptions and cleanup.
- bool Install and bool Uninstall with guarded logging and safe failure paths.

### Command Actions

Use PluginDynamicCommand for button actions.

- Implement RunCommand with mapped shortcut execution behavior.
- Use AddParameter for predefined parameter options when present.
- Provide display text or image mode, not both as primary mode.

### Adjustment Actions

Use PluginDynamicAdjustment for encoder actions.

- Implement ApplyAdjustment using diff.
- Implement RunCommand for reset if enabled.
- Implement GetAdjustmentValue for display.

### Toggle Actions

Generate a single class representing two states.

- Maintain current state backing field.
- On invocation, switch state and trigger corresponding shortcut.
- Refresh display/image via ActionImageChanged.

### Multistate Actions

Use PluginMultistateDynamicCommand.

- Declare state list.
- Implement state transition hooks.
- Bind per-state shortcut behavior.

### App Linking

If enabled, generate ClientApplication subclass.

- Prefer explicit process names.
- Include fuzzy match helper only when configured.

## Manifest Contract

LoupedeckPackage.yaml minimum generated fields:

- pluginName
- displayName
- version
- author
- supportedDevices
- minimumLoupedeckVersion
- license
- homepageUrl
- pluginFolderWin
- pluginFolderMac

Optional fields when supplied:

- shortDescription
- longDescription
- category
- keywords
- productId
- marketplaceStatus

## XML Contract (Optional)

Emit PluginConfiguration XML only when layout customization is requested.

When emitted:

- Include valid command names matching generated classes.
- Include aliases, groups, and layouts only for requested device views.
- Validate references before finalizing package.

## Build and Packaging Contract

Expected command sequence:

1. dotnet build
2. dotnet build --configuration Release
3. LogiPluginTool pack ./bin/Release ./<PluginName>.lplug4
4. LogiPluginTool verify ./<PluginName>.lplug4

Optional installation:

1. LogiPluginTool install ./<PluginName>.lplug4

## Error Contract

The generator must return structured errors:

- code: string
- message: string
- details: array optional
- stage: enum intake | inference | icons | generation | build | packaging

Common codes:

- INVALID_INPUT
- INVALID_ACTION_STATE_MODEL
- ICON_SELECTION_FAILED
- TEMPLATE_RENDER_FAILED
- BUILD_FAILED
- PACK_FAILED
- VERIFY_FAILED

## Validation API

The Node.js app exposes contract-validation endpoints:

- GET /api/generator/sample-request
  - Returns a valid sample payload conforming to this contract.
- POST /api/generator/validate-request
  - Validates a request payload against schema and rule checks.
  - Success response: { ok: true, message: "Generator request is valid against the contract." }
  - Failure response: { ok: false, code: "INVALID_INPUT", stage: "intake", errors: [...] }

## Mock Build API

The Node.js app exposes a mock build pipeline for UI integration and flow testing:

- GET /api/generator/test-request/chrome-shortcuts
  - Returns a test payload containing:
    - Command actions: Cut, Copy, Paste
    - Adjustment action: Browser Zoom in/out
  - Keyboard shortcuts included for Chrome test flow:
    - Cut: Ctrl+X, Cmd+X
    - Copy: Ctrl+C, Cmd+C
    - Paste: Ctrl+V, Cmd+V
    - Zoom: Ctrl+Plus, Ctrl+Minus, Cmd+Plus, Cmd+Minus
- POST /api/generator/mock-build
  - Validates input payload and starts an asynchronous mock job.
  - Success response: { ok: true, jobId: "...", status: "queued" }
- GET /api/generator/mock-build/:jobId
  - Returns job status progression: queued, building, packaging, completed.
  - Includes mock result payload when completed.

## Acceptance Criteria

A generation run is accepted when all are true:

1. All required files are produced.
2. Generated C# compiles in Debug and Release.
3. Manifest is valid and copied into output package metadata.
4. Selected icon mapping exists for each generated action.
5. .lplug4 is created and verify passes.

## Non-Goals for Initial Implementation

1. Marketplace publishing automation.
2. Full localization pipeline automation.
3. Complex runtime web server hosting inside generated plugin unless explicitly requested.

## Change Control

Any contract change must update:

1. This file.
2. /docs/PROJECT_INSTRUCTIONS.md if project-level behavior changes.
3. /.github/skills/logi-plugin-builder/SKILL.md if source-of-truth behavior changes.
