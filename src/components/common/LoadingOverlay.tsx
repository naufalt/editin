import React from 'react'
import { Loader2, Sparkles, FileText, CheckCircle2 } from 'lucide-react'

interface LoadingOverlayProps {
  isOpen: boolean
  title?: string
  progress?: number | null // 0 - 100 or null
  status?: string
  subStatus?: string
  pageStatus?: {
    currentPage: number
    totalPages: number
  }
  isDark?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  title = 'Memproses Dokumen...',
  progress = null,
  status = 'Mohon tunggu sebentar',
  subStatus,
  pageStatus,
  isDark = true,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 text-center relative overflow-hidden ${
          isDark 
            ? 'bg-[#13151D] border-white/10 text-slate-100 shadow-indigo-500/10' 
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-90" />

        <div className="flex flex-col items-center">
          <div className="relative mb-3.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Loader2 size={28} className="animate-spin text-indigo-500 stroke-[2.2]" />
            </div>
            <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
          </div>

          <h3 className="text-base font-bold tracking-tight">
            {title}
          </h3>

          <p className={`text-xs mt-1 leading-snug font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {status}
          </p>

          {/* Sub status info (e.g. current action detail) */}
          {subStatus && (
            <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {subStatus}
            </p>
          )}

          {/* Page counter pill if available */}
          {pageStatus && pageStatus.totalPages > 0 && (
            <div className={`mt-3 px-3 py-1 rounded-full text-[11px] font-mono font-semibold flex items-center space-x-1.5 border ${
              isDark ? 'bg-white/5 border-white/10 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <FileText size={12} />
              <span>
                Halaman {pageStatus.currentPage} dari {pageStatus.totalPages}
              </span>
            </div>
          )}

          {/* Progress Bar & Percentage */}
          {typeof progress === 'number' ? (
            <div className="w-full mt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Progres Pengerjaan
                </span>
                <span className="font-bold text-indigo-400 text-xs">
                  {progress}%
                </span>
              </div>

              <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 border ${
                isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'
              }`}>
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full shadow-sm shadow-indigo-500/50"
                  style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                <span>0% Membaca</span>
                <span>Optimasi Halaman</span>
                <span>100% Selesai</span>
              </div>
            </div>
          ) : (
            <div className={`w-full h-2 rounded-full overflow-hidden mt-4 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div className="h-full w-2/5 bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse rounded-full" />
            </div>
          )}

          {/* Real-time status hint */}
          <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1">
            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
            <span>Memproses 100% lokal di RAM komputer Anda (tanpa internet)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
