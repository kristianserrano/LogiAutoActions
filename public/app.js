const readinessResultEl = document.getElementById('readinessResult');
const approvalSummaryEl = document.getElementById('approvalSummary');
const approvalResultsEl = document.getElementById('approvalResults');
const buildResultEl = document.getElementById('buildResult');
const diagnosticsResultEl = document.getElementById('diagnosticsResult');
const llmAssistResultEl = document.getElementById('llmAssistResult');
const parsedActionsBodyEl = document.getElementById('parsedActionsBody');
const shortcutResultsEl = document.getElementById('shortcutResults');

const step1PanelEl = document.getElementById('step1Panel');
const step2PanelEl = document.getElementById('step2Panel');
const step3PanelEl = document.getElementById('step3Panel');
const stepMarker1El = document.getElementById('stepMarker1');
const stepMarker2El = document.getElementById('stepMarker2');

const actionNameEl = document.getElementById('actionName');
const actionDescriptionEl = document.getElementById('actionDescription');
const appIconFileEl = document.getElementById('appIconFile');
const appIconStatusEl = document.getElementById('appIconStatus');

const shortcutUrlEl = document.getElementById('shortcutUrl');
const shortcutTextEl = document.getElementById('shortcutText');
const shortcutFileEl = document.getElementById('shortcutFile');
const importShortcutsBtn = document.getElementById('importShortcuts');

const goToStep3Btn = document.getElementById('goToStep3');
const runMockBuildBtn = document.getElementById('runMockBuild');
const downloadPluginBtn = document.getElementById('downloadPlugin');
const runDiagnosticsBtn = document.getElementById('runDiagnostics');
const copyLlmPromptBtn = document.getElementById('copyLlmPrompt');
const applyLlmResponseBtn = document.getElementById('applyLlmResponse');
const llmResponseEl = document.getElementById('llmResponse');

let extractedShortcuts = [];
let parsedActions = [];
let approvalActions = [];
let approvalPluginName = 'GeneratedPlugin';
let pluginIconAssetPath = '';
let recordingActionId = null;
let currentUiStep = 1;
let isLoadingApprovalCards = false;
let readinessRequestVersion = 0;

function setAppIconStatus(kind, message) {
  if (!appIconStatusEl) {
    return;
  }

  appIconStatusEl.className = `readiness readiness-${kind}`;
  appIconStatusEl.textContent = message;
}

function updateStep1ContinueState() {
  const hasParsedActions = parsedActions.length > 0;
  const hasPluginName = Boolean(actionNameEl && actionNameEl.value.trim());
  const hasDescription = Boolean(actionDescriptionEl && actionDescriptionEl.value.trim());
  const hasAppIcon = Boolean(pluginIconAssetPath);

  if (goToStep3Btn) {
    goToStep3Btn.disabled = !(hasParsedActions && hasPluginName && hasDescription && hasAppIcon);
  }
}

async function prepareUploadedAppIcon(file) {
  if (!file) {
    pluginIconAssetPath = '';
    setAppIconStatus('warn', 'Upload an app icon to continue.');
    updateStep1ContinueState();
    return;
  }

  const fileType = String(file.type || '').toLowerCase();
  if (!fileType.startsWith('image/')) {
    pluginIconAssetPath = '';
    setAppIconStatus('warn', 'Please upload an image file.');
    updateStep1ContinueState();
    return;
  }

  setAppIconStatus('info', 'Preparing app icon...');

  try {
    const imageDataUrl = await file.text().catch(async () => {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });
    });

    const payloadDataUrl = String(imageDataUrl || '').startsWith('data:')
      ? String(imageDataUrl)
      : await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });

    const response = await fetch('/api/plugin-icon/prepare-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name || 'uploaded-icon',
        imageDataUrl: payloadDataUrl
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok || !data.pluginIcon || !data.pluginIcon.assetPath) {
      throw new Error(data.error || 'Could not prepare app icon.');
    }

    pluginIconAssetPath = String(data.pluginIcon.assetPath || '').trim();
    setAppIconStatus('ok', 'App icon ready (converted to 256x256 PNG).');
    updateStep1ContinueState();
  } catch (error) {
    pluginIconAssetPath = '';
    setAppIconStatus('warn', `Could not process icon: ${error.message}`);
    updateStep1ContinueState();
  }
}

function updateStepTrack(stepNumber) {
  const markers = [stepMarker1El, stepMarker2El].filter(Boolean);
  markers.forEach((marker, index) => {
    const value = index + 1;
    marker.classList.toggle('is-active', value === stepNumber);
    marker.classList.toggle('is-done', value < stepNumber);
  });
}

function showStep(stepNumber, options = {}) {
  const { updateHistory = true, replaceHistory = false, scroll = true, focus = true } = options;
  const previousStep = currentUiStep;
  const showSetupStage = stepNumber < 3;
  step1PanelEl.classList.toggle('is-hidden', !showSetupStage);
  step2PanelEl.classList.toggle('is-hidden', !showSetupStage);
  step3PanelEl.classList.toggle('is-hidden', stepNumber < 3);

  currentUiStep = stepNumber;

  const effectiveStep = stepNumber < 3 ? 1 : 2;
  updateStepTrack(effectiveStep);

  const panelByStep = {
    1: step2PanelEl,
    2: step2PanelEl,
    3: step3PanelEl
  };

  const focusByStep = {
    1: shortcutUrlEl,
    2: shortcutUrlEl,
    3: runMockBuildBtn
  };

  const panel = panelByStep[stepNumber];
  if (panel && scroll) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const target = focusByStep[stepNumber];
  if (target && focus) {
    window.setTimeout(() => target.focus({ preventScroll: true }), 120);
  }

  if (updateHistory) {
    const nextState = { uiStep: stepNumber };
    const nextUrl = `${window.location.pathname}${window.location.search}`;
    if (replaceHistory) {
      window.history.replaceState(nextState, '', nextUrl);
    } else if (previousStep !== stepNumber) {
      window.history.pushState(nextState, '', nextUrl);
    }
  }
}

function canProceedToReviewBuild() {
  const actionName = actionNameEl.value.trim();
  const description = actionDescriptionEl.value.trim();

  if (!actionName || !description) {
    setReadiness('warn', 'Please add both a plugin name and a description.');
    return false;
  }

  if (!parsedActions.length) {
    setReadiness('warn', 'Please import shortcuts before continuing.');
    return false;
  }

  if (!pluginIconAssetPath) {
    setReadiness('warn', 'Please upload an app icon in Step 1 before continuing.');
    return false;
  }

  return true;
}

async function goToReviewBuildStep() {
  if (!canProceedToReviewBuild()) {
    return;
  }

  showStep(3);
  setReadiness('info', 'Loading your actions for review...');
  await loadApprovalCards({ force: true });
}

function toPascalCase(value) {
  const words = String(value || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const merged = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return merged || 'GeneratedPlugin';
}

function toTitleCase(value) {
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
    'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via',
    'as', 'from', 'into', 'over', 'with', 'without', 'within', 'through'
  ]);

  const words = String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((token, index) => {
      if (index !== 0 && minorWords.has(token)) {
        return token;
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

function inferActionNameFromContext(context, fallback) {
  const raw = String(context || '').trim();
  if (!raw) {
    return fallback;
  }

  const stripped = raw
    .replace(/\s*[-–:|].*$/, '')
    .replace(/\b(?:ctrl|control|cmd|command|option|alt|shift|win|meta|fn)\b.*$/i, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return toTitleCase(stripped || fallback);
}

function dedupeParsedActionsByName(actions) {
  const seen = new Set();
  const deduped = [];

  for (const item of Array.isArray(actions) ? actions : []) {
    const actionName = String(item && item.actionName ? item.actionName : '').trim();
    const key = actionName.toLowerCase();

    if (!actionName || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function ensureUniqueApprovalActionIds(actions) {
  const seen = new Set();
  return (Array.isArray(actions) ? actions : []).map((action, index) => {
    const rawId = String((action && action.id) || '').trim() || `generated_action_${index + 1}`;
    let nextId = rawId;
    let suffix = 2;

    while (seen.has(nextId)) {
      nextId = `${rawId}_${suffix}`;
      suffix += 1;
    }

    seen.add(nextId);
    return {
      ...action,
      id: nextId
    };
  });
}

function buildPreviewPayload() {
  return {
    actionName: actionNameEl.value.trim(),
    actionDescription: actionDescriptionEl.value.trim(),
    actionType: 'single',
    states: [],
    shortcuts: parsedActions.map((item) => ({
      shortcut: item.shortcut,
      context: item.actionName
    })),
    projectName: `${toPascalCase(actionNameEl.value.trim() || 'Generated')}Plugin`,
    displayName: `${actionNameEl.value.trim() || 'Generated'} Plugin`,
    author: 'LogiAutoActions User',
    version: '1.0.0',
    minimumLoupedeckVersion: '6.0',
    supportedDevices: ['LoupedeckCtFamily']
  };
}

function validateApprovalAction(action) {
  const errors = [];
  const name = String(action.name || '').trim();
  const shortcuts = Array.isArray(action.shortcuts) ? action.shortcuts.filter(Boolean) : [];
  const states = Array.isArray(action.states) ? action.states.filter(Boolean) : [];

  if (!name) errors.push('Action name is required.');

  if (action.actionKind === 'toggle') {
    if (shortcuts.length !== 2) errors.push('Toggle actions require exactly 2 shortcuts.');
    if (states.length !== 2) errors.push('Toggle actions require exactly 2 states.');
  }

  if (action.actionKind === 'multistate') {
    if (shortcuts.length < 3) errors.push('Multistate actions require at least 3 shortcuts.');
    if (states.length < 3) errors.push('Multistate actions require at least 3 states.');
  }

  if ((action.actionKind === 'command' || action.actionKind === 'adjustment') && shortcuts.length < 1) {
    errors.push('At least one shortcut is required.');
  }

  return errors;
}

function buildSimpleDiff(originalCode, updatedCode) {
  const before = String(originalCode || '').split('\n');
  const after = String(updatedCode || '').split('\n');
  const size = Math.max(before.length, after.length);
  const out = [];

  for (let i = 0; i < size; i += 1) {
    const left = before[i];
    const right = after[i];
    if (left === right) {
      out.push(`  ${left || ''}`);
      continue;
    }
    if (typeof left === 'string') out.push(`- ${left}`);
    if (typeof right === 'string') out.push(`+ ${right}`);
  }

  return out.join('\n');
}

function setReadiness(kind, message) {
  if (!readinessResultEl) {
    return;
  }
  readinessResultEl.className = `readiness readiness-${kind}`;
  readinessResultEl.textContent = message;
}

function setLlmAssistStatus(kind, message) {
  if (!llmAssistResultEl) {
    return;
  }
  llmAssistResultEl.className = `readiness readiness-${kind}`;
  llmAssistResultEl.textContent = message;
}

function setBuildStatus(kind, message) {
  buildResultEl.className = `readiness readiness-${kind}`;
  buildResultEl.textContent = message;
}

function resetDownloadButton() {
  if (!downloadPluginBtn) {
    return;
  }

  downloadPluginBtn.hidden = true;
  downloadPluginBtn.disabled = true;
  downloadPluginBtn.dataset.jobId = '';
}

function enableDownloadButton(jobId) {
  if (!downloadPluginBtn || !jobId) {
    return;
  }

  downloadPluginBtn.hidden = false;
  downloadPluginBtn.disabled = false;
  downloadPluginBtn.dataset.jobId = jobId;
}

function setDiagnosticsStatus(kind, message) {
  diagnosticsResultEl.className = `readiness readiness-${kind}`;
  diagnosticsResultEl.textContent = message;
}

function labelPack(pack) {
  if (pack === 'regular') return 'Regular icon style';
  if (pack === 'solid') return 'Solid icon style';
  if (pack === 'brands') return 'Brand icon style';
  return 'Icon style';
}

function renderParsedActionsTable() {
  if (!parsedActions.length) {
    parsedActionsBodyEl.innerHTML = '<tr><td colspan="3">No shortcuts extracted yet.</td></tr>';
    updateStep1ContinueState();
    if (step3PanelEl.classList.contains('is-hidden')) {
      updateStepTrack(1);
    }
    return;
  }

  parsedActionsBodyEl.innerHTML = parsedActions
    .map((item) => `
      <tr>
        <td>${item.actionName}</td>
        <td>${item.shortcut}</td>
        <td>${item.sourceText}</td>
      </tr>
    `)
    .join('');

  updateStep1ContinueState();
  if (step3PanelEl.classList.contains('is-hidden')) {
    updateStepTrack(2);
  }
}

function buildGeneratorPayloadFromApprovals() {
  const approvedActions = approvalActions.filter((item) => item.approval === 'approved');

  return {
    projectName: approvalPluginName || `${toPascalCase(actionNameEl.value.trim() || 'Generated')}Plugin`,
    displayName: `${actionNameEl.value.trim() || 'Generated'} Plugin`,
    author: 'LogiAutoActions User',
    version: '1.0.0',
    minimumLoupedeckVersion: '6.0',
    supportedDevices: ['LoupedeckCtFamily'],
    actions: approvedActions.map((item, index) => {
      const states = Array.isArray(item.states) ? item.states.filter(Boolean) : [];
      const intent = {
        sourceShortcuts: item.shortcuts || []
      };

      if (states.length > 0) {
        intent.states = states;
      }

      return {
        id: item.id || `generated_action_${index + 1}`,
        name: item.name,
        description: item.description || 'Generated action',
        groupPath: item.groupPath || 'Generated',
        actionKind: item.actionKind,
        intent,
        behavior: {
          keyboardShortcuts: item.shortcuts || [],
          resetOnPress: Boolean(item.behaviorResetOnPress)
        },
        icon: item.icon && item.icon.path
          ? {
            selected: {
              path: item.icon.path,
              pack: item.icon.pack || ''
            }
          }
          : undefined
      };
    })
  };
}

function getReviewIssues(action) {
  const issues = [...validateApprovalAction(action)];

  if (!action.shortcutVerified) {
    issues.push(action.shortcutVerificationMessage || 'Shortcut verification is required.');
  }

  const iconPath = action.icon && action.icon.path ? String(action.icon.path).trim() : '';
  if (!iconPath) {
    issues.push('Select an icon before this action can be ready.');
  }

  return issues;
}

function updateBuildButtonState() {
  const hasActions = approvalActions.length > 0;
  const fullyApproved = hasActions && approvalActions.every((item) => {
    const errors = getReviewIssues(item);
    return item.approval === 'approved' && errors.length === 0;
  });
  runMockBuildBtn.disabled = !fullyApproved;
}

async function refreshReadinessStatus() {
  const requestVersion = ++readinessRequestVersion;

  if (!approvalActions.length) {
    setReadiness('warn', 'No actions to review yet.');
    return;
  }

  const pendingCount = approvalActions.filter((item) => item.approval !== 'approved').length;
  if (pendingCount > 0) {
    setReadiness('warn', `${pendingCount} action(s) still need review.`);
    return;
  }

  const invalidCount = approvalActions.filter((item) => getReviewIssues(item).length > 0).length;
  if (invalidCount > 0) {
    setReadiness('warn', `${invalidCount} action(s) still need fixes.`);
    return;
  }

  try {
    const response = await fetch('/api/generator/validate-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeneratorPayloadFromApprovals())
    });

    if (requestVersion !== readinessRequestVersion) {
      return;
    }

    const data = await response.json();
    if (response.ok) {
      setReadiness('ok', 'Looks good. You are ready to create your plugin.');
      return;
    }

    const firstError = Array.isArray(data.errors) && data.errors.length > 0
      ? data.errors[0].message
      : 'Please review your inputs.';
    setReadiness('warn', `Almost there: ${firstError}`);
  } catch (error) {
    if (requestVersion !== readinessRequestVersion) {
      return;
    }
    setReadiness('warn', `Could not run readiness check: ${error.message}`);
  }
}

function approvalLabel(value) {
  if (value === 'approved') return 'Ready';
  if (value === 'rejected') return 'Rejected';
  return 'Needs review';
}

function approvalClass(value) {
  if (value === 'approved') return 'chip-approval-ok';
  if (value === 'rejected') return 'chip-approval-warn';
  return 'chip-approval-pending';
}

function iconNameFromPath(iconPath) {
  const pathValue = String(iconPath || '').trim();
  if (!pathValue) return '';

  const fileName = pathValue.split('/').pop() || '';
  return fileName.replace(/\.svg$/i, '');
}

function iconPreviewUrl(iconPath) {
  const normalized = String(iconPath || '').trim();
  if (!normalized) {
    return '';
  }

  return `/api/icons/file?path=${encodeURIComponent(normalized)}`;
}

async function resolveIconInputValue(inputValue, preferredPack) {
  const rawValue = String(inputValue || '').trim();
  if (!rawValue) {
    return null;
  }

  const normalizedPath = rawValue
    .replace(/^assets\/icons\//i, '')
    .replace(/^\.\//, '')
    .trim();

  if (/\.svg$/i.test(normalizedPath) && normalizedPath.includes('/')) {
    return {
      path: normalizedPath,
      pack: String(preferredPack || '').trim().toLowerCase() || 'unknown',
      iconName: iconNameFromPath(normalizedPath)
    };
  }

  const params = new URLSearchParams({ query: rawValue });
  if (preferredPack) {
    params.set('pack', preferredPack);
  }

  const response = await fetch(`/api/icons/resolve?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data.ok || !data.match) {
    throw new Error(data.error || 'No matching icon found in local assets.');
  }

  return data.match;
}

function canonicalModifierToken(token) {
  const lower = String(token || '').trim().toLowerCase();
  if (!lower) return '';
  if (lower === 'ctrl' || lower === 'control' || lower === '⌃') return 'Ctrl';
  if (lower === 'cmd' || lower === 'command' || lower === 'meta' || lower === '⌘') return 'Cmd';
  if (lower === 'alt' || lower === 'option' || lower === '⌥') return 'Alt';
  if (lower === 'shift' || lower === '⇧') return 'Shift';
  if (lower === 'fn') return 'Fn';
  if (lower === 'win') return 'Win';
  return '';
}

function canonicalKeyToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const mapped = {
    'esc': 'Esc',
    'escape': 'Esc',
    'enter': 'Enter',
    'return': 'Enter',
    'space': 'Space',
    'spacebar': 'Space',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'back space': 'Backspace',
    'delete': 'Delete',
    'home': 'Home',
    'end': 'End',
    'pageup': 'PageUp',
    'page up': 'PageUp',
    'pagedown': 'PageDown',
    'page down': 'PageDown',
    'left': 'Left',
    'right': 'Right',
    'up': 'Up',
    'down': 'Down',
    '↩': 'Enter',
    '⏎': 'Enter',
    '⎋': 'Esc',
    '⌫': 'Backspace',
    '⌦': 'Delete',
    '←': 'Left',
    '→': 'Right',
    '↑': 'Up',
    '↓': 'Down'
  };

  if (mapped[lower]) {
    return mapped[lower];
  }

  if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(raw)) {
    return raw.toUpperCase();
  }

  if (/^[a-z0-9]$/i.test(raw)) {
    return raw.toUpperCase();
  }

  if (/^[^\s\w]$/.test(raw)) {
    return raw;
  }

  if (/^[a-z]+$/i.test(raw)) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  return '';
}

function normalizeShortcutCombo(shortcut) {
  const compact = String(shortcut || '')
    .replace(/⌃\s*\+?/g, 'Ctrl+')
    .replace(/⌘\s*\+?/g, 'Cmd+')
    .replace(/⌥\s*\+?/g, 'Alt+')
    .replace(/⇧\s*\+?/g, 'Shift+')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\++/g, '+')
    .replace(/^\+|\+$/g, '')
    .trim();

  if (!compact) {
    return null;
  }

  const parts = compact.split('+').map((item) => item.trim()).filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const output = [];
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    const isLast = i === parts.length - 1;

    if (!isLast) {
      const modifier = canonicalModifierToken(token);
      if (!modifier) {
        return null;
      }
      output.push(modifier);
      continue;
    }

    const lastModifier = canonicalModifierToken(token);
    if (lastModifier) {
      return null;
    }

    output.push(canonicalKeyToken(token));
  }

  if (output.some((item) => !item)) {
    return null;
  }

  return output.join('+');
}

function verifyActionShortcutSet(action) {
  const rawShortcuts = Array.isArray(action.shortcuts) ? action.shortcuts : [];
  const normalizedShortcuts = rawShortcuts
    .map((item) => normalizeShortcutCombo(item))
    .filter(Boolean);

  if (normalizedShortcuts.length !== rawShortcuts.length) {
    return {
      verified: false,
      normalizedShortcuts,
      message: 'One or more shortcuts are not valid key combinations.'
    };
  }

  if ((action.actionKind === 'command' || action.actionKind === 'adjustment') && normalizedShortcuts.length < 1) {
    return {
      verified: false,
      normalizedShortcuts,
      message: 'At least one shortcut is required.'
    };
  }

  if (action.actionKind === 'toggle' && normalizedShortcuts.length !== 2) {
    return {
      verified: false,
      normalizedShortcuts,
      message: 'Toggle actions require exactly 2 shortcuts.'
    };
  }

  if (action.actionKind === 'multistate' && normalizedShortcuts.length < 3) {
    return {
      verified: false,
      normalizedShortcuts,
      message: 'Multistate actions require at least 3 shortcuts.'
    };
  }

  return {
    verified: true,
    normalizedShortcuts,
    message: ''
  };
}

function syncActionReviewState(action) {
  const verification = verifyActionShortcutSet(action);
  action.shortcuts = verification.normalizedShortcuts;
  action.shortcutVerified = verification.verified;
  action.shortcutVerificationMessage = verification.message;
  if (!action.icon || typeof action.icon !== 'object') {
    action.icon = { path: '', pack: '' };
  }
  action.icon.path = String(action.icon.path || '').trim();
  const validationErrors = validateApprovalAction(action);
  const hasIcon = Boolean(action.icon.path);
  action.approval = verification.verified && validationErrors.length === 0 && hasIcon ? 'approved' : 'pending';
}

function buildLlmApprovalActionsPayload() {
  return approvalActions.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    groupPath: item.groupPath,
    actionKind: item.actionKind,
    shortcuts: Array.isArray(item.shortcuts) ? item.shortcuts : [],
    states: Array.isArray(item.states) ? item.states : [],
    behaviorResetOnPress: Boolean(item.behaviorResetOnPress),
    approval: item.approval || 'pending'
  }));
}

function formatIssueList(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return '';
  }

  return issues
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      const base = item.message || 'Unknown issue.';
      const suggestions = Array.isArray(item.suggestions) && item.suggestions.length
        ? ` Suggestions: ${item.suggestions.map((entry) => entry.iconName || entry.path).join(', ')}`
        : '';
      return `${base}${suggestions}`;
    })
    .filter(Boolean)
    .join(' | ');
}

async function copyLlmPromptToClipboard() {
  if (!approvalActions.length) {
    setLlmAssistStatus('warn', 'Load action cards first, then copy the prompt.');
    return;
  }

  setLlmAssistStatus('info', 'Preparing prompt payload...');

  try {
    const response = await fetch('/api/icons/llm/export-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: buildLlmApprovalActionsPayload()
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Unable to prepare prompt.');
    }

    const prompt = String(data.promptMarkdown || '').trim();
    if (!prompt) {
      throw new Error('Prompt content is empty.');
    }

    await navigator.clipboard.writeText(prompt);
    setLlmAssistStatus('ok', 'Prompt copied to clipboard. Paste it into your LLM, then paste the JSON response below.');
  } catch (error) {
    setLlmAssistStatus('warn', `Could not copy prompt: ${error.message}`);
  }
}

async function validateAndApplyLlmResponse() {
  if (!approvalActions.length) {
    setLlmAssistStatus('warn', 'Load action cards first, then apply an LLM response.');
    return;
  }

  const responseText = llmResponseEl ? String(llmResponseEl.value || '').trim() : '';
  if (!responseText) {
    setLlmAssistStatus('warn', 'Paste your LLM JSON response before validating.');
    return;
  }

  setLlmAssistStatus('info', 'Validating pasted response...');

  try {
    const response = await fetch('/api/icons/llm/validate-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: buildLlmApprovalActionsPayload(),
        llmResponse: responseText
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      const issueText = formatIssueList(data.errors);
      throw new Error(issueText || 'LLM response did not pass validation.');
    }

    const resolved = Array.isArray(data.resolvedAssignments) ? data.resolvedAssignments : [];
    for (const assignment of resolved) {
      const action = approvalActions.find((item) => item.id === assignment.actionId);
      if (!action) {
        continue;
      }

      action.icon = {
        path: assignment.icon.path,
        pack: assignment.icon.pack || 'unknown'
      };
      action.iconInput = assignment.icon.iconName || assignment.icon.path;
      syncActionReviewState(action);
    }

    if (!pluginIconAssetPath && data.pluginIcon && data.pluginIcon.assetPath) {
      pluginIconAssetPath = String(data.pluginIcon.assetPath || '').trim();
      setAppIconStatus('ok', 'App icon prepared from LLM response.');
      updateStep1ContinueState();
    }

    const warnings = formatIssueList(data.warnings);
    if (warnings) {
      setLlmAssistStatus('warn', `Applied with warnings: ${warnings}`);
    } else {
      const pluginIconMessage = pluginIconAssetPath ? ' Plugin icon prepared.' : '';
      setLlmAssistStatus('ok', `Applied ${resolved.length} icon assignment(s).${pluginIconMessage}`);
    }

    setReadiness('info', 'LLM icon assignments were validated and applied. Review cards and continue to build.');
    renderApprovalCards();
  } catch (error) {
    setLlmAssistStatus('warn', `Could not apply response: ${error.message}`);
  }
}

function formatShortcutFromEvent(event) {
  const key = String(event.key || '');
  const modifierOnly = ['Control', 'Meta', 'Alt', 'Shift'];
  if (modifierOnly.includes(key)) {
    return null;
  }

  const parts = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.metaKey) parts.push('Cmd');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  let normalized = key;
  if (normalized === ' ') normalized = 'Space';
  if (normalized.startsWith('Arrow')) normalized = normalized.replace('Arrow', '');
  if (normalized.length === 1) normalized = normalized.toUpperCase();

  return normalizeShortcutCombo([...parts, normalized].join('+'));
}

async function refreshActionCode(action) {
  const response = await fetch('/api/generator/render-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pluginName: approvalPluginName,
      action: {
        id: action.id,
        name: action.name,
        description: action.description,
        actionKind: action.actionKind,
        shortcuts: action.shortcuts,
        states: action.states,
        groupPath: action.groupPath,
        behaviorResetOnPress: action.behaviorResetOnPress,
        approval: action.approval
      }
    })
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error('Unable to refresh generated class preview.');
  }

  action.className = data.rendered.className;
  action.baseClass = data.rendered.baseClass;
  action.methods = data.rendered.methods;
  action.codePreview = data.rendered.code;
  action.diffPreview = buildSimpleDiff(action.originalCodePreview || '', action.codePreview || '');
}

function renderApprovalCards() {
  if (!approvalActions.length) {
    if (approvalSummaryEl) {
      approvalSummaryEl.textContent = '0/0 actions ready.';
    }
    approvalResultsEl.textContent = 'Your actions will appear here.';
    updateBuildButtonState();
    void refreshReadinessStatus();
    return;
  }

  const approvedCount = approvalActions.filter((item) => item.approval === 'approved').length;
  if (approvalSummaryEl) {
    approvalSummaryEl.textContent = `${approvedCount}/${approvalActions.length} actions ready.`;
  }

  approvalResultsEl.innerHTML = `${approvalActions.map((item) => {
      const reviewErrors = getReviewIssues(item);
      const confirmDisabled = reviewErrors.length > 0;
      const recording = recordingActionId === item.id;
      const needsReview = item.approval !== 'approved';
      const confidencePercent = Math.round((item.confidence || 0) * 100);
      const iconPath = item.icon && item.icon.path ? item.icon.path : '';
      const suggestedIconText = item.icon && item.icon.pack
        ? `${item.icon.pack}: ${iconPath || 'None'}`
        : (iconPath || 'None');
      const iconInputValue = item.iconInput || iconNameFromPath(iconPath) || iconPath;
      const previewUrl = iconPreviewUrl(iconPath);

      return `
        <article class="approval-card" data-action-id="${item.id}">
          <div class="result-row">
            <div class="approval-title-wrap">
              <strong>${item.name}</strong>
              ${needsReview ? `<div class="approval-confidence">Confidence: ${confidencePercent}%</div>` : ''}
            </div>
            <span class="chip ${approvalClass(item.approval)}">${approvalLabel(item.approval)}</span>
            <span class="chip">${item.actionKind}</span>
            ${item.icon && item.icon.path ? `<span class="chip">${labelPack(item.icon.pack || 'unknown')}</span>` : ''}
          </div>
          <div class="approval-grid">
            <label>
              Action name
              <input class="approval-input approval-name" type="text" value="${item.name}" data-action-id="${item.id}" />
            </label>
            <label>
              Keyboard shortcuts
              <input class="approval-input approval-shortcuts" type="text" value="${(item.shortcuts || []).join(', ')}" data-action-id="${item.id}" readonly />
            </label>
            <label>
              <span class="label-row">
                <span>Icon</span>
                <span class="icon-label-preview${previewUrl ? '' : ' is-empty'}">
                  ${previewUrl ? `<img src="${previewUrl}" alt="Selected icon" loading="lazy" />` : ''}
                </span>
              </span>
              <input class="approval-input approval-icon-path" type="text" value="${iconInputValue}" data-action-id="${item.id}" placeholder="e.g. circle-right" />
            </label>
          </div>
          <div class="result-path">Suggested icon: ${suggestedIconText}</div>
          <div class="actions-row">
            ${needsReview ? `<button class="button button-secondary approval-confirm" type="button" data-action-id="${item.id}" ${confirmDisabled ? 'disabled' : ''}>Confirm</button>` : ''}
            <button class="button button-secondary approval-clear-shortcuts" type="button" data-action-id="${item.id}">Clear Shortcut</button>
            <button class="button button-secondary approval-record" type="button" data-action-id="${item.id}">${recording ? 'Press keys now...' : 'Record Shortcut'}</button>
            <button class="button button-secondary approval-remove" type="button" data-action-id="${item.id}">Remove</button>
          </div>
          ${reviewErrors.length > 0 ? `<div class="approval-errors">${reviewErrors.join(' | ')}</div>` : ''}
        </article>
      `;
    }).join('')}`;

  for (const input of approvalResultsEl.querySelectorAll('.approval-name')) {
    input.addEventListener('change', async (event) => {
      const id = event.target.dataset.actionId;
      const action = approvalActions.find((item) => item.id === id);
      if (!action) return;

      action.name = event.target.value.trim() || action.name;
      syncActionReviewState(action);
      recordingActionId = null;

      try {
        await refreshActionCode(action);
      } catch (error) {
        setReadiness('warn', error.message);
      }

      renderApprovalCards();
    });
  }

  for (const input of approvalResultsEl.querySelectorAll('.approval-icon-path')) {
    input.addEventListener('change', async (event) => {
      const id = event.target.dataset.actionId;
      const action = approvalActions.find((item) => item.id === id);
      if (!action) return;

      const rawValue = String(event.target.value || '').trim();
      action.iconInput = rawValue;

      if (!rawValue) {
        action.icon = { path: '', pack: '' };
        syncActionReviewState(action);
        renderApprovalCards();
        return;
      }

      try {
        const match = await resolveIconInputValue(rawValue, action.icon && action.icon.pack ? action.icon.pack : '');
        action.icon = {
          path: match.path,
          pack: match.pack || 'unknown'
        };
      } catch (error) {
        action.icon = { path: '', pack: '' };
        syncActionReviewState(action);
        setReadiness('warn', error.message);
        renderApprovalCards();
        return;
      }

      syncActionReviewState(action);
      setReadiness('info', `Selected icon: ${iconNameFromPath(action.icon.path) || action.icon.path}`);
      renderApprovalCards();
    });
  }

  for (const button of approvalResultsEl.querySelectorAll('.approval-record')) {
    button.addEventListener('click', (event) => {
      const id = event.target.dataset.actionId;
      recordingActionId = recordingActionId === id ? null : id;
      setReadiness('info', recordingActionId ? 'Press your keyboard shortcut now.' : 'Shortcut recording canceled.');
      renderApprovalCards();
    });
  }

  for (const button of approvalResultsEl.querySelectorAll('.approval-clear-shortcuts')) {
    button.addEventListener('click', async (event) => {
      const id = event.target.dataset.actionId;
      const action = approvalActions.find((item) => item.id === id);
      if (!action) return;

      action.shortcuts = [];
      syncActionReviewState(action);
      recordingActionId = null;

      try {
        await refreshActionCode(action);
      } catch (error) {
        setReadiness('warn', error.message);
      }

      renderApprovalCards();
    });
  }

  for (const button of approvalResultsEl.querySelectorAll('.approval-confirm')) {
    button.addEventListener('click', (event) => {
      const id = event.target.dataset.actionId;
      const action = approvalActions.find((item) => item.id === id);
      if (!action) return;
      syncActionReviewState(action);
      recordingActionId = null;
      renderApprovalCards();
    });
  }

  for (const button of approvalResultsEl.querySelectorAll('.approval-remove')) {
    button.addEventListener('click', (event) => {
      const id = event.target.dataset.actionId;
      approvalActions = approvalActions.filter((item) => item.id !== id);
      recordingActionId = null;
      renderApprovalCards();
    });
  }

  updateBuildButtonState();
  void refreshReadinessStatus();
}

document.addEventListener('keydown', async (event) => {
  if (!recordingActionId) {
    return;
  }

  event.preventDefault();

  if (event.key === 'Escape') {
    recordingActionId = null;
    setReadiness('info', 'Shortcut recording canceled.');
    renderApprovalCards();
    return;
  }

  const combo = formatShortcutFromEvent(event);
  if (!combo) {
    return;
  }

  const action = approvalActions.find((item) => item.id === recordingActionId);
  if (!action) {
    recordingActionId = null;
    renderApprovalCards();
    return;
  }

  const existing = Array.isArray(action.shortcuts) ? action.shortcuts : [];
  if (action.actionKind === 'toggle') {
    const updated = existing.includes(combo) ? existing : [...existing, combo];
    action.shortcuts = updated.slice(-2);
  } else if (action.actionKind === 'multistate') {
    action.shortcuts = existing.includes(combo) ? existing : [...existing, combo];
  } else {
    action.shortcuts = [combo];
  }

  syncActionReviewState(action);
  recordingActionId = null;

  try {
    await refreshActionCode(action);
  } catch (error) {
    setReadiness('warn', error.message);
  }

  setReadiness('info', `Saved shortcut: ${combo}`);
  renderApprovalCards();
});

async function extractShortcuts(payload) {
  const response = await fetch('/api/shortcuts/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not import shortcuts right now.');
  }

  extractedShortcuts = data.entries || [];

  if (!actionNameEl.value.trim() && data.suggestedPluginName) {
    actionNameEl.value = data.suggestedPluginName;
  }

  if (!actionDescriptionEl.value.trim() && data.suggestedDescription) {
    actionDescriptionEl.value = data.suggestedDescription;
  }

  parsedActions = dedupeParsedActionsByName(extractedShortcuts.map((entry, index) => ({
    actionName: inferActionNameFromContext(entry.context, `Action ${index + 1}`),
    shortcut: entry.shortcut,
    sourceText: entry.context
  })));

  renderParsedActionsTable();
}

async function importFromCurrentOptions() {
  const url = shortcutUrlEl.value.trim();
  const file = shortcutFileEl.files && shortcutFileEl.files[0];
  const text = shortcutTextEl.value.trim();

  if (!url && !file && !text) {
    parsedActionsBodyEl.innerHTML = '<tr><td colspan="3">Add a URL, upload a file, or paste text first.</td></tr>';
    return;
  }

  try {
    if (url) {
      parsedActionsBodyEl.innerHTML = '<tr><td colspan="3">Importing shortcuts from URL...</td></tr>';
      await extractShortcuts({ sourceType: 'url', url });
    } else if (file) {
      parsedActionsBodyEl.innerHTML = `<tr><td colspan="3">Reading ${file.name}...</td></tr>`;
      const fileText = await file.text();
      shortcutTextEl.value = fileText;
      await extractShortcuts({ sourceType: 'text', text: fileText });
    } else {
      parsedActionsBodyEl.innerHTML = '<tr><td colspan="3">Importing shortcuts from text...</td></tr>';
      await extractShortcuts({ sourceType: 'text', text });
    }

    if (parsedActions.length) {
      shortcutResultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    parsedActionsBodyEl.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
  }
}

importShortcutsBtn.addEventListener('click', async () => {
  await importFromCurrentOptions();
});

shortcutFileEl.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  parsedActionsBodyEl.innerHTML = `<tr><td colspan="3">${file.name} selected. Click "Import Shortcuts" to continue.</td></tr>`;
});

if (appIconFileEl) {
  appIconFileEl.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    await prepareUploadedAppIcon(file || null);
  });
}

if (actionNameEl) {
  actionNameEl.addEventListener('input', () => {
    updateStep1ContinueState();
  });
}

if (actionDescriptionEl) {
  actionDescriptionEl.addEventListener('input', () => {
    updateStep1ContinueState();
  });
}

goToStep3Btn.addEventListener('click', () => {
  void goToReviewBuildStep();
});

if (copyLlmPromptBtn) {
  copyLlmPromptBtn.addEventListener('click', async () => {
    await copyLlmPromptToClipboard();
  });
}

if (applyLlmResponseBtn) {
  applyLlmResponseBtn.addEventListener('click', async () => {
    await validateAndApplyLlmResponse();
  });
}

function handleStepMarkerNavigation(stepNumber) {
  if (stepNumber === 1) {
    showStep(1);
    return;
  }

  if (stepNumber === 2) {
    void goToReviewBuildStep();
  }
}

[stepMarker1El, stepMarker2El].forEach((marker) => {
  if (!marker) return;

  marker.addEventListener('click', () => {
    const step = Number(marker.dataset.step || 1);
    handleStepMarkerNavigation(step);
  });

  marker.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    const step = Number(marker.dataset.step || 1);
    handleStepMarkerNavigation(step);
  });
});

window.addEventListener('popstate', (event) => {
  const stateStep = event.state && Number(event.state.uiStep);
  const targetStep = stateStep >= 3 ? 3 : 1;
  showStep(targetStep, { updateHistory: false, scroll: false, focus: false });
});

runMockBuildBtn.addEventListener('click', async () => {
  setBuildStatus('info', 'Starting plugin creation...');
  resetDownloadButton();

  if (!approvalActions.length || approvalActions.some((item) => item.approval !== 'approved')) {
    setBuildStatus('warn', 'Please make sure all actions are ready before creating your plugin.');
    return;
  }

  if (approvalActions.some((item) => getReviewIssues(item).length > 0)) {
    setBuildStatus('warn', 'Please fix any issues on the action cards before creating your plugin.');
    return;
  }

  try {
    const payload = {
      ...buildGeneratorPayloadFromApprovals(),
      approvalActions,
      pluginIconAssetPath: pluginIconAssetPath || undefined
    };

    const startResponse = await fetch('/api/generator/build-from-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startData = await startResponse.json();

    if (!startResponse.ok) {
      const reason = Array.isArray(startData.errors) && startData.errors.length
        ? startData.errors[0].message
        : 'Plugin creation could not be started.';
      throw new Error(reason);
    }

    const jobId = startData.jobId;
    setBuildStatus('info', 'Getting things ready...');

    let attempts = 0;
    const maxAttempts = 30;
    const timer = setInterval(async () => {
      attempts += 1;

      try {
        const statusResponse = await fetch(`/api/generator/mock-build/${jobId}`);
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) {
          clearInterval(timer);
          setBuildStatus('warn', statusData.message || 'Could not read plugin creation status.');
          return;
        }

        if (statusData.status === 'queued') {
          setBuildStatus('info', 'Waiting to start...');
        }

        if (statusData.status === 'building') {
          setBuildStatus('info', 'Creating your plugin files...');
        }

        if (statusData.status === 'packaging') {
          setBuildStatus('info', 'Packaging your plugin...');
        }

        if (statusData.status === 'completed') {
          clearInterval(timer);
          const actionCount = Array.isArray(statusData.result && statusData.result.actionSummary)
            ? statusData.result.actionSummary.length
            : 0;
          setBuildStatus('ok', `Done. Your plugin was created with ${actionCount} ready action(s). Use Save Plugin File to download it.`);
          enableDownloadButton(jobId);
          return;
        }

        if (statusData.status === 'failed') {
          clearInterval(timer);
          resetDownloadButton();
          const result = statusData.result || {};
          const error = result.error || {};
          const message = error.message || result.message || 'Plugin creation could not finish.';
          setBuildStatus('warn', `Could not create plugin: ${message}`);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(timer);
          resetDownloadButton();
          setBuildStatus('warn', 'This is taking longer than expected. Please try again.');
        }
      } catch (error) {
        clearInterval(timer);
        resetDownloadButton();
        setBuildStatus('warn', `Could not read progress: ${error.message}`);
      }
    }, 600);
  } catch (error) {
    resetDownloadButton();
    setBuildStatus('warn', `Could not start plugin creation: ${error.message}`);
  }
});

if (downloadPluginBtn) {
  downloadPluginBtn.addEventListener('click', () => {
    const jobId = String(downloadPluginBtn.dataset.jobId || '').trim();
    if (!jobId) {
      setBuildStatus('warn', 'Build package is not ready yet.');
      return;
    }

    window.location.assign(`/api/generator/mock-build/${encodeURIComponent(jobId)}/download`);
  });
}

if (runDiagnosticsBtn && diagnosticsResultEl) {
  runDiagnosticsBtn.addEventListener('click', async () => {
    setDiagnosticsStatus('info', 'Checking your computer setup...');

    try {
      const response = await fetch('/api/system/diagnostics');
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error('Diagnostics endpoint unavailable.');
      }

      const diagnostics = data.diagnostics || {};
      const dotnetReady = diagnostics.dotnet && diagnostics.dotnet.available;
      const logiToolReady = diagnostics.logiPluginTool && diagnostics.logiPluginTool.available;
      const pluginApiReady = diagnostics.pluginApi && diagnostics.pluginApi.available;

      if (dotnetReady && logiToolReady && pluginApiReady) {
        setDiagnosticsStatus('ok', 'Great news. Your computer is ready for full local plugin creation.');
        return;
      }

      const missing = [];
      if (!dotnetReady) missing.push('dotnet');
      if (!logiToolReady) missing.push('LogiPluginTool');
      if (!pluginApiReady) missing.push('PluginApi.dll');

      setDiagnosticsStatus('warn', `Some setup items are missing: ${missing.join(', ')}. You can still use guided mode.`);
    } catch (error) {
      setDiagnosticsStatus('warn', `Setup check failed: ${error.message}`);
    }
  });
}

async function loadApprovalCards(options = {}) {
  const { force = false } = options;

  if (isLoadingApprovalCards) {
    return false;
  }

  if (!force && approvalActions.length > 0) {
    return true;
  }

  isLoadingApprovalCards = true;
  approvalResultsEl.textContent = 'Preparing your action cards...';

  try {
    const response = await fetch('/api/generator/preview-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPreviewPayload())
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Could not prepare your action cards.');
    }

    approvalPluginName = data.preview && data.preview.pluginName ? data.preview.pluginName : 'GeneratedPlugin';
    approvalActions = ensureUniqueApprovalActionIds((data.preview && Array.isArray(data.preview.actions) ? data.preview.actions : []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      groupPath: item.groupPath || 'Generated',
      actionKind: item.actionKind,
      icon: item.icon,
      shortcuts: item.quickView && Array.isArray(item.quickView.shortcutSummary)
        ? item.quickView.shortcutSummary
        : item.behavior && Array.isArray(item.behavior.keyboardShortcuts)
          ? item.behavior.keyboardShortcuts
          : [],
      states: item.behaviorView && Array.isArray(item.behaviorView.states) ? item.behaviorView.states : [],
      behaviorPlainLanguage: item.behaviorView ? item.behaviorView.plainLanguage : '',
      behaviorResetOnPress: item.behaviorView ? item.behaviorView.resetOnPress : false,
      className: item.developerView ? item.developerView.className : 'GeneratedAction',
      baseClass: item.developerView ? item.developerView.baseClass : 'PluginDynamicCommand',
      methods: item.developerView && Array.isArray(item.developerView.methods) ? item.developerView.methods : [],
      codePreview: item.developerView ? item.developerView.code : '',
      originalCodePreview: item.developerView ? item.developerView.code : '',
      diffPreview: '',
      confidence: item.quickView ? item.quickView.confidence : 0,
      approval: 'pending'
    })));

    approvalActions.forEach((item) => {
      syncActionReviewState(item);
    });

    recordingActionId = null;
    renderApprovalCards();
    setReadiness('info', 'Review each action card and adjust shortcuts or icons if needed. Valid cards are marked ready automatically.');
    return true;
  } catch (error) {
    approvalActions = [];
    recordingActionId = null;
    renderApprovalCards();
    setReadiness('warn', `Could not prepare action cards: ${error.message}`);
    return false;
  } finally {
    isLoadingApprovalCards = false;
  }
}

showStep(1, { replaceHistory: true, scroll: false, focus: false });
renderParsedActionsTable();
updateBuildButtonState();
updateStep1ContinueState();
setLlmAssistStatus('info', 'Generate a prompt after your action cards are loaded.');
