import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'

let win: BrowserWindow | null = null

function createWindow() {
  const distPath = path.join(__dirname, '../dist')
  
  win = new BrowserWindow({
    width: 1060,
    height: 700,
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
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  ipcMain.handle('fs:save-file-buffer', async (_event, defaultName: string, buffer: ArrayBuffer) => {
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, Buffer.from(buffer))
    return result.filePath
  })

  // Shell open actions
  ipcMain.handle('shell:show-item-in-folder', async (_event, fullPath: string) => {
    if (fullPath && fsSync.existsSync(fullPath)) {
      shell.showItemInFolder(fullPath)
      return true
    }
    return false
  })

  ipcMain.handle('shell:open-path', async (_event, fullPath: string) => {
    if (fullPath && fsSync.existsSync(fullPath)) {
      const err = await shell.openPath(fullPath)
      return err === ''
    }
    return false
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
