import { useState, useRef } from 'react'
import { Titlebar } from './components/layout/Titlebar'
import { Sidebar, TabType } from './components/layout/Sidebar'
import { BottomDeck } from './components/layout/BottomDeck'
import { Dropzone } from './components/common/Dropzone'
import { DashboardHome } from './components/dashboard/DashboardHome'
import { PageGrid } from './components/pages/PageGrid'
import { PageEditorCanvas } from './components/editor/PageEditorCanvas'
import { MergeStudio } from './components/merge/MergeStudio'
import { SplitStudio } from './components/split/SplitStudio'
import { SignStampStudio } from './components/sign/SignStampStudio'
import { CompressStudio } from './components/compress/CompressStudio'
import { ProtectStudio } from './components/protect/ProtectStudio'
import { useDocumentStore } from './store/documentStore'
import { loadPdfPages, exportModifiedPdf } from './utils/pdfEngine'
import { MergeItem, mergePdfDocuments, splitPdfByRange, splitPdfEveryNPages } from './utils/mergeSplitEngine'
import { CompressQuality, compressPdfDocument, encryptPdfDocument } from './utils/compressProtectEngine'
import { EditableTextBlock } from './utils/textExtractEngine'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const fallbackFileInputRef = useRef<HTMLInputElement>(null)

  // Document state
  const {
    currentPdfBuffer,
    fileName,
    pages,
    annotations,
    statusText,
    isLoading,
    setDocument,
    setPages,
    setLoading,
    setStatus,
    resetDocument,
  } = useDocumentStore()

  // Direct text editing state (Acrobat-style inline blocks)
  const [editedBlocks, setEditedBlocks] = useState<EditableTextBlock[]>([])

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<MergeItem[]>([])

  // Split state
  const [splitRange, setSplitRange] = useState('1')
  const [splitMode, setSplitMode] = useState<'range' | 'every-n'>('range')
  const [splitNValue, setSplitNValue] = useState(1)

  // Compress state
  const [compressQuality, setCompressQuality] = useState<CompressQuality>('balanced')

  // Protect state
  const [protectPassword, setProtectPassword] = useState('')

  // Track whether pages were reordered/deleted in Page Manager
  const [hasPageStructureChanges, setHasPageStructureChanges] = useState(false)

  const handleProcessFileBuffer = async (name: string, buffer: ArrayBuffer, path?: string) => {
    try {
      setLoading(true)
      setStatus(`Membuka berkas ${name}...`)
      setDocument(name, buffer, path)

      const parsedPages = await loadPdfPages(buffer)
      setPages(parsedPages)
      setEditedBlocks([])
      setHasPageStructureChanges(false)
      setSplitRange(parsedPages.length > 1 ? `1-${Math.min(3, parsedPages.length)}` : '1')
      
      if (activeTab === 'dashboard') {
        setActiveTab('editor')
      }
    } catch (err: any) {
      console.error('Error loading PDF:', err)
      setStatus(`Gagal memproses dokumen: ${err?.message || 'Format tidak didukung'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const buffer = await file.arrayBuffer()
    await handleProcessFileBuffer(file.name, buffer)
  }

  const handleBrowseNative = async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.openPdfDialog === 'function') {
        const filePaths = await window.electronAPI.openPdfDialog()
        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0]
          const buffer = await window.electronAPI.readFileBuffer(filePath)
          const name = filePath.split(/[\\/]/).pop() || 'document.pdf'
          await handleProcessFileBuffer(name, buffer, filePath)
          return
        }
      }
    } catch (e) {
      console.warn('Native dialog error, falling back to input:', e)
    }
    fallbackFileInputRef.current?.click()
  }

  // Merge Handlers
  const handleAddMergeFiles = (newFiles: MergeItem[]) => {
    setMergeFiles((prev) => [...prev, ...newFiles])
    setStatus(`Menambahkan ${newFiles.length} berkas ke antrean gabung`)
  }

  const handleRemoveMergeFile = (id: string) => {
    setMergeFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleReorderMergeFiles = (fromIndex: number, toIndex: number) => {
    const updated = [...mergeFiles]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    setMergeFiles(updated)
  }

  // Build descriptive output filename reflecting all operations performed on the document
  const buildSmartExportFileName = (currentAction: 'merge' | 'split' | 'compress' | 'protect' | 'editor' | 'sign' | 'pages', extraSuffix?: string): string => {
    const rawBase = (fileName || 'dokumen').replace(/\.pdf$/i, '')

    // Detect cumulative history of actions already performed on this document
    const tags: string[] = []
    const hasTextEdits = editedBlocks.some((b) => b.isEdited)
    const hasEditorAnnotations = annotations.some((a) => !a.id.startsWith('sign_') && !a.id.startsWith('stamp_'))
    const hasSignOrStamp = annotations.some((a) => a.id.startsWith('sign_') || a.id.startsWith('stamp_'))
    const hasRotatedOrReordered =
      hasPageStructureChanges ||
      pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)

    if (hasTextEdits || hasEditorAnnotations || currentAction === 'editor') {
      if (!rawBase.includes('_edited')) tags.push('edited')
    }
    if (hasSignOrStamp || currentAction === 'sign') {
      if (!rawBase.includes('_signed')) tags.push('signed')
    }
    if (hasRotatedOrReordered || currentAction === 'pages') {
      if (!rawBase.includes('_organized') && tags.length === 0) tags.push('organized')
    }
    if (currentAction === 'compress') {
      if (!rawBase.includes('_compressed')) tags.push('compressed')
    }
    if (currentAction === 'protect') {
      if (!rawBase.includes('_locked')) tags.push('locked')
    }
    if (currentAction === 'split') {
      tags.push(extraSuffix || 'split')
    }
    if (currentAction === 'merge') {
      const firstMergeBase = mergeFiles[0]?.name.replace(/\.pdf$/i, '') || 'dokumen'
      return `${firstMergeBase}_merged.pdf`
    }

    if (tags.length === 0) {
      tags.push('edited')
    }

    return `${rawBase}_${tags.join('_')}.pdf`
  }

  // Primary Action Router
  const handleExport = async () => {
    try {
      setLoading(true)

      // 1. GABUNG PDF
      if (activeTab === 'merge') {
        if (mergeFiles.length < 2) {
          setStatus('Pilih minimal 2 dokumen untuk digabungkan')
          setLoading(false)
          return
        }
        setStatus('Menggabungkan dokumen...')
        const mergedBytes = await mergePdfDocuments(mergeFiles)
        await saveOutput(mergedBytes, buildSmartExportFileName('merge'))
        return
      }

      // 2. PISAH / SPLIT PDF
      if (activeTab === 'split') {
        if (!currentPdfBuffer || pages.length === 0) {
          setStatus('Buka dokumen PDF terlebih dahulu')
          setLoading(false)
          return
        }

        if (splitMode === 'every-n') {
          setStatus(`Memecah dokumen tiap ${splitNValue} halaman...`)
          const chunks = await splitPdfEveryNPages(currentPdfBuffer, splitNValue, pages.length)
          for (const chunk of chunks) {
            const chunkName = buildSmartExportFileName('split', `split_part_${chunk.chunkIndex}`)
            await saveOutput(chunk.bytes, chunkName)
          }
          setStatus(`Berhasil memecah menjadi ${chunks.length} berkas`)
          return
        } else {
          setStatus('Memisahkan rentang halaman...')
          const splitBytes = await splitPdfByRange(currentPdfBuffer, splitRange, pages.length)
          const cleanRange = splitRange.replace(/[^a-zA-Z0-9]/g, '_')
          const name = buildSmartExportFileName('split', `split_${cleanRange}`)
          await saveOutput(splitBytes, name)
          return
        }
      }

      // 3. KOMPRES PDF
      if (activeTab === 'compress') {
        if (!currentPdfBuffer) return
        setStatus('Mengompresi ukuran dokumen...')
        // First apply any pending edits/signatures if the user edited or signed before compressing!
        const hasPendingChanges =
          editedBlocks.some((b) => b.isEdited) ||
          annotations.length > 0 ||
          pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)
        let sourceBuffer = currentPdfBuffer
        if (hasPendingChanges && pages.length > 0) {
          const modBytes = await exportModifiedPdf(currentPdfBuffer, pages, annotations, editedBlocks)
          sourceBuffer = modBytes.buffer.slice(modBytes.byteOffset, modBytes.byteOffset + modBytes.byteLength) as ArrayBuffer
        }

        const result = await compressPdfDocument(sourceBuffer, compressQuality)
        const name = buildSmartExportFileName('compress')
        const saved = await saveOutput(result.bytes, name)
        if (saved) {
          const origMb = (result.originalSize / (1024 * 1024)).toFixed(2)
          const newMb = (result.newSize / (1024 * 1024)).toFixed(2)
          setStatus(`Kompresi berhasil! ${origMb} MB → ${newMb} MB (Hemat ${result.savingsPercent}%)`)
        }
        return
      }

      // 4. KUNCI SANDI (PROTECT)
      if (activeTab === 'protect') {
        if (!currentPdfBuffer) return
        if (protectPassword.length < 4) {
          setStatus('Kata sandi minimal 4 karakter')
          setLoading(false)
          return
        }
        setStatus('Mengenkripsi & mengunci dokumen dengan kata sandi...')
        // First apply any pending edits/signatures if the user edited or signed before locking!
        const hasPendingChanges =
          editedBlocks.some((b) => b.isEdited) ||
          annotations.length > 0 ||
          pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)
        let sourceBuffer = currentPdfBuffer
        if (hasPendingChanges && pages.length > 0) {
          const modBytes = await exportModifiedPdf(currentPdfBuffer, pages, annotations, editedBlocks)
          sourceBuffer = modBytes.buffer.slice(modBytes.byteOffset, modBytes.byteOffset + modBytes.byteLength) as ArrayBuffer
        }

        const encryptedBytes = await encryptPdfDocument(sourceBuffer, protectPassword)
        const name = buildSmartExportFileName('protect')
        const saved = await saveOutput(encryptedBytes, name)
        if (saved) {
          setStatus('Dokumen berhasil dikunci dengan sandi!')
        }
        return
      }

      // 5. EDITOR / PAGES / SIGN (Simpan Hasil Editan / Tanda Tangan / Susun Halaman)
      if (!currentPdfBuffer || pages.length === 0) return
      setStatus('Menyimpan perubahan ke PDF...')
      const outputBytes = await exportModifiedPdf(currentPdfBuffer, pages, annotations, editedBlocks)
      const actionType = activeTab === 'sign' ? 'sign' : activeTab === 'pages' ? 'pages' : 'editor'
      const defaultExportName = buildSmartExportFileName(actionType)
      await saveOutput(outputBytes, defaultExportName)

    } catch (err: any) {
      console.error(err)
      setStatus(`Gagal: ${err.message || 'Terjadi kesalahan'}`)
    } finally {
      setLoading(false)
    }
  }

  const saveOutput = async (bytes: Uint8Array, defaultName: string): Promise<boolean> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveFileBuffer === 'function') {
        const outBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        const saved = await window.electronAPI.saveFileBuffer(defaultName, outBuffer)
        if (saved) {
          setStatus(`Berhasil disimpan sebagai ${defaultName}`)
          return true
        } else {
          setStatus('Penyimpanan dibatalkan')
          return false
        }
      }
    } catch (e) {
      console.warn('Native save failed, fallback to download:', e)
    }

    const outBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const blob = new Blob([outBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(url)
    setStatus(`Berhasil didownload sebagai ${defaultName}`)
    return true
  }

  const getItemCount = () => {
    if (activeTab === 'merge') return mergeFiles.length
    return pages.length
  }

  const getPrimaryLabel = () => {
    if (activeTab === 'merge') return 'Gabungkan & Simpan'
    if (activeTab === 'split') {
      return splitMode === 'every-n' ? `Pecah Tiap ${splitNValue} Hal` : 'Ekstrak & Simpan'
    }
    if (activeTab === 'sign') return 'Simpan Dokumen Bertanda Tangan'
    if (activeTab === 'compress') return 'Kompres & Simpan'
    if (activeTab === 'protect') return 'Kunci Dokumen & Simpan'
    return 'Simpan & Download PDF'
  }

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark bg-[#0C0D12]' : 'bg-[#EEF1F6] text-slate-800'}`}>
      {/* 1. Custom Frameless Titlebar */}
      <Titlebar />

      <input
        ref={fallbackFileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* 2. Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#13151D]/40">
          {activeTab === 'dashboard' && (
            <DashboardHome
              onNavigate={setActiveTab}
              onOpenFile={handleBrowseNative}
              fileName={fileName}
              pageCount={pages.length}
            />
          )}

          {activeTab === 'merge' && (
            <MergeStudio
              files={mergeFiles}
              onAddFiles={handleAddMergeFiles}
              onRemoveFile={handleRemoveMergeFile}
              onReorderFiles={handleReorderMergeFiles}
              onClearAll={() => setMergeFiles([])}
            />
          )}

          {activeTab !== 'dashboard' && activeTab !== 'merge' && (!currentPdfBuffer || pages.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
              <Dropzone
                onFilesSelected={handleFilesSelected}
                onBrowseClick={handleBrowseNative}
                title={`Pilih Dokumen PDF untuk ${activeTab.toUpperCase()}`}
                subtitle="Buka file PDF terlebih dahulu untuk mulai memproses dokumen secara 100% offline."
              />
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'merge' && currentPdfBuffer && pages.length > 0 && (
            <>
              {activeTab === 'editor' && (
                <PageEditorCanvas
                  editedBlocks={editedBlocks}
                  onBlocksChange={setEditedBlocks}
                />
              )}
              {activeTab === 'pages' && <PageGrid />}
              {activeTab === 'split' && (
                <SplitStudio
                  fileName={fileName}
                  totalPageCount={pages.length}
                  rangeString={splitRange}
                  onRangeChange={setSplitRange}
                  splitMode={splitMode}
                  onModeChange={setSplitMode}
                  nValue={splitNValue}
                  onNValueChange={setSplitNValue}
                  onQuickPreset={(preset) => {
                    if (preset === 'first') setSplitRange('1')
                    if (preset === 'last') setSplitRange(`${pages.length}`)
                    if (preset === 'all-except-first') setSplitRange(pages.length > 1 ? `2-${pages.length}` : '1')
                  }}
                />
              )}
              {activeTab === 'sign' && <SignStampStudio />}
              {activeTab === 'compress' && (
                <CompressStudio
                  fileName={fileName}
                  originalSizeBytes={currentPdfBuffer.byteLength}
                  totalPageCount={pages.length}
                  selectedQuality={compressQuality}
                  onSelectQuality={setCompressQuality}
                />
              )}
              {activeTab === 'protect' && (
                <ProtectStudio
                  fileName={fileName}
                  totalPageCount={pages.length}
                  passwordValue={protectPassword}
                  onPasswordChange={setProtectPassword}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Bottom Action Deck */}
      {activeTab !== 'dashboard' && (
        <BottomDeck
          itemCount={getItemCount()}
          primaryActionLabel={getPrimaryLabel()}
          onPrimaryAction={handleExport}
          onReset={activeTab === 'merge' ? () => setMergeFiles([]) : resetDocument}
          isLoading={isLoading}
          statusText={statusText}
        />
      )}
    </div>
  )
}
