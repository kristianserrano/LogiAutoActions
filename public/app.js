const statusEl = document.getElementById('status');
const shortcutResultsEl = document.getElementById('shortcutResults');
const readinessResultEl = document.getElementById('readinessResult');
const iconResultsEl = document.getElementById('iconResults');
const buildResultEl = document.getElementById('buildResult');
const diagnosticsResultEl = document.getElementById('diagnosticsResult');

const actionNameEl = document.getElementById('actionName');
const actionDescriptionEl = document.getElementById('actionDescription');
const actionTypeEl = document.getElementById('actionType');
const actionStatesEl = document.getElementById('actionStates');

const shortcutUrlEl = document.getElementById('shortcutUrl');
const shortcutTextEl = document.getElementById('shortcutText');
const shortcutFileEl = document.getElementById('shortcutFile');

const extractFromUrlBtn = document.getElementById('extractFromUrl');
const extractFromTextBtn = document.getElementById('extractFromText');
const checkReadinessBtn = document.getElementById('checkReadiness');
const rankIconsBtn = document.getElementById('rankIcons');
const runMockBuildBtn = document.getElementById('runMockBuild');
const runDiagnosticsBtn = document.getElementById('runDiagnostics');

let extractedShortcuts = [];

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

function mapActionKind(actionType) {
  if (actionType === 'toggle') {
    return 'toggle';
  }
  if (actionType === 'multistate') {
    return 'multistate';
  }
  return 'command';
}

function buildValidationPayload() {
  const actionName = actionNameEl.value.trim() || 'Generated Action';
  const actionType = actionTypeEl.value;
  const states = getStates();
  const inferredShortcut = extractedShortcuts.length > 0
    ? extractedShortcuts.map((item) => item.shortcut)
    : [];

  return {
    projectName: `${toPascalCase(actionName)}Plugin`,
    displayName: `${actionName} Plugin`,
    author: 'LogiAutoActions User',
    version: '1.0.0',
    actions: [
      {
        id: toPascalCase(actionName).toLowerCase(),
        name: actionName,
        actionKind: mapActionKind(actionType),
        intent: {
          states,
          sourceShortcuts: inferredShortcut
        }
      }
    ]
  };
}

function setReadiness(kind, message) {
  readinessResultEl.className = `readiness readiness-${kind}`;
  readinessResultEl.textContent = message;
}

function setBuildStatus(kind, message) {
  buildResultEl.className = `readiness readiness-${kind}`;
  buildResultEl.textContent = message;
}

function setDiagnosticsStatus(kind, message) {
  diagnosticsResultEl.className = `readiness readiness-${kind}`;
  diagnosticsResultEl.textContent = message;
}

function labelPack(pack) {
  if (pack === 'regular') {
    return 'Regular icon style';
  }
  if (pack === 'solid') {
    return 'Solid icon style';
  }
  if (pack === 'brands') {
    return 'Brand icon style';
  }
  return 'Icon style';
}

function summarizeReasons(reasons) {
  const input = Array.isArray(reasons) ? reasons : [];
  const messages = [];

  if (input.some((item) => item.startsWith('exact:'))) {
    messages.push('Name matches your action closely.');
  }
  if (input.some((item) => item.startsWith('concept:'))) {
    messages.push('This icon matches the action category.');
  }
  if (input.some((item) => item.includes('toggle'))) {
    messages.push('It fits toggle behavior.');
  }
  if (!messages.length) {
    messages.push('This is a close visual match.');
  }

  return messages.join(' ');
}

function getStates() {
  return actionStatesEl.value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function renderShortcuts(entries) {
  if (!entries.length) {
    shortcutResultsEl.textContent = 'No keyboard shortcuts were found.';
    return;
  }

  const lines = entries.map((entry, index) => {
    return `${index + 1}. ${entry.shortcut}\n   ${entry.context}`;
  });
  shortcutResultsEl.textContent = lines.join('\n\n');
}

function renderIconResults(result) {
  const ranked = Array.isArray(result.ranked) ? result.ranked.slice(0, 5) : [];
  if (!ranked.length) {
    iconResultsEl.textContent = 'No icon suggestions were returned.';
    return;
  }

  const selected = result.selected || ranked[0];

  iconResultsEl.innerHTML = ranked
    .map((item, index) => {
      const isSelected = selected && item.path === selected.path;
      return `
        <article class="result-item">
          <div class="result-row">
            <strong>${isSelected ? 'Recommended: ' : `Alternative ${index + 1}: `}${item.iconName}</strong>
            <span class="chip">${labelPack(item.pack)}</span>
          </div>
          <div class="result-reasons">${summarizeReasons(item.reasons)}</div>
          <details class="advanced-details">
            <summary>Show technical details</summary>
            <div class="result-path">${item.path}</div>
            <div class="result-path">Score: ${item.score}</div>
            <div class="result-reasons">${item.reasons.join(' | ')}</div>
          </details>
        </article>
      `;
    })
    .join('');
}

async function extractShortcuts(payload) {
  const response = await fetch('/api/shortcuts/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not import shortcuts.');
  }

  extractedShortcuts = data.entries || [];
  renderShortcuts(extractedShortcuts);
}

extractFromUrlBtn.addEventListener('click', async () => {
  const url = shortcutUrlEl.value.trim();
  if (!url) {
    shortcutResultsEl.textContent = 'Please enter a URL first.';
    return;
  }

  shortcutResultsEl.textContent = 'Importing shortcuts from URL...';
  try {
    await extractShortcuts({ sourceType: 'url', url });
  } catch (error) {
    shortcutResultsEl.textContent = error.message;
  }
});

extractFromTextBtn.addEventListener('click', async () => {
  const text = shortcutTextEl.value.trim();
  if (!text) {
    shortcutResultsEl.textContent = 'Please paste shortcuts text first.';
    return;
  }

  shortcutResultsEl.textContent = 'Importing shortcuts from text...';
  try {
    await extractShortcuts({ sourceType: 'text', text });
  } catch (error) {
    shortcutResultsEl.textContent = error.message;
  }
});

shortcutFileEl.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  shortcutResultsEl.textContent = `Reading ${file.name}...`;
  try {
    const text = await file.text();
    shortcutTextEl.value = text;
    await extractShortcuts({ sourceType: 'text', text });
  } catch (error) {
    shortcutResultsEl.textContent = `Unable to read file: ${error.message}`;
  }
});

rankIconsBtn.addEventListener('click', async () => {
  iconResultsEl.textContent = 'Finding best icon suggestions...';

  try {
    const response = await fetch('/api/icons/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionName: actionNameEl.value.trim(),
        description: actionDescriptionEl.value.trim(),
        actionType: actionTypeEl.value,
        states: getStates()
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Could not suggest icons.');
    }

    renderIconResults(data);
  } catch (error) {
    iconResultsEl.textContent = error.message;
  }
});

checkReadinessBtn.addEventListener('click', async () => {
  setReadiness('info', 'Checking your inputs...');

  try {
    const response = await fetch('/api/generator/validate-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildValidationPayload())
    });

    const data = await response.json();
    if (response.ok) {
      setReadiness('ok', 'Looks good. Your action setup is ready for generation.');
      return;
    }

    const firstError = Array.isArray(data.errors) && data.errors.length > 0
      ? data.errors[0].message
      : 'Please review your inputs.';
    setReadiness('warn', `Not ready yet: ${firstError}`);
  } catch (error) {
    setReadiness('warn', `Could not run readiness check: ${error.message}`);
  }
});

runMockBuildBtn.addEventListener('click', async () => {
  setBuildStatus('info', 'Starting Chrome test build...');

  try {
    const payloadResponse = await fetch('/api/generator/test-request/chrome-shortcuts');
    const payload = await payloadResponse.json();
    if (!payloadResponse.ok) {
      throw new Error(payload.error || 'Could not load Chrome test payload.');
    }

    const startResponse = await fetch('/api/generator/mock-build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startData = await startResponse.json();

    if (!startResponse.ok) {
      const reason = Array.isArray(startData.errors) && startData.errors.length
        ? startData.errors[0].message
        : 'Mock build could not be started.';
      throw new Error(reason);
    }

    const jobId = startData.jobId;
    setBuildStatus('info', 'Build queued. Preparing source files...');

    let attempts = 0;
    const maxAttempts = 20;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const statusResponse = await fetch(`/api/generator/mock-build/${jobId}`);
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) {
          clearInterval(timer);
          setBuildStatus('warn', statusData.message || 'Could not read build status.');
          return;
        }

        if (statusData.status === 'queued') {
          setBuildStatus('info', 'Build queued. Waiting for worker...');
        }

        if (statusData.status === 'building') {
          setBuildStatus('info', 'Building plugin project...');
        }

        if (statusData.status === 'packaging') {
          setBuildStatus('info', 'Packaging plugin into .lplug4...');
        }

        if (statusData.status === 'completed') {
          clearInterval(timer);
          const actionCount = Array.isArray(statusData.result && statusData.result.actionSummary)
            ? statusData.result.actionSummary.length
            : 0;
          setBuildStatus('ok', `Mock build completed. Generated ${actionCount} actions and packaged a .lplug4 artifact.`);
          return;
        }

        if (statusData.status === 'failed') {
          clearInterval(timer);
          const result = statusData.result || {};
          const error = result.error || {};
          const message = error.message || result.message || 'Build failed during verification.';
          setBuildStatus('warn', `Build failed: ${message}`);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(timer);
          setBuildStatus('warn', 'Build check timed out. Try again.');
        }
      } catch (error) {
        clearInterval(timer);
        setBuildStatus('warn', `Build status failed: ${error.message}`);
      }
    }, 600);
  } catch (error) {
    setBuildStatus('warn', `Mock build could not start: ${error.message}`);
  }
});

runDiagnosticsBtn.addEventListener('click', async () => {
  setDiagnosticsStatus('info', 'Checking local toolchain...');

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
      setDiagnosticsStatus('ok', 'All local tools are ready. Real plugin build mode is available.');
      return;
    }

    const missing = [];
    if (!dotnetReady) missing.push('dotnet');
    if (!logiToolReady) missing.push('LogiPluginTool');
    if (!pluginApiReady) missing.push('PluginApi.dll');

    setDiagnosticsStatus('warn', `Some tools are missing: ${missing.join(', ')}. The app will use fallback build mode.`);
  } catch (error) {
    setDiagnosticsStatus('warn', `Diagnostics failed: ${error.message}`);
  }
});

fetch('/api/health')
  .then((response) => response.json())
  .then((data) => {
    statusEl.textContent = data.ok ? 'API status: healthy' : 'API status: unhealthy';
  })
  .catch(() => {
    statusEl.textContent = 'API status: unavailable';
  });
