import React from 'react'
import { Download, RefreshCw, FileCheck } from 'lucide-react'

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
  return (
    <footer className="h-14 bg-[#0C0D12] border-t border-white/5 px-6 flex items-center justify-between select-none">
      {/* Left status & info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs text-slate-300">
          <FileCheck size={16} className="text-indigo-400" />
          <span className="font-medium">
            {itemCount} {itemCount === 1 ? 'Page / File' : 'Pages / Files'} Loaded
          </span>
        </div>
        {statusText && (
          <>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">{statusText}</span>
          </>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-3">
        {onReset && (
          <button
            onClick={onReset}
            disabled={isLoading || itemCount === 0}
            className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
          >
            <RefreshCw size={13} />
            <span>Reset</span>
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
              <span>Processing...</span>
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
