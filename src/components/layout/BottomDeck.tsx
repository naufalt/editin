import React from 'react'
import { Download, RefreshCw, FileCheck } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

interface BottomDeckProps {
  itemCount: number
  primaryActionLabel?: string
  onPrimaryAction: () => void
  onReset?: () => void
  isLoading?: boolean
  statusText?: string
}

export const BottomDeck: React.FC<BottomDeckProps> = ({
  itemCount,
  primaryActionLabel = 'Export Document',
  onPrimaryAction,
  onReset,
  isLoading = false,
  statusText,
}) => {
  const { isDark, t } = useAppSettings()

  return (
    <footer className={`h-14 border-t px-6 flex items-center justify-between select-none transition-colors duration-150 ${
      isDark ? 'bg-[#0C0D12] border-white/5' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Left status & info */}
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <FileCheck size={16} className="text-indigo-500 shrink-0" />
          <span className="font-medium">
            {itemCount} {itemCount === 1 ? t.pageUnit : t.pageUnit} {t.loadedInfo}
          </span>
        </div>
        {statusText && (
          <>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
            <span className={`text-xs font-mono truncate max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {statusText}
            </span>
          </>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-3">
        {onReset && (
          <button
            onClick={onReset}
            disabled={isLoading || itemCount === 0}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 ${
              isDark 
                ? 'border-white/10 hover:bg-white/5 text-slate-300 hover:text-white' 
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <RefreshCw size={13} />
            <span>{t.resetBtn}</span>
          </button>
        )}

        <button
          onClick={onPrimaryAction}
          disabled={isLoading || itemCount === 0}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 active:scale-95"
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>{t.processing}</span>
            </>
          ) : (
            <>
              <Download size={14} />
              <span>{primaryActionLabel}</span>
            </>
          )}
        </button>
      </div>
    </footer>
  )
}
