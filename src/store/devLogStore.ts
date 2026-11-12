import { create } from 'zustand'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  details?: any
}

interface DevLogState {
  logs: LogEntry[]
  isPanelOpen: boolean
  addLog: (level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) => void
  clearLogs: () => void
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
}

export const useDevLogStore = create<DevLogState>((set) => ({
  logs: [],
  isPanelOpen: false,
  addLog: (level, message, details) => {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      level,
      message,
      details,
    }
    // Also mirror to native console for DevTools
    if (level === 'error') console.error(`[EditIn] ${message}`, details || '')
    else if (level === 'warn') console.warn(`[EditIn] ${message}`, details || '')
    else console.log(`[EditIn] ${message}`, details || '')

    set((state) => ({
      logs: [entry, ...state.logs].slice(0, 100), // keep latest 100 entries
    }))
  },
  clearLogs: () => set({ logs: [] }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
}))
