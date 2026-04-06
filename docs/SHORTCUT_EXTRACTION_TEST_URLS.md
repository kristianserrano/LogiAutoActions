# Shortcut Extraction Benchmark URLs

Purpose: Keep a diverse, repeatable set of public pages to validate shortcut extraction across many document formats.

## How to use this list

1. Run extraction for each URL and store raw output count.
2. Track extraction behavior by format diversity, not by app popularity.
3. Keep a few must-detect shortcuts per URL as golden checks.
4. Add new URLs only when they introduce a new structure or notation style.

## Diverse Sample Set

### App-focused targets

1. YouTube Music
URL: [YouTube Music keyboard shortcuts cheat sheet](https://support.google.com/youtubemusic/thread/180145/keyboard-shortcuts-web-player-cheat-sheet?hl=en)
Format pattern: Community help thread with list-like shortcuts.

2. Google Keep
URL: [Google Keep keyboard shortcuts (Desktop)](https://support.google.com/keep/answer/12862970?hl=en&co=GENIE.Platform=Desktop)
Format pattern: Help-center style guidance and shortcut listings.

3. Google Tasks
URL: [Google Tasks keyboard shortcuts (Desktop)](https://support.google.com/tasks/answer/7675630?hl=en&co=GENIE.Platform=Desktop)
Format pattern: Help-center article with platform variants.

4. Pocket Casts
URL: [Pocket Casts keyboard shortcuts](https://support.pocketcasts.com/knowledge-base/do-you-have-any-keyboard-shortcuts/)
Format pattern: Support article grouped by app areas (navigation/playback/settings).

5. Reddit
URL: [Reddit keyboard shortcuts (hotkeys)](https://support.reddithelp.com/hc/en-us/articles/38744650091412-How-to-use-keyboard-shortcuts-hotkeys)
Format pattern: Help-center sectioned list with media shortcuts.

6. Apple Notes
URL: [Keyboard shortcuts and gestures in Notes on Mac](https://support.apple.com/guide/notes/keyboard-shortcuts-and-gestures-apd46c25187e/mac)
Format pattern: Structured table-style Apple guide with symbols and chords.

7. Windows Notepad (community fallback)
URL: [Windows Notepad keyboard shortcuts](https://www.omnicalculator.com/other/notepad-shortcuts)
Format pattern: Community long-form categorized list.
Note: Included for app diversity; replace with an official Microsoft Notepad-specific shortcuts page if one becomes available.

### Operating system targets

1. Windows (official)
URL: [Keyboard shortcuts in Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec)
Format pattern: Large multi-section support document with many shortcut families.

2. macOS (official)
URL: [Mac keyboard shortcuts](https://support.apple.com/en-us/102650)
Format pattern: Deep nested sections with symbol-heavy macOS notation.

### General format diversity targets

1. GitHub
URL: [GitHub keyboard shortcuts](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
Format pattern: Category sections and mixed prose/list structure.

2. Slack
URL: [Slack keyboard shortcuts](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts)
Format pattern: Long help page with platform variants.

3. Firefox
URL: [Firefox keyboard shortcuts](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly)
Format pattern: Dense single-key and chord-heavy documentation.

4. Google Docs
URL: [Google Docs keyboard shortcuts](https://support.google.com/docs/answer/179738?hl=en)
Format pattern: Enterprise help-center style grouping.

5. VS Code
URL: [VS Code default keybindings](https://code.visualstudio.com/docs/reference/default-keybindings)
Format pattern: Table-heavy technical documentation.

6. Foundry VTT
URL: [Foundry VTT controls](https://foundryvtt.com/article/controls/)
Format pattern: Heading/value blocks with mixed keyboard and mouse controls.

7. Excel
URL: [Excel keyboard shortcuts](https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-excel-1798d9d5-842a-42b8-9c99-9b7213f0040f)
Format pattern: Very large support page with high-volume combinations.

8. PowerPoint
URL: [PowerPoint keyboard shortcuts](https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-powerpoint-df4e6f9e-ec45-4fbe-bf1f-6f4b06f1f73b)
Format pattern: Similar vendor template with different shortcut vocabulary.

9. Chrome
URL: [Chrome keyboard shortcuts](https://support.google.com/chrome/answer/157179?hl=en)
Format pattern: Support article with cross-platform notes.

10. Notion
URL: [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts)
Format pattern: Modern docs with chip-like shortcut notation.

11. Figma
URL: [Figma shortcut cheat sheet](https://www.figma.com/best-practices/tips/shortcut-cheat-sheet/)
Format pattern: Marketing and educational hybrid page.

12. macOS User Guide shortcut overview
URL: [Use macOS keyboard shortcuts](https://support.apple.com/guide/mac-help/mchlp2262/mac)
Format pattern: User-guide narrative with linked shortcut families.

## Optional challenge pages

1. MDN accessibility widget keyboard behavior
URL: [Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
Format pattern: Technical prose and examples with many non-shortcut tokens.

2. Atlassian Confluence shortcuts
URL: [Confluence keyboard shortcuts](https://www.atlassian.com/software/confluence/keyboard-shortcuts)
Format pattern: SaaS docs and marketing-adjacent layout.

## Notes

- Prefer stable official docs where possible.
- Keep at least one community page for noise robustness.
- If a URL blocks automated fetches, mark it and keep it for manual verification.
- Capture snapshots later for deterministic CI fixtures if needed.
