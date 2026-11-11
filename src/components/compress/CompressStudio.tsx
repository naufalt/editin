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

  const presets: { id: CompressQuality; title: string; desc: string; target: string; tag?: string }[] = [
    {
      id: 'cpns',
      title: 'Target CPNS & Portal (< 2 MB)',
      desc: 'Optimasi khusus agar lolos syarat upload SSCASN/BKN, beasiswa, dan portal instansi.',
      target: 'Maks 2.0 MB',
      tag: 'Paling Populer',
    },
    {
      id: 'medium',
      title: 'Kualitas Web & Email (Standar)',
      desc: 'Kompresi seimbang, teks tetap tajam untuk dibaca di HP atau dikirim via email.',
      target: '~50-60% Lebih Ringan',
    },
    {
      id: 'low',
      title: 'Kompresi Maksimum (File Kecil)',
      desc: 'Ukuran file sekecil mungkin untuk keterbatasan kuota atau upload sangat ketat.',
      target: 'Ukuran Terkecil',
    },
    {
      id: 'high',
      title: 'Pembersihan Metadata (Lossless)',
      desc: 'Menghapus data sampah dan histori tanpa mengurangi ketajaman gambar sedikit pun.',
      target: 'Kualitas Asli 100%',
    },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D]">
        <div className="flex items-center space-x-2">
          <Minimize2 size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">Kecilkan Ukuran Dokumen (PDF Slim)</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Ukuran Asli: {formatSize(originalSizeBytes)}
        </span>
      </div>

      {/* Main Settings */}
      <div className="flex-1 overflow-y-auto p-8 max-w-xl mx-auto w-full flex flex-col justify-center">
        <div className="bg-[#13151D] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
          {/* File summary */}
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {fileName || 'Dokumen Aktif'}
              </h4>
              <span className="text-[11px] text-slate-400">
                {totalPageCount} Halaman • {formatSize(originalSizeBytes)}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
              100% Offline
            </div>
          </div>

          {/* Preset list */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Pilih Profil Kompresi:
            </label>

            {presets.map((preset) => {
              const isSelected = selectedQuality === preset.id
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectQuality(preset.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
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

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-2.5 text-slate-400 text-xs">
            <Zap size={15} className="text-amber-400 shrink-0" />
            <span>
              Proses kompresi dijalankan secara instan langsung di komputer Anda tanpa mengunggah dokumen ke server internet.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
