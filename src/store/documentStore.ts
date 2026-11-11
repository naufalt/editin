import { create } from 'zustand'
import { CanvasAnnotation } from '../types/annotations'

export interface PageInfo {
  pageIndex: number       // 0-based original index
  pageNumber: number      // 1-based display number
  rotation: number        // 0, 90, 180, 270
  thumbnailUrl?: string   // Data URL or object URL rendered from canvas
  width: number
  height: number
  sourceDocId?: string
}

export interface DocumentState {
  currentPdfPath: string | null
  currentPdfBuffer: ArrayBuffer | null
  fileName: string | null
  pageCount: number
  pages: PageInfo[]
  selectedPages: number[] // page indices
  isLoading: boolean
  statusText: string

  // Annotations (Edit Isi Dokumen)
  annotations: CanvasAnnotation[]
  activePageIndex: number

  // Actions
  setDocument: (fileName: string, buffer: ArrayBuffer, path?: string) => void
  setPages: (pages: PageInfo[]) => void
  updatePageThumbnail: (index: number, url: string) => void
  rotatePage: (index: number, direction: 'cw' | 'ccw') => void
  rotateAllPages: (direction: 'cw' | 'ccw') => void
  deletePage: (index: number) => void
  deleteSelectedPages: () => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  toggleSelectPage: (index: number, multi?: boolean) => void
  clearSelection: () => void
  setStatus: (status: string) => void
  setLoading: (loading: boolean) => void
  resetDocument: () => void

  // Annotation Actions
  setActivePageIndex: (pageIndex: number) => void
  addAnnotation: (annotation: CanvasAnnotation) => void
  updateAnnotation: (id: string, updates: Partial<CanvasAnnotation>) => void
  removeAnnotation: (id: string) => void
  clearAnnotationsOnPage: (pageIndex: number) => void
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentPdfPath: null,
  currentPdfBuffer: null,
  fileName: null,
  pageCount: 0,
  pages: [],
  selectedPages: [],
  isLoading: false,
  statusText: 'Siap',
  annotations: [],
  activePageIndex: 0,

  setDocument: (fileName, buffer, path) => set({
    fileName,
    currentPdfBuffer: buffer,
    currentPdfPath: path || null,
    pages: [],
    selectedPages: [],
    pageCount: 0,
    annotations: [],
    activePageIndex: 0,
    statusText: `Berhasil membuka ${fileName}`,
  }),

  setPages: (pages) => set({
    pages,
    pageCount: pages.length,
    statusText: `${pages.length} halaman siap diedit`,
  }),

  updatePageThumbnail: (index, url) => {
    const { pages } = get()
    if (!pages[index]) return
    const updated = [...pages]
    updated[index] = { ...updated[index], thumbnailUrl: url }
    set({ pages: updated })
  },

  rotatePage: (index, direction) => {
    const { pages } = get()
    if (!pages[index]) return
    const delta = direction === 'cw' ? 90 : -90
    const newRotation = (pages[index].rotation + delta + 360) % 360
    const updated = [...pages]
    updated[index] = { ...updated[index], rotation: newRotation }
    set({ pages: updated, statusText: `Memutar halaman ${pages[index].pageNumber}` })
  },

  rotateAllPages: (direction) => {
    const { pages } = get()
    const delta = direction === 'cw' ? 90 : -90
    const updated = pages.map((p) => ({
      ...p,
      rotation: (p.rotation + delta + 360) % 360,
    }))
    set({ pages: updated, statusText: `Memutar seluruh halaman 90°` })
  },

  deletePage: (index) => {
    const { pages, selectedPages } = get()
    const updated = pages.filter((_, i) => i !== index)
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }))
    set({
      pages: renumbered,
      pageCount: renumbered.length,
      selectedPages: selectedPages.filter((i) => i !== index),
      statusText: `Menghapus halaman ${index + 1}`,
    })
  },

  deleteSelectedPages: () => {
    const { pages, selectedPages } = get()
    if (selectedPages.length === 0) return
    const updated = pages.filter((_, i) => !selectedPages.includes(i))
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }))
    set({
      pages: renumbered,
      pageCount: renumbered.length,
      selectedPages: [],
      statusText: `Menghapus ${selectedPages.length} halaman terpilih`,
    })
  },

  reorderPages: (fromIndex, toIndex) => {
    const { pages } = get()
    if (fromIndex === toIndex) return
    const updated = [...pages]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }))
    set({ pages: renumbered, statusText: `Memindahkan halaman ${fromIndex + 1} ke posisi ${toIndex + 1}` })
  },

  toggleSelectPage: (index, multi = false) => {
    const { selectedPages } = get()
    if (multi) {
      if (selectedPages.includes(index)) {
        set({ selectedPages: selectedPages.filter((i) => i !== index) })
      } else {
        set({ selectedPages: [...selectedPages, index] })
      }
    } else {
      if (selectedPages.length === 1 && selectedPages[0] === index) {
        set({ selectedPages: [] })
      } else {
        set({ selectedPages: [index] })
      }
    }
  },

  clearSelection: () => set({ selectedPages: [] }),
  setStatus: (status) => set({ statusText: status }),
  setLoading: (loading) => set({ isLoading: loading }),

  resetDocument: () => set({
    currentPdfPath: null,
    currentPdfBuffer: null,
    fileName: null,
    pageCount: 0,
    pages: [],
    selectedPages: [],
    annotations: [],
    activePageIndex: 0,
    isLoading: false,
    statusText: 'Siap',
  }),

  // Annotation functions
  setActivePageIndex: (activePageIndex) => set({ activePageIndex }),
  addAnnotation: (annotation) => set((state) => ({ 
    annotations: [...state.annotations, annotation],
    statusText: `Menambahkan elemen baru`
  })),
  updateAnnotation: (id, updates) => set((state) => ({
    annotations: state.annotations.map((a) => a.id === id ? { ...a, ...updates } : a)
  })),
  removeAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter((a) => a.id !== id),
    statusText: `Menghapus elemen`
  })),
  clearAnnotationsOnPage: (pageIndex) => set((state) => ({
    annotations: state.annotations.filter((a) => a.pageIndex !== pageIndex)
  })),
}))
