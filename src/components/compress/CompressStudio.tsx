import React from 'react'
import { Minimize2, FileText, CheckCircle2, Zap } from 'lucide-react'
import { CompressQuality } from '../../utils/compressProtectEngine'

interface CompressStudioProps {
  fileName: string | null
  originalSizeBytes: number
  totalPageCount: number
  selectedQuality: CompressQuality
  onSelectQuality: (q: CompressQuality) => void
}

export const CompressStudio: React.FC<CompressStudioProps> = ({
  fileName,
  originalSizeBytes,
  totalPageCount,
  selectedQuality,
  onSelectQuality,
}) => {
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
      title: 'Maksimal Kompres (Ukuran Terkecil)',
      desc: 'Kompresi agresif untuk ukuran file sekecil mungkin agar lolos batas upload ketat (< 1–2 MB).',
      target: 'Ukuran Terkecil',
    },
    {
      id: 'balanced',
      title: 'Seimbang (Rekomendasi)',
      desc: 'Perpaduan ideal antara ukuran file yang jauh lebih ringan dan ketajaman teks untuk portal/email.',
      target: '~60-75% Lebih Ringan',
      tag: 'Rekomendasi',
    },
    {
      id: 'high',
      title: 'Maksimal Kualitas',
      desc: 'Mempertahankan ketajaman visual tertinggi sembari membersihkan struktur dan beban gambar berlebih.',
      target: 'Kualitas Terbaik',
    },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] shrink-0">
        <div className="flex items-center space-x-2">
          <Minimize2 size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">Kecilkan Ukuran Dokumen (PDF Slim)</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Ukuran Asli: {formatSize(originalSizeBytes)}
        </span>
      </div>

      {/* Main Settings (Scrollable cleanly on small windows without clipping top) */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto">
          <div className="bg-[#13151D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5">
            {/* File summary */}
            <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <FileText size={20} />
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="text-xs font-semibold text-slate-200 truncate">
                  {fileName || 'Dokumen Aktif'}
                </h4>
                <span className="text-[11px] text-slate-400 block">
                  {totalPageCount} Halaman • {formatSize(originalSizeBytes)}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono shrink-0">
                100% Offline
              </div>
            </div>

            {/* 3 Clean Presets */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Pilih Tingkat Kompresi (3 Opsi):
              </label>

              {presets.map((preset) => {
                const isSelected = selectedQuality === preset.id
                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectQuality(preset.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500 shadow-md'
                        : 'border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="overflow-hidden pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100">
                          {preset.title}
                        </span>
                        {preset.tag && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {preset.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {preset.target}
                      </span>
                      {isSelected && (
                        <CheckCircle2 size={16} className="text-indigo-400 mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-2.5 text-slate-400 text-xs">
              <Zap size={15} className="text-amber-400 shrink-0" />
              <span>
                Proses kompresi dijalankan langsung di komputer Anda tanpa mengunggah dokumen ke server internet.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
