import React, { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export const Titlebar: React.FC = () => {
  const [isMax, setIsMax] = useState(false)

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
    <div className="h-10 w-full bg-[#0C0D12] border-b border-white/5 flex items-center justify-between select-none z-50 relative">
      {/* Draggable Region */}
      <div 
        className="flex-1 h-full flex items-center px-4 space-x-3 cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Brand Badge */}
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-[10px] font-black text-white leading-none">E</span>
          </div>
          <span className="text-xs font-bold tracking-wider text-slate-200">
            EDITIN <span className="text-indigo-400 font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">// DOC STUDIO</span>
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
          className="h-full px-4 hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title={isMax ? "Restore" : "Maximize"}
        >
          {isMax ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-500 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
