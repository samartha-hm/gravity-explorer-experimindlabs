const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gravityDesktop', Object.freeze({ fullscreen: () => ipcRenderer.invoke('gravity:fullscreen') }));
