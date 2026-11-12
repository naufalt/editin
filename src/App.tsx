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
import { ResultModal, ResultModalData } from './components/common/ResultModal'
import { LoadingOverlay } from './components/common/LoadingOverlay'
import { DevLogDrawer } from './components/common/DevLogDrawer'
import { useDocumentStore } from './store/documentStore'
import { useAppSettings } from './store/settingsStore'
import { useDevLogStore } from './store/devLogStore'
import { loadPdfPages, exportModifiedPdf } from './utils/pdfEngine'
import { MergeItem, mergePdfDocuments, splitPdfByRange, splitPdfEveryNPages } from './utils/mergeSplitEngine'
import { CompressQuality, compressPdfDocument, encryptPdfDocument } from './utils/compressProtectEngine'
import { EditableTextBlock } from './utils/textExtractEngine'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const fallbackFileInputRef = useRef<HTMLInputElement>(null)

  // App settings & Dev logs
  const { isDark, t } = useAppSettings()
  const { addLog } = useDevLogStore()

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
  const [compressProgress, setCompressProgress] = useState<number | null>(null)

  // Protect state
  const [protectPassword, setProtectPassword] = useState('')

  // Track whether pages were reordered/deleted in Page Manager
  const [hasPageStructureChanges, setHasPageStructureChanges] = useState(false)

  // Modal result state (SweetAlert-style modern popup)
  const [modalData, setModalData] = useState<ResultModalData>({
    isOpen: false,
    title: '',
    message: '',
  })

  // Loading overlay state
  const [overlayState, setOverlayState] = useState<{
    isOpen: boolean
    title?: string
    status?: string
    subStatus?: string
    progress?: number | null
    pageStatus?: {
      currentPage: number
      totalPages: number
    }
  }>({ isOpen: false })

  const handleProcessFileBuffer = async (name: string, buffer: ArrayBuffer, path?: string) => {
    try {
      setLoading(true)
      setStatus(`Membuka berkas ${name}...`)
      addLog('info', `Membuka berkas: ${name} (${(buffer.byteLength / 1024).toFixed(1)} KB)`, { path })
      setOverlayState({ 
        isOpen: true, 
        title: 'Membuka Dokumen PDF...', 
        status: `Memuat berkas ${name}`,
        subStatus: 'Menganalisis halaman dan struktur objek...',
        progress: 25 
      })
      setDocument(name, buffer, path)

      setOverlayState((prev) => ({ ...prev, progress: 60, subStatus: 'Membuat pratinjau thumbnail halaman...' }))
      const parsedPages = await loadPdfPages(buffer)
      setPages(parsedPages)
      setEditedBlocks([])
      setHasPageStructureChanges(false)
      setSplitRange(parsedPages.length > 1 ? `1-${Math.min(3, parsedPages.length)}` : '1')
      
      addLog('success', `Berhasil memuat ${parsedPages.length} halaman dari ${name}`)
      if (activeTab === 'dashboard') {
        setActiveTab('editor')
      }
    } catch (err: any) {
      console.error('Error loading PDF:', err)
      addLog('error', `Gagal memuat dokumen: ${err?.message || err}`, err)
      setStatus(`Gagal memproses dokumen: ${err?.message || 'Format tidak didukung'}`)
    } finally {
      setLoading(false)
      setOverlayState({ isOpen: false })
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
    } catch (e: any) {
      console.warn('Native dialog error, falling back to input:', e)
      addLog('warn', `Native dialog error: ${e?.message || e}`)
    }
    fallbackFileInputRef.current?.click()
  }

  // Merge Handlers
  const handleAddMergeFiles = (newFiles: MergeItem[]) => {
    setMergeFiles((prev) => [...prev, ...newFiles])
    setStatus(`Menambahkan ${newFiles.length} berkas ke antrean gabung`)
    addLog('info', `Menambahkan ${newFiles.length} berkas gabung. Total saat ini: ${mergeFiles.length + newFiles.length}`)
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

  // Save Output File & Pop up Result Modal
  const saveOutput = async (bytes: Uint8Array, defaultName: string): Promise<string | null> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveFileBuffer === 'function') {
        const outBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        const res = await window.electronAPI.saveFileBuffer(defaultName, outBuffer)
        if (typeof res === 'string') {
          setStatus(`Berhasil disimpan sebagai ${defaultName}`)
          addLog('success', `File tersimpan secara native: ${res}`)
          return res
        } else if (res === true) {
          setStatus(`Berhasil disimpan sebagai ${defaultName}`)
          addLog('success', `File tersimpan: ${defaultName}`)
          return defaultName
        } else {
          setStatus('Penyimpanan dibatalkan')
          addLog('info', 'Dialog simpan file dibatalkan oleh user')
          return null
        }
      }
    } catch (e: any) {
      console.warn('Native save failed, fallback to download:', e)
      addLog('warn', `Native save gagal, beralih ke browser download: ${e?.message || e}`)
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
    addLog('success', `File terunduh via blob: ${defaultName}`)
    return defaultName
  }

  // Primary Action Router
  const handleExport = async () => {
    try {
      setLoading(true)

      // 1. GABUNG PDF
      if (activeTab === 'merge') {
        if (mergeFiles.length < 2) {
          setStatus('Pilih minimal 2 dokumen untuk digabungkan')
          addLog('warn', 'Upaya gabung dibatalkan: dokumen kurang dari 2')
          setLoading(false)
          return
        }
        setOverlayState({ 
          isOpen: true, 
          title: 'Menggabungkan Dokumen...', 
          status: `Menyatukan ${mergeFiles.length} berkas PDF`,
          subStatus: 'Mengurutkan dan menyatukan objek dokumen...',
          progress: 40
        })
        setStatus('Menggabungkan dokumen...')
        addLog('info', `Mulai menggabungkan ${mergeFiles.length} berkas...`)
        const mergedBytes = await mergePdfDocuments(mergeFiles)
        setOverlayState((prev) => ({ ...prev, progress: 90, subStatus: 'Menyimpan berkas...' }))
        const name = buildSmartExportFileName('merge')
        const savedPath = await saveOutput(mergedBytes, name)
        if (savedPath) {
          setModalData({
            isOpen: true,
            title: t.successMergeTitle,
            message: `${mergeFiles.length} berkas PDF berhasil disatukan ke dalam dokumen baru yang rapi.`,
            fileName: name,
            filePath: savedPath.includes('\\') || savedPath.includes('/') ? savedPath : undefined,
          })
        }
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
          setOverlayState({ 
            isOpen: true, 
            title: 'Memecah Dokumen PDF...', 
            status: `Membagi tiap ${splitNValue} halaman`,
            subStatus: 'Memisahkan halaman menjadi pecahan berkas...',
            progress: 35
          })
          setStatus(`Memecah dokumen tiap ${splitNValue} halaman...`)
          addLog('info', `Memecah dokumen tiap ${splitNValue} halaman dari total ${pages.length} halaman`)
          const chunks = await splitPdfEveryNPages(currentPdfBuffer, splitNValue, pages.length)
          let lastPath: string | null = null
          for (let c = 0; c < chunks.length; c++) {
            const chunk = chunks[c]
            setOverlayState((prev) => ({ 
              ...prev, 
              progress: Math.round(40 + (c / chunks.length) * 55),
              subStatus: `Menyimpan bagian ${c + 1} dari ${chunks.length}...`
            }))
            const chunkName = buildSmartExportFileName('split', `split_part_${chunk.chunkIndex}`)
            lastPath = await saveOutput(chunk.bytes, chunkName)
          }
          setStatus(`Berhasil memecah menjadi ${chunks.length} berkas`)
          addLog('success', `Berhasil memecah dokumen menjadi ${chunks.length} berkas`)
          if (lastPath) {
            setModalData({
              isOpen: true,
              title: t.successSplitTitle,
              message: `Dokumen berhasil dipecah menjadi ${chunks.length} berkas terpisah.`,
              fileName: `Bagian 1 s/d ${chunks.length}`,
              filePath: lastPath.includes('\\') || lastPath.includes('/') ? lastPath : undefined,
            })
          }
          return
        } else {
          setOverlayState({ 
            isOpen: true, 
            title: 'Mengekstrak Halaman...', 
            status: `Mengambil rentang halaman ${splitRange}`,
            subStatus: 'Memotong lembaran halaman yang dipilih...',
            progress: 50
          })
          setStatus('Memisahkan rentang halaman...')
          addLog('info', `Mengekstrak rentang halaman: ${splitRange}`)
          const splitBytes = await splitPdfByRange(currentPdfBuffer, splitRange, pages.length)
          const cleanRange = splitRange.replace(/[^a-zA-Z0-9]/g, '_')
          const name = buildSmartExportFileName('split', `split_${cleanRange}`)
          const savedPath = await saveOutput(splitBytes, name)
          if (savedPath) {
            setModalData({
              isOpen: true,
              title: t.successSplitTitle,
              message: `Halaman (${splitRange}) berhasil diekstrak ke dokumen PDF baru.`,
              fileName: name,
              filePath: savedPath.includes('\\') || savedPath.includes('/') ? savedPath : undefined,
            })
          }
          return
        }
      }

      // 3. KOMPRES PDF
      if (activeTab === 'compress') {
        if (!currentPdfBuffer) return
        addLog('info', `Mulai kompresi PDF profil [${compressQuality}] untuk ${fileName || 'Dokumen'}`)
        setOverlayState({ 
          isOpen: true, 
          title: 'Mengompresi Ukuran Dokumen...', 
          status: 'Membaca dan membersihkan metadata...',
          subStatus: 'Menyiapkan halaman dokumen...',
          progress: 5 
        })
        setCompressProgress(5)
        setStatus('Mengompresi ukuran dokumen...')

        const hasPendingChanges =
          editedBlocks.some((b) => b.isEdited) ||
          annotations.length > 0 ||
          pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)
        let sourceBuffer = currentPdfBuffer
        if (hasPendingChanges && pages.length > 0) {
          addLog('info', 'Menerapkan editan / coretan tertunda sebelum kompresi...')
          const modBytes = await exportModifiedPdf(currentPdfBuffer, pages, annotations, editedBlocks)
          sourceBuffer = modBytes.buffer.slice(modBytes.byteOffset, modBytes.byteOffset + modBytes.byteLength) as ArrayBuffer
        }

        const result = await compressPdfDocument(sourceBuffer, compressQuality, (prog) => {
          setCompressProgress(prog.percent)
          setOverlayState({
            isOpen: true,
            title: 'Mengompresi Ukuran Dokumen...',
            status: prog.statusText,
            subStatus: prog.totalPages > 0 ? `Sedang mengoptimasi halaman ${prog.currentPage} dari ${prog.totalPages}` : undefined,
            progress: prog.percent,
            pageStatus: prog.totalPages > 0 ? { currentPage: prog.currentPage, totalPages: prog.totalPages } : undefined,
          })
          addLog('info', `[Kompresi] ${prog.percent}%: ${prog.statusText}`)
        })

        const name = buildSmartExportFileName('compress')
        setOverlayState((prev) => ({ ...prev, status: 'Menyimpan berkas...', progress: 98 }))
        const savedPath = await saveOutput(result.bytes, name)
        setCompressProgress(null)
        if (savedPath) {
          const origMb = (result.originalSize / (1024 * 1024)).toFixed(2)
          const newMb = (result.newSize / (1024 * 1024)).toFixed(2)
          setStatus(`Kompresi berhasil! ${origMb} MB → ${newMb} MB (Hemat ${result.savingsPercent}%)`)
          addLog('success', `Kompresi selesai! ${origMb} MB -> ${newMb} MB (Hemat ${result.savingsPercent}%)`)
          setModalData({
            isOpen: true,
            title: t.successCompressTitle,
            message: `Ukuran dokumen berhasil dikurangi dari ${origMb} MB menjadi ${newMb} MB.`,
            fileName: name,
            filePath: savedPath.includes('\\') || savedPath.includes('/') ? savedPath : undefined,
            details: {
              originalSize: `${origMb} MB`,
              newSize: `${newMb} MB`,
              savings: `${result.savingsPercent}%`,
            },
          })
        }
        return
      }

      // 4. KUNCI SANDI (PROTECT)
      if (activeTab === 'protect') {
        if (!currentPdfBuffer) return
        if (protectPassword.length < 4) {
          setStatus('Kata sandi minimal 4 karakter')
          addLog('warn', 'Gagal enkripsi: panjang kata sandi kurang dari 4 karakter')
          setLoading(false)
          return
        }
        setOverlayState({ 
          isOpen: true, 
          title: 'Mengenkripsi Dokumen PDF...', 
          status: 'Menerapkan standar 128-bit encryption...',
          subStatus: 'Mengamankan seluruh objek dengan ISO 32000-1 handler...',
          progress: 45
        })
        setStatus('Mengenkripsi & mengunci dokumen dengan kata sandi...')
        addLog('info', 'Mulai mengenkripsi PDF dengan 128-bit security handler...')

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
        setOverlayState((prev) => ({ ...prev, progress: 95, subStatus: 'Menyimpan berkas terkunci...' }))
        const name = buildSmartExportFileName('protect')
        const savedPath = await saveOutput(encryptedBytes, name)
        if (savedPath) {
          setStatus('Dokumen berhasil dikunci dengan sandi!')
          addLog('success', `Dokumen berhasil dikunci dengan sandi: ${name}`)
          setModalData({
            isOpen: true,
            title: t.successProtectTitle,
            message: 'Dokumen berhasil diamankan dengan enkripsi sandi. Sandi akan diminta saat dokumen dibuka.',
            fileName: name,
            filePath: savedPath.includes('\\') || savedPath.includes('/') ? savedPath : undefined,
          })
        }
        return
      }

      // 5. EDITOR / PAGES / SIGN (Simpan Hasil Editan / Tanda Tangan / Susun Halaman)
      if (!currentPdfBuffer || pages.length === 0) return
      setOverlayState({ 
        isOpen: true, 
        title: 'Menyimpan Perubahan Dokumen...', 
        status: 'Menyusun vektor & teks asli...',
        subStatus: 'Menerapkan font asli dan anotasi tanda tangan...',
        progress: 50
      })
      setStatus('Menyimpan perubahan ke PDF...')
      addLog('info', `Menyimpan perubahan PDF (${pages.length} halaman)...`)
      const outputBytes = await exportModifiedPdf(currentPdfBuffer, pages, annotations, editedBlocks)
      setOverlayState((prev) => ({ ...prev, progress: 90, subStatus: 'Menulis berkas ke disk...' }))
      const actionType = activeTab === 'sign' ? 'sign' : activeTab === 'pages' ? 'pages' : 'editor'
      const defaultExportName = buildSmartExportFileName(actionType)
      const savedPath = await saveOutput(outputBytes, defaultExportName)
      if (savedPath) {
        addLog('success', `Dokumen berhasil disimpan: ${defaultExportName}`)
        setModalData({
          isOpen: true,
          title: t.successTitle,
          message: 'Seluruh perubahan teks, tanda tangan, atau susunan halaman berhasil disimpan ke dokumen PDF baru.',
          fileName: defaultExportName,
          filePath: savedPath.includes('\\') || savedPath.includes('/') ? savedPath : undefined,
        })
      }

    } catch (err: any) {
      console.error(err)
      addLog('error', `Terjadi error saat pengerjaan: ${err?.message || err}`, err)
      setStatus(`Gagal: ${err.message || 'Terjadi kesalahan'}`)
    } finally {
      setLoading(false)
      setOverlayState({ isOpen: false })
    }
  }

  const getItemCount = () => {
    if (activeTab === 'merge') return mergeFiles.length
    return pages.length
  }

  const getPrimaryLabel = () => {
    if (activeTab === 'merge') return t.btnMergeSave
    if (activeTab === 'split') {
      return splitMode === 'every-n' ? t.btnSplitN.replace('{n}', `${splitNValue}`) : t.btnSplitRange
    }
    if (activeTab === 'sign') return t.btnSignSave
    if (activeTab === 'compress') return t.btnCompressSave
    if (activeTab === 'protect') return t.btnProtectSave
    return t.btnSavePdf
  }

  return (
    <div className={`h-screen flex flex-col font-sans transition-colors duration-150 ${isDark ? 'dark bg-[#0C0D12] text-slate-100' : 'bg-[#F4F5F8] text-slate-800'}`}>
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
        />

        <main className={`flex-1 flex flex-col overflow-hidden transition-colors duration-150 ${
          isDark ? 'bg-[#13151D]/30' : 'bg-[#F8F9FB]'
        }`}>
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
                  isCompressing={isLoading}
                  compressProgress={compressProgress}
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

      {/* 4. Processing Loading Overlay with Real-time Status */}
      <LoadingOverlay
        isOpen={overlayState.isOpen}
        title={overlayState.title}
        status={overlayState.status}
        subStatus={overlayState.subStatus}
        progress={overlayState.progress}
        pageStatus={overlayState.pageStatus}
        isDark={isDark}
      />

      {/* 5. Modern Result Modal (SweetAlert-style) */}
      <ResultModal
        data={modalData}
        onClose={() => setModalData((prev) => ({ ...prev, isOpen: false }))}
        isDark={isDark}
      />

      {/* 6. Developer Live Logs Drawer */}
      <DevLogDrawer isDark={isDark} />
    </div>
  )
}
