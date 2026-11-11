export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  openPdfDialog: () => Promise<string[] | null>
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>
  saveFileBuffer: (defaultName: string, buffer: ArrayBuffer) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
