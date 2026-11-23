import React, { useState, useEffect, useRef } from 'react'
import {
  Printer,
  Sparkles,
  Sliders,
  Eye,
  RefreshCw,
} from 'lucide-react'
import {
  ScanSimulatorOptions,
  DEFAULT_SCAN_OPTIONS,
  ScanColorMode,
  applyScanEffectToPage,
} from '../../utils/scanSimulatorEngine'
import { useAppSettings } from '../../store/settingsStore'

interface ScanSimulatorStudioProps {
  pdfBuffer: ArrayBuffer | null
  fileName: string | null
  totalPageCount: number
  options: ScanSimulatorOptions
  onOptionsChange: (opts: ScanSimulatorOptions) => void
  isProcessing?: boolean
  progressPercent?: number | null
}

export const ScanSimulatorStudio: React.FC<ScanSimulatorStudioProps> = ({
  pdfBuffer,
  fileName,
  totalPageCount,
  options,
  onOptionsChange,
}) => {
  const { isDark, language } = useAppSettings()
  const [previewPage, setPreviewPage] = useState(1)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const debounceTimerRef = useRef<any>(null)

  // Generate live interactive preview whenever options change
  useEffect(() => {
    if (!pdfBuffer || totalPageCount === 0) return

    setIsPreviewLoading(true)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const canvas = await applyScanEffectToPage(pdfBuffer, previewPage, options, 42)
        setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.8))
      } catch (err) {
        console.error('Error generating scan preview:', err)
      } finally {
        setIsPreviewLoading(false)
      }
    }, 180)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [pdfBuffer, previewPage, options, totalPageCount])

  const presets = [
    {
      id: 'natural',
      name: language === 'id' ? 'Hasil Scan Normal (HVS)' : 'Natural Office Scan',
      desc: language === 'id' ? 'Warna asli, sedikit miring alami (0.5°), tekstur kertas halus' : 'Color scan, subtle 0.5° tilt, natural paper grain',
      opts: { ...DEFAULT_SCAN_OPTIONS, colorMode: 'color' as ScanColorMode, tiltAngle: 0.5, noiseIntensity: 16 },
    },
    {
      id: 'photocopy',
      name: language === 'id' ? 'Fotokopi Hitam Putih' : 'B&W Photocopy',
      desc: language === 'id' ? 'Monokrom pekat bertekstur seperti mesin fotokopi sekolah/kantor' : 'Sharp monochrome photocopy look with toner textures',
      opts: { ...DEFAULT_SCAN_OPTIONS, colorMode: 'bw' as ScanColorMode, tiltAngle: 0.8, contrast: 30, noiseIntensity: 22 },
    },
    {
      id: 'grayscale',
      name: language === 'id' ? 'Scan Dokumen Gray' : 'Grayscale Archival',
      desc: language === 'id' ? 'Abu-abu dokumen arsip resmi, kontras jelas' : 'Clean grayscale official scan with sharp contrast',
      opts: { ...DEFAULT_SCAN_OPTIONS, colorMode: 'grayscale' as ScanColorMode, tiltAngle: 0.4, contrast: 18, noiseIntensity: 14 },
    },
  ]

  const colorModes: { id: ScanColorMode; label: string; desc: string }[] = [
    {
      id: 'color',
      label: language === 'id' ? 'Asli Berwarna' : 'Full Color',
      desc: language === 'id' ? 'Mempertahankan tinta & warna cap asli' : 'Keeps original inks & stamps',
    },
    {
      id: 'grayscale',
      label: language === 'id' ? 'Grayscale' : 'Grayscale',
      desc: language === 'id' ? 'Gradasi abu-abu dokumen resmi' : 'Standard gray document gradient',
    },
    {
      id: 'bw',
      label: language === 'id' ? 'Monokrom (Fotokopi)' : 'Black & White',
      desc: language === 'id' ? 'Hitam putih kontras mesin fotokopi' : 'High contrast photocopy print',
    },
  ]

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-150 ${
        isDark ? 'bg-[#0C0D12]' : 'bg-[#F4F5F8]'
      }`}
    >
      {/* Top Header */}
      <div
        className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-150 ${
          isDark ? 'bg-[#13151D] border-white/5' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Printer size={16} />
          </div>
          <div>
            <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {language === 'id' ? 'Simulator Hasil Scan Printer' : 'Printer Scanner Simulator'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {fileName || 'Dokumen PDF'} ({totalPageCount} Halaman)
          </span>
        </div>
      </div>

      {/* Main Split Layout: Settings Panel (Left) & Real-time Live Preview (Right) */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Settings Sidebar (Cols 5) */}
        <div
          className={`lg:col-span-5 border-r overflow-y-auto p-5 space-y-5 transition-colors duration-150 ${
            isDark ? 'border-white/5 bg-[#10121A]/70' : 'border-slate-200 bg-white/60'
          }`}
        >
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {language === 'id' ? 'Preset Cepat Scan' : 'Quick Presets'}
            </label>

            <div className="grid grid-cols-1 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOptionsChange(p.opts)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    options.colorMode === p.opts.colorMode && Math.abs(options.tiltAngle - p.opts.tiltAngle) < 0.1
                      ? isDark
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                        : 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                      : isDark
                      ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.name}</span>
                    <Sparkles size={13} className="text-indigo-400" />
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode Selector */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {language === 'id' ? 'Mode Warna Kertas' : 'Color Mode'}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {colorModes.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => onOptionsChange({ ...options, colorMode: cm.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    options.colorMode === cm.id
                      ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/20'
                      : isDark
                      ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-xs block">{cm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tuning Sliders */}
          <div className={`p-4 rounded-2xl border space-y-4 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center space-x-1.5 text-indigo-400">
                <Sliders size={14} />
                <span>{language === 'id' ? 'Parameter Scanner' : 'Scanner Sliders'}</span>
              </span>
              <button
                onClick={() => onOptionsChange(DEFAULT_SCAN_OPTIONS)}
                className="text-[10px] text-slate-400 hover:text-indigo-400 transition-colors"
              >
                {language === 'id' ? 'Kembalikan Default' : 'Reset Defaults'}
              </button>
            </div>

            {/* Micro Tilt Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {language === 'id' ? 'Kemiringan Kertas Fisik (Tilt)' : 'Paper Tilt Angle'}
                </span>
                <span className="font-mono text-indigo-400 font-bold">{options.tiltAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={options.tiltAngle}
                onChange={(e) => onOptionsChange({ ...options, tiltAngle: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'id' ? 'Mensimulasikan posisi kertas yang sedikit miring di atas kaca scanner.' : 'Simulates subtle hand placement angle on flatbed scanner glass.'}
              </span>
            </div>

            {/* Grain / Noise Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {language === 'id' ? 'Tekstur Serat Kertas (Noise)' : 'Paper Fiber Texture'}
                </span>
                <span className="font-mono text-indigo-400 font-bold">{options.noiseIntensity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={options.noiseIntensity}
                onChange={(e) => onOptionsChange({ ...options, noiseIntensity: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Contrast Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {language === 'id' ? 'Kontras Tinta Scanner' : 'Scanner Ink Contrast'}
                </span>
                <span className="font-mono text-indigo-400 font-bold">{options.contrast}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="35"
                step="5"
                value={options.contrast}
                onChange={(e) => onOptionsChange({ ...options, contrast: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Scanner Bed Shadow Checkbox */}
            <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={options.pageShadow}
                onChange={(e) => onOptionsChange({ ...options, pageShadow: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 focus:ring-0"
              />
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {language === 'id' ? 'Bayangan Lipatan / Tepi Kaca Scanner' : 'Flatbed Edge Shadow Effect'}
              </span>
            </label>
          </div>
        </div>

        {/* Right Live Preview Canvas Area (Cols 7) */}
        <div
          className={`lg:col-span-7 flex flex-col items-center justify-between p-6 overflow-hidden ${
            isDark ? 'bg-[#08090D]' : 'bg-[#E5E9F0]'
          }`}
        >
          {/* Header Preview controls */}
          <div className="w-full flex items-center justify-between pb-3">
            <div className="flex items-center space-x-2">
              <Eye size={15} className="text-indigo-400" />
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {language === 'id' ? 'Pratinjau Interaktif (Live Preview)' : 'Interactive Live Preview'}
              </span>
              {isPreviewLoading && <RefreshCw size={12} className="animate-spin text-indigo-400" />}
            </div>

            {/* Page Navigator */}
            {totalPageCount > 1 && (
              <div className="flex items-center space-x-2 text-xs">
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs"
                >
                  &larr;
                </button>
                <span className="font-mono text-xs">
                  Hal {previewPage} / {totalPageCount}
                </span>
                <button
                  disabled={previewPage >= totalPageCount}
                  onClick={() => setPreviewPage((p) => Math.min(totalPageCount, p + 1))}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Interactive Document Sheet on Scanner Bed */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
            {previewDataUrl ? (
              <div className="relative group max-h-full max-w-full">
                <img
                  src={previewDataUrl}
                  alt="Scan Preview"
                  className="max-h-[70vh] w-auto object-contain rounded-md shadow-2xl transition-all duration-200 border border-black/20"
                  style={{
                    boxShadow: isDark
                      ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.1)'
                      : '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs flex flex-col items-center">
                <RefreshCw size={24} className="animate-spin mb-2 text-indigo-400" />
                <span>{language === 'id' ? 'Memuat pratinjau scanner...' : 'Rendering scan preview...'}</span>
              </div>
            )}
          </div>

          {/* Bottom Banner */}
          <div className={`w-full text-center py-2 text-[11px] font-mono border-t ${
            isDark ? 'border-white/5 text-slate-500' : 'border-slate-300 text-slate-600'
          }`}>
            {language === 'id'
              ? '💡 Dokumen PDF asli Anda akan diubah seolah-olah baru saja discan dari mesin scanner fisik.'
              : '💡 Converts crisp digital vector PDFs into authentic, realistic physical flatbed scan look.'}
          </div>
        </div>
      </div>
    </div>
  )
}
