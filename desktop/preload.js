const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setPowerSave: (active) => ipcRenderer.send('power-save', active),
  updateTray: (label) => ipcRenderer.send('update-tray', label),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});
