import React, { useState } from 'react'
import { Terminal, Trash2, X, ChevronUp, ChevronDown, Bug, AlertTriangle, CheckCircle, Info, Copy } from 'lucide-react'
import { useDevLogStore } from '../../store/devLogStore'

interface DevLogDrawerProps {
  isDark?: boolean
}

export const DevLogDrawer: React.FC<DevLogDrawerProps> = ({ isDark = true }) => {
  const { logs, isPanelOpen, togglePanel, clearLogs } = useDevLogStore()
  const [copied, setCopied] = useState(false)

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1"><Bug size={10} /><span>ERR</span></span>
      case 'warn':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1"><AlertTriangle size={10} /><span>WARN</span></span>
      case 'success':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1"><CheckCircle size={10} /><span>OK</span></span>
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center space-x-1"><Info size={10} /><span>INFO</span></span>
    }
  }

  return (
    <>
      {/* Floating Toggle Pill button in bottom-right */}
      <button
        onClick={togglePanel}
        className={`fixed bottom-16 right-4 z-40 px-3 py-1.5 rounded-full border shadow-xl flex items-center space-x-2 text-xs font-mono transition-all active:scale-95 ${
          isDark 
            ? 'bg-[#13151D] border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/50' 
            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-md'
        }`}
        title="Buka Developer Logs & Status Console"
      >
        <Terminal size={13} className="text-indigo-400" />
        <span className="font-semibold text-[11px]">Console Logs</span>
        {logs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
            {logs.length}
          </span>
        )}
        {isPanelOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>

      {/* Drawer Panel */}
      {isPanelOpen && (
        <div className={`fixed bottom-0 right-0 left-0 sm:left-64 sm:right-6 sm:bottom-16 sm:max-w-xl z-50 rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isDark 
            ? 'bg-[#0E1017] border-white/10 text-slate-200' 
            : 'bg-white border-slate-200 text-slate-800 shadow-2xl'
        }`} style={{ maxHeight: '340px' }}>
          {/* Header */}
          <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs select-none ${
            isDark ? 'bg-[#13151D] border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Terminal size={14} className="text-indigo-400" />
              <span className="font-bold text-xs">Developer Live Event & Error Log</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="px-2 py-1 rounded-lg hover:bg-white/5 text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 disabled:opacity-30"
                title="Salin seluruh log ke clipboard"
              >
                <Copy size={12} />
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
              <button
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                title="Hapus log"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={togglePanel}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                title="Tutup panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Log Stream Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px] select-text">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Belum ada aktivitas atau error yang tercatat. Semua proses berjalan lancar.
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2 rounded-lg border flex items-start space-x-2 leading-relaxed ${
                    log.level === 'error'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : log.level === 'warn'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : log.level === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : isDark
                      ? 'bg-white/5 border-white/5 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 text-[10px] pt-0.5">{log.timestamp}</span>
                  <div className="shrink-0">{getLevelBadge(log.level)}</div>
                  <div className="flex-1 overflow-hidden break-words">
                    <span>{log.message}</span>
                    {log.details && (
                      <pre className="mt-1 text-[10px] text-slate-400 overflow-x-auto bg-black/40 p-1.5 rounded">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
