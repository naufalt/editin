import React, { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

export const Titlebar: React.FC = () => {
  const [isMax, setIsMax] = useState(false)
  const { isDark } = useAppSettings()

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

  return (
    <div className={`h-10 w-full border-b flex items-center justify-between select-none z-50 relative transition-colors duration-150 ${
      isDark ? 'bg-[#0C0D12] border-white/5' : 'bg-[#FFFFFF] border-slate-200 shadow-sm'
    }`}>
      {/* Draggable Region */}
      <div 
        className="flex-1 h-full flex items-center px-4 space-x-3 cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Brand Badge */}
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <span className="text-[10px] font-black text-white leading-none">E</span>
          </div>
          <span className={`text-xs font-bold tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            EDITIN <span className={`font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded ${
              isDark ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' : 'text-indigo-600 bg-indigo-50 border border-indigo-200'
            }`}>// DOC STUDIO</span>
          </span>
        </div>
      </div>

      {/* Non-draggable Window Control Buttons */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
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
    </div>
  )
}
