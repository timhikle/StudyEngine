const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, powerSaveBlocker } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let powerBlockId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 780,
    resizable: false,
    frame: false,
    transparent: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);
  mainWindow.setTitle('Phase Study');

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Phase Study');

  const ctx = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(ctx);
  tray.on('click', () => mainWindow?.show());
}

function updateTray(label) {
  if (!tray) return;
  tray.setToolTip(label ? `Phase Study - ${label}` : 'Phase Study');
}

function setPowerSave(enabled) {
  if (enabled && powerBlockId === null) {
    powerBlockId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!enabled && powerBlockId !== null) {
    powerSaveBlocker.stop(powerBlockId);
    powerBlockId = null;
  }
}

// IPC handlers
ipcMain.on('power-save', (_, active) => setPowerSave(active));
ipcMain.on('update-tray', (_, label) => updateTray(label));
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png') }).show();
  }
});
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-close', () => mainWindow?.hide());

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {});
app.on('activate', () => mainWindow?.show());
