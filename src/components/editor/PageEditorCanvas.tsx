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
  RotateCcw,
  Move
} from 'lucide-react'
import { useDocumentStore } from '../../store/documentStore'
import { CanvasAnnotation } from '../../types/annotations'
import { renderPageToThumbnail } from '../../utils/pdfEngine'

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
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'whiteout' | 'pan'>('select')
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentPage = pages[activePageIndex]
  const currentAnnotations = annotations.filter((a) => a.pageIndex === activePageIndex)

  // 1. Render high-res crisp visual background of original PDF
  useEffect(() => {
    if (!currentPdfBuffer || !currentPage) return
    renderPageToThumbnail(currentPdfBuffer, currentPage.pageIndex + 1, 2.0)
      .then((url) => setPageImageUrl(url))
      .catch((err) => console.error('Failed to render editor page preview:', err))
  }, [currentPdfBuffer, currentPage])

  // 2. NATIVE TOUCHPAD GESTURES: Pinch-to-zoom (Ctrl+Wheel) & 2-finger pan
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      if (e.ctrlKey) {
        // Pinch-to-zoom gesture on Touchpad
        const zoomDelta = -e.deltaY * 0.005
        setZoomScale((prev) => Math.min(Math.max(0.5, prev + zoomDelta), 2.5))
      } else {
        // Two-finger scroll / pan gesture on Touchpad
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX * 0.8,
          y: prev.y - e.deltaY * 0.8,
        }))
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Mouse pan handlers
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1 || e.altKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
      return
    }

    if (isDraggingElement && selectedAnnotationId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
      const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100

      updateAnnotation(selectedAnnotationId, {
        x: Math.min(Math.max(newX, 0), 95),
        y: Math.min(Math.max(newY, 0), 95),
      })
    }
  }

  const handleViewportMouseUp = () => {
    setIsPanning(false)
    setIsDraggingElement(false)
  }

  // Canvas click to add user elements
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'pan' || !containerRef.current) return
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
        text: 'Ketik teks baru...',
        fontSize: 14,
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
        x: Math.min(Math.max(clickX - 5, 2), 85),
        y: Math.min(Math.max(clickY - 1.5, 2), 90),
        width: 18,
        height: 3.5,
      }
      addAnnotation(newAnnotation)
      setSelectedAnnotationId(newAnnotation.id)
      setActiveTool('select')
    }
  }

  // Image upload
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
        width: 25,
        height: 15,
        imageDataUrl: dataUrl,
      }
      addAnnotation(newAnnotation)
      setSelectedAnnotationId(newAnnotation.id)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

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

  const resetView = () => {
    setZoomScale(1.0)
    setPanOffset({ x: 0, y: 0 })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] z-20">
        {/* Left: Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Type size={14} />
            <span>+ Teks Baru</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'whiteout' ? 'select' : 'whiteout')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTool === 'whiteout'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Tutup teks lama dengan kotak putih sebelum menuliskan teks baru"
          >
            <Eraser size={14} />
            <span>Tipex / Tutup Teks</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <ImageIcon size={14} />
            <span>+ Foto/Logo</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="h-5 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTool === 'pan'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Geser tampilan (Bisa juga gunakan 2 jari di touchpad)"
          >
            <Move size={14} />
            <span>Geser Layar</span>
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

        {/* Right: Page Navigation, Reset View & Zoom */}
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

          <button
            onClick={resetView}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            title="Reset Posisi & Zoom"
          >
            <RotateCcw size={14} />
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-11 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(Math.min(2.5, zoomScale + 0.1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div 
        ref={viewportRef}
        onMouseDown={handleViewportMouseDown}
        onMouseMove={handleViewportMouseMove}
        onMouseUp={handleViewportMouseUp}
        className={`flex-1 overflow-hidden relative flex items-center justify-center ${
          activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        onClick={() => setSelectedAnnotationId(null)}
      >
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isPanning || isDraggingElement ? 'none' : 'transform 0.05s ease-out',
          }}
          className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-none border border-black/10 shrink-0"
        >
          {/* Base Original PDF Render Image (100% Original Vector & Crisp Layout) */}
          {pageImageUrl ? (
            <img
              src={pageImageUrl}
              alt="PDF Page"
              className="max-h-[75vh] w-auto pointer-events-none block"
            />
          ) : (
            <div className="w-[500px] h-[700px] flex items-center justify-center bg-slate-900 text-slate-400">
              <span className="text-xs">Memuat tampilan dokumen...</span>
            </div>
          )}

          {/* User Annotations: Tipex, Teks Baru, Gambar */}
          {currentAnnotations.map((ann) => {
            const isSelected = ann.id === selectedAnnotationId

            if (ann.type === 'whiteout') {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width || 18}%`,
                    height: `${ann.height || 3.5}%`,
                  }}
                  className={`absolute z-10 bg-white cursor-move shadow-xs ${
                    isSelected ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-amber-300'
                  }`}
                  title="Tipex Putih (Geser untuk menutupi teks lama)"
                />
              )
            }

            if (ann.type === 'text') {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                  }}
                  className={`absolute z-20 cursor-move transition-shadow rounded ${
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
                  className={`absolute z-20 cursor-move ${
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
