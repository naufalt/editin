import React, { useRef } from 'react'
import { UploadCloud, FileText, Sparkles, ShieldCheck } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

interface DropzoneProps {
  onFilesSelected: (files: FileList | null) => void
  onBrowseClick?: () => void
  title?: string
  subtitle?: string
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onBrowseClick,
  title,
  subtitle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isDark, t } = useAppSettings()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    if (onBrowseClick) {
      onBrowseClick()
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative overflow-hidden select-none ${
        isDark 
          ? 'border-white/10 hover:border-indigo-500/50 bg-[#13151D]/60 hover:bg-[#13151D]' 
          : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/70 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />

      {/* Decorative Icon */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:scale-105 group-hover:rotate-1 transition-transform">
          <UploadCloud size={28} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
          <FileText size={13} />
        </div>
      </div>

      <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
        {title || t.dropzoneTitle}
      </h3>
      <p className={`text-xs mt-1.5 max-w-md leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {subtitle || t.dropzoneSubtitle}
      </p>

      {/* Action CTA Button */}
      <button
        type="button"
        className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 active:scale-95"
      >
        <Sparkles size={14} />
        <span>{t.dropzoneBrowse}</span>
      </button>

      {/* Offline Badge */}
      <div className={`mt-6 flex items-center space-x-1.5 text-[11px] font-mono ${
        isDark ? 'text-slate-500' : 'text-slate-400'
      }`}>
        <ShieldCheck size={14} className="text-emerald-500" />
        <span>100% Offline • Zero-Upload Data Guarantee</span>
      </div>
    </div>
  )
}
