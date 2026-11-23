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
  Move,
  Sparkles,
  Undo2
} from 'lucide-react'
import { useDocumentStore } from '../../store/documentStore'
import { CanvasAnnotation } from '../../types/annotations'
import { renderPageToCanvas, exportModifiedPdf } from '../../utils/pdfEngine'
import { extractPageTextBlocks, EditableTextBlock, DetectedFontCategory, sanitizePdfText } from '../../utils/textExtractEngine'

interface PageEditorCanvasProps {
  editedBlocks: EditableTextBlock[]
  onBlocksChange: (blocks: EditableTextBlock[]) => void
}

export const PageEditorCanvas: React.FC<PageEditorCanvasProps> = ({
  editedBlocks,
  onBlocksChange,
}) => {
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
  const [renderedPageHeightPx, setRenderedPageHeightPx] = useState<number>(700)
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'whiteout' | 'pan'>('select')
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isScanning, setIsScanning] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editedBlocksRef = useRef<EditableTextBlock[]>(editedBlocks)
  editedBlocksRef.current = editedBlocks

  const currentPage = pages[activePageIndex]
  const currentAnnotations = annotations.filter((a) => a.pageIndex === activePageIndex)
  const currentPageNumber = currentPage ? currentPage.pageIndex + 1 : 1
  const currentPageBlocks = editedBlocks.filter((b) => b.pageNumber === currentPageNumber)

  // 1. Render high-res crisp visual background AND sample exact colors for 1:1 native text editing
  useEffect(() => {
    if (!currentPdfBuffer || !currentPage) return
    let isCancelled = false

    const loadPageAndExtract = async () => {
      try {
        setIsScanning(true)
        const baseCanvas = await renderPageToCanvas(currentPdfBuffer, currentPageNumber, 2.0)
        if (isCancelled) return
        setPageImageUrl(baseCanvas.toDataURL('image/jpeg', 0.94))

        const alreadyExtracted = editedBlocksRef.current.some((b) => b.pageNumber === currentPageNumber)
        if (!alreadyExtracted) {
          const newBlocks = await extractPageTextBlocks(currentPdfBuffer, currentPageNumber, baseCanvas)
          if (!isCancelled) {
            onBlocksChange([...editedBlocksRef.current, ...newBlocks])
          }
        }
      } catch (err) {
        console.error('Failed to render/extract editor page:', err)
      } finally {
        if (!isCancelled) setIsScanning(false)
      }
    }

    loadPageAndExtract()
    return () => {
      isCancelled = true
    }
  }, [currentPdfBuffer, currentPageNumber])

  // 1b. Live 1:1 PDF Vector Preview: whenever any block on this page is edited, re-render the actual modified PDF page
  // so what the user sees on screen is 100% the true PDF vector glyphs (identical to the original PDF and exported file!)
  useEffect(() => {
    if (!currentPdfBuffer || !currentPage) return
    const hasEditsOnPage = currentPageBlocks.some((b) => b.isEdited)
    let isCancelled = false

    const timer = setTimeout(async () => {
      try {
        if (!hasEditsOnPage) {
          const baseCanvas = await renderPageToCanvas(currentPdfBuffer, currentPageNumber, 2.0)
          if (!isCancelled) setPageImageUrl(baseCanvas.toDataURL('image/jpeg', 0.94))
          return
        }
        const modBytes = await exportModifiedPdf(
          currentPdfBuffer,
          pages,
          [],
          editedBlocksRef.current
        )
        if (isCancelled) return
        const modBuffer = modBytes.buffer.slice(
          modBytes.byteOffset,
          modBytes.byteOffset + modBytes.byteLength
        ) as ArrayBuffer
        const modCanvas = await renderPageToCanvas(modBuffer, activePageIndex + 1, 2.0)
        if (!isCancelled) {
          setPageImageUrl(modCanvas.toDataURL('image/jpeg', 0.94))
        }
      } catch (e) {
        console.warn('Live PDF vector preview update skipped:', e)
      }
    }, 80)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [editedBlocks, currentPdfBuffer, currentPageNumber, activePageIndex])

  // Track rendered image height so font sizes match exact 1:1 scale
  useEffect(() => {
    const updateHeight = () => {
      if (imgRef.current && imgRef.current.clientHeight > 0) {
        setRenderedPageHeightPx(imgRef.current.clientHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [pageImageUrl])

  // 2. NATIVE TOUCHPAD GESTURES: Pinch-to-zoom (Ctrl+Wheel) & 2-finger pan
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      if (e.ctrlKey) {
        const zoomDelta = -e.deltaY * 0.005
        setZoomScale((prev) => Math.min(Math.max(0.5, prev + zoomDelta), 2.5))
      } else {
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

  // Update text block properties
  const handleUpdateBlock = (id: string, updates: Partial<EditableTextBlock>) => {
    const updated = editedBlocks.map((b) => {
      if (b.id === id) {
        const nextStr = updates.str !== undefined ? sanitizePdfText(updates.str) : b.str
        return {
          ...b,
          ...updates,
          str: nextStr,
          isEdited:
            nextStr !== b.originalStr ||
            updates.textColor !== undefined ||
            updates.isBold !== undefined ||
            updates.fontCategory !== undefined ||
            updates.pdfFontSize !== undefined,
        }
      }
      return b
    })
    onBlocksChange(updated)
  }

  // Revert a single edited text block back to original PDF vector
  const handleRevertBlock = (id: string) => {
    const updated = editedBlocks.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          str: b.originalStr,
          isEdited: false,
        }
      }
      return b
    })
    onBlocksChange(updated)
    setSelectedBlockId(null)
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
    setSelectedBlockId(null)
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

  const activeBlock = currentPageBlocks.find((b) => b.id === selectedBlockId)

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] z-20">
        {/* Left: Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles size={14} className={isScanning ? "animate-spin" : "text-indigo-400"} />
            <span>{isScanning ? 'Memindai Teks...' : 'Klik Teks untuk Edit 1:1'}</span>
          </div>

          <div className="h-5 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Type size={14} />
            <span>+ Teks</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'whiteout' ? 'select' : 'whiteout')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTool === 'whiteout'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Eraser size={14} />
            <span>Tipex</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <ImageIcon size={14} />
            <span>+ Gambar</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />

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
            <span>Geser</span>
          </button>
        </div>

        {/* Center: Active Block 1:1 Inspector (Detected Font, Category, Weight, Size, Color, Revert) */}
        {activeBlock && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#1A1D28] border border-indigo-500/30 shadow-lg">
            {/* Detected PDF Font Badge & Style Selector */}
            <div className="flex items-center space-x-1.5 pr-1 border-r border-white/10">
              <span
                className="text-[10px] font-medium text-indigo-300 max-w-[90px] truncate"
                title={`Font Asli PDF: ${activeBlock.realFontName || 'Inter'}`}
              >
                {activeBlock.realFontName || 'Inter'}
              </span>
              <select
                value={activeBlock.fontCategory || 'sans'}
                onChange={(e) =>
                  handleUpdateBlock(activeBlock.id, {
                    fontCategory: e.target.value as DetectedFontCategory,
                  })
                }
                className="bg-white/5 text-slate-200 text-[10px] rounded px-1.5 py-0.5 border border-white/10 outline-none cursor-pointer"
                title="Gaya Huruf (Sans-Serif / Serif / Monospace)"
              >
                <option value="sans" className="bg-[#1A1D28] text-slate-200">
                  Sans-Serif
                </option>
                <option value="serif" className="bg-[#1A1D28] text-slate-200">
                  Serif
                </option>
                <option value="mono" className="bg-[#1A1D28] text-slate-200">
                  Monospace
                </option>
              </select>
            </div>

            {/* Bold toggle */}
            <button
              onClick={() => handleUpdateBlock(activeBlock.id, { isBold: !activeBlock.isBold })}
              className={`w-6 h-6 rounded text-xs font-black transition-colors ${
                activeBlock.isBold ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              title="Tebal (Bold)"
            >
              B
            </button>

            {/* Font size fine-tuning */}
            <div className="flex items-center space-x-1 bg-white/5 rounded px-1.5 py-0.5">
              <button
                onClick={() => {
                  const nextPt = Math.max(5, (activeBlock.pdfFontSize || 11) - 0.5)
                  const ratioScale = nextPt / (activeBlock.pdfFontSize || 11)
                  handleUpdateBlock(activeBlock.id, {
                    pdfFontSize: nextPt,
                    fontSizeRatio: activeBlock.fontSizeRatio * ratioScale,
                  })
                }}
                className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                title="Perkecil huruf"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-slate-200 w-7 text-center">
                {Math.round((activeBlock.pdfFontSize || 11) * 10) / 10}
              </span>
              <button
                onClick={() => {
                  const nextPt = Math.min(72, (activeBlock.pdfFontSize || 11) + 0.5)
                  const ratioScale = nextPt / (activeBlock.pdfFontSize || 11)
                  handleUpdateBlock(activeBlock.id, {
                    pdfFontSize: nextPt,
                    fontSizeRatio: activeBlock.fontSizeRatio * ratioScale,
                  })
                }}
                className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                title="Perbesar huruf"
              >
                +
              </button>
            </div>

            {/* Text Color Picker */}
            <input
              type="color"
              value={activeBlock.textColor || '#000000'}
              onChange={(e) => handleUpdateBlock(activeBlock.id, { textColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
              title="Warna Teks"
            />

            {activeBlock.isEdited && (
              <button
                onClick={() => handleRevertBlock(activeBlock.id)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] flex items-center space-x-1 transition-colors"
                title="Kembalikan ke teks asli dokumen"
              >
                <Undo2 size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}

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
              Hal {activePageIndex + 1} / {pages.length}
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
        onClick={() => {
          setSelectedAnnotationId(null)
          setSelectedBlockId(null)
        }}
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
          {/* 1. Base Original PDF Render Image (100% Original Vector & Crisp Layout) */}
          {pageImageUrl ? (
            <img
              ref={imgRef}
              onLoad={(e) => setRenderedPageHeightPx(e.currentTarget.clientHeight)}
              src={pageImageUrl}
              alt="PDF Page"
              className="max-h-[75vh] w-auto pointer-events-none block"
            />
          ) : (
            <div className="w-[500px] h-[700px] flex items-center justify-center bg-slate-900 text-slate-400">
              <span className="text-xs">Memuat tampilan dokumen...</span>
            </div>
          )}

          {/* 2. True 1:1 Native Text Editing Layer */}
          {currentPageBlocks.map((block) => {
            const isSelected = block.id === selectedBlockId
            // Only show the HTML input while actively selected & typing; once unselected, the live PDF vector canvas underneath shows the 100% native PDF glyphs!
            const showEditor = isSelected

            // Exact 1:1 pixel font size matching the PDF font metric
            const exactFontSizePx = (block.fontSizeRatio / 100) * renderedPageHeightPx
            const category = block.fontCategory || 'sans'
            const cssFontFamily =
              category === 'serif'
                ? 'Georgia, "Times New Roman", Times, serif'
                : category === 'mono'
                ? '"Consolas", "Courier New", monospace'
                : '"EditInSans", "Inter", Arial, Helvetica, sans-serif'

            return (
              <div
                key={block.id}
                onClick={(e) => {
                  if (activeTool !== 'select') return
                  e.stopPropagation()
                  setSelectedBlockId(block.id)
                  setSelectedAnnotationId(null)
                }}
                style={{
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  minWidth: `${block.width}%`,
                  height: `${block.height}%`,
                  backgroundColor: showEditor ? block.bgColor : 'transparent',
                }}
                className={`absolute z-10 flex items-baseline transition-shadow ${
                  showEditor
                    ? ''
                    : 'hover:outline hover:outline-1 hover:outline-indigo-500/50 cursor-text'
                } ${isSelected ? 'outline outline-1 outline-dashed outline-indigo-600 z-30' : ''}`}
                title={showEditor ? undefined : `Klik untuk edit teks: "${block.str}"`}
              >
                {showEditor && (
                  <input
                    type="text"
                    autoFocus={isSelected}
                    value={block.str}
                    onChange={(e) => handleUpdateBlock(block.id, { str: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setSelectedBlockId(null)
                      }
                    }}
                    style={{
                      fontSize: `${exactFontSizePx}px`,
                      lineHeight: '1',
                      fontFamily: cssFontFamily,
                      fontWeight: block.isBold ? 700 : 400,
                      fontStyle: block.isItalic ? 'italic' : 'normal',
                      color: block.textColor || '#000000',
                      backgroundColor: block.bgColor || '#ffffff',
                      width: `${Math.max(block.str.length + 0.5, 2)}ch`,
                      minWidth: '100%',
                    }}
                    className="h-full border-none outline-none p-0 m-0 tracking-normal"
                  />
                )}
              </div>
            )
          })}

          {/* 3. User Annotations: Tipex, Teks Baru, Gambar */}
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
                  className={`absolute z-20 bg-white cursor-move shadow-xs ${
                    isSelected ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-amber-300'
                  }`}
                  title="Tipex Putih"
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
