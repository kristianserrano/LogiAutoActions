function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function stripHtml(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function parseShortcutEntries(text) {
  const source = String(text || '');
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const modifier = '(?:Ctrl|Control|Cmd|Command|Alt|Option|Shift|Fn|Meta|Win|⌘|⌥|⌃|⇧)';
  const keyPart = '(?:[A-Za-z0-9]{1,12}|F(?:[1-9]|1[0-2])|Esc|Enter|Return|Space|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Up|Down|Left|Right)';
  const shortcutRegex = new RegExp(`${modifier}(?:\\s*\\+\\s*${keyPart})+`, 'gi');

  const unique = new Map();
  for (const line of lines) {
    const matches = line.match(shortcutRegex) || [];
    for (const match of matches) {
      const normalized = match
        .replace(/\s+/g, '')
        .replace(/control/gi, 'Ctrl')
        .replace(/command/gi, 'Cmd')
        .replace(/option/gi, 'Alt')
        .replace(/meta/gi, 'Cmd');

      if (!unique.has(normalized)) {
        unique.set(normalized, line);
      }
    }
  }

  return Array.from(unique.entries()).map(([shortcut, context]) => ({
    shortcut,
    context
  }));
}

module.exports = {
  decodeHtml,
  stripHtml,
  parseShortcutEntries
};
