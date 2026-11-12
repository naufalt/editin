import React, { useRef } from 'react'
import {
  Minimize2,
  FileText,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Zap,
  FolderOpen,
  RotateCcw,
} from 'lucide-react'
import { CompressQuality } from '../../utils/compressProtectEngine'

export interface CompressTargetFile {
  name: string
  path?: string
  size: number
  ext: string
  category: 'pdf' | 'image' | 'video'
  buffer?: ArrayBuffer
}

interface CompressStudioProps {
  activePdfName: string | null
  activePdfSizeBytes: number
  activePdfPageCount: number
  customTarget: CompressTargetFile | null
  onSelectCustomTarget: (target: CompressTargetFile | null) => void
  selectedQuality: CompressQuality
  onSelectQuality: (q: CompressQuality) => void
  progressPercent?: number | null
  progressEta?: string
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']
const VIDEO_EXTS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'flv', 'm4v']

export const CompressStudio: React.FC<CompressStudioProps> = ({
  activePdfName,
  activePdfSizeBytes,
  activePdfPageCount,
  customTarget,
  onSelectCustomTarget,
  selectedQuality,
  onSelectQuality,
  progressPercent,
  progressEta,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const classifyExt = (ext: string): 'pdf' | 'image' | 'video' => {
    const clean = ext.toLowerCase().replace('.', '')
    if (IMAGE_EXTS.includes(clean)) return 'image'
    if (VIDEO_EXTS.includes(clean)) return 'video'
    return 'pdf'
  }

  const handleBrowseAnyFile = async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.openFilesDialog === 'function') {
        const selected = await window.electronAPI.openFilesDialog({
          multi: false,
          filters: [
            {
              name: 'PDF, Gambar & Video (Semua Format Kompresi)',
              extensions: ['pdf', ...IMAGE_EXTS, ...VIDEO_EXTS],
            },
            { name: 'Dokumen PDF', extensions: ['pdf'] },
            { name: 'Gambar (JPG, PNG, WEBP, BMP)', extensions: IMAGE_EXTS },
            { name: 'Video (MP4, MKV, MOV, AVI, WEBM)', extensions: VIDEO_EXTS },
          ],
        })
        if (selected && selected.length > 0) {
          const item = selected[0]
          const category = classifyExt(item.ext)
          let buffer: ArrayBuffer | undefined
          if (category !== 'video') {
            buffer = await window.electronAPI.readFileBuffer(item.path)
          }
          onSelectCustomTarget({
            name: item.name,
            path: item.path,
            size: item.size,
            ext: item.ext,
            category,
            buffer,
          })
          return
        }
      }
    } catch (e) {
      console.warn('Native openFilesDialog failed, using input fallback:', e)
    }
    fileInputRef.current?.click()
  }

  const handleFallbackInput = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const category = classifyExt(ext)
    const buffer = category !== 'video' ? await file.arrayBuffer() : undefined
    onSelectCustomTarget({
      name: file.name,
      path: (file as any).path,
      size: file.size,
      ext,
      category,
      buffer,
    })
  }

  const currentCategory: 'pdf' | 'image' | 'video' = customTarget
    ? customTarget.category
    : 'pdf'
  const currentName = customTarget ? customTarget.name : activePdfName
  const currentSize = customTarget ? customTarget.size : activePdfSizeBytes
  const hasFileLoaded = Boolean(customTarget || (activePdfName && activePdfSizeBytes > 0))

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
      desc: 'Kompresi agresif untuk ukuran file PDF, Gambar, atau Video sekecil mungkin agar lolos batas upload ketat.',
      target: 'Ukuran Terkecil',
    },
    {
      id: 'balanced',
      title: 'Seimbang (Rekomendasi)',
      desc: 'Perpaduan ideal antara ukuran file yang jauh lebih ringan dan ketajaman visual untuk portal, WA, atau email.',
      target: '~50-75% Lebih Ringan',
      tag: 'Rekomendasi',
    },
    {
      id: 'high',
      title: 'Maksimal Kualitas',
      desc: 'Mempertahankan resolusi & ketajaman visual tertinggi sembari memangkas bitrate/beban data berlebih.',
      target: 'Kualitas Terbaik',
    },
  ]

  const renderCategoryBadge = () => {
    if (currentCategory === 'image') {
      return (
        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 shrink-0">
          <ImageIcon size={20} />
        </div>
      )
    }
    if (currentCategory === 'video') {
      return (
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
          <Film size={20} />
        </div>
      )
    }
    return (
      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
        <FileText size={20} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.mkv,.mov,.avi,.webm,.wmv"
        className="hidden"
        onChange={(e) => handleFallbackInput(e.target.files)}
      />

      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] shrink-0">
        <div className="flex items-center space-x-2">
          <Minimize2 size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">
            Kecilkan Ukuran File (PDF, Gambar & Video)
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {customTarget && activePdfName && (
            <button
              onClick={() => onSelectCustomTarget(null)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center space-x-1.5 border border-white/10 transition-colors"
              title="Kembali gunakan dokumen PDF aktif"
            >
              <RotateCcw size={13} />
              <span>Gunakan PDF Aktif</span>
            </button>
          )}
          <button
            onClick={handleBrowseAnyFile}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <FolderOpen size={14} />
            <span>Pilih File (PDF / Gambar / Video)</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto">
          {!hasFileLoaded ? (
            <div
              onClick={handleBrowseAnyFile}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFallbackInput(e.dataTransfer.files)
              }}
              className="bg-[#13151D] border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-10 text-center cursor-pointer transition-all group space-y-4"
            >
              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <FileText size={22} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                  <ImageIcon size={22} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Film size={22} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Pilih atau Seret File PDF, Gambar, atau Video
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Mendukung kompresi dokumen <span className="text-slate-300 font-semibold">PDF</span>, gambar{' '}
                  <span className="text-slate-300 font-semibold">JPG, PNG, WEBP, BMP</span>, serta video{' '}
                  <span className="text-slate-300 font-semibold">MP4, MKV, MOV, AVI, WEBM</span> secara 100% offline.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
              >
                Jelajahi File di Komputer
              </button>
            </div>
          ) : (
            <div className="bg-[#13151D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5">
              {/* File summary */}
              <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                {renderCategoryBadge()}
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
                      {currentCategory === 'pdf'
                        ? 'PDF'
                        : currentCategory === 'image'
                        ? `GAMBAR • ${customTarget?.ext.toUpperCase()}`
                        : `VIDEO • ${customTarget?.ext.toUpperCase()}`}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      {currentName}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {currentCategory === 'pdf' && !customTarget
                      ? `${activePdfPageCount} Halaman • ${formatSize(currentSize)}`
                      : `Ukuran Asli: ${formatSize(currentSize)}`}
                  </span>
                </div>
                <button
                  onClick={handleBrowseAnyFile}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold shrink-0 transition-colors"
                >
                  Ganti File
                </button>
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

              {/* Progress Bar when compressing video/large file */}
              {typeof progressPercent === 'number' && progressPercent > 0 && progressPercent < 100 && (
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">
                      Mengompresi {currentCategory === 'video' ? 'Video' : 'File'}... {progressPercent}%
                    </span>
                    {progressEta && (
                      <span className="font-mono text-[11px] text-indigo-400">{progressEta}</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-2.5 text-slate-400 text-xs">
                <Zap size={15} className="text-amber-400 shrink-0" />
                <span>
                  Kompresi PDF, Gambar, dan Video diproses 100% offline di perangkat Anda. Nama file otomatis ditambahkan akhiran{' '}
                  <code className="text-indigo-300">_compressed</code>.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
