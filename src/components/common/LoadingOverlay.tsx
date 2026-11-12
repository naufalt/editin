import React from 'react'
import { Loader2, Sparkles } from 'lucide-react'

interface LoadingOverlayProps {
  isOpen: boolean
  title?: string
  progress?: number | null // 0 - 100 or null for indeterminate
  status?: string
  isDark?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  title = 'Memproses Dokumen...',
  progress = null,
  status = 'Mohon tunggu sebentar',
  isDark = true,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center relative overflow-hidden ${
          isDark 
            ? 'bg-[#13151D] border-white/10 text-slate-100 shadow-indigo-500/10' 
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Loader2 size={26} className="animate-spin text-indigo-500" />
            </div>
            <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
          </div>

          <h3 className="text-sm font-bold tracking-tight">
            {title}
          </h3>

          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {status}
          </p>

          {/* Progress Bar (if percentage available) */}
          {typeof progress === 'number' ? (
            <div className="w-full mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Proses</span>
                <span className="font-bold text-indigo-400">{progress}%</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-4 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div className="h-full w-2/5 bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
