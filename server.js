const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');
const express = require('express');
const AdmZip = require('adm-zip');
const sharp = require('sharp');
const { scanIconCandidates } = require('./src/icon-catalog');
const { validateGeneratorRequest } = require('./src/validate-generator-request');
const { parseShortcutEntries, extractPageMetadata } = require('./src/shortcut-extraction');
const { verifyLplug4Package } = require('./src/package-verification');
const { createChromeShortcutsTestRequest } = require('./src/sample-requests');

const app = express();
const PORT = process.env.PORT || 3000;
const RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.LOGI_RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = Number.parseInt(process.env.LOGI_RATE_LIMIT_MAX_REQUESTS || '120', 10);
const ICONS_ROOT = fs.existsSync(path.join(__dirname, 'assets', 'fa-icons'))
  ? path.join(__dirname, 'assets', 'fa-icons')
  : path.join(__dirname, 'assets', 'icons');
const ARTIFACTS_ROOT = path.join(__dirname, 'artifacts');
const PLUGIN_ICON_CACHE_ROOT = path.join(ARTIFACTS_ROOT, '_plugin-icon-cache');
const mockBuildJobs = new Map();
let httpServer;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function checkTool(binary, args = ['--version']) {
  const result = spawnSync(binary, args, {
    encoding: 'utf8',
    timeout: 10000
  });

  const available = result.status === 0;
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  return {
    available,
    version: available ? output.split('\n')[0] : null,
    output: output || null
  };
}

function getSystemDiagnostics() {
  const dotnet = checkTool('dotnet', ['--version']);
  const logiPluginTool = checkTool('LogiPluginTool', ['--help']);
  const forceNoVerifier = process.env.LOGI_FORCE_NO_VERIFIER === '1';
  const forceNoRealBuild = process.env.LOGI_FORCE_NO_REAL_BUILD === '1';

  const pluginApiCandidates = [
    '/Applications/Utilities/LogiPluginService.app/Contents/MonoBundle/PluginApi.dll',
    'C:/Program Files/Logi/LogiPluginService/PluginApi.dll'
  ];

  const existingPluginApi = pluginApiCandidates.find((candidate) => fs.existsSync(candidate));

  return {
    dotnet,
    logiPluginTool: {
      available: forceNoVerifier ? false : logiPluginTool.available,
      version: forceNoVerifier ? null : (logiPluginTool.available ? 'available' : null),
      output: forceNoVerifier ? 'Verifier disabled by LOGI_FORCE_NO_VERIFIER=1' : logiPluginTool.output
    },
    pluginApi: {
      available: Boolean(existingPluginApi),
      path: existingPluginApi || null,
      candidates: pluginApiCandidates
    },
    canAttemptRealBuild: !forceNoRealBuild && dotnet.available && Boolean(existingPluginApi)
  };
}

function toSafeIdentifier(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleaned) {
    return fallback;
  }

  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

function toPascalCase(value, fallback) {
  const normalized = String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  const words = normalized
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return fallback;
  }

  const merged = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return toSafeIdentifier(merged, fallback);
}

function createActionClass(pluginName, action) {
  const className = toPascalCase(action.name || action.id, 'GeneratedAction');
  const actionName = action.name || action.id;
  const actionDescription = action.description || 'Generated action';
  const actionGroup = action.groupPath || 'Generated';
  const shortcuts = action.behavior && Array.isArray(action.behavior.keyboardShortcuts)
    ? action.behavior.keyboardShortcuts
    : [];
  const shortcutList = shortcuts.map((item) => `"${item}"`).join(', ');

  if (action.actionKind === 'adjustment') {
    return {
      fileName: `${className}Adjustment.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}Adjustment : PluginDynamicAdjustment\n{\n    private readonly String[] _shortcuts = new[] { ${shortcutList || '""'} };\n    private Int32 _value = 100;\n\n    public ${className}Adjustment()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}", hasReset: true)\n    {\n    }\n\n    protected override void ApplyAdjustment(String actionParameter, Int32 diff)\n    {\n        _value += diff;\n        this.AdjustmentValueChanged();\n        // TODO: map diff direction to _shortcuts for runtime dispatch.\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        _value = 100;\n        this.AdjustmentValueChanged();\n    }\n\n    protected override String GetAdjustmentValue(String actionParameter)\n        => $"{_value}%";\n}\n`
    };
  }

  if (action.actionKind === 'multistate') {
    const states = action.intent && Array.isArray(action.intent.states) ? action.intent.states : ['StateA', 'StateB', 'StateC'];
    const stateList = states.map((state) => `\"${state}\"`).join(', ');
    return {
      fileName: `${className}MultistateCommand.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}MultistateCommand : PluginMultistateDynamicCommand\n{\n    private readonly String[] _shortcuts = new[] { ${shortcutList || '""'} };\n\n    public ${className}MultistateCommand()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}", new[] { ${stateList} })\n    {\n    }\n}\n`
    };
  }

  if (action.actionKind === 'toggle') {
    const states = action.intent && Array.isArray(action.intent.states) ? action.intent.states : ['Off', 'On'];
    const stateA = states[0] || 'Off';
    const stateB = states[1] || 'On';
    return {
      fileName: `${className}ToggleCommand.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}ToggleCommand : PluginDynamicCommand\n{\n    private readonly String[] _shortcuts = new[] { ${shortcutList || '""'} };\n    private Boolean _isSecondState;\n\n    public ${className}ToggleCommand()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}")\n    {\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        _isSecondState = !_isSecondState;\n        // TODO: trigger _shortcuts[_isSecondState ? 1 : 0] through runtime command bridge.\n        this.ActionImageChanged();\n    }\n\n    protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)\n        => _isSecondState ? "${stateB}" : "${stateA}";\n}\n`
    };
  }

  return {
    fileName: `${className}Command.cs`,
    className,
    content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}Command : PluginDynamicCommand\n{\n    private readonly String[] _shortcuts = new[] { ${shortcutList || '""'} };\n\n    public ${className}Command()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}")\n    {\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        // TODO: trigger _shortcuts[0] through runtime command bridge.\n    }\n}\n`
  };
}

function getActionKindInfo(actionKind) {
  if (actionKind === 'toggle') {
    return {
      baseClass: 'PluginDynamicCommand',
      methods: ['RunCommand', 'GetCommandDisplayName']
    };
  }

  if (actionKind === 'multistate') {
    return {
      baseClass: 'PluginMultistateDynamicCommand',
      methods: ['Constructor (states)']
    };
  }

  if (actionKind === 'adjustment') {
    return {
      baseClass: 'PluginDynamicAdjustment',
      methods: ['ApplyAdjustment', 'RunCommand', 'GetAdjustmentValue']
    };
  }

  return {
    baseClass: 'PluginDynamicCommand',
    methods: ['RunCommand']
  };
}

function toActionNameFromContext(context, fallback) {
  const raw = String(context || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return fallback;
  }

  const cleaned = raw
    .replace(/\s*[-–:|].*$/, '')
    .replace(/\b(?:ctrl|cmd|command|control|alt|shift|option|win|meta|fn)\b.*$/i, '')
    .trim();

  return cleaned || fallback;
}

function dedupeShortcutEntriesByActionName(shortcuts, actionName) {
  const seenKeys = new Set();
  const deduped = [];

  for (let index = 0; index < shortcuts.length; index += 1) {
    const entry = shortcuts[index] || {};
    const inferredName = toActionNameFromContext(entry.context, `${actionName} ${index + 1}`);
    const key = normalizeLookupText(inferredName);

    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    deduped.push({
      ...entry,
      inferredName
    });
  }

  return deduped;
}

function ensureUniqueActionIds(actions) {
  const seen = new Set();
  return (Array.isArray(actions) ? actions : []).map((action, index) => {
    const baseId = toSafeIdentifier(action && action.id, `generated_action_${index + 1}`);
    let nextId = baseId;
    let suffix = 2;

    while (seen.has(nextId)) {
      nextId = `${baseId}_${suffix}`;
      suffix += 1;
    }

    seen.add(nextId);
    return {
      ...action,
      id: nextId
    };
  });
}

function buildDraftActions(payload) {
  const actionName = String(payload.actionName || '').trim() || 'Generated Action';
  const actionDescription = String(payload.actionDescription || '').trim() || 'Generated action';
  const actionType = String(payload.actionType || 'single').trim();
  const states = Array.isArray(payload.states) ? payload.states.filter(Boolean) : [];
  const shortcuts = Array.isArray(payload.shortcuts) ? payload.shortcuts : [];
  const dedupedShortcuts = dedupeShortcutEntriesByActionName(shortcuts, actionName);

  if (actionType === 'toggle' && shortcuts.length >= 2) {
    return ensureUniqueActionIds([
      {
        id: toSafeIdentifier(toPascalCase(actionName, 'ToggleAction').toLowerCase(), 'toggle_action'),
        name: actionName,
        description: actionDescription,
        groupPath: 'Generated',
        actionKind: 'toggle',
        intent: {
          states: states.length === 2 ? states : ['Off', 'On'],
          sourceShortcuts: [shortcuts[0].shortcut, shortcuts[1].shortcut]
        },
        behavior: {
          keyboardShortcuts: [shortcuts[0].shortcut, shortcuts[1].shortcut]
        },
        confidence: 0.86,
        status: 'ready'
      }
    ]);
  }

  if (actionType === 'multistate' && shortcuts.length >= 3) {
    const generatedStates = states.length >= 3
      ? states
      : shortcuts.slice(0, 3).map((item, index) => toActionNameFromContext(item.context, `State ${index + 1}`));

    return ensureUniqueActionIds([
      {
        id: toSafeIdentifier(toPascalCase(actionName, 'MultistateAction').toLowerCase(), 'multistate_action'),
        name: actionName,
        description: actionDescription,
        groupPath: 'Generated',
        actionKind: 'multistate',
        intent: {
          states: generatedStates,
          sourceShortcuts: shortcuts.map((item) => item.shortcut)
        },
        behavior: {
          keyboardShortcuts: shortcuts.map((item) => item.shortcut)
        },
        confidence: 0.84,
        status: 'ready'
      }
    ]);
  }

  if (dedupedShortcuts.length > 0) {
    return ensureUniqueActionIds(dedupedShortcuts.map((entry, index) => {
      const inferredName = entry.inferredName || toActionNameFromContext(entry.context, `${actionName} ${index + 1}`);
      const idBase = toPascalCase(inferredName, `GeneratedAction${index + 1}`).toLowerCase();
      return {
        id: toSafeIdentifier(idBase, `generated_action_${index + 1}`),
        name: inferredName,
        description: `Runs ${entry.shortcut}`,
        groupPath: 'Generated',
        actionKind: 'command',
        intent: {
          sourceShortcuts: [entry.shortcut],
          states: []
        },
        behavior: {
          keyboardShortcuts: [entry.shortcut]
        },
        confidence: 0.88,
        status: 'ready'
      };
    }));
  }

  return ensureUniqueActionIds([
    {
      id: toSafeIdentifier(toPascalCase(actionName, 'GeneratedAction').toLowerCase(), 'generated_action'),
      name: actionName,
      description: actionDescription,
      groupPath: 'Generated',
      actionKind: actionType === 'single' ? 'command' : actionType,
      intent: {
        states,
        sourceShortcuts: []
      },
      behavior: {
        keyboardShortcuts: []
      },
      confidence: 0.55,
      status: 'needs-review'
    }
  ]);
}

function createManifestPreview(payload, pluginName) {
  const packageName = pluginName.replace(/plugin$/i, '') || 'GeneratedAction';
  const pluginBinaryName = `${packageName}Plugin.dll`;
  return {
    displayName: payload.displayName || `${pluginName} Plugin`,
    version: payload.version || '1.0.0',
    author: payload.author || 'LogiAutoActions User',
    pluginFileName: pluginBinaryName,
    minimumLoupedeckVersion: payload.minimumLoupedeckVersion || '6.0'
  };
}

function buildApprovalPreview(payload) {
  const projectName = toPascalCase(payload.projectName || `${payload.actionName || 'Generated'}Plugin`, 'GeneratedPlugin');
  const draftActions = buildDraftActions(payload);
  const manifestPreview = createManifestPreview(payload, projectName);

  const actions = draftActions.map((action) => {
    const classInfo = createActionClass(projectName, action);
    const kindInfo = getActionKindInfo(action.actionKind);

    const shortcutSummary = action.behavior && Array.isArray(action.behavior.keyboardShortcuts)
      ? action.behavior.keyboardShortcuts
      : [];

    return {
      ...action,
      icon: null,
      quickView: {
        status: action.status,
        confidence: action.confidence,
        shortcutSummary
      },
      behaviorView: {
        plainLanguage: `${action.name} runs ${shortcutSummary.join(', ') || 'a shortcut mapping to be defined'}.`,
        states: action.intent && Array.isArray(action.intent.states) ? action.intent.states : [],
        resetOnPress: Boolean(action.behavior && action.behavior.resetOnPress)
      },
      developerView: {
        className: classInfo.className,
        fileName: classInfo.fileName,
        baseClass: kindInfo.baseClass,
        methods: kindInfo.methods,
        code: classInfo.content,
        manifestPreview
      }
    };
  });

  return {
    pluginName: projectName,
    manifestPreview,
    actions,
    summary: {
      total: actions.length,
      ready: actions.filter((item) => item.quickView.status === 'ready').length,
      needsReview: actions.filter((item) => item.quickView.status !== 'ready').length
    }
  };
}

function normalizeIconLookupTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^assets\/icons\//, '')
    .replace(/^fa[srb]?\s+/, '')
    .replace(/^fa-/, '')
    .replace(/\.svg$/i, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function iconNameFromPath(iconPath) {
  return path.basename(String(iconPath || ''), '.svg').toLowerCase();
}

function resolveIconCandidate(query, preferredPack) {
  const normalizedQuery = normalizeIconLookupTerm(query);
  if (!normalizedQuery) {
    return null;
  }

  const normalizedPack = String(preferredPack || '').trim().toLowerCase();
  const candidates = iconCandidates
    .map((candidate) => {
      const iconName = iconNameFromPath(candidate.path);
      return {
        candidate,
        iconName,
        normalizedName: normalizeIconLookupTerm(iconName),
        normalizedPath: normalizeIconLookupTerm(candidate.path)
      };
    })
    .sort((a, b) => a.iconName.localeCompare(b.iconName));

  const preferred = normalizedPack
    ? candidates.filter((item) => item.candidate.pack === normalizedPack)
    : candidates;

  const pools = preferred.length > 0 ? [preferred, candidates] : [candidates];
  for (const pool of pools) {
    const exactName = pool.find((item) => item.normalizedName === normalizedQuery);
    if (exactName) {
      return {
        path: exactName.candidate.path,
        pack: exactName.candidate.pack,
        iconName: exactName.iconName
      };
    }

    const exactPath = pool.find((item) => item.normalizedPath === normalizedQuery);
    if (exactPath) {
      return {
        path: exactPath.candidate.path,
        pack: exactPath.candidate.pack,
        iconName: exactPath.iconName
      };
    }
  }

  return null;
}

function sanitizeLlmJsonInput(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  return raw;
}

function extractBalancedJsonObject(text) {
  const source = String(text || '');
  if (!source) {
    return '';
  }

  let searchFrom = 0;
  while (searchFrom < source.length) {
    const start = source.indexOf('{', searchFrom);
    if (start === -1) {
      return '';
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < source.length; i += 1) {
      const ch = source[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth += 1;
        continue;
      }

      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, i + 1).trim();
        }
      }
    }

    searchFrom = start + 1;
  }

  return '';
}

function parseLlmAssignmentsInput(value) {
  if (value && typeof value === 'object') {
    return { ok: true, parsed: value };
  }

  const sanitized = sanitizeLlmJsonInput(value);
  if (!sanitized) {
    return {
      ok: false,
      error: 'Paste a JSON response from your LLM before validating.'
    };
  }

  try {
    const parsed = JSON.parse(sanitized);
    return { ok: true, parsed };
  } catch (error) {
    const extracted = extractBalancedJsonObject(sanitized);
    if (extracted) {
      try {
        const parsed = JSON.parse(extracted);
        return { ok: true, parsed };
      } catch (_ignored) {
        // Fall through to user-facing parse error below.
      }
    }

    return {
      ok: false,
      error: `Could not parse JSON: ${error.message}`
    };
  }
}

function decodeImageDataUrl(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2].replace(/\s+/g, ''), 'base64')
  };
}

function cleanUrlToken(value) {
  return String(value || '')
    .trim()
    .replace(/^['"<\s]+|['">\s]+$/g, '')
    .replace(/[),.;]+$/g, '');
}

function extractUrlCandidatesFromText(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  const candidates = [];

  if (raw.startsWith('data:image/')) {
    candidates.push(raw);
  }

  const markdownMatch = raw.match(/!?\[([^\]]*)\]\(([^)]+)\)/);
  if (markdownMatch) {
    const label = cleanUrlToken(markdownMatch[1]);
    const href = cleanUrlToken(String(markdownMatch[2]).split(/\s+/)[0]);
    if (label) candidates.push(label);
    if (href) candidates.push(href);
  }

  const angleBracketMatch = raw.match(/<([^>]+)>/);
  if (angleBracketMatch && angleBracketMatch[1]) {
    candidates.push(cleanUrlToken(angleBracketMatch[1]));
  }

  const plainUrls = raw.match(/https?:\/\/[^\s)]+/gi) || [];
  for (const item of plainUrls) {
    candidates.push(cleanUrlToken(item));
  }

  if (candidates.length === 0) {
    candidates.push(cleanUrlToken(raw));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function unwrapNestedUrl(value) {
  let current = String(value || '').trim();
  for (let i = 0; i < 4; i += 1) {
    if (current.startsWith('data:image/')) {
      return current;
    }

    let parsed;
    try {
      parsed = new URL(current);
    } catch (_error) {
      return current;
    }

    const nested =
      parsed.searchParams.get('imgurl') ||
      parsed.searchParams.get('mediaurl') ||
      parsed.searchParams.get('url') ||
      parsed.searchParams.get('u') ||
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('target');

    if (!nested) {
      return current;
    }

    const decoded = decodeURIComponent(String(nested).trim());
    if (!decoded || decoded === current) {
      return current;
    }

    current = decoded;
  }

  return current;
}

function scorePluginIconUrlCandidate(value) {
  const candidate = String(value || '').trim();
  if (!candidate) {
    return -1;
  }

  if (candidate.startsWith('data:image/')) {
    return 1000;
  }

  let score = 0;
  if (/^https?:\/\//i.test(candidate)) {
    score += 100;
  }

  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?|#|$)/i.test(candidate)) {
    score += 60;
  }

  if (!/(google\.|bing\.|search\?|\/search)/i.test(candidate)) {
    score += 20;
  }

  return score;
}

function normalizePluginIconUrl(pluginIconUrl) {
  const candidates = extractUrlCandidatesFromText(pluginIconUrl)
    .map((item) => unwrapNestedUrl(item))
    .filter(Boolean);

  if (candidates.length === 0) {
    return String(pluginIconUrl || '').trim();
  }

  return candidates.sort((a, b) => scorePluginIconUrlCandidate(b) - scorePluginIconUrlCandidate(a))[0];
}

function isDisallowedPluginIconSource(parsedUrl) {
  const host = String(parsedUrl.hostname || '').toLowerCase();
  const fullPath = `${host}${String(parsedUrl.pathname || '').toLowerCase()}`;

  if (/fontawesome|fortawesome/.test(fullPath)) {
    return true;
  }

  if (host === 'raw.githubusercontent.com' && /\/fortawesome\/font-awesome\//.test(fullPath)) {
    return true;
  }

  return false;
}

async function fetchPluginIconInput(pluginIconUrl) {
  const normalizedUrl = normalizePluginIconUrl(pluginIconUrl);
  const dataUrl = decodeImageDataUrl(normalizedUrl);
  if (dataUrl) {
    return dataUrl.buffer;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (_error) {
    throw new Error('pluginIconUrl must be a valid URL.');
  }

  const protocol = String(parsedUrl.protocol || '').toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('pluginIconUrl must use http or https.');
  }

  if (isDisallowedPluginIconSource(parsedUrl)) {
    throw new Error('pluginIconUrl must point to an official app icon source, not a generic icon library.');
  }

  if (!/\.png(\?|#|$)/i.test(parsedUrl.pathname)) {
    throw new Error('pluginIconUrl must point to a direct .png file.');
  }

  const response = await fetch(parsedUrl, {
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pluginIconUrl (${response.status}).`);
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/png')) {
    throw new Error('pluginIconUrl must return image/png content.');
  }

  const imageArrayBuffer = await response.arrayBuffer();
  return Buffer.from(imageArrayBuffer);
}

async function preparePluginIconAsset(pluginIconUrl) {
  const normalizedUrl = normalizePluginIconUrl(pluginIconUrl);
  const imageBuffer = await fetchPluginIconInput(normalizedUrl);
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('pluginIconUrl returned an empty image.');
  }

  const imageMetadata = await sharp(imageBuffer).metadata();
  if (imageMetadata.format && imageMetadata.format !== 'png') {
    throw new Error('pluginIconUrl must resolve to a PNG image.');
  }

  const imageStats = await sharp(imageBuffer).ensureAlpha().stats();
  const alphaChannel = imageStats && Array.isArray(imageStats.channels) ? imageStats.channels[3] : null;
  if (!alphaChannel || alphaChannel.min >= 255) {
    throw new Error('pluginIconUrl must be a transparent PNG (alpha channel required).');
  }

  const outputBuffer = await sharp(imageBuffer)
    .resize(256, 256, {
      fit: 'cover',
      position: 'centre'
    })
    .png()
    .toBuffer();

  fs.mkdirSync(PLUGIN_ICON_CACHE_ROOT, { recursive: true });
  const hash = crypto.createHash('sha256').update(String(normalizedUrl)).digest('hex').slice(0, 16);
  const fileName = `icon-${hash}.png`;
  const outputPath = path.join(PLUGIN_ICON_CACHE_ROOT, fileName);
  fs.writeFileSync(outputPath, outputBuffer);

  return {
    sourceUrl: String(normalizedUrl),
    assetPath: path.relative(__dirname, outputPath).split(path.sep).join('/'),
    width: 256,
    height: 256
  };
}

function normalizeLookupText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLlmPromptExport(approvalActions) {
  const actions = approvalActions.map((action) => {
    return {
      actionId: action.id,
      actionName: action.name,
      actionKind: action.actionKind,
      description: action.description || '',
      shortcuts: normalizeApprovalShortcuts(action.shortcuts)
    };
  });

  const responseTemplate = {
    pluginIconUrl: '',
    assignments: actions.map((action) => ({
      actionId: action.actionId,
      icon: '',
      pack: 'solid',
      reason: ''
    }))
  };

  const promptMarkdown = [
    '# Task',
    'Pick one Font Awesome Free icon for every action below.',
    '',
    '# Rules',
    '- Output valid JSON only (no prose).',
    '- Use every actionId exactly once.',
    '- Return exactly one icon per action.',
    '- pluginIconUrl is optional because plugin icon is provided in Step 1 by user upload.',
    '- If pluginIconUrl is provided, it must be a direct https URL to the official app icon as a transparent PNG.',
    '- Do not use markdown link syntax, search-result links, redirect links, SVG files, or icon-library assets for pluginIconUrl.',
    '- Use icon names from Font Awesome Free (for example: copy, paste, arrow-right).',
    '- Do not reuse the same icon family across different command groups.',
    '- Keep distinct icon families for groups like move note, navigate notes, move list item, and navigate list item.',
    '- Keep opposite navigation actions visually opposite (next vs previous, forward vs back).',
    '',
    '# JSON Schema',
    '{',
    '  "pluginIconUrl": "https://example.com/icon.png",',
    '  "assignments": [',
    '    {',
    '      "actionId": "exact-action-id",',
    '      "icon": "font-awesome-icon-name-or-path",',
    '      "pack": "solid|regular|brands",',
    '      "reason": "short reason"',
    '    }',
    '  ]',
    '}',
    '',
    '# Actions',
    JSON.stringify(actions, null, 2),
    '',
    '# Return Only This JSON Shape',
    JSON.stringify(responseTemplate, null, 2)
  ].join('\n');

  return {
    actions,
    responseTemplate,
    promptMarkdown
  };
}

async function validateLlmIconAssignments(approvalActions, llmResponse) {
  const parsedResult = parseLlmAssignmentsInput(llmResponse);
  if (!parsedResult.ok) {
    return {
      ok: false,
      errors: [{ message: parsedResult.error }],
      warnings: [],
      resolvedAssignments: [],
      pluginIcon: null
    };
  }

  const payload = parsedResult.parsed || {};
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const pluginIconUrl = String(payload.pluginIconUrl || '').trim();
  const errors = [];
  const warnings = [];

  if (!assignments.length) {
    return {
      ok: false,
      errors: [{ message: 'JSON must contain a non-empty assignments array.' }],
      warnings,
      resolvedAssignments: [],
      pluginIcon: null
    };
  }

  const actionsById = new Map();
  const actionsByName = new Map();
  for (const action of approvalActions) {
    actionsById.set(action.id, action);
    actionsByName.set(normalizeLookupText(action.name), action);
  }

  const seenActionIds = new Set();
  const resolvedAssignments = [];

  for (let index = 0; index < assignments.length; index += 1) {
    const item = assignments[index] || {};
    const actionId = String(item.actionId || '').trim();
    const actionName = String(item.actionName || '').trim();
    const iconQuery = String(item.icon || '').trim();
    const preferredPack = String(item.pack || '').trim().toLowerCase();

    let action = null;
    if (actionId && actionsById.has(actionId)) {
      action = actionsById.get(actionId);
    } else if (!actionId && actionName && actionsByName.has(normalizeLookupText(actionName))) {
      action = actionsByName.get(normalizeLookupText(actionName));
    }

    if (!action) {
      errors.push({
        index,
        message: `Assignment ${index + 1} does not map to a known action. Include a valid actionId.`
      });
      continue;
    }

    if (seenActionIds.has(action.id)) {
      errors.push({
        index,
        actionId: action.id,
        message: `Action "${action.id}" appears more than once.`
      });
      continue;
    }

    seenActionIds.add(action.id);

    if (!iconQuery) {
      errors.push({
        index,
        actionId: action.id,
        message: 'Icon is required for every assignment.'
      });
      continue;
    }

    const match = resolveIconCandidate(iconQuery, preferredPack);
    if (!match) {
      errors.push({
        index,
        actionId: action.id,
        message: `No local icon found for "${iconQuery}".`
      });
      continue;
    }

    resolvedAssignments.push({
      actionId: action.id,
      actionName: action.name,
      icon: {
        path: match.path,
        pack: match.pack,
        iconName: match.iconName
      },
      reason: String(item.reason || '').trim()
    });
  }

  for (const action of approvalActions) {
    if (!seenActionIds.has(action.id)) {
      errors.push({
        actionId: action.id,
        message: `Missing assignment for action "${action.id}".`
      });
    }
  }

  let pluginIcon = null;
  if (errors.length === 0 && pluginIconUrl) {
    try {
      pluginIcon = await preparePluginIconAsset(pluginIconUrl);
    } catch (error) {
      errors.push({
        message: `Could not prepare plugin icon from pluginIconUrl: ${error.message}`
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    resolvedAssignments,
    pluginIcon
  };
}

function normalizeApprovalStates(states) {
  return Array.isArray(states)
    ? states.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeApprovalShortcuts(shortcuts) {
  return Array.isArray(shortcuts)
    ? shortcuts.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function validateApprovalAction(action, index) {
  const errors = [];
  const name = String(action.name || '').trim();
  const actionKind = String(action.actionKind || 'command').trim();
  const shortcuts = normalizeApprovalShortcuts(action.shortcuts);
  const states = normalizeApprovalStates(action.states);

  if (!name) {
    errors.push({ field: 'name', message: 'Action name is required.' });
  }

  if (actionKind === 'toggle') {
    if (shortcuts.length !== 2) {
      errors.push({ field: 'shortcuts', message: 'Toggle actions require exactly 2 shortcuts.' });
    }
    if (states.length !== 2) {
      errors.push({ field: 'states', message: 'Toggle actions require exactly 2 states.' });
    }
  }

  if (actionKind === 'multistate') {
    if (shortcuts.length < 3) {
      errors.push({ field: 'shortcuts', message: 'Multistate actions require at least 3 shortcuts.' });
    }
    if (states.length < 3) {
      errors.push({ field: 'states', message: 'Multistate actions require at least 3 states.' });
    }
  }

  if ((actionKind === 'command' || actionKind === 'adjustment') && shortcuts.length < 1) {
    errors.push({ field: 'shortcuts', message: 'At least one shortcut is required.' });
  }

  return {
    index,
    id: action.id || `action_${index + 1}`,
    valid: errors.length === 0,
    errors,
    normalized: {
      id: action.id || `action_${index + 1}`,
      name,
      actionKind,
      shortcuts,
      states,
      description: String(action.description || '').trim() || 'Generated action',
      groupPath: String(action.groupPath || 'Generated').trim() || 'Generated',
      resetOnPress: Boolean(action.behaviorResetOnPress),
      approval: action.approval || 'pending'
    }
  };
}

function approvalActionToGeneratorAction(item) {
  const intent = {
    sourceShortcuts: item.shortcuts
  };

  if (item.states.length > 0) {
    intent.states = item.states;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    groupPath: item.groupPath,
    actionKind: item.actionKind,
    intent,
    behavior: {
      keyboardShortcuts: item.shortcuts,
      resetOnPress: item.resetOnPress
    }
  };
}

function buildGeneratorPayloadFromApproval(payload) {
  const approvalActions = Array.isArray(payload.approvalActions) ? payload.approvalActions : [];
  const validated = approvalActions.map((item, index) => validateApprovalAction(item, index));
  const invalid = validated.filter((item) => !item.valid);
  const nonApproved = validated.filter((item) => item.normalized.approval !== 'approved');

  if (invalid.length > 0 || nonApproved.length > 0) {
    return {
      ok: false,
      errors: {
        invalid,
        nonApproved: nonApproved.map((item) => ({
          id: item.id,
          message: 'Action is not approved.'
        }))
      }
    };
  }

  const approved = validated.map((item) => item.normalized);
  const pluginIconAssetPath = String(payload.pluginIconAssetPath || '').trim();

  if (pluginIconAssetPath) {
    const absolutePath = path.resolve(__dirname, pluginIconAssetPath);
    const allowedRoot = path.resolve(PLUGIN_ICON_CACHE_ROOT) + path.sep;
    if (!absolutePath.startsWith(allowedRoot) || !fs.existsSync(absolutePath)) {
      return {
        ok: false,
        errors: {
          invalid: [{
            id: 'pluginIconAssetPath',
            errors: [{ field: 'pluginIconAssetPath', message: 'Plugin icon asset path is invalid or missing.' }]
          }],
          nonApproved: []
        }
      };
    }
  }

  return {
    ok: true,
    generatorPayload: {
      projectName: toPascalCase(payload.projectName || 'GeneratedPlugin', 'GeneratedPlugin'),
      displayName: payload.displayName || 'Generated Plugin',
      author: payload.author || 'LogiAutoActions User',
      version: payload.version || '1.0.0',
      minimumLoupedeckVersion: payload.minimumLoupedeckVersion || '6.0',
      supportedDevices: Array.isArray(payload.supportedDevices) && payload.supportedDevices.length > 0
        ? payload.supportedDevices
        : ['LoupedeckCtFamily'],
      actions: approved.map((item) => approvalActionToGeneratorAction(item))
    },
    approvedActions: approved,
    pluginIconAssetPath
  };
}

function renderActionForApproval(payload) {
  const pluginName = toPascalCase(payload.pluginName || 'GeneratedPlugin', 'GeneratedPlugin');
  const validated = validateApprovalAction(payload.action || {}, 0);
  if (!validated.valid) {
    return {
      ok: false,
      errors: validated.errors
    };
  }

  const action = approvalActionToGeneratorAction(validated.normalized);
  const classInfo = createActionClass(pluginName, action);
  const kindInfo = getActionKindInfo(action.actionKind);

  return {
    ok: true,
    rendered: {
      className: classInfo.className,
      fileName: classInfo.fileName,
      baseClass: kindInfo.baseClass,
      methods: kindInfo.methods,
      code: classInfo.content
    }
  };
}

function writePluginArtifacts(payload) {
  const pluginName = toPascalCase(payload.projectName, 'GeneratedPlugin');
  const packageName = pluginName.replace(/plugin$/i, '') || 'GeneratedAction';
  const pluginBinaryName = `${packageName}Plugin.dll`;
  const assemblyName = pluginBinaryName.replace(/\.dll$/i, '');

  const artifactRoot = path.join(ARTIFACTS_ROOT, pluginName);
  const srcRoot = path.join(artifactRoot, 'src');
  const actionsRoot = path.join(srcRoot, 'Actions');
  const metadataRoot = path.join(srcRoot, 'package', 'metadata');
  const compiledRoot = path.join(artifactRoot, 'compiled');
  const diagnostics = getSystemDiagnostics();

  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.mkdirSync(compiledRoot, { recursive: true });

  const generatedFiles = new Set();
  const warnings = [];
  const addGeneratedFile = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    generatedFiles.add(path.relative(artifactRoot, filePath).split(path.sep).join('/'));
  };

  let scaffoldedWithTool = false;
  if (diagnostics.logiPluginTool.available) {
    const scaffoldResult = spawnSync('LogiPluginTool', ['generate', pluginName], {
      cwd: ARTIFACTS_ROOT,
      encoding: 'utf8',
      timeout: 120000
    });

    if (scaffoldResult.status === 0 && fs.existsSync(srcRoot)) {
      scaffoldedWithTool = true;
      addGeneratedFile(path.join(artifactRoot, `${pluginName}.sln`));
      addGeneratedFile(path.join(srcRoot, `${pluginName}.cs`));
      addGeneratedFile(path.join(srcRoot, `${packageName}Application.cs`));
      addGeneratedFile(path.join(srcRoot, `${pluginName}.csproj`));
      addGeneratedFile(path.join(metadataRoot, 'LoupedeckPackage.yaml'));
      addGeneratedFile(path.join(metadataRoot, 'Icon256x256.png'));
    } else {
      const scaffoldOutput = `${scaffoldResult.stdout || ''}${scaffoldResult.stderr || ''}`.trim();
      warnings.push('LogiPluginTool scaffold generation failed. Using internal scaffold.');
      if (scaffoldOutput) {
        warnings.push(scaffoldOutput.split('\n').slice(0, 2).join(' | '));
      }
    }
  }

  if (!scaffoldedWithTool) {
    fs.mkdirSync(actionsRoot, { recursive: true });
    fs.mkdirSync(metadataRoot, { recursive: true });

    const pluginClassPath = path.join(srcRoot, `${pluginName}.cs`);
    fs.writeFileSync(
      pluginClassPath,
      `using System;\n\nnamespace Loupedeck.${pluginName};\n\npublic class ${pluginName} : Plugin\n{\n    public override Boolean UsesApplicationApiOnly => true;\n    public override Boolean HasNoApplication => true;\n\n    public override void Load()\n    {\n    }\n\n    public override void Unload()\n    {\n    }\n\n    public override Boolean Install() => true;\n    public override Boolean Uninstall() => true;\n}\n`,
      'utf8'
    );
    addGeneratedFile(pluginClassPath);

    const applicationClassPath = path.join(srcRoot, `${packageName}Application.cs`);
    fs.writeFileSync(
      applicationClassPath,
      `using System;\n\nnamespace Loupedeck.${pluginName};\n\npublic class ${packageName}Application : ClientApplication\n{\n    protected override String GetProcessName() => \"\";\n\n    protected override String GetBundleName() => \"\";\n\n    public override ClientApplicationStatus GetApplicationStatus() => ClientApplicationStatus.Unknown;\n}\n`,
      'utf8'
    );
    addGeneratedFile(applicationClassPath);

    const csprojPath = path.join(srcRoot, `${pluginName}.csproj`);
    const pluginApiReference = diagnostics.pluginApi.available
      ? `\n  <ItemGroup>\n    <Reference Include=\"PluginApi\">\n      <HintPath>${escapeXml(diagnostics.pluginApi.path)}</HintPath>\n    </Reference>\n  </ItemGroup>`
      : '';
    fs.writeFileSync(
      csprojPath,
      `<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>disable</Nullable>\n    <RootNamespace>Loupedeck.${pluginName}</RootNamespace>\n    <AssemblyName>${assemblyName}</AssemblyName>\n  </PropertyGroup>${pluginApiReference}\n</Project>\n`,
      'utf8'
    );
    addGeneratedFile(csprojPath);

    const solutionPath = path.join(artifactRoot, `${pluginName}.sln`);
    fs.writeFileSync(
      solutionPath,
      `Microsoft Visual Studio Solution File, Format Version 12.00\n# Mock solution generated by LogiAutoActions\n`,
      'utf8'
    );
    addGeneratedFile(solutionPath);
  }

  fs.mkdirSync(actionsRoot, { recursive: true });
  fs.mkdirSync(metadataRoot, { recursive: true });

  fs.rmSync(actionsRoot, { recursive: true, force: true });
  fs.mkdirSync(actionsRoot, { recursive: true });

  const csprojPath = path.join(srcRoot, `${pluginName}.csproj`);

  for (const action of payload.actions || []) {
    const classFile = createActionClass(pluginName, action);
    const classPath = path.join(actionsRoot, classFile.fileName);
    fs.writeFileSync(classPath, classFile.content, 'utf8');
    addGeneratedFile(classPath);
  }

  const packageYamlPath = path.join(metadataRoot, 'LoupedeckPackage.yaml');
  fs.writeFileSync(
    packageYamlPath,
    `name: ${packageName}\npluginName: ${packageName}\ndisplayName: \"${payload.displayName || pluginName}\"\nversion: ${payload.version || '1.0.0'}\nauthor: \"${payload.author || 'LogiAutoActions'}\"\nlicense: ${payload.license || 'MIT'}\npluginFileName: ${pluginBinaryName}\nsupportedDevices:\n  - ${Array.isArray(payload.supportedDevices) && payload.supportedDevices.length ? payload.supportedDevices[0] : 'LoupedeckCtFamily'}\nminimumLoupedeckVersion: ${payload.minimumLoupedeckVersion || '6.0'}\npluginFolderWin: win/bin\npluginFolderMac: mac/bin\n`,
    'utf8'
  );
  addGeneratedFile(packageYamlPath);

  const iconPath = path.join(metadataRoot, 'Icon256x256.png');
  const pluginIconAssetPath = String(payload.pluginIconAssetPath || '').trim();
  if (pluginIconAssetPath) {
    const absoluteIconAssetPath = path.resolve(__dirname, pluginIconAssetPath);
    const allowedRoot = path.resolve(PLUGIN_ICON_CACHE_ROOT) + path.sep;
    if (absoluteIconAssetPath.startsWith(allowedRoot) && fs.existsSync(absoluteIconAssetPath)) {
      fs.copyFileSync(absoluteIconAssetPath, iconPath);
    } else {
      warnings.push('Plugin icon asset path was invalid. Falling back to placeholder icon.');
      const onePxPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0B3W0AAAAASUVORK5CYII=';
      fs.writeFileSync(iconPath, Buffer.from(onePxPngBase64, 'base64'));
    }
  } else {
    const onePxPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0B3W0AAAAASUVORK5CYII=';
    fs.writeFileSync(iconPath, Buffer.from(onePxPngBase64, 'base64'));
  }
  addGeneratedFile(iconPath);

  let realBuildUsed = false;
  const compiledDllPath = path.join(compiledRoot, pluginBinaryName);

  if (diagnostics.canAttemptRealBuild) {
    const buildResult = spawnSync('dotnet', ['build', csprojPath, '-c', 'Release', '-o', compiledRoot], {
      encoding: 'utf8',
      timeout: 180000
    });

    if (buildResult.status === 0 && fs.existsSync(compiledDllPath)) {
      realBuildUsed = true;
      addGeneratedFile(compiledDllPath);
    } else {
      warnings.push('Real build attempt failed. Falling back to placeholder binaries.');
      const buildOutput = `${buildResult.stdout || ''}${buildResult.stderr || ''}`.trim();
      if (buildOutput) {
        warnings.push(buildOutput.split('\n').slice(0, 2).join(' | '));
      }
    }
  } else {
    warnings.push('Real build prerequisites not met. Using placeholder binaries.');
  }

  const packagePath = path.join(artifactRoot, `${pluginName}.lplug4`);
  const zip = new AdmZip();
  zip.addFile('metadata/LoupedeckPackage.yaml', Buffer.from(fs.readFileSync(packageYamlPath)));
  zip.addFile('metadata/Icon256x256.png', Buffer.from(fs.readFileSync(iconPath)));

  if (realBuildUsed) {
    const dllBuffer = Buffer.from(fs.readFileSync(compiledDllPath));
    zip.addFile(`win/bin/${pluginBinaryName}`, dllBuffer);
    zip.addFile(`mac/bin/${pluginBinaryName}`, dllBuffer);
  } else {
    zip.addFile(`win/bin/${pluginBinaryName}`, Buffer.from('Mock Windows plugin binary placeholder', 'utf8'));
    zip.addFile(`mac/bin/${pluginBinaryName}`, Buffer.from('Mock macOS plugin binary placeholder', 'utf8'));
  }
  zip.writeZip(packagePath);

  return {
    pluginName,
    artifactRoot,
    packagePath,
    generatedFiles: Array.from(generatedFiles),
    warnings,
    realBuildUsed,
    diagnostics
  };
}

function buildMockBuildResult(payload, options = {}) {
  const artifacts = writePluginArtifacts(payload);
  const strictRealBuild = Boolean(options.strictRealBuild);

  if (strictRealBuild && !artifacts.realBuildUsed) {
    return {
      ok: false,
      pluginName: artifacts.pluginName,
      outputPath: path.relative(__dirname, artifacts.artifactRoot).split(path.sep).join('/'),
      generatedFiles: artifacts.generatedFiles,
      selectedIcons: [],
      warnings: artifacts.warnings,
      error: {
        code: 'REAL_BUILD_REQUIRED',
        stage: 'build',
        message: 'Real build mode is required but prerequisites were not met or compilation failed.',
        details: artifacts.warnings
      },
      build: {
        attempted: true,
        succeeded: false,
        mode: artifacts.realBuildUsed ? 'real' : 'fallback',
        diagnostics: artifacts.diagnostics
      },
      package: {
        filePath: null,
        verifyAttempted: false,
        verifyPassed: false,
        verifyMessage: 'Skipped because strict real build mode requires a real compile.',
        verifyOutput: null
      },
      actionSummary: (payload.actions || []).map((action) => ({
        id: action.id,
        name: action.name,
        actionKind: action.actionKind,
        keyboardShortcuts: action.behavior && Array.isArray(action.behavior.keyboardShortcuts)
          ? action.behavior.keyboardShortcuts
          : []
      }))
    };
  }

  const verification = verifyLplug4Package(artifacts.packagePath, artifacts.diagnostics);
  const verificationPassed = verification.passed;
  const verificationError = !verificationPassed
    ? {
      code: 'VERIFY_FAILED',
      stage: 'packaging',
      message: verification.message,
      details: verification.output ? [verification.output] : []
    }
    : null;

  if (verificationError) {
    artifacts.warnings.push(verification.message);
    if (verification.output) {
      artifacts.warnings.push(verification.output.split('\n').slice(0, 2).join(' | '));
    }
  }

  return {
    ok: verificationPassed,
    pluginName: artifacts.pluginName,
    outputPath: path.relative(__dirname, artifacts.artifactRoot).split(path.sep).join('/'),
    generatedFiles: artifacts.generatedFiles,
    selectedIcons: [],
    warnings: artifacts.warnings,
    error: verificationError,
    build: {
      attempted: true,
      succeeded: verificationPassed,
      mode: artifacts.realBuildUsed ? 'real' : 'fallback',
      diagnostics: artifacts.diagnostics
    },
    package: {
      filePath: verificationPassed
        ? path.relative(__dirname, artifacts.packagePath).split(path.sep).join('/')
        : null,
      verifyAttempted: verification.attempted,
      verifyPassed: verificationPassed,
      verifyMessage: verification.message,
      verifyOutput: verification.output
    },
    actionSummary: (payload.actions || []).map((action) => ({
      id: action.id,
      name: action.name,
      actionKind: action.actionKind,
      keyboardShortcuts: action.behavior && Array.isArray(action.behavior.keyboardShortcuts)
        ? action.behavior.keyboardShortcuts
        : []
    }))
  };
}

function runMockBuildJob(jobId, payload, options = {}) {
  const job = mockBuildJobs.get(jobId);
  if (!job) {
    return;
  }

  const now = () => new Date().toISOString();
  job.status = 'queued';
  job.updatedAt = now();

  setTimeout(() => {
    const active = mockBuildJobs.get(jobId);
    if (!active) {
      return;
    }
    active.status = 'building';
    active.updatedAt = now();
  }, 500);

  setTimeout(() => {
    const active = mockBuildJobs.get(jobId);
    if (!active) {
      return;
    }
    active.status = 'packaging';
    active.updatedAt = now();
  }, 1200);

  setTimeout(() => {
    const active = mockBuildJobs.get(jobId);
    if (!active) {
      return;
    }
    try {
      const result = buildMockBuildResult(payload, options);
      active.status = result.ok ? 'completed' : 'failed';
      active.updatedAt = now();
      active.result = result;
    } catch (error) {
      active.status = 'failed';
      active.updatedAt = now();
      active.result = {
        ok: false,
        code: 'MOCK_BUILD_FAILED',
        message: error.message
      };
    }
  }, 2000);
}

let iconCandidates = [];
const apiRateLimitBuckets = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function cleanupRateLimitBuckets(nowMs, windowMs) {
  if (apiRateLimitBuckets.size <= 1000) {
    return;
  }

  for (const [ip, bucket] of apiRateLimitBuckets.entries()) {
    if (nowMs - bucket.windowStart >= windowMs * 2) {
      apiRateLimitBuckets.delete(ip);
    }
  }
}

function apiRateLimit(req, res, next) {
  if (
    !Number.isFinite(RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS <= 0
    || !Number.isFinite(RATE_LIMIT_MAX_REQUESTS) || RATE_LIMIT_MAX_REQUESTS <= 0
    || req.path === '/health'
  ) {
    next();
    return;
  }

  const nowMs = Date.now();
  const ip = getClientIp(req);
  let bucket = apiRateLimitBuckets.get(ip);

  if (!bucket || (nowMs - bucket.windowStart) >= RATE_LIMIT_WINDOW_MS) {
    bucket = {
      windowStart: nowMs,
      count: 0
    };
    apiRateLimitBuckets.set(ip, bucket);
  }

  bucket.count += 1;

  const resetInMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (nowMs - bucket.windowStart));
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetInMs / 1000)));

  cleanupRateLimitBuckets(nowMs, RATE_LIMIT_WINDOW_MS);

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(resetInMs / 1000))));
    res.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please retry shortly.'
    });
    return;
  }

  next();
}

function refreshIconCandidates() {
  try {
    iconCandidates = scanIconCandidates(ICONS_ROOT);
    return true;
  } catch (error) {
    console.warn('Unable to scan icons directory:', error.message);
    return false;
  }
}

refreshIconCandidates();

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRateLimit);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'logi-auto-actions' });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'logi-auto-actions' });
});

app.get('/api/icons/catalog', (_req, res) => {
  res.json({
    total: iconCandidates.length,
    packs: {
      regular: iconCandidates.filter((item) => item.pack === 'regular').length,
      solid: iconCandidates.filter((item) => item.pack === 'solid').length,
      brands: iconCandidates.filter((item) => item.pack === 'brands').length
    }
  });
});

app.get('/api/icons/file', (req, res) => {
  refreshIconCandidates();

  const relativePath = String(req.query.path || '').trim();
  if (!relativePath) {
    res.status(400).json({ ok: false, error: 'Icon path is required.' });
    return;
  }

  const normalizedPath = path.normalize(relativePath).replace(/^([/\\])+/, '');
  if (!normalizedPath || normalizedPath.includes('..')) {
    res.status(400).json({ ok: false, error: 'Invalid icon path.' });
    return;
  }

  const absolutePath = path.resolve(ICONS_ROOT, normalizedPath);
  const normalizedRoot = path.resolve(ICONS_ROOT) + path.sep;
  if (!absolutePath.startsWith(normalizedRoot)) {
    res.status(400).json({ ok: false, error: 'Invalid icon path.' });
    return;
  }

  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ ok: false, error: 'Icon not found.' });
    return;
  }

  res.sendFile(absolutePath);
});

app.get('/api/icons/resolve', (req, res) => {
  refreshIconCandidates();

  const query = String(req.query.query || '');
  const preferredPack = String(req.query.pack || '');

  if (!query.trim()) {
    res.status(400).json({
      ok: false,
      error: 'Query is required.'
    });
    return;
  }

  const match = resolveIconCandidate(query, preferredPack);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: `No icon found for "${query}".`
    });
    return;
  }

  res.json({
    ok: true,
    match
  });
});

app.post('/api/plugin-icon/prepare-upload', async (req, res) => {
  const payload = req.body || {};
  const imageDataUrl = String(payload.imageDataUrl || '').trim();
  const fileName = String(payload.fileName || 'uploaded-icon').trim();

  if (!imageDataUrl) {
    res.status(400).json({
      ok: false,
      error: 'imageDataUrl is required.'
    });
    return;
  }

  const decoded = decodeImageDataUrl(imageDataUrl);
  if (!decoded || !decoded.buffer || decoded.buffer.length === 0) {
    res.status(400).json({
      ok: false,
      error: 'imageDataUrl must be a valid base64 data URL.'
    });
    return;
  }

  try {
    const outputBuffer = await sharp(decoded.buffer)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    fs.mkdirSync(PLUGIN_ICON_CACHE_ROOT, { recursive: true });
    const hash = crypto
      .createHash('sha256')
      .update(Buffer.concat([Buffer.from(fileName), outputBuffer]))
      .digest('hex')
      .slice(0, 16);

    const outputPath = path.join(PLUGIN_ICON_CACHE_ROOT, `icon-upload-${hash}.png`);
    fs.writeFileSync(outputPath, outputBuffer);

    res.json({
      ok: true,
      pluginIcon: {
        sourceUrl: fileName || 'uploaded-file',
        assetPath: path.relative(__dirname, outputPath).split(path.sep).join('/'),
        width: 256,
        height: 256
      }
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: `Could not process uploaded icon: ${error.message}`
    });
  }
});

app.post('/api/icons/llm/export-prompt', (req, res) => {
  refreshIconCandidates();

  const payload = req.body || {};
  const approvalActions = Array.isArray(payload.approvalActions) ? payload.approvalActions : [];
  if (!approvalActions.length) {
    res.status(400).json({
      ok: false,
      error: 'approvalActions is required and must contain at least one action.'
    });
    return;
  }

  const normalizedActions = approvalActions.map((item, index) => {
    const validated = validateApprovalAction(item, index);
    return {
      ...validated.normalized,
      id: validated.id
    };
  });

  const exported = buildLlmPromptExport(normalizedActions);
  res.json({
    ok: true,
    ...exported
  });
});

app.post('/api/icons/llm/validate-import', async (req, res) => {
  refreshIconCandidates();

  const payload = req.body || {};
  const approvalActions = Array.isArray(payload.approvalActions) ? payload.approvalActions : [];
  if (!approvalActions.length) {
    res.status(400).json({
      ok: false,
      errors: [{ message: 'approvalActions is required and cannot be empty.' }],
      warnings: [],
      resolvedAssignments: []
    });
    return;
  }

  const normalizedActions = approvalActions.map((item, index) => {
    const validated = validateApprovalAction(item, index);
    return {
      ...validated.normalized,
      id: validated.id
    };
  });

  const result = await validateLlmIconAssignments(normalizedActions, payload.llmResponse);
  if (!result.ok) {
    res.status(400).json({
      ok: false,
      errors: result.errors,
      warnings: result.warnings,
      resolvedAssignments: result.resolvedAssignments,
      pluginIcon: result.pluginIcon
    });
    return;
  }

  res.json({
    ok: true,
    warnings: result.warnings,
    resolvedAssignments: result.resolvedAssignments,
    pluginIcon: result.pluginIcon
  });
});

app.post('/api/shortcuts/extract', async (req, res) => {
  const payload = req.body || {};
  const sourceType = payload.sourceType || 'text';

  let sourceText = String(payload.text || '');
  let sourceMetadata = { suggestedPluginName: null, suggestedDescription: null };
  if (sourceType === 'url') {
    const url = String(payload.url || '');
    if (!url) {
      res.status(400).json({ error: 'URL source requested but no url was provided.' });
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        res.status(400).json({ error: `Unable to fetch URL (${response.status}).` });
        return;
      }

      sourceText = await response.text();
      sourceMetadata = extractPageMetadata(sourceText);
    } catch (error) {
      res.status(400).json({ error: `Failed to fetch URL: ${error.message}` });
      return;
    }
  }

  if (!sourceText.trim()) {
    res.status(400).json({ error: 'No source text found for extraction.' });
    return;
  }

  const entries = parseShortcutEntries(sourceText);
  res.json({
    total: entries.length,
    entries,
    suggestedPluginName: sourceMetadata.suggestedPluginName,
    suggestedDescription: sourceMetadata.suggestedDescription
  });
});

app.get('/api/generator/sample-request', (_req, res) => {
  res.json({
    projectName: 'DemoShortcutPlugin',
    displayName: 'Demo Shortcut Plugin',
    author: 'Your Team',
    version: '1.0.0',
    description: 'Generated plugin from keyboard shortcut intent.',
    category: 'Productivity',
    homepageUrl: 'https://example.com',
    license: 'MIT',
    supportedDevices: ['LoupedeckCtFamily'],
    minimumLoupedeckVersion: '6.0',
    appLinking: {
      enabled: false,
      processNames: []
    },
    actions: [
      {
        id: 'toggle_mute',
        name: 'Toggle Mute',
        description: 'Toggles system audio mute state.',
        groupPath: 'Audio',
        actionKind: 'toggle',
        intent: {
          sourceShortcuts: ['Ctrl+M'],
          states: ['Muted', 'Unmuted'],
          parameterHints: []
        },
        behavior: {
          keyboardShortcuts: ['Ctrl+M'],
          resetOnPress: false
        },
        icon: {
          selected: {
            path: 'FontAwesomeFreeRegularIcons/volume-off.svg',
            pack: 'regular',
            score: 40
          }
        }
      }
    ]
  });
});

app.get('/api/generator/test-request/chrome-shortcuts', (_req, res) => {
  res.json(createChromeShortcutsTestRequest());
});

app.get('/api/system/diagnostics', (_req, res) => {
  const diagnostics = getSystemDiagnostics();
  res.json({
    ok: true,
    diagnostics
  });
});

app.post('/api/generator/validate-request', (req, res) => {
  const payload = req.body || {};
  const result = validateGeneratorRequest(payload);

  if (!result.valid) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_INPUT',
      stage: 'intake',
      errors: result.errors
    });
    return;
  }

  res.json({
    ok: true,
    message: 'Generator request is valid against the contract.'
  });
});

app.post('/api/generator/preview-actions', (req, res) => {
  const payload = req.body || {};
  const preview = buildApprovalPreview(payload);
  res.json({
    ok: true,
    preview
  });
});

app.post('/api/generator/render-action', (req, res) => {
  const payload = req.body || {};
  const rendered = renderActionForApproval(payload);

  if (!rendered.ok) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_ACTION_FOR_RENDER',
      errors: rendered.errors
    });
    return;
  }

  res.json({
    ok: true,
    rendered: rendered.rendered
  });
});

app.post('/api/generator/build-from-approval', (req, res) => {
  const payload = req.body || {};
  const built = buildGeneratorPayloadFromApproval(payload);

  if (!built.ok) {
    res.status(400).json({
      ok: false,
      code: 'APPROVAL_REQUIRED',
      stage: 'approval',
      errors: built.errors
    });
    return;
  }

  const result = validateGeneratorRequest(built.generatorPayload);
  if (!result.valid) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_INPUT',
      stage: 'intake',
      errors: result.errors
    });
    return;
  }

  const strictRealBuild = Boolean(payload.requireRealBuildOnly);
  const jobId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  mockBuildJobs.set(jobId, {
    jobId,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    result: null
  });

  const buildPayload = {
    ...built.generatorPayload,
    pluginIconAssetPath: built.pluginIconAssetPath || ''
  };

  runMockBuildJob(jobId, buildPayload, { strictRealBuild });

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued'
  });
});

app.post('/api/generator/mock-build', (req, res) => {
  const payload = req.body || {};
  const result = validateGeneratorRequest(payload);

  if (!result.valid) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_INPUT',
      stage: 'intake',
      errors: result.errors
    });
    return;
  }

  const jobId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  mockBuildJobs.set(jobId, {
    jobId,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    result: null
  });

  runMockBuildJob(jobId, payload);

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued'
  });
});

app.get('/api/generator/mock-build/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = mockBuildJobs.get(jobId);

  if (!job) {
    res.status(404).json({
      ok: false,
      code: 'JOB_NOT_FOUND',
      message: 'No mock build job found for the provided id.'
    });
    return;
  }

  res.json({
    ok: true,
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    result: job.result
  });
});

app.get('/api/generator/mock-build/:jobId/download', (req, res) => {
  const { jobId } = req.params;
  const job = mockBuildJobs.get(jobId);

  if (!job) {
    res.status(404).json({
      ok: false,
      code: 'JOB_NOT_FOUND',
      message: 'No mock build job found for the provided id.'
    });
    return;
  }

  if (job.status !== 'completed' || !job.result || !job.result.ok) {
    res.status(409).json({
      ok: false,
      code: 'JOB_NOT_READY',
      message: 'Plugin package is not ready to download yet.'
    });
    return;
  }

  const relativePackagePath = job.result.package && job.result.package.filePath
    ? String(job.result.package.filePath)
    : '';

  if (!relativePackagePath) {
    res.status(404).json({
      ok: false,
      code: 'PACKAGE_NOT_FOUND',
      message: 'No package file was produced for this build.'
    });
    return;
  }

  const absolutePackagePath = path.resolve(__dirname, relativePackagePath);
  const rootPath = path.resolve(__dirname) + path.sep;
  if (!absolutePackagePath.startsWith(rootPath) || !fs.existsSync(absolutePackagePath)) {
    res.status(404).json({
      ok: false,
      code: 'PACKAGE_NOT_FOUND',
      message: 'Package file is missing from disk.'
    });
    return;
  }

  res.download(absolutePackagePath, path.basename(absolutePackagePath));
});

function startServer({ port = PORT, host = '0.0.0.0' } = {}) {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      resolve(httpServer);
      return;
    }

    const server = app.listen(port, host, () => {
      httpServer = server;
      resolve(server);
    });

    server.on('error', (error) => {
      reject(error);
    });
  });
}

function stopServer() {
  return new Promise((resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }

    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      httpServer = undefined;
      resolve();
    });
  });
}

if (require.main === module) {
  startServer({ port: PORT })
    .then(() => {
      console.log(`LogiAutoActions is running at http://localhost:${PORT}`);
    })
    .catch((error) => {
      console.error(`Failed to start LogiAutoActions: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  app,
  startServer,
  stopServer
};
