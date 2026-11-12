import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // File system & Dialogs
  openPdfDialog: () => ipcRenderer.invoke('dialog:open-pdf'),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('fs:read-file-buffer', filePath),
  saveFileBuffer: (defaultName: string, buffer: ArrayBuffer) => ipcRenderer.invoke('fs:save-file-buffer', defaultName, buffer),

  // Shell integration
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:show-item-in-folder', fullPath),
  openPath: (fullPath: string) => ipcRenderer.invoke('shell:open-path', fullPath),
})
