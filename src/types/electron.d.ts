export interface SelectedFileEntry {
  path: string
  name: string
  size: number
  ext: string
}

export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  openPdfDialog: () => Promise<string[] | null>
  openFilesDialog: (options?: {
    multi?: boolean
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<SelectedFileEntry[] | null>
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>
  saveFileBuffer: (defaultName: string, buffer: ArrayBuffer) => Promise<boolean>
  showItemInFolder: (fullPath: string) => Promise<boolean>
  compressMediaFile: (payload: {
    id: string
    inputPath: string
    defaultOutputName: string
    mediaType: 'video' | 'image'
    quality: 'extreme' | 'balanced' | 'high'
  }) => Promise<{
    success: boolean
    canceled?: boolean
    outputPath?: string
    originalSize?: number
    newSize?: number
    savingsPercent?: number
    error?: string
  }>
  convertMediaFile: (payload: {
    id: string
    inputPath: string
    defaultOutputName: string
    targetExt: string
    category: 'video' | 'audio' | 'image' | 'document'
    saveDirectory?: string
  }) => Promise<{
    success: boolean
    canceled?: boolean
    outputPath?: string
    error?: string
  }>
  onMediaProgress: (
    callback: (data: { id: string; percent: number; eta?: string }) => void
  ) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
