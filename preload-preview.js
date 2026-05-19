const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronPreview', {
  save:   () => ipcRenderer.send('preview-action', 'save'),
  cancel: () => ipcRenderer.send('preview-action', 'cancel')
});
