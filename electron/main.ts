import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { spawn } from 'node:child_process'

let win: BrowserWindow | null = null

function resolveFfmpegBinary(): string {
  const candidates = [
    path.join(process.cwd(), 'resources', 'bin', 'ffmpeg.exe'),
    path.join(process.cwd(), '..', 'convertin', 'resources', 'bin', 'ffmpeg.exe'),
    (process as any).resourcesPath
      ? path.join((process as any).resourcesPath, 'bin', 'ffmpeg.exe')
      : '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate
    }
  }
  return 'ffmpeg'
}

function getOfficeHelperScriptPath(): string {
  const candidates = [
    path.join(process.cwd(), 'electron', 'officeHelper.ps1'),
    path.join(__dirname, 'officeHelper.ps1'),
    (process as any).resourcesPath
      ? path.join((process as any).resourcesPath, 'app', 'electron', 'officeHelper.ps1')
      : '',
  ].filter(Boolean)

  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c
  }
  return candidates[0]
}

function formatSecondsToTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function runFfmpegWithProgress(
  id: string,
  args: string[],
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const ffmpegBin = resolveFfmpegBinary()
    const proc = spawn(ffmpegBin, args, { shell: false })
    let totalDurationSeconds = 0
    const stderrLines: string[] = []

    proc.stderr?.on('data', (chunk) => {
      const line = chunk.toString()
      stderrLines.push(line)

      if (totalDurationSeconds === 0) {
        const durMatch = line.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
        if (durMatch) {
          const hours = parseInt(durMatch[1], 10)
          const minutes = parseInt(durMatch[2], 10)
          const seconds = parseInt(durMatch[3], 10)
          const centis = parseInt(durMatch[4], 10)
          totalDurationSeconds = hours * 3600 + minutes * 60 + seconds + centis / 100
        }
      }

      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)
      if (timeMatch && totalDurationSeconds > 0) {
        const hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const seconds = parseInt(timeMatch[3], 10)
        const centis = parseInt(timeMatch[4], 10)
        const currentSeconds = hours * 3600 + minutes * 60 + seconds + centis / 100

        const percent = Math.min(99, Math.round((currentSeconds / totalDurationSeconds) * 100))
        let eta = ''
        if (speedMatch) {
          const speedNum = parseFloat(speedMatch[1])
          if (speedNum > 0) {
            const remainingSec = Math.max(0, (totalDurationSeconds - currentSeconds) / speedNum)
            eta = formatSecondsToTime(remainingSec)
          }
        }
        mainWindow?.webContents.send('media:progress', {
          id,
          percent,
          eta: eta ? `ETA ${eta}` : undefined,
        })
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        mainWindow?.webContents.send('media:progress', { id, percent: 100 })
        resolve({ success: true })
      } else {
        const relevant = stderrLines
          .join('\n')
          .split('\n')
          .filter(
            (l) =>
              !l.startsWith('ffmpeg version') &&
              !l.startsWith('  built with') &&
              !l.startsWith('  configuration:') &&
              !l.startsWith('  libav') &&
              l.trim().length > 0
          )
        resolve({
          success: false,
          error: relevant.slice(-3).join(' ') || `FFmpeg keluar dengan kode ${code}`,
        })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

function createWindow() {
  const distPath = path.join(__dirname, '../dist')

  win = new BrowserWindow({
    width: 1080,
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

  // Universal file dialog for Compress (PDF, Image, Video) and Convert (All formats)
  ipcMain.handle(
    'dialog:open-files',
    async (
      _event,
      options?: {
        multi?: boolean
        filters?: { name: string; extensions: string[] }[]
      }
    ) => {
      if (!win) return null
      const result = await dialog.showOpenDialog(win, {
        properties: options?.multi ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: options?.filters || [
          {
            name: 'Semua File Didukung (PDF, Gambar, Video, Audio, Dokumen)',
            extensions: [
              'pdf',
              'jpg',
              'jpeg',
              'png',
              'webp',
              'bmp',
              'gif',
              'ico',
              'svg',
              'mp4',
              'mkv',
              'mov',
              'avi',
              'webm',
              'wmv',
              'flv',
              'mp3',
              'wav',
              'aac',
              'flac',
              'ogg',
              'm4a',
              'docx',
              'doc',
              'pptx',
              'ppt',
              'xlsx',
              'xls',
              'txt',
              'md',
              'csv',
              'html',
            ],
          },
        ],
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const items = await Promise.all(
        result.filePaths.map(async (fp) => {
          const stat = await fs.stat(fp)
          return {
            path: fp,
            name: path.basename(fp),
            size: stat.size,
            ext: path.extname(fp).toLowerCase().replace('.', ''),
          }
        })
      )
      return items
    }
  )

  ipcMain.handle('fs:read-file-buffer', async (_event, filePath: string) => {
    const buf = await fs.readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  ipcMain.handle('fs:save-file-buffer', async (_event, defaultName: string, buffer: ArrayBuffer) => {
    if (!win) return false
    const ext = path.extname(defaultName).toLowerCase().replace('.', '') || 'pdf'
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: `${ext.toUpperCase()} File`, extensions: [ext] }],
    })
    if (result.canceled || !result.filePath) return false
    await fs.writeFile(result.filePath, Buffer.from(buffer))
    return true
  })

  ipcMain.handle('shell:show-item-in-folder', (_event, fullPath: string) => {
    if (fullPath && fsSync.existsSync(fullPath)) {
      shell.showItemInFolder(fullPath)
      return true
    }
    return false
  })

  // Compress Video or Image via FFmpeg + Native Save Dialog
  ipcMain.handle(
    'media:compress-file',
    async (
      _event,
      payload: {
        id: string
        inputPath: string
        defaultOutputName: string
        mediaType: 'video' | 'image'
        quality: 'extreme' | 'balanced' | 'high'
      }
    ) => {
      if (!win) return { success: false, error: 'Window tidak ditemukan' }
      const { id, inputPath, defaultOutputName, mediaType, quality } = payload
      const ext = path.extname(defaultOutputName).toLowerCase().replace('.', '') || 'mp4'
      const defaultDir = path.dirname(inputPath)
      const saveDialog = await dialog.showSaveDialog(win, {
        defaultPath: path.join(defaultDir, defaultOutputName),
        filters: [{ name: `${ext.toUpperCase()} File`, extensions: [ext] }],
      })

      if (saveDialog.canceled || !saveDialog.filePath) {
        return { success: false, canceled: true }
      }

      const outputPath = saveDialog.filePath
      const originalStat = await fs.stat(inputPath)
      const originalSize = originalStat.size

      const args: string[] = ['-y', '-i', inputPath]

      if (mediaType === 'video') {
        if (quality === 'extreme') {
          args.push(
            '-vcodec',
            'libx264',
            '-crf',
            '30',
            '-preset',
            'veryfast',
            '-vf',
            "scale='min(1280,iw)':-2",
            '-acodec',
            'aac',
            '-b:a',
            '96k'
          )
        } else if (quality === 'balanced') {
          args.push(
            '-vcodec',
            'libx264',
            '-crf',
            '25',
            '-preset',
            'fast',
            '-vf',
            "scale='min(1920,iw)':-2",
            '-acodec',
            'aac',
            '-b:a',
            '128k'
          )
        } else {
          args.push(
            '-vcodec',
            'libx264',
            '-crf',
            '20',
            '-preset',
            'medium',
            '-acodec',
            'aac',
            '-b:a',
            '192k'
          )
        }
      } else {
        // Image compression via FFmpeg fallback
        if (ext === 'jpg' || ext === 'jpeg') {
          const qVal = quality === 'extreme' ? '14' : quality === 'balanced' ? '7' : '3'
          args.push('-q:v', qVal)
        } else if (ext === 'webp') {
          const qVal = quality === 'extreme' ? '45' : quality === 'balanced' ? '72' : '88'
          args.push('-c:v', 'libwebp', '-quality', qVal)
        } else if (ext === 'png') {
          if (quality === 'extreme') {
            args.push('-vf', "scale='min(1400,iw)':-1", '-compression_level', '9')
          } else if (quality === 'balanced') {
            args.push('-vf', "scale='min(2000,iw)':-1", '-compression_level', '9')
          } else {
            args.push('-compression_level', '9')
          }
        }
      }

      args.push(outputPath)

      const res = await runFfmpegWithProgress(id, args, win)
      if (!res.success) {
        return { success: false, error: res.error }
      }

      const newStat = await fs.stat(outputPath)
      const newSize = newStat.size
      const savingsPercent = Math.max(
        0,
        Math.round(((originalSize - newSize) / Math.max(1, originalSize)) * 100)
      )

      return {
        success: true,
        outputPath,
        originalSize,
        newSize,
        savingsPercent,
      }
    }
  )

  // Universal Conversion via FFmpeg or Office COM
  ipcMain.handle(
    'media:convert-file',
    async (
      _event,
      payload: {
        id: string
        inputPath: string
        defaultOutputName: string
        targetExt: string
        category: 'video' | 'audio' | 'image' | 'document'
        saveDirectory?: string
      }
    ) => {
      if (!win) return { success: false, error: 'Window tidak ditemukan' }
      const { id, inputPath, defaultOutputName, targetExt, category } = payload
      const cleanExt = targetExt.toLowerCase().replace('.', '')
      const defaultDir = payload.saveDirectory || path.dirname(inputPath)

      const saveDialog = await dialog.showSaveDialog(win, {
        defaultPath: path.join(defaultDir, defaultOutputName),
        filters: [{ name: `${cleanExt.toUpperCase()} File`, extensions: [cleanExt] }],
      })

      if (saveDialog.canceled || !saveDialog.filePath) {
        return { success: false, canceled: true }
      }

      const outputPath = saveDialog.filePath
      const inputExt = path.extname(inputPath).toLowerCase().replace('.', '')

      // Office document conversion via PowerShell COM
      const isOfficeConversion =
        (['docx', 'doc', 'rtf', 'pptx', 'ppt', 'xlsx', 'xls'].includes(inputExt) &&
          cleanExt === 'pdf') ||
        (inputExt === 'pdf' && ['docx', 'doc'].includes(cleanExt))

      if (isOfficeConversion) {
        let action = ''
        if (['docx', 'doc', 'rtf'].includes(inputExt) && cleanExt === 'pdf') action = 'docx-to-pdf'
        else if (inputExt === 'pdf' && ['docx', 'doc'].includes(cleanExt)) action = 'pdf-to-docx'
        else if (['pptx', 'ppt'].includes(inputExt) && cleanExt === 'pdf') action = 'pptx-to-pdf'
        else if (['xlsx', 'xls'].includes(inputExt) && cleanExt === 'pdf') action = 'xlsx-to-pdf'

        if (action) {
          win.webContents.send('media:progress', { id, percent: 25 })
          const scriptPath = getOfficeHelperScriptPath()
          const officeRes = await new Promise<{ success: boolean; error?: string }>((resolve) => {
            const child = spawn('powershell.exe', [
              '-NoProfile',
              '-ExecutionPolicy',
              'Bypass',
              '-File',
              scriptPath,
              '-Action',
              action,
              '-InputPath',
              inputPath,
              '-OutputPath',
              outputPath,
            ])
            let stderr = ''
            child.stderr?.on('data', (d) => (stderr += d.toString()))
            child.on('close', (code) => {
              if (code === 0 && fsSync.existsSync(outputPath)) {
                win?.webContents.send('media:progress', { id, percent: 100 })
                resolve({ success: true })
              } else {
                resolve({
                  success: false,
                  error:
                    stderr.trim() ||
                    'Gagal mengonversi via Microsoft Office. Pastikan Microsoft Office terinstal di PC Anda.',
                })
              }
            })
            child.on('error', (err) => resolve({ success: false, error: err.message }))
          })
          return { ...officeRes, outputPath }
        }
      }

      // FFmpeg conversion for Video, Audio, and Image formats
      const args: string[] = ['-y', '-i', inputPath]

      if (category === 'image') {
        if (cleanExt === 'ico') {
          args.push(
            '-vf',
            'scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=black@0'
          )
        } else if (cleanExt === 'webp') {
          args.push('-c:v', 'libwebp', '-quality', '86')
        } else if (['jpg', 'jpeg'].includes(cleanExt)) {
          args.push('-q:v', '2')
        }
      } else if (category === 'video') {
        if (cleanExt === 'gif') {
          args.push(
            '-vf',
            'fps=15,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
          )
        } else if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(cleanExt)) {
          args.push('-vn')
          if (cleanExt === 'mp3') args.push('-c:a', 'libmp3lame', '-q:a', '2')
          else if (cleanExt === 'aac' || cleanExt === 'm4a') args.push('-c:a', 'aac', '-b:a', '192k')
          else if (cleanExt === 'wav') args.push('-c:a', 'pcm_s16le')
          else if (cleanExt === 'flac') args.push('-c:a', 'flac')
          else if (cleanExt === 'ogg') args.push('-c:a', 'libvorbis', '-q:a', '5')
        } else if (cleanExt === 'webm') {
          args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus')
        } else {
          args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-b:a', '192k')
        }
      } else if (category === 'audio') {
        args.push('-vn')
        if (cleanExt === 'mp3') args.push('-c:a', 'libmp3lame', '-q:a', '2')
        else if (cleanExt === 'wav') args.push('-c:a', 'pcm_s16le')
        else if (cleanExt === 'flac') args.push('-c:a', 'flac')
        else if (cleanExt === 'aac' || cleanExt === 'm4a') args.push('-c:a', 'aac', '-b:a', '192k')
        else if (cleanExt === 'ogg') args.push('-c:a', 'libvorbis', '-q:a', '5')
      }

      args.push(outputPath)
      const res = await runFfmpegWithProgress(id, args, win)
      return { ...res, outputPath }
    }
  )

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
