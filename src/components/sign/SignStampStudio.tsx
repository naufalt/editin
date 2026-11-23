import React, { useRef, useState, useEffect } from 'react'
import { Pen, Stamp as StampIcon, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useDocumentStore } from '../../store/documentStore'
import { CanvasAnnotation } from '../../types/annotations'
import { renderPageToThumbnail } from '../../utils/pdfEngine'
import { SignaturePad } from './SignaturePad'
import { StampPicker, StampPreset, generateStampDataUrl } from './StampPicker'

export const SignStampStudio: React.FC = () => {
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
  const [showSignModal, setShowSignModal] = useState(false)
  const [showStampModal, setShowStampModal] = useState(false)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const currentPage = pages[activePageIndex]
  const currentAnnotations = annotations.filter((a) => a.pageIndex === activePageIndex)

  useEffect(() => {
    if (!currentPdfBuffer || !currentPage) return
    renderPageToThumbnail(currentPdfBuffer, currentPage.pageIndex + 1, 1.5)
      .then((url) => setPageImageUrl(url))
      .catch((err) => console.error('Failed to render sign page preview:', err))
  }, [currentPdfBuffer, currentPage])

  // Save new signature to canvas
  const handleSignatureReady = (dataUrl: string) => {
    const newAnn: CanvasAnnotation = {
      id: `sign_${Date.now()}`,
      pageIndex: activePageIndex,
      type: 'image',
      x: 35,
      y: 65,
      width: 25,
      imageDataUrl: dataUrl,
    }
    addAnnotation(newAnn)
    setSelectedAnnotationId(newAnn.id)
    setShowSignModal(false)
  }

  // Stamp selection
  const handleStampSelect = (stamp: StampPreset) => {
    const stampDataUrl = generateStampDataUrl(stamp.label, stamp.hexColor)
    const newAnn: CanvasAnnotation = {
      id: `stamp_${Date.now()}`,
      pageIndex: activePageIndex,
      type: 'image',
      x: 35,
      y: 30,
      width: 28,
      imageDataUrl: stampDataUrl,
    }
    addAnnotation(newAnn)
    setSelectedAnnotationId(newAnn.id)
    setShowStampModal(false)
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
      {/* Top Toolbar */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] z-20">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSignModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-2 active:scale-95"
          >
            <Pen size={15} />
            <span>+ Buat Tanda Tangan</span>
          </button>

          <button
            onClick={() => setShowStampModal(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center space-x-2 active:scale-95"
          >
            <StampIcon size={15} className="text-amber-400" />
            <span>+ Pilih Cap / Stempel</span>
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
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(Math.min(1.8, zoomScale + 0.1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div 
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative cursor-default"
        onClick={() => setSelectedAnnotationId(null)}
      >
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isDraggingElement ? 'none' : 'transform 0.1s ease',
          }}
          className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-none border border-black/10"
        >
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

          {/* Render signatures and stamps on canvas */}
          {currentAnnotations.map((ann) => {
            const isSelected = ann.id === selectedAnnotationId

            if (ann.imageDataUrl) {
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
                    isSelected ? 'ring-2 ring-indigo-500 rounded' : 'hover:ring-1 hover:ring-indigo-300'
                  }`}
                >
                  <img
                    src={ann.imageDataUrl}
                    alt="Signature or Stamp"
                    className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                  />
                </div>
              )
            }
            return null
          })}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <SignaturePad
              onSaveSignature={handleSignatureReady}
              onClose={() => setShowSignModal(false)}
            />
          </div>
        </div>
      )}

      {/* Stamp Picker Modal */}
      {showStampModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13151D] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <StampIcon size={16} className="text-amber-400" />
                <span>Pilih Cap / Stempel Resmi</span>
              </h3>
              <button
                onClick={() => setShowStampModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <StampPicker onSelectStamp={handleStampSelect} />
          </div>
        </div>
      )}
    </div>
  )
}
