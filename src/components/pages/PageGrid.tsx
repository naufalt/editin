import React, { useState } from 'react'
import { RotateCw, RotateCcw, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../../store/documentStore'
import { PageCard } from './PageCard'

export const PageGrid: React.FC = () => {
  const {
    pages,
    currentPdfBuffer,
    fileName,
    selectedPages,
    rotatePage,
    rotateAllPages,
    deletePage,
    deleteSelectedPages,
    reorderPages,
    toggleSelectPage,
    clearSelection,
    updatePageThumbnail,
  } = useDocumentStore()

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  if (!currentPdfBuffer || pages.length === 0) {
    return null
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderPages(draggedIndex, targetIndex)
    }
    setDraggedIndex(null)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Grid Toolbar */}
      <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-[#0C0D12]/60 select-none">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-200 truncate max-w-xs">
            {fileName}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            ({pages.length} pages)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedPages.length > 0 ? (
            <>
              <span className="text-xs text-indigo-400 font-medium">
                {selectedPages.length} selected
              </span>
              <button
                onClick={deleteSelectedPages}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-medium transition-colors flex items-center space-x-1"
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
              <button
                onClick={clearSelection}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                Deselect
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => rotateAllPages('ccw')}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-1"
                title="Rotate all pages counter-clockwise"
              >
                <RotateCcw size={13} />
                <span>Rotate All L</span>
              </button>
              <button
                onClick={() => rotateAllPages('cw')}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-1"
                title="Rotate all pages clockwise"
              >
                <RotateCw size={13} />
                <span>Rotate All R</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Page Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((page, index) => (
            <PageCard
              key={`${page.pageIndex}-${index}`}
              page={page}
              index={index}
              pdfBuffer={currentPdfBuffer}
              isSelected={selectedPages.includes(index)}
              onSelect={toggleSelectPage}
              onRotateCW={(idx) => rotatePage(idx, 'cw')}
              onRotateCCW={(idx) => rotatePage(idx, 'ccw')}
              onDelete={deletePage}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onThumbnailRendered={updatePageThumbnail}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
