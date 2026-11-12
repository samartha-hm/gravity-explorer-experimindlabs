const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
let window;
let recoveries = 0;
const entry = path.join(__dirname, '../dist/index.html');
let approved = [];
let permissionFile;
function fingerprint(device) {
  return [device.vendorId || device.usbVendorId || '', device.productId || device.usbProductId || '', device.serialNumber || '', device.portName || ''].join(':');
}
function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 600,
    minHeight: 700,
    backgroundColor: '#080e18',
    title: 'GravityExplorer by ExpermindLabs',
    icon: path.join(__dirname, '../public/logo.png'),
    autoHideMenuBar: true,
    fullscreen: process.argv.includes('--kiosk'),
    kiosk: process.argv.includes('--kiosk'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('render-process-gone', () => {
    if (recoveries++ < 2) setTimeout(() => { if (window && !window.isDestroyed()) window.loadFile(entry); }, 1000);
    else dialog.showErrorBox('GravityExplorer', 'The display could not recover. Restart the app, then choose Low graphics in teacher controls.');
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'q') app.quit();
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
  });
  window.on('closed', () => { window = null; });
  window.loadFile(entry);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    permissionFile = path.join(app.getPath('userData'), 'approved-scale.json');
    try { const data = JSON.parse(fs.readFileSync(permissionFile, 'utf8')); if (Array.isArray(data)) approved = data.filter(x => typeof x === 'string').slice(0, 4); } catch { /* First launch. */ }
    const ses = session.defaultSession;
    ses.setPermissionCheckHandler((contents, permission) => contents === window?.webContents && permission === 'serial');
    ses.setPermissionRequestHandler((contents, permission, callback) => callback(contents === window?.webContents && permission === 'serial'));
    ses.setDevicePermissionHandler(details => details.deviceType === 'serial' && details.origin === 'file://' && approved.includes(fingerprint(details.device)));
    ses.on('select-serial-port', async (event, ports, contents, callback) => {
      event.preventDefault();
      if (contents !== window?.webContents || !ports.length) { callback(''); if (window && !ports.length) dialog.showMessageBox(window, { message: 'No serial device found', detail: 'Connect the Arduino USB data cable, install its driver if needed, then try again.' }); return; }
      const { response } = await dialog.showMessageBox(window, { title: 'Choose GravityExplorer Arduino', message: 'Choose the Arduino running GravityExplorer firmware', detail: 'Disconnect unrelated serial devices if you are unsure.', buttons: [...ports.map(p => `${p.displayName || p.portName} (${p.portName})`), 'Cancel'], cancelId: ports.length, noLink: true });
      const device = ports[response];
      if (!device) { callback(''); return; }
      // Retain only the explicitly selected device. No weight data is persisted.
      approved = [fingerprint(device)];
      try { fs.writeFileSync(permissionFile, JSON.stringify(approved), { mode: 0o600 }); } catch { /* Permission remains valid for this launch. */ }
      callback(device.portId);
    });
    ipcMain.handle('gravity:fullscreen', event => { if (event.sender !== window?.webContents) return; window.setFullScreen(!window.isFullScreen()); });
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
