import React, { useRef, useState, useEffect } from 'react'
import { Eraser, Check, Pen, Upload } from 'lucide-react'

interface SignaturePadProps {
  onSaveSignature: (dataUrl: string) => void
  onClose?: () => void
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSaveSignature, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [penColor, setPenColor] = useState<'#000000' | '#1D4ED8' | '#DC2626'>('#000000')
  const [penWidth] = useState<number>(3)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.strokeStyle = penColor
    ctx.lineWidth = penWidth
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleApply = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    const dataUrl = canvas.toDataURL('image/png')
    onSaveSignature(dataUrl)
  }

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      onSaveSignature(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="bg-[#13151D] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Pen size={16} className="text-indigo-400" />
          <span className="text-xs font-bold text-slate-200">Kanvas Tanda Tangan</span>
        </div>

        {/* Color picker */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPenColor('#000000')}
            className={`w-6 h-6 rounded-full bg-black border-2 transition-all ${
              penColor === '#000000' ? 'border-indigo-400 scale-110 shadow' : 'border-white/20'
            }`}
            title="Tinta Hitam"
          />
          <button
            onClick={() => setPenColor('#1D4ED8')}
            className={`w-6 h-6 rounded-full bg-blue-700 border-2 transition-all ${
              penColor === '#1D4ED8' ? 'border-indigo-400 scale-110 shadow' : 'border-white/20'
            }`}
            title="Tinta Biru Resmi"
          />
          <button
            onClick={() => setPenColor('#DC2626')}
            className={`w-6 h-6 rounded-full bg-red-600 border-2 transition-all ${
              penColor === '#DC2626' ? 'border-indigo-400 scale-110 shadow' : 'border-white/20'
            }`}
            title="Tinta Merah"
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-[2/1] bg-white rounded-xl overflow-hidden border border-black/10 cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={500}
          height={250}
          className="w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
            Goreskan tanda tangan Anda di sini (Mouse atau Touchscreen)
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={clearCanvas}
            className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-medium transition-colors flex items-center space-x-1.5"
          >
            <Eraser size={14} />
            <span>Hapus</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-medium transition-colors flex items-center space-x-1.5"
          >
            <Upload size={14} />
            <span>Upload Foto TTD (PNG)</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleUploadImage}
          />
        </div>

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
            >
              Batal
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={!hasDrawn}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <Check size={14} />
            <span>Gunakan Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  )
}
