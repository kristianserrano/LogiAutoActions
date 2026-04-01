const path = require('path');
const { app, BrowserWindow } = require('electron');
const { startServer, stopServer } = require('../server');

let mainWindow;
let localServer;

async function createWindow() {
  localServer = await startServer({
    port: 0,
    host: '127.0.0.1'
  });

  const address = localServer.address();
  const port = typeof address === 'object' && address ? address.port : 3000;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 720,
    title: 'LogiAutoActions',
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(`Failed to start Electron app: ${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  try {
    await stopServer();
  } catch (error) {
    console.error(`Failed to stop local server: ${error.message}`);
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
