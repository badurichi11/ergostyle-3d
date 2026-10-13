// Ergostyle 3D for Windows: opens Bazis .b3d files in the same viewer as the phone app.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let pending = null;

function b3dFrom(argv) {
  return (argv || []).find(a => typeof a === 'string' && /\.b3d$/i.test(a) && fs.existsSync(a)) || null;
}

function openInPage(file) {
  if (!file) return;
  if (!win || win.webContents.isLoading()) { pending = file; return; }
  try {
    const b64 = fs.readFileSync(file).toString('base64');
    const name = path.basename(file).replace(/\.b3d$/i, '');
    win.webContents.executeJavaScript('openB64(' + JSON.stringify(b64) + ',' + JSON.stringify(name) + ')');
    if (win.isMinimized()) win.restore();
    win.focus();
  } catch (e) { /* unreadable file: the page keeps the current model */ }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => openInPage(b3dFrom(argv)));

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1400, height: 900, minWidth: 900, minHeight: 600,
      title: 'Ergostyle 3D', backgroundColor: '#e9edf1',
      icon: path.join(__dirname, 'app', 'icon.png'),
      webPreferences: { contextIsolation: true, sandbox: true }
    });
    win.maximize();
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('did-finish-load', () => {
      const f = pending || b3dFrom(process.argv);
      pending = null;
      if (f) openInPage(f);
    });
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
  });

  app.on('window-all-closed', () => app.quit());
}
