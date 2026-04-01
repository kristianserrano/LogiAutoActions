# Project: LogiPlugin Architect (C# Plugin Focus)

**Stack:** Node.js (Web App Engine), Vanilla JS/HTML/CSS (UI), C# (Target Plugin Language).

## Updated Project Overview

The web app acts as a compiler/generator. It takes user input (URLs/Text), identifies keyboard shortcuts via AI, and outputs **C# source code** and manifests that comply with the Logi Actions SDK.

## Key Constraints

- **SDK Source:** Use the Markdown files in `/docs/AgentDocs/` as the definitive guide for SDK implementation.
- **SDK Secondary Reference:** When deeper clarification is needed beyond local docs, use `https://logitech.github.io/actions-sdk-docs/`.
- **Language Duality:** - The **Builder Web App** is Node.js.
  - The **Output Plugin** must be C#.
- **AI Icon Logic:** Map Font Awesome SVGs from the local `/assets/icons/` folder and its subfolders to the generated C# action classes. Prioritize regular icons if an appropriate regular icon is available, but if a solid icon is a better match, select that one.
- **Toggle Logic:** If the AI identifies a pair of shortcuts (e.g., Play/Pause, Indent/Unindent, List View/Grid View), it should generate a single C# class with toggle logic rather than two separate actions. If there are multiple states, use the multistate actions.

## Development Workflow for Copilot

1. When asked to "Create a new action," first scan `/docs/AgentDocs/` to find the correct C# interface to implement.
2. Ensure all C# code is modular and ready to be bundled into a Logi Options+ plugin.
3. Ensure a DRY approach for code architecture and constant variables.
4. Provide a verification UI in the web app so the user can review the C# code and icon assignments before saving.
