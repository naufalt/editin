import React, { useEffect, useRef } from 'react'
import { RotateCw, RotateCcw, Trash2, GripVertical } from 'lucide-react'
import { PageInfo } from '../../store/documentStore'
import { renderPageToThumbnail } from '../../utils/pdfEngine'

interface PageCardProps {
  page: PageInfo
  index: number
  pdfBuffer: ArrayBuffer
  isSelected: boolean
  onSelect: (index: number, multi: boolean) => void
  onRotateCW: (index: number) => void
  onRotateCCW: (index: number) => void
  onDelete: (index: number) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onThumbnailRendered: (index: number, url: string) => void
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  index,
  pdfBuffer,
  isSelected,
  onSelect,
  onRotateCW,
  onRotateCCW,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onThumbnailRendered,
}) => {
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    if (!page.thumbnailUrl) {
      renderPageToThumbnail(pdfBuffer, page.pageIndex + 1)
        .then((url) => {
          if (isMounted.current) {
            onThumbnailRendered(index, url)
          }
        })
        .catch((err) => {
          console.error(`Failed to render thumbnail for page ${index + 1}:`, err)
        })
    }
    return () => {
      isMounted.current = false
    }
  }, [page.pageIndex, pdfBuffer])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onClick={(e) => onSelect(index, e.ctrlKey || e.metaKey)}
      className={`group relative rounded-2xl border transition-all duration-150 flex flex-col items-center bg-[#13151D] select-none cursor-pointer overflow-hidden p-3 ${
        isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
          : 'border-white/10 hover:border-white/20 hover:shadow-md'
      }`}
    >
      {/* Top Header / Drag Handle & Page Badge */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center space-x-1.5">
          <GripVertical size={14} className="text-slate-500 group-hover:text-slate-300 cursor-grab" />
          <span className="text-xs font-bold text-slate-300">
            Page {page.pageNumber}
          </span>
        </div>
        {page.rotation !== 0 && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {page.rotation}°
          </span>
        )}
      </div>

      {/* Visual Canvas Thumbnail Container */}
      <div className="w-full aspect-[1/1.4] bg-slate-900/50 rounded-xl overflow-hidden flex items-center justify-center relative border border-white/5">
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.pageNumber}`}
            className="w-full h-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${page.rotation}deg)` }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
            <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
            <span className="text-[10px]">Rendering...</span>
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRotateCCW(index)
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Rotate Left 90°"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRotateCW(index)
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Rotate Right 90°"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(index)
            }}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
            title="Delete Page"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
