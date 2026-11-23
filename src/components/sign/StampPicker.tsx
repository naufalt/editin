import React, { useRef, useState } from 'react'
import { UploadCloud, Image as ImageIcon, Type, Sparkles } from 'lucide-react'

export interface StampPreset {
  id: string
  label: string
  color: string // Tailwind text & border color class
  hexColor: string
  bgAlpha: string
}

export const STAMP_PRESETS: StampPreset[] = [
  { id: 'approved', label: 'APPROVED', color: 'text-emerald-500 border-emerald-500', hexColor: '#10B981', bgAlpha: 'rgba(16, 185, 129, 0.1)' },
  { id: 'lunas', label: 'LUNAS', color: 'text-blue-500 border-blue-500', hexColor: '#3B82F6', bgAlpha: 'rgba(59, 130, 246, 0.1)' },
  { id: 'confidential', label: 'CONFIDENTIAL', color: 'text-rose-500 border-rose-500', hexColor: '#F43F5E', bgAlpha: 'rgba(244, 63, 94, 0.1)' },
  { id: 'draft', label: 'DRAFT', color: 'text-amber-500 border-amber-500', hexColor: '#F59E0B', bgAlpha: 'rgba(245, 158, 11, 0.1)' },
  { id: 'asli', label: 'SALINAN SAH', color: 'text-purple-500 border-purple-500', hexColor: '#A855F7', bgAlpha: 'rgba(168, 85, 247, 0.1)' },
  { id: 'ditolak', label: 'REJECTED', color: 'text-red-600 border-red-600', hexColor: '#DC2626', bgAlpha: 'rgba(220, 38, 38, 0.1)' },
]

// Convert stamp into high-res transparent PNG Data URL
export function generateStampDataUrl(label: string, hexColor: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 340
  canvas.height = 110
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Border rectangle with double lines
  ctx.strokeStyle = hexColor
  ctx.lineWidth = 5
  ctx.strokeRect(10, 10, 320, 90)

  ctx.lineWidth = 2
  ctx.strokeRect(16, 16, 308, 78)

  // Text
  ctx.fillStyle = hexColor
  ctx.font = 'bold 30px "Impact", "Arial Black", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label.toUpperCase(), 170, 55)

  return canvas.toDataURL('image/png')
}

interface StampPickerProps {
  onSelectStamp: (stamp: StampPreset) => void
  onCustomStampImageReady?: (dataUrl: string) => void
}

export const StampPicker: React.FC<StampPickerProps> = ({
  onSelectStamp,
  onCustomStampImageReady,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'preset' | 'upload' | 'text'>('preset')
  const [customText, setCustomText] = useState('')
  const [customColor, setCustomColor] = useState('#DC2626')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result && onCustomStampImageReady) {
        onCustomStampImageReady(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCreateTextStamp = () => {
    if (!customText.trim()) return
    const dataUrl = generateStampDataUrl(customText.trim(), customColor)
    if (onCustomStampImageReady) {
      onCustomStampImageReady(dataUrl)
    }
  }

  const colorOptions = [
    { label: 'Merah', hex: '#DC2626' },
    { label: 'Biru', hex: '#2563EB' },
    { label: 'Hijau', hex: '#16A34A' },
    { label: 'Ungu', hex: '#9333EA' },
    { label: 'Hitam', hex: '#1E293B' },
  ]

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs">
        <button
          onClick={() => setActiveSubTab('preset')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
            activeSubTab === 'preset'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Preset Cap Resmi
        </button>
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'upload'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UploadCloud size={13} />
          <span>Upload File Cap (PNG/JPG)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('text')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'text'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Type size={13} />
          <span>Ketik Teks Cap</span>
        </button>
      </div>

      {/* Preset View */}
      {activeSubTab === 'preset' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STAMP_PRESETS.map((stamp) => (
            <button
              key={stamp.id}
              onClick={() => onSelectStamp(stamp)}
              className="p-3.5 rounded-xl border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center group active:scale-95"
            >
              <div className={`px-3 py-1 rounded border-2 font-black text-xs tracking-wider transform -rotate-2 group-hover:rotate-0 transition-transform ${stamp.color}`}>
                {stamp.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Upload Custom Image View */}
      {activeSubTab === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFileUpload(e.dataTransfer.files)
          }}
          className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-7 text-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center space-y-2 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ImageIcon size={22} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200">
              Pilih Foto / Gambar Cap Perusahaan
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mendukung PNG (transparan), JPG, atau WebP. Seret & lepas berkas ke sini.
            </p>
          </div>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all mt-1"
          >
            Pilih Berkas dari Komputer
          </button>
        </div>
      )}

      {/* Custom Text Stamp View */}
      {activeSubTab === 'text' && (
        <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Tulisan Cap / Stempel:
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Contoh: SUDAH DIVERIFIKASI, LUNAS KASIR, dll..."
              maxLength={28}
              className="w-full text-xs uppercase font-mono px-3 py-2 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Pilih Warna Tinta Cap:
            </label>
            <div className="flex items-center space-x-2">
              {colorOptions.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setCustomColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                    customColor === c.hex ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Live mini preview */}
          {customText.trim() && (
            <div className="pt-2 flex justify-center">
              <div
                className="px-4 py-1.5 rounded border-2 font-black text-sm tracking-wider transform -rotate-1"
                style={{ color: customColor, borderColor: customColor, backgroundColor: `${customColor}15` }}
              >
                {customText.toUpperCase()}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!customText.trim()}
            onClick={handleCreateTextStamp}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
          >
            <Sparkles size={14} />
            <span>Tempelkan Cap Teks Ini</span>
          </button>
        </div>
      )}
    </div>
  )
}
