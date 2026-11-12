import React from 'react'
import { CheckCircle2, FolderOpen, ExternalLink, X, FileCheck, ArrowRight } from 'lucide-react'

export interface ResultModalData {
  isOpen: boolean
  title: string
  message: string
  filePath?: string
  fileName?: string
  details?: {
    originalSize?: string
    newSize?: string
    savings?: string
    pageCount?: number
  }
}

interface ResultModalProps {
  data: ResultModalData
  onClose: () => void
  isDark?: boolean
}

export const ResultModal: React.FC<ResultModalProps> = ({ data, onClose, isDark = true }) => {
  if (!data.isOpen) return null

  const handleOpenFolder = () => {
    if (data.filePath && window.electronAPI?.showItemInFolder) {
      window.electronAPI.showItemInFolder(data.filePath)
    }
  }

  const handleOpenFile = () => {
    if (data.filePath && window.electronAPI?.openPath) {
      window.electronAPI.openPath(data.filePath)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 overflow-hidden relative transform transition-all scale-100 ${
          isDark 
            ? 'bg-[#13151D] border-white/10 text-slate-100 shadow-indigo-500/10' 
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X size={18} />
        </button>

        {/* Success Icon with Glow */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={30} className="stroke-[2.2]" />
          </div>

          <h3 className="text-base font-bold tracking-tight">
            {data.title}
          </h3>

          <p className={`text-xs mt-1 leading-relaxed max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {data.message}
          </p>

          {/* Details Pill (e.g. Compression stats or File info) */}
          {data.details && (
            <div className={`mt-4 w-full p-3 rounded-xl border flex items-center justify-around text-xs ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              {data.details.originalSize && (
                <div className="text-center">
                  <span className={`block text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sebelum</span>
                  <span className="font-mono font-medium">{data.details.originalSize}</span>
                </div>
              )}
              {data.details.newSize && (
                <>
                  <ArrowRight size={14} className="text-indigo-400 shrink-0" />
                  <div className="text-center">
                    <span className={`block text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sesudah</span>
                    <span className="font-mono font-bold text-emerald-400">{data.details.newSize}</span>
                  </div>
                </>
              )}
              {data.details.savings && (
                <div className="text-center">
                  <span className={`block text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Hemat</span>
                  <span className="font-mono font-bold text-indigo-400">{data.details.savings}</span>
                </div>
              )}
            </div>
          )}

          {/* File Name preview */}
          {data.fileName && (
            <div className={`mt-3 w-full px-3 py-2 rounded-lg text-left flex items-center space-x-2 text-[11px] font-mono truncate border ${
              isDark ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <FileCheck size={14} className="text-indigo-400 shrink-0" />
              <span className="truncate">{data.fileName}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 w-full grid grid-cols-2 gap-2.5">
            {data.filePath ? (
              <>
                <button
                  onClick={handleOpenFile}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  <ExternalLink size={14} />
                  <span>Buka File</span>
                </button>
                <button
                  onClick={handleOpenFolder}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
                    isDark 
                      ? 'border-white/10 hover:bg-white/5 text-slate-200 hover:text-white' 
                      : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FolderOpen size={14} />
                  <span>Buka Folder</span>
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="col-span-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
