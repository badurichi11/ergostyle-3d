const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('Android', {
  savePdf: (b64, name) => ipcRenderer.invoke('save-pdf', b64, name)
});
