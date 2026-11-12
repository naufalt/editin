import React, { useState } from 'react'
import { Split, FileText, CheckCircle2, AlertCircle, Layers } from 'lucide-react'
import { parsePageRange } from '../../utils/mergeSplitEngine'

interface SplitStudioProps {
  fileName: string | null
  totalPageCount: number
  rangeString: string
  onRangeChange: (val: string) => void
  onQuickPreset: (preset: 'first' | 'last' | 'all-except-first') => void
  splitMode: 'range' | 'every-n'
  onModeChange: (mode: 'range' | 'every-n') => void
  nValue: number
  onNValueChange: (n: number) => void
}

export const SplitStudio: React.FC<SplitStudioProps> = ({
  fileName,
  totalPageCount,
  rangeString,
  onRangeChange,
  onQuickPreset,
  splitMode,
  onModeChange,
  nValue,
  onNValueChange,
}) => {
  const [customRange, setCustomRange] = useState(rangeString || (totalPageCount > 1 ? `1-${Math.min(3, totalPageCount)}` : '1'))

  const handleInputChange = (val: string) => {
    setCustomRange(val)
    onRangeChange(val)
  }

  const parsedIndices = parsePageRange(customRange, totalPageCount)
  const isValidRange = parsedIndices.length > 0
  const estimatedChunks = Math.ceil(totalPageCount / (nValue || 1))

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] shrink-0">
        <div className="flex items-center space-x-2">
          <Split size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">Pisah & Ambil Halaman</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Total Dokumen: {totalPageCount} Halaman
        </span>
      </div>

      {/* Main Split Settings Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto">
          <div className="bg-[#13151D] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
          {/* File summary */}
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {fileName || 'Dokumen Aktif'}
              </h4>
              <span className="text-[11px] text-slate-400">
                Terdiri dari {totalPageCount} halaman
              </span>
            </div>
          </div>

          {/* Mode Switcher: Range vs Every N Pages */}
          <div className="flex p-1 rounded-xl bg-[#0C0D12] border border-white/5">
            <button
              onClick={() => onModeChange('range')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'range'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ekstrak Rentang Halaman
            </button>
            <button
              onClick={() => onModeChange('every-n')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'every-n'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pecah Tiap N Halaman
            </button>
          </div>

          {splitMode === 'range' ? (
            <>
              {/* Quick presets */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Pilihan Cepat:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const val = '1'
                      handleInputChange(val)
                      onQuickPreset('first')
                    }}
                    className="py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Hal Pertama (1)
                  </button>
                  <button
                    onClick={() => {
                      const val = `${totalPageCount}`
                      handleInputChange(val)
                      onQuickPreset('last')
                    }}
                    className="py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Hal Terakhir ({totalPageCount})
                  </button>
                  <button
                    onClick={() => {
                      const val = totalPageCount > 1 ? `2-${totalPageCount}` : '1'
                      handleInputChange(val)
                      onQuickPreset('all-except-first')
                    }}
                    className="py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Hal 2 ke Akhir
                  </button>
                </div>
              </div>

              {/* Custom Range Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Ketik Halaman yang Ingin Diambil:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Contoh: 1-3, 5, 8"
                    className="w-full bg-[#0C0D12] border border-white/15 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Gunakan minus (<code className="text-indigo-300">-</code>) untuk rentang, dan koma (<code className="text-indigo-300">,</code>) untuk memisahkan halaman.
                </p>
              </div>

              {/* Validation & Preview status */}
              <div className={`p-3.5 rounded-xl border flex items-center space-x-2.5 ${
                isValidRange 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}>
                {isValidRange ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-medium">
                      {parsedIndices.length} halaman akan diekstrak: [{parsedIndices.map((i) => i + 1).join(', ')}]
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span className="text-xs font-medium">
                      Rentang halaman belum valid atau di luar jumlah total halaman dokumen
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Split Every N Pages Mode */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Pecah Menjadi Berkas Baru Setiap Berapa Halaman?
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max={totalPageCount}
                    value={nValue}
                    onChange={(e) => onNValueChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 bg-[#0C0D12] border border-white/15 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none text-center font-bold"
                  />
                  <span className="text-xs text-slate-300 font-medium">Halaman per berkas</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center space-x-3 text-indigo-300">
                <Layers size={18} />
                <div className="text-xs">
                  Dokumen akan dipecah menjadi <b className="text-white">{estimatedChunks} berkas PDF baru</b> terpisah.
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
