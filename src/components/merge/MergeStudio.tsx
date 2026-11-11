import React, { useState } from 'react'
import { Plus, Trash2, GripVertical, FileText, ArrowDownUp } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { MergeItem } from '../../utils/mergeSplitEngine'

interface MergeStudioProps {
  files: MergeItem[]
  onAddFiles: (newFiles: MergeItem[]) => void
  onRemoveFile: (id: string) => void
  onReorderFiles: (fromIndex: number, toIndex: number) => void
  onClearAll: () => void
}

export const MergeStudio: React.FC<MergeStudioProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onReorderFiles,
  onClearAll,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleNativeAdd = async () => {
    if (window.electronAPI) {
      const paths = await window.electronAPI.openPdfDialog()
      if (paths && paths.length > 0) {
        const loaded: MergeItem[] = []
        for (const p of paths) {
          const buffer = await window.electronAPI.readFileBuffer(p)
          const name = p.split(/[\\/]/).pop() || 'document.pdf'
          try {
            const doc = await PDFDocument.load(buffer)
            loaded.push({
              id: `${Date.now()}_${Math.random()}`,
              name,
              size: buffer.byteLength,
              buffer,
              pageCount: doc.getPageCount(),
            })
          } catch (e) {
            console.error('Invalid PDF file:', e)
          }
        }
        onAddFiles(loaded)
      }
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const fileList = Array.from(e.target.files)
    const loaded: MergeItem[] = []

    for (const f of fileList) {
      const buffer = await f.arrayBuffer()
      try {
        const doc = await PDFDocument.load(buffer)
        loaded.push({
          id: `${Date.now()}_${Math.random()}`,
          name: f.name,
          size: f.size,
          buffer,
          pageCount: doc.getPageCount(),
        })
      } catch (err) {
        console.error('Invalid PDF file:', err)
      }
    }

    onAddFiles(loaded)
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0)

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-100">Gabung PDF</span>
            <span className="text-xs text-indigo-400 font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              {files.length} Berkas • {totalPages} Total Halaman
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {files.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Hapus Semua
            </button>
          )}

          <label
            onClick={window.electronAPI ? handleNativeAdd : undefined}
            htmlFor={window.electronAPI ? undefined : "merge-file-input"}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Plus size={15} />
            <span>+ Tambah Dokumen</span>
          </label>
          <input
            id="merge-file-input"
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-[#13151D]/40">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              Belum Ada Dokumen yang Dipilih
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
              Pilih minimal 2 dokumen PDF untuk digabungkan menjadi satu berkas teratur secara offline.
            </p>
            <label
              onClick={window.electronAPI ? handleNativeAdd : undefined}
              htmlFor={window.electronAPI ? undefined : "merge-file-input"}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Pilih Dokumen PDF</span>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 pb-1">
              <span>Urutan Dokumen (Geser untuk ubah urutan)</span>
              <span className="flex items-center space-x-1">
                <ArrowDownUp size={12} />
                <span>Drag & Drop Enabled</span>
              </span>
            </div>

            {files.map((file, idx) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => {
                  setDraggedIndex(idx)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedIndex !== null && draggedIndex !== idx) {
                    onReorderFiles(draggedIndex, idx)
                  }
                  setDraggedIndex(null)
                }}
                className="flex items-center justify-between p-3.5 bg-[#13151D] hover:bg-[#181A25] rounded-xl border border-white/5 transition-all group"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="cursor-grab text-slate-500 group-hover:text-slate-300">
                    <GripVertical size={16} />
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      {file.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {file.pageCount} Halaman • {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Hapus dari antrean"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
