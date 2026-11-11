import React from 'react'

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
  canvas.width = 320
  canvas.height = 110
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Border rectangle with double lines
  ctx.strokeStyle = hexColor
  ctx.lineWidth = 5
  ctx.strokeRect(10, 10, 300, 90)

  ctx.lineWidth = 2
  ctx.strokeRect(16, 16, 288, 78)

  // Text
  ctx.fillStyle = hexColor
  ctx.font = 'bold 32px "Impact", "Arial Black", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 160, 55)

  return canvas.toDataURL('image/png')
}

interface StampPickerProps {
  onSelectStamp: (stamp: StampPreset) => void
}

export const StampPicker: React.FC<StampPickerProps> = ({ onSelectStamp }) => {
  return (
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
  )
}
