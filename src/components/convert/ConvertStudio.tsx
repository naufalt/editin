import React, { useRef } from 'react'
import {
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FolderOpen,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Plus,
} from 'lucide-react'
import {
  ConvertFileItem,
  detectFileCategory,
  getSupportedTargetsForExtension,
} from '../../utils/universalConvertEngine'

interface ConvertStudioProps {
  items: ConvertFileItem[]
  onAddItems: (newItems: ConvertFileItem[]) => void
  onUpdateTargetExt: (id: string, targetExt: string) => void
  onRemoveItem: (id: string) => void
  onClearAll: () => void
  onConvertSingle: (item: ConvertFileItem) => void
}

export const ConvertStudio: React.FC<ConvertStudioProps> = ({
  items,
  onAddItems,
  onUpdateTargetExt,
  onRemoveItem,
  onClearAll,
  onConvertSingle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleBrowseFiles = async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.openFilesDialog === 'function') {
        const selected = await window.electronAPI.openFilesDialog({
          multi: true,
        })
        if (selected && selected.length > 0) {
          const created: ConvertFileItem[] = []
          for (const s of selected) {
            const category = detectFileCategory(s.ext)
            const targets = getSupportedTargetsForExtension(s.ext)
            let buffer: ArrayBuffer | undefined
            if (category === 'image' || category === 'document') {
              try {
                buffer = await window.electronAPI.readFileBuffer(s.path)
              } catch {
                // fallback to main process path
              }
            }
            created.push({
              id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: s.name,
              path: s.path,
              size: s.size,
              ext: s.ext,
              category,
              targetExt: targets[0] || 'pdf',
              buffer,
              status: 'idle',
              progress: 0,
            })
          }
          onAddItems(created)
          return
        }
      }
    } catch (e) {
      console.warn('Native openFilesDialog error, using input fallback:', e)
    }
    fileInputRef.current?.click()
  }

  const handleFallbackInput = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const created: ConvertFileItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const category = detectFileCategory(ext)
      const targets = getSupportedTargetsForExtension(ext)
      const buffer =
        category === 'image' || category === 'document' ? await file.arrayBuffer() : undefined
      created.push({
        id: `conv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        path: (file as any).path,
        size: file.size,
        ext,
        category,
        targetExt: targets[0] || 'pdf',
        buffer,
        status: 'idle',
        progress: 0,
      })
    }
    onAddItems(created)
  }

  const renderCategoryIcon = (category: ConvertFileItem['category']) => {
    if (category === 'image') {
      return (
        <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
          <ImageIcon size={18} />
        </div>
      )
    }
    if (category === 'video') {
      return (
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Film size={18} />
        </div>
      )
    }
    if (category === 'audio') {
      return (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <Music size={18} />
        </div>
      )
    }
    return (
      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
        <FileText size={18} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.md,.csv,.html,.jpg,.jpeg,.png,.webp,.bmp,.gif,.ico,.svg,.mp4,.mkv,.mov,.avi,.webm,.wmv,.mp3,.wav,.aac,.flac,.ogg,.m4a"
        className="hidden"
        onChange={(e) => handleFallbackInput(e.target.files)}
      />

      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] shrink-0">
        <div className="flex items-center space-x-2">
          <RefreshCw size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">
            Konversi Format Universal (Dokumen, Gambar, Video & Audio)
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          {items.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Bersihkan</span>
            </button>
          )}
          <button
            onClick={handleBrowseFiles}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={14} />
            <span>Tambah File</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto w-full my-auto space-y-4">
          {items.length === 0 ? (
            <div
              onClick={handleBrowseFiles}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFallbackInput(e.dataTransfer.files)
              }}
              className="bg-[#13151D] border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-10 text-center cursor-pointer transition-all group space-y-5"
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
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Music size={22} />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Pilih atau Seret Berbagai File untuk Dikonversi
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto leading-relaxed">
                  Ubah ekstensi berbagai format secara 100% offline:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left max-w-xl mx-auto">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase text-indigo-400 block">
                    Dokumen & File
                  </span>
                  <span className="text-[11px] text-slate-300 mt-0.5 block">
                    PDF ⇄ JPG, PNG, WEBP, TXT, DOCX • Word/Excel/PPT → PDF
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase text-pink-400 block">
                    Gambar & Foto
                  </span>
                  <span className="text-[11px] text-slate-300 mt-0.5 block">
                    PNG, JPG, WEBP, SVG, BMP, GIF ⇄ JPG, PNG, WEBP, PDF, ICO
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block">
                    Video & Audio
                  </span>
                  <span className="text-[11px] text-slate-300 mt-0.5 block">
                    MP4, MKV, MOV, AVI, WEBM ⇄ MP4, GIF, MP3, WAV, AAC, FLAC
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all inline-flex items-center space-x-2"
              >
                <FolderOpen size={15} />
                <span>Pilih File dari Komputer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const supportedTargets = getSupportedTargetsForExtension(item.ext)
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#13151D] border border-white/5 hover:border-white/10 shadow-lg flex flex-col space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 overflow-hidden flex-1">
                        {renderCategoryIcon(item.category)}
                        <div className="overflow-hidden flex-1">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                              .{item.ext.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatSize(item.size)}
                            </span>
                            {item.status === 'done' && (
                              <span className="text-[10px] font-semibold text-emerald-400 flex items-center space-x-1">
                                <CheckCircle2 size={12} />
                                <span>Selesai ({item.outputName || `.${item.targetExt}`})</span>
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="text-[10px] font-semibold text-rose-400 flex items-center space-x-1 truncate">
                                <AlertCircle size={12} />
                                <span>{item.errorMessage || 'Gagal'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Format Selector */}
                      <div className="flex items-center space-x-2.5 shrink-0">
                        <span className="text-[11px] text-slate-400 flex items-center">
                          Ubah ke <ArrowRight size={12} className="ml-1 text-slate-500" />
                        </span>
                        <select
                          value={item.targetExt}
                          disabled={item.status === 'processing'}
                          onChange={(e) => onUpdateTargetExt(item.id, e.target.value)}
                          className="bg-[#1C1F2B] text-white text-xs font-bold font-mono uppercase px-3 py-1.5 rounded-xl border border-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {supportedTargets.map((ext) => (
                            <option key={ext} value={ext} className="bg-[#13151D] text-white">
                              .{ext.toUpperCase()}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => onConvertSingle(item)}
                          disabled={item.status === 'processing'}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
                          title="Konversi & Simpan file ini"
                        >
                          {item.status === 'processing' ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>{item.status === 'done' ? 'Simpan Lagi' : 'Konversi'}</span>
                        </button>

                        {item.outputPath && window.electronAPI?.showItemInFolder && (
                          <button
                            onClick={() => window.electronAPI.showItemInFolder(item.outputPath!)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Lihat di Folder"
                          >
                            <FolderOpen size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          disabled={item.status === 'processing'}
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Hapus dari daftar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar when processing */}
                    {item.status === 'processing' && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-indigo-300 font-mono">
                          <span>Mengonversi ke .{item.targetExt.toUpperCase()}...</span>
                          <span>
                            {item.progress}% {item.eta ? `• ${item.eta}` : ''}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-200"
                            style={{ width: `${Math.max(8, item.progress)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
