import React from 'react'
import { Minimize2, FileText, CheckCircle2, Zap } from 'lucide-react'
import { CompressQuality } from '../../utils/compressProtectEngine'
import { useAppSettings } from '../../store/settingsStore'

interface CompressStudioProps {
  fileName: string | null
  originalSizeBytes: number
  totalPageCount: number
  selectedQuality: CompressQuality
  onSelectQuality: (q: CompressQuality) => void
  isCompressing?: boolean
  compressProgress?: number | null
}

export const CompressStudio: React.FC<CompressStudioProps> = ({
  fileName,
  originalSizeBytes,
  totalPageCount,
  selectedQuality,
  onSelectQuality,
  isCompressing = false,
  compressProgress = null,
}) => {
  const { isDark, t } = useAppSettings()

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const presets: {
    id: CompressQuality
    title: string
    desc: string
    target: string
    tag?: string
  }[] = [
    {
      id: 'extreme',
      title: t.optExtremeTitle,
      desc: t.optExtremeDesc,
      target: t.optExtremeTarget,
    },
    {
      id: 'balanced',
      title: t.optBalancedTitle,
      desc: t.optBalancedDesc,
      target: t.optBalancedTarget,
      tag: t.optBalancedBadge,
    },
    {
      id: 'high',
      title: t.optHighTitle,
      desc: t.optHighDesc,
      target: t.optHighTarget,
    },
  ]

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-150 ${
      isDark ? 'bg-[#0C0D12]' : 'bg-[#F4F5F8]'
    }`}>
      {/* Top Header */}
      <div className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-150 ${
        isDark ? 'bg-[#13151D] border-white/5' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center space-x-2">
          <Minimize2 size={17} className="text-indigo-500" />
          <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.compressHeader}
          </span>
        </div>
        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {t.originalSize}: {formatSize(originalSizeBytes)}
        </span>
      </div>

      {/* Main Settings */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto space-y-4">
          <div className={`border rounded-2xl p-5 shadow-xl space-y-5 transition-colors duration-150 ${
            isDark ? 'bg-[#13151D] border-white/5' : 'bg-white border-slate-200'
          }`}>
            {/* File summary */}
            <div className={`flex items-center space-x-3 p-3.5 rounded-xl border ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                <FileText size={20} />
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {fileName || 'Dokumen Aktif'}
                </h4>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {totalPageCount} {t.pageUnit} • {formatSize(originalSizeBytes)}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold font-mono shrink-0">
                {t.offlineBadge}
              </div>
            </div>

            {/* In-Studio Progress Bar when processing */}
            {isCompressing && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 animate-pulse">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-indigo-500">Mengompresi Dokumen PDF...</span>
                  {typeof compressProgress === 'number' && (
                    <span className="font-mono font-bold text-indigo-500">{compressProgress}%</span>
                  )}
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                    style={{ width: `${typeof compressProgress === 'number' ? Math.max(10, compressProgress) : 60}%` }}
                  />
                </div>
              </div>
            )}

            {/* 3 Clean Presets */}
            <div className="space-y-2.5">
              <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.chooseProfile}
              </label>

              {presets.map((preset) => {
                const isSelected = selectedQuality === preset.id
                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectQuality(preset.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? isDark 
                          ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500 shadow-md' 
                          : 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500 shadow-sm'
                        : isDark 
                          ? 'border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="overflow-hidden pr-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {preset.title}
                        </span>
                        {preset.tag && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {preset.tag}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {preset.desc}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-xs font-mono font-bold text-indigo-500">
                        {preset.target}
                      </span>
                      {isSelected && (
                        <CheckCircle2 size={16} className="text-indigo-500 mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs ${
              isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Zap size={15} className="text-amber-500 shrink-0" />
              <span>
                {t.compressPrivacyNotice}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
