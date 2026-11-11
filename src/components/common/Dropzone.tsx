import React from 'react'
import { UploadCloud, FileText } from 'lucide-react'

interface DropzoneProps {
  onFilesSelected: (files: FileList | null) => void
  onBrowseClick?: () => void
  title?: string
  subtitle?: string
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onBrowseClick,
  title = "Tarik & Letakkan File PDF di Sini",
  subtitle = "Semua dokumen diproses 100% offline langsung di komputer Anda"
}) => {
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files)
    }
  }

  const handleClickArea = () => {
    if (window.electronAPI) {
      onBrowseClick?.()
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClickArea}
      className={`relative w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
          : 'border-white/10 hover:border-indigo-500/40 bg-[#13151D]/60 hover:bg-[#13151D]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
        <UploadCloud size={28} />
      </div>

      <h3 className="text-base font-semibold text-slate-100 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-5">
        {subtitle}
      </p>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleClickArea()
          }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-lg shadow-indigo-600/20 flex items-center space-x-2 active:scale-95"
        >
          <FileText size={15} />
          <span>Buka Berkas PDF</span>
        </button>
      </div>

      <div className="mt-4 text-[10px] text-slate-400 font-mono">
        100% Offline Processing • Tidak Ada Data yang Keluar dari Komputer
      </div>
    </div>
  )
}
