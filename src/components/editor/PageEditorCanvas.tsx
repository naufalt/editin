import React, { useRef, useState, useEffect } from 'react'
import { 
  Type, 
  Image as ImageIcon, 
  Eraser, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  ScanText,
  CheckCircle2
} from 'lucide-react'
import { useDocumentStore } from '../../store/documentStore'
import { CanvasAnnotation } from '../../types/annotations'
import { renderPageToThumbnail } from '../../utils/pdfEngine'
import { extractPageTextItems } from '../../utils/textExtractEngine'

export const PageEditorCanvas: React.FC = () => {
  const {
    currentPdfBuffer,
    pages,
    activePageIndex,
    setActivePageIndex,
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
  } = useDocumentStore()

  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'whiteout'>('select')
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isScanningText, setIsScanningText] = useState(false)
  const [scanSuccessCount, setScanSuccessCount] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentPage = pages[activePageIndex]
  const currentAnnotations = annotations.filter((a) => a.pageIndex === activePageIndex)

  // Render high-res image of current active page
  useEffect(() => {
    if (!currentPdfBuffer || !currentPage) return
    renderPageToThumbnail(currentPdfBuffer, currentPage.pageIndex + 1, 1.5)
      .then((url) => setPageImageUrl(url))
      .catch((err) => console.error('Failed to render editor page preview:', err))
  }, [currentPdfBuffer, currentPage])

  // OCR / Direct Text Extraction: Turn native PDF text into editable inputs on canvas
  const handleScanAndEnableEditing = async () => {
    if (!currentPdfBuffer || !currentPage) return
    try {
      setIsScanningText(true)
      const extracted = await extractPageTextItems(currentPdfBuffer, currentPage.pageIndex + 1)
      
      let count = 0
      for (const item of extracted) {
        // 1. Place a whiteout box directly behind the text to hide original font
        const whiteoutId = `wo_${item.id}`
        addAnnotation({
          id: whiteoutId,
          pageIndex: activePageIndex,
          type: 'whiteout',
          x: item.x,
          y: item.y,
          width: item.width + 1,
          height: item.height + 0.8,
        })

        // 2. Place an editable text input right above it
        addAnnotation({
          id: `edit_${item.id}`,
          pageIndex: activePageIndex,
          type: 'text',
          x: item.x,
          y: item.y,
          text: item.str,
          fontSize: item.fontSize || 13,
          color: '#000000',
        })
        count++
      }

      setScanSuccessCount(count)
      setTimeout(() => setScanSuccessCount(null), 4000)
    } catch (err) {
      console.error('Failed to scan text:', err)
    } finally {
      setIsScanningText(false)
    }
  }

  // Click on canvas to add text or whiteout box
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = ((e.clientX - rect.left) / rect.width) * 100
    const clickY = ((e.clientY - rect.top) / rect.height) * 100

    if (activeTool === 'text') {
      const newAnnotation: CanvasAnnotation = {
        id: `text_${Date.now()}`,
        pageIndex: activePageIndex,
        type: 'text',
        x: Math.min(Math.max(clickX, 5), 85),
        y: Math.min(Math.max(clickY, 5), 90),
        text: 'Ketik teks di sini...',
        fontSize: 15,
        color: '#000000',
      }
      addAnnotation(newAnnotation)
      setSelectedAnnotationId(newAnnotation.id)
      setActiveTool('select')
    } else if (activeTool === 'whiteout') {
      const newAnnotation: CanvasAnnotation = {
        id: `whiteout_${Date.now()}`,
        pageIndex: activePageIndex,
        type: 'whiteout',
        x: Math.min(Math.max(clickX - 10, 5), 80),
        y: Math.min(Math.max(clickY - 2.5, 5), 90),
        width: 25,
        height: 5,
      }
      addAnnotation(newAnnotation)
      setSelectedAnnotationId(newAnnotation.id)
      setActiveTool('select')
    }
  }

  // Handle image upload from computer
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const newAnnotation: CanvasAnnotation = {
        id: `img_${Date.now()}`,
        pageIndex: activePageIndex,
        type: 'image',
        x: 35,
        y: 35,
        width: 30,
        height: 20,
        imageDataUrl: dataUrl,
      }
      addAnnotation(newAnnotation)
      setSelectedAnnotationId(newAnnotation.id)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Dragging annotations across canvas
  const handleAnnotationMouseDown = (e: React.MouseEvent, ann: CanvasAnnotation) => {
    e.stopPropagation()
    setSelectedAnnotationId(ann.id)
    setIsDraggingElement(true)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const elementPxX = (ann.x / 100) * rect.width
    const elementPxY = (ann.y / 100) * rect.height
    setDragOffset({
      x: e.clientX - rect.left - elementPxX,
      y: e.clientY - rect.top - elementPxY,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingElement || !selectedAnnotationId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
    const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100

    updateAnnotation(selectedAnnotationId, {
      x: Math.min(Math.max(newX, 0), 95),
      y: Math.min(Math.max(newY, 0), 95),
    })
  }

  const handleMouseUp = () => {
    setIsDraggingElement(false)
  }

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Editor Main Toolbar */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] z-20">
        {/* Left: Tools */}
        <div className="flex items-center space-x-2">
          {/* OCR / Scan Text Button */}
          <button
            onClick={handleScanAndEnableEditing}
            disabled={isScanningText}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-40"
            title="Pindai & jadikan seluruh tulisan di halaman ini langsung bisa diedit"
          >
            {isScanningText ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <ScanText size={15} />
            )}
            <span>{isScanningText ? 'Memindai Teks...' : 'Pindai Teks (Bisa Diedit)'}</span>
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Type size={15} />
            <span>+ Tambah Teks</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <ImageIcon size={15} />
            <span>+ Tempel Gambar / Logo</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />

          <button
            onClick={() => setActiveTool(activeTool === 'whiteout' ? 'select' : 'whiteout')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeTool === 'whiteout'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Tutup teks lama yang salah dengan tipex putih"
          >
            <Eraser size={15} />
            <span>Tipex / Tutup Teks</span>
          </button>
        </div>

        {/* Center: Selected Element Controls */}
        {selectedAnnotationId && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400">Elemen Terpilih:</span>
            <button
              onClick={() => {
                removeAnnotation(selectedAnnotationId)
                setSelectedAnnotationId(null)
              }}
              className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
              title="Hapus Elemen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Right: Page Navigation & Zoom */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300">
            <button
              onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
              disabled={activePageIndex === 0}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold">
              Hal {activePageIndex + 1} dari {pages.length}
            </span>
            <button
              onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
              disabled={activePageIndex >= pages.length - 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              title="Perkecil"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(Math.min(1.8, zoomScale + 0.1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              title="Perbesar"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Canvas Viewport */}
      <div 
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative cursor-default"
        onClick={() => setSelectedAnnotationId(null)}
      >
        {scanSuccessCount !== null && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl backdrop-blur-md z-30 flex items-center space-x-2 animate-bounce">
            <CheckCircle2 size={16} />
            <span>{scanSuccessCount} baris teks berhasil dipindai! Klik tulisan apa pun untuk mengubahnya.</span>
          </div>
        )}

        {activeTool !== 'select' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600/90 text-white text-xs font-medium shadow-lg backdrop-blur-md z-30 pointer-events-none animate-bounce">
            Klik di area dokumen untuk meletakkan {activeTool === 'text' ? 'kotak teks' : 'tipex putih'}
          </div>
        )}

        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isDraggingElement ? 'none' : 'transform 0.1s ease',
          }}
          className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-none border border-black/10"
        >
          {/* Base PDF Page Canvas Render */}
          {pageImageUrl ? (
            <img
              src={pageImageUrl}
              alt="PDF Page Render"
              className="max-h-[75vh] w-auto pointer-events-none block"
            />
          ) : (
            <div className="w-[500px] h-[700px] flex items-center justify-center bg-slate-900 text-slate-400">
              <span className="text-xs">Memuat tampilan dokumen...</span>
            </div>
          )}

          {/* Interactive Annotations Overlay */}
          {currentAnnotations.map((ann) => {
            const isSelected = ann.id === selectedAnnotationId

            if (ann.type === 'text') {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                  }}
                  className={`absolute z-10 cursor-move transition-shadow rounded ${
                    isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : 'hover:ring-1 hover:ring-indigo-300'
                  }`}
                >
                  <input
                    type="text"
                    value={ann.text || ''}
                    onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                    style={{
                      fontSize: `${ann.fontSize || 14}px`,
                      color: ann.color || '#000000',
                    }}
                    className="bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white outline-none px-0.5 font-sans leading-tight"
                  />
                </div>
              )
            }

            if (ann.type === 'whiteout') {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width || 20}%`,
                    height: `${ann.height || 4}%`,
                  }}
                  className={`absolute z-1 bg-white cursor-move ${
                    isSelected ? 'ring-2 ring-amber-500' : ''
                  }`}
                  title="Tipex Putih"
                />
              )
            }

            if (ann.type === 'image' && ann.imageDataUrl) {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width || 25}%`,
                  }}
                  className={`absolute z-10 cursor-move ${
                    isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-300'
                  }`}
                >
                  <img
                    src={ann.imageDataUrl}
                    alt="Pasted"
                    className="w-full h-auto object-contain pointer-events-none"
                  />
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}
