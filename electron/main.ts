import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'

let win: BrowserWindow | null = null

function createWindow() {
  const distPath = path.join(__dirname, '../dist')
  
  win = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 860,
    minHeight: 560,
    center: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0C0D12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  // Window Controls IPC
  ipcMain.on('window-minimize', () => {
    win?.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    if (win) {
      win.destroy()
      win = null
    }
    app.quit()
  })

  ipcMain.handle('window-is-maximized', () => win?.isMaximized() ?? false)

  // File Dialog Handlers
  ipcMain.handle('dialog:open-pdf', async () => {
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    })
    if (result.canceled) return null
    return result.filePaths
  })

  ipcMain.handle('fs:read-file-buffer', async (_event, filePath: string) => {
    const buf = await fs.readFile(filePath)
    return buf.buffer
  })

  ipcMain.handle('fs:save-file-buffer', async (_event, defaultName: string, buffer: ArrayBuffer) => {
    if (!win) return false
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    })
    if (result.canceled || !result.filePath) return false
    await fs.writeFile(result.filePath, Buffer.from(buffer))
    return true
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(distPath, 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
