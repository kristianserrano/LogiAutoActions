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
const defaultIconBgColorEl = document.getElementById('defaultIconBgColor');
const defaultIconFgColorEl = document.getElementById('defaultIconFgColor');
const defaultIconTemplateStatusEl = document.getElementById('defaultIconTemplateStatus');

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
const newGroupNameEl = document.getElementById('newGroupName');
const addActionGroupBtn = document.getElementById('addActionGroup');
const groupingResultEl = document.getElementById('groupingResult');
const groupingBoardEl = document.getElementById('groupingBoard');
const groupAssistPanelEl = document.getElementById('groupAssistPanel');
const parsedActionRowTemplateEl = document.getElementById('parsedActionRowTemplate');
const approvalCardTemplateEl = document.getElementById('approvalCardTemplate');
const groupingGridTemplateEl = document.getElementById('groupingGridTemplate');
const groupColumnTemplateEl = document.getElementById('groupColumnTemplate');
const groupActionChipTemplateEl = document.getElementById('groupActionChipTemplate');
const groupDropzoneEmptyTemplateEl = document.getElementById('groupDropzoneEmptyTemplate');

let extractedShortcuts = [];
let parsedActions = [];
let approvalActions = [];
let approvalPluginName = 'GeneratedPlugin';
let pluginIconAssetPath = '';
let recordingActionId = null;
let currentUiStep = 1;
let isLoadingApprovalCards = false;
let readinessRequestVersion = 0;
let groupingBuckets = [];
let defaultIconBackgroundHex = '#287c67';
let defaultIconForegroundHex = '#ffffff';
let foregroundColorOverride = false;

const DEFAULT_GROUP_NAME = 'Generated';
const UNGROUPED_LABEL = 'No Group';
const NO_GROUP_LABEL = 'No group';

function normalizeHexColor(value, fallback = '#287c67') {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hexColor) {
  const normalized = normalizeHexColor(hexColor, '#287c67').slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb) {
  return (
    0.2126 * srgbToLinear(rgb.r)
    + 0.7152 * srgbToLinear(rgb.g)
    + 0.0722 * srgbToLinear(rgb.b)
  );
}

function pickContrastingTextColor(backgroundHex) {
  const luminance = relativeLuminance(hexToRgb(backgroundHex));
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
}

function getIconForegroundFilter(foregroundHex) {
  return String(foregroundHex || '').toLowerCase() === '#ffffff'
    ? 'brightness(0) invert(1)'
    : 'brightness(0) saturate(100%)';
}

function setAppIconStatus(kind, message) {
  if (!appIconStatusEl) {
    return;
  }

  appIconStatusEl.className = `readiness readiness-${kind}`;
  appIconStatusEl.textContent = message;
}

function setDefaultIconTemplateStatus(kind, message) {
  if (!defaultIconTemplateStatusEl) {
    return;
  }

  defaultIconTemplateStatusEl.className = `readiness readiness-${kind}`;
  defaultIconTemplateStatusEl.textContent = message;
}

function setDefaultIconTemplateColor(hexColor, sourceLabel) {
  const normalized = normalizeHexColor(hexColor, defaultIconBackgroundHex);
  defaultIconBackgroundHex = normalized;

  if (!foregroundColorOverride) {
    defaultIconForegroundHex = pickContrastingTextColor(normalized);
  }

  if (defaultIconBgColorEl) {
    defaultIconBgColorEl.value = normalized;
  }

  if (defaultIconFgColorEl) {
    defaultIconFgColorEl.value = defaultIconForegroundHex;
  }

  const foregroundSource = foregroundColorOverride
    ? 'manual selection'
    : `auto contrast (${sourceLabel})`;

  setDefaultIconTemplateStatus(
    'info',
    `Default icon background: ${defaultIconBackgroundHex}. Foreground: ${defaultIconForegroundHex} (${foregroundSource}).`
  );

  if (approvalActions.length > 0 && !step3PanelEl.classList.contains('is-hidden')) {
    renderApprovalCards();
  }
}

function setDefaultIconForegroundColor(hexColor, sourceLabel = 'manual selection') {
  const normalized = normalizeHexColor(hexColor, defaultIconForegroundHex);
  defaultIconForegroundHex = normalized;
  foregroundColorOverride = true;

  if (defaultIconFgColorEl) {
    defaultIconFgColorEl.value = normalized;
  }

  setDefaultIconTemplateStatus(
    'info',
    `Default icon background: ${defaultIconBackgroundHex}. Foreground: ${defaultIconForegroundHex} (${sourceLabel}).`
  );

  if (approvalActions.length > 0 && !step3PanelEl.classList.contains('is-hidden')) {
    renderApprovalCards();
  }
}

function updateStep1ContinueState() {
  if (goToStep3Btn) {
    // Keep the button clickable so users can always see validation guidance.
    goToStep3Btn.disabled = false;
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
    const dominantColorHex = normalizeHexColor(
      data.pluginIcon && data.pluginIcon.dominantColorHex ? data.pluginIcon.dominantColorHex : '',
      defaultIconBackgroundHex
    );
    setDefaultIconTemplateColor(dominantColorHex, 'auto-picked from app icon');
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

  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const focusByStep = {
    1: shortcutUrlEl,
    2: shortcutUrlEl,
    3: runMockBuildBtn
  };

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

function setGroupingStatus(kind, message) {
  if (!groupingResultEl) {
    return;
  }

  groupingResultEl.className = `readiness readiness-${kind}`;
  groupingResultEl.textContent = message;
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

function setParsedActionsMessage(message) {
  if (!parsedActionsBodyEl) {
    return;
  }

  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.textContent = String(message || '');
  row.appendChild(cell);

  parsedActionsBodyEl.textContent = '';
  parsedActionsBodyEl.appendChild(row);
}

function buildParsedActionRow(item) {
  if (!parsedActionRowTemplateEl) {
    const fallbackRow = document.createElement('tr');
    const actionCell = document.createElement('td');
    actionCell.textContent = item.actionName;
    const shortcutCell = document.createElement('td');
    shortcutCell.textContent = item.shortcut;
    const sourceCell = document.createElement('td');
    sourceCell.textContent = item.sourceText;
    fallbackRow.appendChild(actionCell);
    fallbackRow.appendChild(shortcutCell);
    fallbackRow.appendChild(sourceCell);
    return fallbackRow;
  }

  const fragment = parsedActionRowTemplateEl.content.cloneNode(true);
  const row = fragment.querySelector('tr');
  if (!row) {
    return null;
  }

  const nameEl = row.querySelector('.parsed-action-name');
  const shortcutEl = row.querySelector('.parsed-action-shortcut');
  const sourceEl = row.querySelector('.parsed-action-source');
  if (nameEl) nameEl.textContent = String(item.actionName || '');
  if (shortcutEl) shortcutEl.textContent = String(item.shortcut || '');
  if (sourceEl) sourceEl.textContent = String(item.sourceText || '');
  return fragment;
}

function renderParsedActionsTable() {
  if (!parsedActions.length) {
    setParsedActionsMessage('No shortcuts extracted yet.');
    updateStep1ContinueState();
    if (step3PanelEl.classList.contains('is-hidden')) {
      updateStepTrack(1);
    }
    return;
  }

  parsedActionsBodyEl.textContent = '';
  const tableFragment = document.createDocumentFragment();
  for (const item of parsedActions) {
    const row = buildParsedActionRow(item);
    if (row) {
      tableFragment.appendChild(row);
    }
  }
  parsedActionsBodyEl.appendChild(tableFragment);

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

      const normalizedGroupPath = normalizeGroupName(item.groupPath || '');
      const generatedAction = {
        id: item.id || `generated_action_${index + 1}`,
        name: item.name,
        description: item.description || 'Generated action',
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

      if (normalizedGroupPath && !isDefaultGroupName(normalizedGroupPath)) {
        generatedAction.groupPath = normalizedGroupPath;
      }

      return generatedAction;
    })
  };
}

function normalizeGroupName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name;
}

function isDefaultGroupName(value) {
  return String(value || '').trim().toLowerCase() === DEFAULT_GROUP_NAME.toLowerCase();
}

function ensureGroupingBucketsFromActions() {
  const fromActions = new Set(
    approvalActions
      .map((item) => normalizeGroupName(item.groupPath || ''))
      .filter((name) => name && !isDefaultGroupName(name))
  );

  const ordered = [];
  for (const name of groupingBuckets) {
    const normalized = normalizeGroupName(name);
    if (normalized && !ordered.includes(normalized)) {
      ordered.push(normalized);
    }
  }

  for (const name of fromActions) {
    if (!ordered.includes(name)) {
      ordered.push(name);
    }
  }

  groupingBuckets = ordered;
}

function getActionsForGroup(groupName) {
  return approvalActions.filter((item) => {
    const value = normalizeGroupName(item.groupPath || '');
    return value === groupName;
  });
}

function getUngroupedActions() {
  return approvalActions.filter((item) => {
    const value = normalizeGroupName(item.groupPath || '');
    return !value || isDefaultGroupName(value);
  });
}

function buildGroupActionChipNode(action) {
  if (!groupActionChipTemplateEl) {
    const fallback = document.createElement('span');
    fallback.className = 'group-action-chip';
    fallback.draggable = true;
    fallback.dataset.actionId = String(action.id || '');
    fallback.title = 'Drag to move';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'group-action-chip-icon-wrap';
    iconWrap.style.backgroundColor = defaultIconBackgroundHex;
    const iconImg = document.createElement('img');
    iconImg.className = 'group-action-chip-icon';
    iconImg.style.filter = getIconForegroundFilter(defaultIconForegroundHex);
    const previewUrl = iconPreviewUrl(action && action.icon ? action.icon.path : '');
    if (previewUrl) {
      iconImg.src = previewUrl;
      iconImg.hidden = false;
    } else {
      iconImg.hidden = true;
    }
    iconWrap.appendChild(iconImg);

    const nameEl = document.createElement('span');
    nameEl.className = 'group-action-chip-name';
    nameEl.textContent = String(action.name || '');

    fallback.appendChild(iconWrap);
    fallback.appendChild(nameEl);
    return fallback;
  }

  const fragment = groupActionChipTemplateEl.content.cloneNode(true);
  const chip = fragment.querySelector('.group-action-chip');
  if (!chip) {
    return null;
  }

  chip.dataset.actionId = String(action.id || '');
  const chipNameEl = chip.querySelector('.group-action-chip-name');
  if (chipNameEl) {
    chipNameEl.textContent = String(action.name || '');
  }

  const chipIconEl = chip.querySelector('.group-action-chip-icon');
  const chipIconWrapEl = chip.querySelector('.group-action-chip-icon-wrap');
  if (chipIconWrapEl) {
    chipIconWrapEl.style.backgroundColor = defaultIconBackgroundHex;
  }
  if (chipIconEl) {
    chipIconEl.style.filter = getIconForegroundFilter(defaultIconForegroundHex);
    const previewUrl = iconPreviewUrl(action && action.icon ? action.icon.path : '');
    if (previewUrl) {
      chipIconEl.src = previewUrl;
      chipIconEl.hidden = false;
    } else {
      chipIconEl.src = '';
      chipIconEl.hidden = true;
    }
  }

  return fragment;
}

function appendGroupActionChips(dropzoneEl, actions) {
  if (!dropzoneEl) {
    return;
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    if (groupDropzoneEmptyTemplateEl) {
      dropzoneEl.appendChild(groupDropzoneEmptyTemplateEl.content.cloneNode(true));
      return;
    }

    const emptyEl = document.createElement('div');
    emptyEl.className = 'group-dropzone-empty';
    emptyEl.textContent = 'Drop actions here';
    dropzoneEl.appendChild(emptyEl);
    return;
  }

  for (const action of actions) {
    const chip = buildGroupActionChipNode(action);
    if (chip) {
      dropzoneEl.appendChild(chip);
    }
  }
}

function buildGroupColumnNode(columnTitle, dropGroupValue, actions, options = {}) {
  const { removable = false, groupColumnValue = '' } = options;

  let fragment;
  if (groupColumnTemplateEl) {
    fragment = groupColumnTemplateEl.content.cloneNode(true);
  } else {
    fragment = document.createDocumentFragment();
    const section = document.createElement('section');
    section.className = 'group-column';
    section.dataset.groupColumn = '';

    const header = document.createElement('div');
    header.className = 'group-column-header';

    const title = document.createElement('span');
    title.className = 'group-column-title';
    header.appendChild(title);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'group-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    header.appendChild(removeBtn);

    const dropzone = document.createElement('div');
    dropzone.className = 'group-dropzone';
    dropzone.dataset.dropGroup = '';

    section.appendChild(header);
    section.appendChild(dropzone);
    fragment.appendChild(section);
  }

  const sectionEl = fragment.querySelector('.group-column');
  if (!sectionEl) {
    return null;
  }

  sectionEl.dataset.groupColumn = String(groupColumnValue || '');

  const titleEl = sectionEl.querySelector('.group-column-title');
  if (titleEl) {
    titleEl.textContent = String(columnTitle || '');
  }

  const removeButtonEl = sectionEl.querySelector('.group-remove');
  if (removeButtonEl) {
    removeButtonEl.hidden = !removable;
    removeButtonEl.dataset.removeGroup = removable ? String(groupColumnValue || '') : '';
  }

  const dropzoneEl = sectionEl.querySelector('.group-dropzone');
  if (dropzoneEl) {
    dropzoneEl.dataset.dropGroup = String(dropGroupValue || '');
    appendGroupActionChips(dropzoneEl, actions);
  }

  return fragment;
}

function renderGroupingBoard() {
  if (!groupingBoardEl) {
    return;
  }

  ensureGroupingBucketsFromActions();

  const ungroupedActions = getUngroupedActions();
  groupingBoardEl.textContent = '';

  let gridFragment;
  if (groupingGridTemplateEl) {
    gridFragment = groupingGridTemplateEl.content.cloneNode(true);
  } else {
    gridFragment = document.createDocumentFragment();
    const grid = document.createElement('div');
    grid.className = 'grouping-grid';
    gridFragment.appendChild(grid);
  }

  const gridEl = gridFragment.querySelector('.grouping-grid');
  if (!gridEl) {
    groupingBoardEl.textContent = 'Could not render grouping board.';
    return;
  }

  const ungroupedColumn = buildGroupColumnNode(UNGROUPED_LABEL, '', ungroupedActions, {
    removable: false,
    groupColumnValue: ''
  });
  if (ungroupedColumn) {
    gridEl.appendChild(ungroupedColumn);
  }

  for (const groupName of groupingBuckets) {
    const actions = getActionsForGroup(groupName);
    const groupColumn = buildGroupColumnNode(groupName, groupName, actions, {
      removable: true,
      groupColumnValue: groupName
    });
    if (groupColumn) {
      gridEl.appendChild(groupColumn);
    }
  }

  groupingBoardEl.appendChild(gridFragment);

  for (const chip of groupingBoardEl.querySelectorAll('.group-action-chip')) {
    chip.addEventListener('dragstart', (event) => {
      const actionId = String(chip.dataset.actionId || '').trim();
      if (!actionId) {
        return;
      }

      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', actionId);
    });
  }

  for (const zone of groupingBoardEl.querySelectorAll('.group-dropzone')) {
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      zone.classList.add('is-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('is-over');
    });

    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('is-over');

      const actionId = String(event.dataTransfer.getData('text/plain') || '').trim();
      if (!actionId) {
        return;
      }

      const targetGroupRaw = String(zone.dataset.dropGroup || '').trim();
      const targetGroup = normalizeGroupName(targetGroupRaw);
      const action = approvalActions.find((item) => item.id === actionId);
      if (!action) {
        return;
      }

      action.groupPath = targetGroup || '';
      if (targetGroup && !groupingBuckets.includes(targetGroup)) {
        groupingBuckets.push(targetGroup);
      }

      setGroupingStatus('ok', `Moved "${action.name}" to ${targetGroup || UNGROUPED_LABEL}.`);
      renderGroupingBoard();
      renderApprovalCards();
    });
  }

  for (const button of groupingBoardEl.querySelectorAll('.group-remove')) {
    button.addEventListener('click', () => {
      const groupName = normalizeGroupName(button.dataset.removeGroup || '');
      if (!groupName) {
        return;
      }

      groupingBuckets = groupingBuckets.filter((item) => item !== groupName);
      for (const action of approvalActions) {
        if (normalizeGroupName(action.groupPath || '') === groupName) {
          action.groupPath = '';
        }
      }

      setGroupingStatus('info', `Removed group "${groupName}". Actions moved to ${UNGROUPED_LABEL}.`);
      renderGroupingBoard();
      renderApprovalCards();
    });
  }
}

function addGroupingBucketFromInput() {
  if (!newGroupNameEl) {
    return;
  }

  const groupName = normalizeGroupName(newGroupNameEl.value);
  if (!groupName) {
    setGroupingStatus('warn', 'Enter a group name first.');
    return;
  }

  if (isDefaultGroupName(groupName)) {
    setGroupingStatus('warn', `"${DEFAULT_GROUP_NAME}" is reserved for ${UNGROUPED_LABEL}.`);
    return;
  }

  if (groupingBuckets.some((item) => item.toLowerCase() === groupName.toLowerCase())) {
    setGroupingStatus('warn', `Group "${groupName}" already exists.`);
    return;
  }

  groupingBuckets.push(groupName);
  newGroupNameEl.value = '';
  setGroupingStatus('ok', `Added group "${groupName}". Drag actions into it.`);
  renderGroupingBoard();
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

function updateGroupingPanelState() {
  if (!groupAssistPanelEl) {
    return;
  }

  groupAssistPanelEl.hidden = false;

  if (newGroupNameEl) {
    newGroupNameEl.disabled = false;
  }

  if (addActionGroupBtn) {
    addActionGroupBtn.disabled = false;
  }
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

function buildApprovalCardNode(item) {
  if (!approvalCardTemplateEl) {
    return null;
  }

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

  const fragment = approvalCardTemplateEl.content.cloneNode(true);
  const card = fragment.querySelector('.approval-card');
  if (!card) {
    return null;
  }

  card.dataset.actionId = item.id;

  const titleTextEl = card.querySelector('.approval-title-text');
  if (titleTextEl) {
    titleTextEl.textContent = item.name;
  }

  const confidenceEl = card.querySelector('.approval-confidence');
  if (confidenceEl) {
    if (needsReview) {
      confidenceEl.textContent = `Confidence: ${confidencePercent}%`;
      confidenceEl.hidden = false;
    } else {
      confidenceEl.textContent = '';
      confidenceEl.hidden = true;
    }
  }

  const approvalChipEl = card.querySelector('.approval-state-chip');
  if (approvalChipEl) {
    approvalChipEl.className = `chip ${approvalClass(item.approval)} approval-state-chip`;
    approvalChipEl.textContent = approvalLabel(item.approval);
  }

  const kindChipEl = card.querySelector('.approval-kind-chip');
  if (kindChipEl) {
    kindChipEl.textContent = item.actionKind;
  }

  const groupChipEl = card.querySelector('.approval-group-chip');
  if (groupChipEl) {
    groupChipEl.textContent = normalizeGroupName(item.groupPath || '') || NO_GROUP_LABEL;
  }

  const packChipEl = card.querySelector('.approval-pack-chip');
  if (packChipEl) {
    if (item.icon && item.icon.path) {
      packChipEl.textContent = labelPack(item.icon.pack || 'unknown');
      packChipEl.hidden = false;
    } else {
      packChipEl.textContent = '';
      packChipEl.hidden = true;
    }
  }

  const nameInput = card.querySelector('.approval-name');
  if (nameInput) {
    nameInput.value = item.name;
    nameInput.dataset.actionId = item.id;
  }

  const shortcutsInput = card.querySelector('.approval-shortcuts');
  if (shortcutsInput) {
    shortcutsInput.value = (item.shortcuts || []).join(', ');
    shortcutsInput.dataset.actionId = item.id;
  }

  const iconPreviewWrap = card.querySelector('.icon-label-preview');
  const iconPreviewImg = card.querySelector('.approval-icon-preview');
  if (iconPreviewWrap) {
    iconPreviewWrap.classList.toggle('is-empty', !previewUrl);
    if (previewUrl) {
      iconPreviewWrap.style.background = defaultIconBackgroundHex;
    } else {
      iconPreviewWrap.style.background = '';
    }
  }
  if (iconPreviewImg) {
    iconPreviewImg.style.filter = getIconForegroundFilter(defaultIconForegroundHex);
    if (previewUrl) {
      iconPreviewImg.src = previewUrl;
      iconPreviewImg.hidden = false;
    } else {
      iconPreviewImg.src = '';
      iconPreviewImg.hidden = true;
    }
  }

  const iconInput = card.querySelector('.approval-icon-path');
  if (iconInput) {
    iconInput.value = iconInputValue;
    iconInput.dataset.actionId = item.id;
  }

  const suggestedIconTextEl = card.querySelector('.suggested-icon-text');
  if (suggestedIconTextEl) {
    suggestedIconTextEl.textContent = suggestedIconText;
  }

  const confirmBtn = card.querySelector('.approval-confirm');
  if (confirmBtn) {
    confirmBtn.dataset.actionId = item.id;
    confirmBtn.disabled = confirmDisabled;
    confirmBtn.hidden = !needsReview;
  }

  const clearBtn = card.querySelector('.approval-clear-shortcuts');
  if (clearBtn) {
    clearBtn.dataset.actionId = item.id;
  }

  const recordBtn = card.querySelector('.approval-record');
  if (recordBtn) {
    recordBtn.dataset.actionId = item.id;
    recordBtn.textContent = recording ? 'Press keys now...' : 'Record Shortcut';
  }

  const removeBtn = card.querySelector('.approval-remove');
  if (removeBtn) {
    removeBtn.dataset.actionId = item.id;
  }

  const errorsEl = card.querySelector('.approval-errors');
  if (errorsEl) {
    if (reviewErrors.length > 0) {
      errorsEl.textContent = reviewErrors.join(' | ');
      errorsEl.hidden = false;
    } else {
      errorsEl.textContent = '';
      errorsEl.hidden = true;
    }
  }

  return fragment;
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
    return raw;
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

    const warnings = formatIssueList(data.warnings);
    if (warnings) {
      setLlmAssistStatus('warn', `Applied with warnings: ${warnings}`);
    } else {
      setLlmAssistStatus('ok', `Applied ${resolved.length} icon assignment(s).`);
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
  updateGroupingPanelState();

  if (!approvalActions.length) {
    if (approvalSummaryEl) {
      approvalSummaryEl.textContent = '0/0 actions ready.';
    }
    approvalResultsEl.textContent = 'Your actions will appear here.';
    renderGroupingBoard();
    updateBuildButtonState();
    void refreshReadinessStatus();
    return;
  }

  const approvedCount = approvalActions.filter((item) => item.approval === 'approved').length;
  if (approvalSummaryEl) {
    approvalSummaryEl.textContent = `${approvedCount}/${approvalActions.length} actions ready.`;
  }

  approvalResultsEl.textContent = '';
  const cardsFragment = document.createDocumentFragment();
  for (const item of approvalActions) {
    const cardNode = buildApprovalCardNode(item);
    if (cardNode) {
      cardsFragment.appendChild(cardNode);
    }
  }
  approvalResultsEl.appendChild(cardsFragment);

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
      ensureGroupingBucketsFromActions();
      recordingActionId = null;
      renderApprovalCards();
    });
  }

  renderGroupingBoard();
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
    setParsedActionsMessage('Add a URL, upload a file, or paste text first.');
    return;
  }

  try {
    if (url) {
      setParsedActionsMessage('Importing shortcuts from URL...');
      await extractShortcuts({ sourceType: 'url', url });
    } else if (file) {
      setParsedActionsMessage(`Reading ${file.name}...`);
      const fileText = await file.text();
      shortcutTextEl.value = fileText;
      await extractShortcuts({ sourceType: 'text', text: fileText });
    } else {
      setParsedActionsMessage('Importing shortcuts from text...');
      await extractShortcuts({ sourceType: 'text', text });
    }

    if (parsedActions.length) {
      shortcutResultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    setParsedActionsMessage(error.message);
  }
}

importShortcutsBtn.addEventListener('click', async () => {
  await importFromCurrentOptions();
});

shortcutFileEl.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  setParsedActionsMessage(`${file.name} selected. Click "Import Shortcuts" to continue.`);
});

if (appIconFileEl) {
  appIconFileEl.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    await prepareUploadedAppIcon(file || null);
  });
}

if (defaultIconBgColorEl) {
  defaultIconBgColorEl.addEventListener('input', (event) => {
    const colorValue = String(event.target && event.target.value ? event.target.value : '').trim();
    setDefaultIconTemplateColor(colorValue, 'manual picker');
  });
}

if (defaultIconFgColorEl) {
  defaultIconFgColorEl.addEventListener('input', (event) => {
    const colorValue = String(event.target && event.target.value ? event.target.value : '').trim();
    setDefaultIconForegroundColor(colorValue, 'manual picker');
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

if (addActionGroupBtn) {
  addActionGroupBtn.addEventListener('click', () => {
    addGroupingBucketFromInput();
  });
}

if (newGroupNameEl) {
  newGroupNameEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    addGroupingBucketFromInput();
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
      pluginIconAssetPath: pluginIconAssetPath || undefined,
      defaultIconTemplate: {
        backgroundColorHex: defaultIconBackgroundHex,
        foregroundColorHex: defaultIconForegroundHex
      },
      requireRealBuildOnly: true
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
          if (String(error.code || '') === 'REAL_BUILD_REQUIRED') {
            const diagnostics = result.build && result.build.diagnostics ? result.build.diagnostics : {};
            const missing = [];
            if (!(diagnostics.dotnet && diagnostics.dotnet.available)) {
              missing.push('dotnet SDK');
            }
            if (!(diagnostics.pluginApi && diagnostics.pluginApi.available)) {
              missing.push('PluginApi.dll');
            }

            const missingText = missing.length
              ? ` Missing prerequisites: ${missing.join(', ')}.`
              : '';
            const details = Array.isArray(error.details) ? error.details.filter(Boolean) : [];
            const detailText = !missing.length && details.length
              ? ` Build details: ${String(details[0])}`
              : '';
            setBuildStatus('warn', `Could not create plugin: ${message}${missingText}${detailText}`);
            return;
          }

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
      groupPath: item.groupPath || '',
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
    ensureGroupingBucketsFromActions();

    recordingActionId = null;
    renderApprovalCards();
    setReadiness('info', 'Review each action card and adjust shortcuts or icons if needed. Valid cards are marked ready automatically.');
    setGroupingStatus('info', 'Add groups and drag actions into the right group before creating your plugin.');
    return true;
  } catch (error) {
    approvalActions = [];
    groupingBuckets = [];
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
updateGroupingPanelState();
setLlmAssistStatus('info', 'Generate a prompt after your action cards are loaded.');
setDefaultIconTemplateColor(defaultIconBackgroundHex, 'default');
