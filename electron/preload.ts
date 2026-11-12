import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // File system & Dialogs
  openPdfDialog: () => ipcRenderer.invoke('dialog:open-pdf'),
  openFilesDialog: (options?: {
    multi?: boolean
    filters?: { name: string; extensions: string[] }[]
  }) => ipcRenderer.invoke('dialog:open-files', options),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('fs:read-file-buffer', filePath),
  saveFileBuffer: (defaultName: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('fs:save-file-buffer', defaultName, buffer),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:show-item-in-folder', fullPath),

  // Media Compression & Conversion (FFmpeg / Office)
  compressMediaFile: (payload: {
    id: string
    inputPath: string
    defaultOutputName: string
    mediaType: 'video' | 'image'
    quality: 'extreme' | 'balanced' | 'high'
  }) => ipcRenderer.invoke('media:compress-file', payload),

  convertMediaFile: (payload: {
    id: string
    inputPath: string
    defaultOutputName: string
    targetExt: string
    category: 'video' | 'audio' | 'image' | 'document'
    saveDirectory?: string
  }) => ipcRenderer.invoke('media:convert-file', payload),

  onMediaProgress: (
    callback: (data: { id: string; percent: number; eta?: string }) => void
  ) => {
    const listener = (_event: any, data: { id: string; percent: number; eta?: string }) =>
      callback(data)
    ipcRenderer.on('media:progress', listener)
    return () => {
      ipcRenderer.removeListener('media:progress', listener)
    }
  },
})
