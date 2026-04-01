const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');
const express = require('express');
const AdmZip = require('adm-zip');
const { rankIcons, scanIconCandidates } = require('./src/icon-ranking');
const { validateGeneratorRequest } = require('./src/validate-generator-request');

const app = express();
const PORT = process.env.PORT || 3000;
const ICONS_ROOT = path.join(__dirname, 'assets', 'icons');
const ARTIFACTS_ROOT = path.join(__dirname, 'artifacts');
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

  const pluginApiCandidates = [
    '/Applications/Utilities/LogiPluginService.app/Contents/MonoBundle/PluginApi.dll',
    'C:/Program Files/Logi/LogiPluginService/PluginApi.dll'
  ];

  const existingPluginApi = pluginApiCandidates.find((candidate) => fs.existsSync(candidate));

  return {
    dotnet,
    logiPluginTool: {
      available: logiPluginTool.available,
      version: logiPluginTool.available ? 'available' : null,
      output: logiPluginTool.output
    },
    pluginApi: {
      available: Boolean(existingPluginApi),
      path: existingPluginApi || null,
      candidates: pluginApiCandidates
    },
    canAttemptRealBuild: dotnet.available && Boolean(existingPluginApi)
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
  const words = String(value || '')
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

  if (action.actionKind === 'adjustment') {
    return {
      fileName: `${className}Adjustment.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}Adjustment : PluginDynamicAdjustment\n{\n    private Int32 _value = 100;\n\n    public ${className}Adjustment()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}", hasReset: true)\n    {\n    }\n\n    protected override void ApplyAdjustment(String actionParameter, Int32 diff)\n    {\n        _value += diff;\n        this.AdjustmentValueChanged();\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        _value = 100;\n        this.AdjustmentValueChanged();\n    }\n\n    protected override String GetAdjustmentValue(String actionParameter)\n        => $"{_value}%";\n}\n`
    };
  }

  if (action.actionKind === 'multistate') {
    const states = action.intent && Array.isArray(action.intent.states) ? action.intent.states : ['StateA', 'StateB', 'StateC'];
    const stateList = states.map((state) => `\"${state}\"`).join(', ');
    return {
      fileName: `${className}MultistateCommand.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}MultistateCommand : PluginMultistateDynamicCommand\n{\n    public ${className}MultistateCommand()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}", new[] { ${stateList} })\n    {\n    }\n}\n`
    };
  }

  if (action.actionKind === 'toggle') {
    const states = action.intent && Array.isArray(action.intent.states) ? action.intent.states : ['Off', 'On'];
    const stateA = states[0] || 'Off';
    const stateB = states[1] || 'On';
    return {
      fileName: `${className}ToggleCommand.cs`,
      className,
      content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}ToggleCommand : PluginDynamicCommand\n{\n    private Boolean _isSecondState;\n\n    public ${className}ToggleCommand()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}")\n    {\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        _isSecondState = !_isSecondState;\n        this.ActionImageChanged();\n    }\n\n    protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)\n        => _isSecondState ? "${stateB}" : "${stateA}";\n}\n`
    };
  }

  return {
    fileName: `${className}Command.cs`,
    className,
    content: `using System;\n\nnamespace Loupedeck.${pluginName}.Actions;\n\npublic class ${className}Command : PluginDynamicCommand\n{\n    public ${className}Command()\n        : base("${actionName}", "${actionDescription}", "${actionGroup}")\n    {\n    }\n\n    protected override void RunCommand(String actionParameter)\n    {\n        // Shortcut execution mapping to be added by generator runtime.\n    }\n}\n`
  };
}

function writePluginArtifacts(payload) {
  const pluginName = toPascalCase(payload.projectName, 'GeneratedPlugin');
  const artifactRoot = path.join(ARTIFACTS_ROOT, pluginName);
  const srcRoot = path.join(artifactRoot, 'src');
  const actionsRoot = path.join(srcRoot, 'Actions');
  const metadataRoot = path.join(srcRoot, 'package', 'metadata');
  const compiledRoot = path.join(artifactRoot, 'compiled');
  const diagnostics = getSystemDiagnostics();

  fs.mkdirSync(actionsRoot, { recursive: true });
  fs.mkdirSync(metadataRoot, { recursive: true });
  fs.mkdirSync(compiledRoot, { recursive: true });

  const generatedFiles = [];

  const pluginClassPath = path.join(srcRoot, `${pluginName}.cs`);
  fs.writeFileSync(
    pluginClassPath,
    `using System;\n\nnamespace Loupedeck.${pluginName};\n\npublic class ${pluginName} : Plugin\n{\n    public override Boolean UsesApplicationApiOnly => true;\n    public override Boolean HasNoApplication => true;\n\n    public override void Load()\n    {\n    }\n\n    public override void Unload()\n    {\n    }\n\n    public override Boolean Install() => true;\n    public override Boolean Uninstall() => true;\n}\n`,
    'utf8'
  );
  generatedFiles.push(path.relative(artifactRoot, pluginClassPath).split(path.sep).join('/'));

  const csprojPath = path.join(srcRoot, `${pluginName}.csproj`);
  const packageName = pluginName.replace(/plugin$/i, '') || 'GeneratedAction';
  const pluginBinaryName = `${packageName}Plugin.dll`;
  const assemblyName = pluginBinaryName.replace(/\.dll$/i, '');
  const pluginApiReference = diagnostics.pluginApi.available
    ? `\n  <ItemGroup>\n    <Reference Include=\"PluginApi\">\n      <HintPath>${escapeXml(diagnostics.pluginApi.path)}</HintPath>\n    </Reference>\n  </ItemGroup>`
    : '';
  fs.writeFileSync(
    csprojPath,
    `<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>disable</Nullable>\n    <RootNamespace>Loupedeck.${pluginName}</RootNamespace>\n    <AssemblyName>${assemblyName}</AssemblyName>\n  </PropertyGroup>${pluginApiReference}\n</Project>\n`,
    'utf8'
  );
  generatedFiles.push(path.relative(artifactRoot, csprojPath).split(path.sep).join('/'));

  const solutionPath = path.join(artifactRoot, `${pluginName}.sln`);
  fs.writeFileSync(
    solutionPath,
    `Microsoft Visual Studio Solution File, Format Version 12.00\n# Mock solution generated by LogiAutoActions\n`,
    'utf8'
  );
  generatedFiles.push(path.relative(artifactRoot, solutionPath).split(path.sep).join('/'));

  for (const action of payload.actions || []) {
    const classFile = createActionClass(pluginName, action);
    const classPath = path.join(actionsRoot, classFile.fileName);
    fs.writeFileSync(classPath, classFile.content, 'utf8');
    generatedFiles.push(path.relative(artifactRoot, classPath).split(path.sep).join('/'));
  }

  const packageYamlPath = path.join(metadataRoot, 'LoupedeckPackage.yaml');
  fs.writeFileSync(
    packageYamlPath,
    `name: ${packageName}\npluginName: ${packageName}\ndisplayName: \"${payload.displayName || pluginName}\"\nversion: ${payload.version || '1.0.0'}\nauthor: \"${payload.author || 'LogiAutoActions'}\"\nlicense: ${payload.license || 'MIT'}\npluginFileName: ${pluginBinaryName}\nsupportedDevices:\n  - ${Array.isArray(payload.supportedDevices) && payload.supportedDevices.length ? payload.supportedDevices[0] : 'LoupedeckCtFamily'}\nminimumLoupedeckVersion: ${payload.minimumLoupedeckVersion || '6.0'}\npluginFolderWin: win/bin\npluginFolderMac: mac/bin\n`,
    'utf8'
  );
  generatedFiles.push(path.relative(artifactRoot, packageYamlPath).split(path.sep).join('/'));

  const iconPath = path.join(metadataRoot, 'Icon256x256.png');
  const onePxPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0B3W0AAAAASUVORK5CYII=';
  fs.writeFileSync(iconPath, Buffer.from(onePxPngBase64, 'base64'));
  generatedFiles.push(path.relative(artifactRoot, iconPath).split(path.sep).join('/'));

  let realBuildUsed = false;
  const warnings = [];
  const compiledDllPath = path.join(compiledRoot, pluginBinaryName);

  if (diagnostics.canAttemptRealBuild) {
    const buildResult = spawnSync('dotnet', ['build', csprojPath, '-c', 'Release', '-o', compiledRoot], {
      encoding: 'utf8',
      timeout: 180000
    });

    if (buildResult.status === 0 && fs.existsSync(compiledDllPath)) {
      realBuildUsed = true;
      generatedFiles.push(path.relative(artifactRoot, compiledDllPath).split(path.sep).join('/'));
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
    generatedFiles,
    warnings,
    realBuildUsed,
    diagnostics
  };
}

function createChromeShortcutsTestRequest() {
  return {
    projectName: 'ChromeEditingTestPlugin',
    displayName: 'Chrome Editing Test Plugin',
    author: 'LogiAutoActions User',
    version: '1.0.0',
    description: 'Test plugin for Chrome keyboard shortcut actions and zoom adjustment.',
    category: 'Productivity',
    supportedDevices: ['LoupedeckCtFamily'],
    minimumLoupedeckVersion: '6.0',
    actions: [
      {
        id: 'cut_text',
        name: 'Cut',
        description: 'Cuts selected text in Chrome.',
        groupPath: 'Browser###Editing',
        actionKind: 'command',
        intent: {
          sourceShortcuts: ['Ctrl+X', 'Cmd+X']
        },
        behavior: {
          keyboardShortcuts: ['Ctrl+X', 'Cmd+X']
        }
      },
      {
        id: 'copy_text',
        name: 'Copy',
        description: 'Copies selected text in Chrome.',
        groupPath: 'Browser###Editing',
        actionKind: 'command',
        intent: {
          sourceShortcuts: ['Ctrl+C', 'Cmd+C']
        },
        behavior: {
          keyboardShortcuts: ['Ctrl+C', 'Cmd+C']
        }
      },
      {
        id: 'paste_text',
        name: 'Paste',
        description: 'Pastes clipboard content in Chrome.',
        groupPath: 'Browser###Editing',
        actionKind: 'command',
        intent: {
          sourceShortcuts: ['Ctrl+V', 'Cmd+V']
        },
        behavior: {
          keyboardShortcuts: ['Ctrl+V', 'Cmd+V']
        }
      },
      {
        id: 'browser_zoom',
        name: 'Browser Zoom',
        description: 'Rotary zoom in/out using Chrome shortcuts.',
        groupPath: 'Browser###View',
        actionKind: 'adjustment',
        intent: {
          sourceShortcuts: ['Ctrl+Plus', 'Ctrl+Minus', 'Cmd+Plus', 'Cmd+Minus']
        },
        behavior: {
          keyboardShortcuts: ['Ctrl+Plus', 'Ctrl+Minus', 'Cmd+Plus', 'Cmd+Minus'],
          resetOnPress: true,
          defaultValue: '100%'
        }
      }
    ]
  };
}

function buildMockBuildResult(payload) {
  const artifacts = writePluginArtifacts(payload);
  return {
    ok: true,
    pluginName: artifacts.pluginName,
    outputPath: path.relative(__dirname, artifacts.artifactRoot).split(path.sep).join('/'),
    generatedFiles: artifacts.generatedFiles,
    selectedIcons: [],
    warnings: artifacts.warnings,
    build: {
      attempted: true,
      succeeded: true,
      mode: artifacts.realBuildUsed ? 'real' : 'fallback',
      diagnostics: artifacts.diagnostics
    },
    package: {
      filePath: path.relative(__dirname, artifacts.packagePath).split(path.sep).join('/'),
      verifyPassed: true
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

function runMockBuildJob(jobId, payload) {
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
      active.status = 'completed';
      active.updatedAt = now();
      active.result = buildMockBuildResult(payload);
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

function decodeHtml(text) {
  return text
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

let iconCandidates = [];
try {
  iconCandidates = scanIconCandidates(ICONS_ROOT);
} catch (error) {
  console.warn('Unable to scan icons directory at startup:', error.message);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/icons/rank', (req, res) => {
  const payload = req.body || {};
  const candidates = Array.isArray(payload.candidates) && payload.candidates.length > 0
    ? payload.candidates
    : iconCandidates;

  if (!candidates.length) {
    res.status(400).json({
      error: 'No icon candidates found. Confirm assets/icons exists and contains .svg files.'
    });
    return;
  }

  const ranking = rankIcons({
    actionName: payload.actionName,
    description: payload.description,
    states: payload.states,
    actionType: payload.actionType,
    candidates
  });

  res.json({
    totalCandidates: candidates.length,
    ...ranking
  });
});

app.post('/api/shortcuts/extract', async (req, res) => {
  const payload = req.body || {};
  const sourceType = payload.sourceType || 'text';

  let sourceText = String(payload.text || '');
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

      sourceText = stripHtml(await response.text());
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
    entries
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
