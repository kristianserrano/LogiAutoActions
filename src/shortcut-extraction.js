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

function parseTagAttributes(tagText) {
  const attrs = {};
  const source = String(tagText || '');
  const attrRegex = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (const match of source.matchAll(attrRegex)) {
    const key = String(match[1] || '').toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!key) continue;
    attrs[key] = decodeHtml(value).trim();
  }

  return attrs;
}

function inferPluginNameFromText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';

  const forMatch = value.match(/keyboard shortcuts? for\s+(.+?)(?:\s*[-|:].*)?$/i);
  if (forMatch && forMatch[1]) {
    return forMatch[1].trim();
  }

  const reverseMatch = value.match(/^(.+?)\s+keyboard shortcuts?$/i);
  if (reverseMatch && reverseMatch[1]) {
    return reverseMatch[1].trim();
  }

  if (/\s[-|:]\s/.test(value)) {
    return value.split(/\s[-|:]\s/)[0].trim();
  }

  return value;
}

function extractPageMetadata(sourceHtml) {
  const html = String(sourceHtml || '');
  if (!html.trim()) {
    return { suggestedPluginName: null, suggestedDescription: null };
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleText = titleMatch ? cleanHtmlFragment(titleMatch[1]) : '';
  const h1Text = h1Match ? cleanHtmlFragment(h1Match[1]) : '';

  let description = '';
  const metaTagRegex = /<meta\b[^>]*>/gi;
  for (const match of html.matchAll(metaTagRegex)) {
    const attrs = parseTagAttributes(match[0]);
    const name = (attrs.name || attrs.property || '').toLowerCase();
    if (!description && /^(description|og:description|twitter:description)$/.test(name)) {
      description = attrs.content || '';
    }
  }

  if (!description) {
    const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    description = pMatch ? cleanHtmlFragment(pMatch[1]) : '';
  }

  const suggestedPluginName = inferPluginNameFromText(titleText) || inferPluginNameFromText(h1Text) || null;
  const suggestedDescription = description ? description.replace(/\s+/g, ' ').trim() : null;

  return {
    suggestedPluginName,
    suggestedDescription
  };
}

function cleanHtmlFragment(fragment) {
  return decodeHtml(
    String(fragment || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' / ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalKeyName(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  if (raw === '⌃') return 'Ctrl';
  if (raw === '⌘') return 'Cmd';
  if (raw === '⌥') return 'Alt';
  if (raw === '⇧') return 'Shift';
  if (raw === '↩' || raw === '⏎') return 'Enter';
  if (raw === '⎋') return 'Esc';
  if (raw === '⌫') return 'Backspace';
  if (raw === '⌦') return 'Delete';
  if (raw === '←') return 'Left';
  if (raw === '→') return 'Right';
  if (raw === '↑') return 'Up';
  if (raw === '↓') return 'Down';
  if (lower === 'control') return 'Ctrl';
  if (lower === 'command') return 'Cmd';
  if (lower === 'option') return 'Alt';
  if (lower === 'cmdorctrl') return 'Ctrl';
  if (lower === 'meta') return 'Cmd';
  if (lower === 'escape') return 'Esc';
  if (lower === 'return') return 'Enter';
  if (lower === 'spacebar') return 'Space';
  if (lower === 'page up') return 'PageUp';
  if (lower === 'page down') return 'PageDown';
  if (lower === 'back space') return 'Backspace';

  return raw;
}

function normalizeShortcut(shortcut) {
  const compact = String(shortcut || '')
    .replace(/⌃\s*\+?/g, 'Ctrl+')
    .replace(/⌘\s*\+?/g, 'Cmd+')
    .replace(/⌥\s*\+?/g, 'Alt+')
    .replace(/⇧\s*\+?/g, 'Shift+')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s+/g, ' ')
    .replace(/\++/g, '+')
    .replace(/^\+|\+$/g, '')
    .trim();

  if (!compact) return null;

  const tokens = compact
    .split('+')
    .map((token) => canonicalKeyName(token))
    .filter(Boolean);

  if (!tokens.length) return null;
  return tokens.join('+');
}

function hasModifier(shortcut) {
  return /(?:^|\+)(?:Ctrl|Cmd|Alt|Shift|Fn|Win|⌘|⌥|⌃|⇧)(?:\+|$)/i.test(String(shortcut || ''));
}

function getModifierPrefix(shortcut) {
  const tokens = String(shortcut || '')
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) return '';

  const modifiers = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    if (!/^(Ctrl|Cmd|Alt|Shift|Fn|Win|⌘|⌥|⌃|⇧)$/i.test(token)) {
      return '';
    }
    modifiers.push(token);
  }

  return modifiers.length ? `${modifiers.join('+')}+` : '';
}

function extractShortcutsFromCellText(shortcutCellText) {
  const rawText = String(shortcutCellText || '').trim();
  if (rawText === '/') {
    return ['/'];
  }

  const parts = rawText
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const out = [];
  let inheritedPrefix = '';

  for (const part of parts) {
    let normalized = normalizeShortcut(part);
    if (!normalized) continue;

    if (!hasModifier(normalized) && inheritedPrefix) {
      normalized = normalizeShortcut(`${inheritedPrefix}${normalized}`);
    }

    if (!normalized) continue;

    out.push(normalized);

    const prefix = getModifierPrefix(normalized);
    if (prefix) {
      inheritedPrefix = prefix;
    }
  }

  return out;
}

function splitPairedActionContexts(actionText, shortcutCount) {
  const base = String(actionText || '').trim();
  if (!base || shortcutCount <= 1) {
    return Array.from({ length: Math.max(shortcutCount, 1) }, () => base);
  }

  if (shortcutCount !== 2) {
    return Array.from({ length: shortcutCount }, () => base);
  }

  const pairedWordMatch = base.match(/\b([a-z]+)\s*\/\s*([a-z]+)\b/i);
  if (!pairedWordMatch) {
    return [base, base];
  }

  const left = pairedWordMatch[1];
  const right = pairedWordMatch[2];
  const pairedText = pairedWordMatch[0];

  const first = base.replace(pairedText, left);
  const second = base.replace(pairedText, right);
  return [first, second];
}

function parseShortcutEntriesFromHtml(source) {
  const html = String(source || '');
  if (!/<tr\b/i.test(html) || !/<td\b/i.test(html)) {
    return [];
  }

  const unique = new Map();
  const rowRegex = /<tr\b[\s\S]*?<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowHtml = rowMatch[0] || '';
    const cells = Array.from(rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((match) =>
      cleanHtmlFragment(match[1])
    );

    if (cells.length < 2) continue;

    const actionText = cells[0];
    const shortcutText = cells[1];

    if (!actionText || !shortcutText) continue;
    if (/^(action|command|shortcut|shortcuts|description)$/i.test(actionText)) continue;

    const shortcuts = extractShortcutsFromCellText(shortcutText);
    const contexts = splitPairedActionContexts(actionText, shortcuts.length);

    for (let index = 0; index < shortcuts.length; index += 1) {
      const shortcut = shortcuts[index];
      const context = contexts[index] || actionText;
      const key = `${shortcut}::${context}`;
      if (!unique.has(key)) {
        unique.set(key, { shortcut, context });
      }
    }
  }

  return Array.from(unique.values());
}

function parseShortcutEntriesFromLines(source) {
  const text = String(source || '');
  const normalizedText = /<[^>]+>/.test(text) ? stripHtml(text) : text;
  const lines = normalizedText
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
      const normalized = normalizeShortcut(match);
      if (!normalized) continue;

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

function parseShortcutEntries(text) {
  const htmlEntries = parseShortcutEntriesFromHtml(text);
  if (htmlEntries.length > 0) {
    return htmlEntries;
  }

  return parseShortcutEntriesFromLines(text);
}

module.exports = {
  decodeHtml,
  stripHtml,
  parseShortcutEntries,
  extractPageMetadata
};
