// Ergostyle 3D for Windows: opens Bazis .b3d files in the same viewer as the phone app.
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let ready = false;
let pending = null;

function b3dFrom(argv) {
  return (argv || []).slice(1).find(a => typeof a === 'string' && /\.b3d$/i.test(a) && fs.existsSync(a)) || null;
}

function openInPage(file) {
  if (!file) return;
  if (!win || !ready) { pending = file; return; }
  try {
    const b64 = fs.readFileSync(file).toString('base64');
    const name = path.basename(file).replace(/\.b3d$/i, '');
    win.webContents.executeJavaScript('openB64(' + JSON.stringify(b64) + ',' + JSON.stringify(name) + ')');
    if (win.isMinimized()) win.restore();
    win.focus();
  } catch (e) { /* unreadable file: the page keeps the current model */ }
}

// the page calls window.Android.savePdf(base64, name), same as on the phone
ipcMain.handle('save-pdf', async (_e, b64, name) => {
  const safe = String(name || 'ergostyle.pdf').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'ergostyle.pdf';
  const r = await dialog.showSaveDialog(win, {
    title: 'PDF-ის შენახვა',
    defaultPath: path.join(app.getPath('documents'), safe),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, Buffer.from(b64, 'base64'));
  shell.openPath(r.filePath);
  return true;
});

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
      webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') }
    });
    win.maximize();
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('did-finish-load', () => {
      ready = true;
      const f = pending || b3dFrom(process.argv);
      pending = null;
      // give the page a moment to finish opening its built-in sample first
      if (f) setTimeout(() => openInPage(f), 300);
    });
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
  });

  app.on('window-all-closed', () => app.quit());
}
