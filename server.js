const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');
const express = require('express');
const AdmZip = require('adm-zip');
const { rankIcons, scanIconCandidates } = require('./src/icon-ranking');
const { validateGeneratorRequest } = require('./src/validate-generator-request');
const { parseShortcutEntries, stripHtml } = require('./src/shortcut-extraction');
const { verifyLplug4Package } = require('./src/package-verification');
const { createChromeShortcutsTestRequest } = require('./src/sample-requests');

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
  const forceNoVerifier = process.env.LOGI_FORCE_NO_VERIFIER === '1';

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

function buildDraftActions(payload) {
  const actionName = String(payload.actionName || '').trim() || 'Generated Action';
  const actionDescription = String(payload.actionDescription || '').trim() || 'Generated action';
  const actionType = String(payload.actionType || 'single').trim();
  const states = Array.isArray(payload.states) ? payload.states.filter(Boolean) : [];
  const shortcuts = Array.isArray(payload.shortcuts) ? payload.shortcuts : [];

  if (actionType === 'toggle' && shortcuts.length >= 2) {
    return [
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
    ];
  }

  if (actionType === 'multistate' && shortcuts.length >= 3) {
    const generatedStates = states.length >= 3
      ? states
      : shortcuts.slice(0, 3).map((item, index) => toActionNameFromContext(item.context, `State ${index + 1}`));

    return [
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
    ];
  }

  if (shortcuts.length > 0) {
    return shortcuts.map((entry, index) => {
      const inferredName = toActionNameFromContext(entry.context, `${actionName} ${index + 1}`);
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
    });
  }

  return [
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
  ];
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
    const rankedIcons = rankIcons({
      actionName: action.name,
      description: action.description,
      actionType: action.actionKind,
      states: action.intent && Array.isArray(action.intent.states) ? action.intent.states : [],
      candidates: iconCandidates
    });

    const selectedIcon = rankedIcons.selected
      ? {
        path: rankedIcons.selected.path,
        pack: rankedIcons.selected.pack,
        score: rankedIcons.selected.score
      }
      : null;

    const shortcutSummary = action.behavior && Array.isArray(action.behavior.keyboardShortcuts)
      ? action.behavior.keyboardShortcuts
      : [];

    return {
      ...action,
      icon: selectedIcon,
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

function buildMockBuildResult(payload) {
  const artifacts = writePluginArtifacts(payload);
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
      const result = buildMockBuildResult(payload);
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

app.post('/api/generator/preview-actions', (req, res) => {
  const payload = req.body || {};
  const preview = buildApprovalPreview(payload);
  res.json({
    ok: true,
    preview
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
