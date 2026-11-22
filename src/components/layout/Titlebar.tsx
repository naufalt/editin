import React, { useState, useEffect } from 'react'
import { Minus, Square, X, Copy, DownloadCloud } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'
import { UpdateModal } from '../common/UpdateModal'

export const Titlebar: React.FC = () => {
  const [isMax, setIsMax] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const { isDark, language } = useAppSettings()

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMax).catch(() => {})
  }, [])

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleMaximize = async () => {
    window.electronAPI?.maximize()
    const max = await window.electronAPI?.isMaximized()
    setIsMax(max)
  }
  const handleClose = () => window.electronAPI?.close()

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')

  return (
    <header className={`h-12 w-full border-b flex items-center justify-between select-none z-50 relative transition-colors duration-150 ${
      isDark ? 'bg-[#11131A] border-slate-800/80' : 'bg-[#E3E8F0] border-slate-300/70'
    }`}>
      {/* Left: Brand Identity */}
      <div
        className={`flex items-center gap-2.5 cursor-default ${isMac ? 'pl-20 pr-4' : 'px-4'}`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className={`w-7 h-7 rounded-xl p-1 border flex items-center justify-center shadow-sm ${
            isDark ? 'bg-[#181B24] border-slate-800' : 'bg-[#F8FAFC] border-slate-300/80'
          }`}
        >
          <img
            src="./app-icon.png"
            alt="EditIn"
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            EditIn
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md font-mono border font-semibold ${
              isDark
                ? 'bg-[#181B24] text-indigo-300 border-slate-800'
                : 'bg-[#F8FAFC] text-indigo-600 border-slate-300/70'
            }`}
          >
            v1.0.0
          </span>
        </div>
      </div>

      {/* Center Drag Handle Indicator */}
      <div
        className="flex-1 h-full flex items-center justify-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-300/90'}`} />
      </div>

      {/* Non-draggable Window Control Buttons */}
      <div 
        className="flex items-center h-full px-2 gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => setShowUpdateModal(true)}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
            isDark
              ? 'text-slate-400 hover:bg-slate-800/70'
              : 'text-slate-600 hover:bg-slate-300/60'
          }`}
          title={language === 'id' ? 'Cek Pembaruan' : 'Check for Updates'}
        >
          <DownloadCloud className="w-3.5 h-3.5 text-indigo-500" />
          <span>{language === 'id' ? 'Pembaruan' : 'Updates'}</span>
        </button>

        <div className={`w-px h-3.5 mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        <button
          onClick={handleMinimize}
          className={`h-full px-4 transition-colors flex items-center justify-center ${
            isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className={`h-full px-4 transition-colors flex items-center justify-center ${
            isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={isMax ? "Restore" : "Maximize"}
        >
          {isMax ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-rose-500 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
      <UpdateModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
    </header>
  )
}
