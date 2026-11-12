import { useState, useRef, useEffect } from 'react'
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
import { CompressStudio, CompressTargetFile } from './components/compress/CompressStudio'
import { ConvertStudio } from './components/convert/ConvertStudio'
import { ProtectStudio } from './components/protect/ProtectStudio'
import { useDocumentStore } from './store/documentStore'
import { loadPdfPages, exportModifiedPdf } from './utils/pdfEngine'
import {
  MergeItem,
  mergePdfDocuments,
  splitPdfByRange,
  splitPdfEveryNPages,
} from './utils/mergeSplitEngine'
import {
  CompressQuality,
  compressPdfDocument,
  compressImageBuffer,
  encryptPdfDocument,
} from './utils/compressProtectEngine'
import {
  ConvertFileItem,
  convertImageBufferInBrowser,
  convertPdfBufferInBrowser,
  convertTextBufferToPdf,
} from './utils/universalConvertEngine'
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

  // Compress state (Supports active PDF or any custom PDF / Image / Video file)
  const [compressQuality, setCompressQuality] = useState<CompressQuality>('balanced')
  const [customCompressTarget, setCustomCompressTarget] = useState<CompressTargetFile | null>(null)
  const [compressProgress, setCompressProgress] = useState<{
    percent: number | null
    eta?: string
  }>({ percent: null })

  // Universal Convert state
  const [convertItems, setConvertItems] = useState<ConvertFileItem[]>([])

  // Protect state
  const [protectPassword, setProtectPassword] = useState('')

  // Track whether pages were reordered/deleted in Page Manager
  const [hasPageStructureChanges, setHasPageStructureChanges] = useState(false)

  // Listen to FFmpeg / Media progress from Electron main process
  useEffect(() => {
    if (!window.electronAPI || typeof window.electronAPI.onMediaProgress !== 'function') return
    const unsubscribe = window.electronAPI.onMediaProgress((data) => {
      if (data.id.startsWith('cmp_')) {
        setCompressProgress({
          percent: data.percent,
          eta: data.eta,
        })
      } else if (data.id.startsWith('conv_')) {
        setConvertItems((prev) =>
          prev.map((item) =>
            item.id === data.id
              ? { ...item, progress: data.percent, eta: data.eta }
              : item
          )
        )
      }
    })
    return unsubscribe
  }, [])

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
  const buildSmartExportFileName = (
    currentAction: 'merge' | 'split' | 'compress' | 'protect' | 'editor' | 'sign' | 'pages',
    extraSuffix?: string
  ): string => {
    const rawBase = (fileName || 'dokumen').replace(/\.pdf$/i, '')

    // Detect cumulative history of actions already performed on this document
    const tags: string[] = []
    const hasTextEdits = editedBlocks.some((b) => b.isEdited)
    const hasEditorAnnotations = annotations.some(
      (a) => !a.id.startsWith('sign_') && !a.id.startsWith('stamp_')
    )
    const hasSignOrStamp = annotations.some(
      (a) => a.id.startsWith('sign_') || a.id.startsWith('stamp_')
    )
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

  // Convert Single Item Handler (Supports PDF, Office, Image, Video, Audio)
  const handleConvertSingleItem = async (item: ConvertFileItem): Promise<boolean> => {
    const baseName = item.name.replace(/\.[^.]+$/, '')
    const cleanBase = baseName.includes('_converted') ? baseName : `${baseName}_converted`
    const defaultOutputName = `${cleanBase}.${item.targetExt}`

    setConvertItems((prev) =>
      prev.map((x) =>
        x.id === item.id ? { ...x, status: 'processing', progress: 10, errorMessage: undefined } : x
      )
    )
    setStatus(`Mengonversi ${item.name} ke .${item.targetExt.toUpperCase()}...`)

    try {
      const inExt = item.ext.toLowerCase()
      const outExt = item.targetExt.toLowerCase()

      // 1. Video / Audio / Office Conversion via Native Electron FFmpeg & PowerShell COM
      const needsNativeEngine =
        item.category === 'video' ||
        item.category === 'audio' ||
        (['docx', 'doc', 'rtf', 'pptx', 'ppt', 'xlsx', 'xls'].includes(inExt) && outExt === 'pdf') ||
        (inExt === 'pdf' && ['docx', 'doc'].includes(outExt))

      if (needsNativeEngine) {
        if (!item.path || !window.electronAPI?.convertMediaFile) {
          throw new Error('Pilih file melalui dialog aplikasi untuk konversi Video/Audio/Office.')
        }
        const res = await window.electronAPI.convertMediaFile({
          id: item.id,
          inputPath: item.path,
          defaultOutputName,
          targetExt: outExt,
          category: item.category,
        })
        if (res.canceled) {
          setConvertItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'idle', progress: 0 } : x))
          )
          setStatus('Penyimpanan hasil konversi dibatalkan')
          return false
        }
        if (!res.success) {
          throw new Error(res.error || 'Gagal mengonversi file')
        }
        setConvertItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  status: 'done',
                  progress: 100,
                  outputPath: res.outputPath,
                  outputName: defaultOutputName,
                }
              : x
          )
        )
        setStatus(`Berhasil dikonversi: ${defaultOutputName}`)
        return true
      }

      // 2. Browser / Pure In-Memory Conversion (PDF -> Image/TXT/HTML, Image -> Image/PDF/ICO, TXT/MD -> PDF)
      let buffer = item.buffer
      if (!buffer && item.path && window.electronAPI?.readFileBuffer) {
        buffer = await window.electronAPI.readFileBuffer(item.path)
      }
      if (!buffer) {
        throw new Error('Data file tidak ditemukan')
      }

      let outBytes: Uint8Array
      if (inExt === 'pdf') {
        outBytes = await convertPdfBufferInBrowser(buffer, outExt, (pct) => {
          setConvertItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, progress: pct } : x))
          )
        })
      } else if (['txt', 'md', 'csv', 'html'].includes(inExt)) {
        outBytes = await convertTextBufferToPdf(buffer, outExt)
      } else {
        outBytes = await convertImageBufferInBrowser(buffer, inExt, outExt)
      }

      const saved = await saveOutput(outBytes, defaultOutputName)
      if (!saved) {
        setConvertItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: 'idle', progress: 0 } : x))
        )
        return false
      }

      setConvertItems((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? { ...x, status: 'done', progress: 100, outputName: defaultOutputName }
            : x
        )
      )
      setStatus(`Berhasil dikonversi & disimpan sebagai ${defaultOutputName}`)
      return true
    } catch (err: any) {
      console.error('Conversion error:', err)
      setConvertItems((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? { ...x, status: 'error', progress: 0, errorMessage: err?.message || 'Gagal konversi' }
            : x
        )
      )
      setStatus(`Gagal konversi ${item.name}: ${err?.message || 'Terjadi kesalahan'}`)
      return false
    }
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

      // 3. KOMPRES FILE (PDF, GAMBAR, VIDEO)
      if (activeTab === 'compress') {
        // Case A: Custom Image or Video or Custom PDF selected in CompressStudio
        if (customCompressTarget) {
          const baseName = customCompressTarget.name.replace(/\.[^.]+$/, '')
          const cleanBase = baseName.includes('_compressed')
            ? baseName
            : `${baseName}_compressed`

          if (customCompressTarget.category === 'video') {
            if (!customCompressTarget.path || !window.electronAPI?.compressMediaFile) {
              setStatus('Pilih file video melalui tombol Pilih File di aplikasi.')
              return
            }
            const jobId = `cmp_${Date.now()}`
            setCompressProgress({ percent: 5 })
            setStatus(`Mengompresi video ${customCompressTarget.name}...`)
            const defaultOutputName = `${cleanBase}.${customCompressTarget.ext}`
            const res = await window.electronAPI.compressMediaFile({
              id: jobId,
              inputPath: customCompressTarget.path,
              defaultOutputName,
              mediaType: 'video',
              quality: compressQuality,
            })
            setCompressProgress({ percent: null })
            if (res.canceled) {
              setStatus('Penyimpanan video dibatalkan')
              return
            }
            if (!res.success) {
              setStatus(`Gagal mengompresi video: ${res.error || 'Terjadi kesalahan'}`)
              return
            }
            const origMb = ((res.originalSize || customCompressTarget.size) / (1024 * 1024)).toFixed(2)
            const newMb = ((res.newSize || 0) / (1024 * 1024)).toFixed(2)
            setStatus(
              `Kompresi video berhasil! ${origMb} MB → ${newMb} MB (Hemat ${res.savingsPercent ?? 0}%)`
            )
            return
          }

          if (customCompressTarget.category === 'image') {
            let imgBuffer = customCompressTarget.buffer
            if (!imgBuffer && customCompressTarget.path && window.electronAPI?.readFileBuffer) {
              imgBuffer = await window.electronAPI.readFileBuffer(customCompressTarget.path)
            }
            if (!imgBuffer) {
              setStatus('Data gambar tidak ditemukan')
              return
            }
            setStatus(`Mengompresi gambar ${customCompressTarget.name}...`)
            const result = await compressImageBuffer(
              imgBuffer,
              customCompressTarget.ext,
              compressQuality
            )
            const outExt = result.outputExt || customCompressTarget.ext
            const outName = `${cleanBase}.${outExt}`
            const saved = await saveOutput(result.bytes, outName)
            if (saved) {
              const origKb = (result.originalSize / 1024).toFixed(1)
              const newKb = (result.newSize / 1024).toFixed(1)
              setStatus(
                `Kompresi gambar berhasil! ${origKb} KB → ${newKb} KB (Hemat ${result.savingsPercent}%)`
              )
            }
            return
          }

          // Custom PDF file selected in CompressStudio
          let pdfBuf = customCompressTarget.buffer
          if (!pdfBuf && customCompressTarget.path && window.electronAPI?.readFileBuffer) {
            pdfBuf = await window.electronAPI.readFileBuffer(customCompressTarget.path)
          }
          if (!pdfBuf) return
          setStatus(`Mengompresi dokumen ${customCompressTarget.name}...`)
          const result = await compressPdfDocument(pdfBuf, compressQuality)
          const outName = `${cleanBase}.pdf`
          const saved = await saveOutput(result.bytes, outName)
          if (saved) {
            const origMb = (result.originalSize / (1024 * 1024)).toFixed(2)
            const newMb = (result.newSize / (1024 * 1024)).toFixed(2)
            setStatus(
              `Kompresi PDF berhasil! ${origMb} MB → ${newMb} MB (Hemat ${result.savingsPercent}%)`
            )
          }
          return
        }

        // Case B: Active PDF document loaded in workspace
        if (!currentPdfBuffer) {
          setStatus('Pilih file PDF, Gambar, atau Video terlebih dahulu untuk dikompres')
          return
        }
        setStatus('Mengompresi ukuran dokumen PDF...')
        const hasPendingChanges =
          editedBlocks.some((b) => b.isEdited) ||
          annotations.length > 0 ||
          pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)
        let sourceBuffer = currentPdfBuffer
        if (hasPendingChanges && pages.length > 0) {
          const modBytes = await exportModifiedPdf(
            currentPdfBuffer,
            pages,
            annotations,
            editedBlocks
          )
          sourceBuffer = modBytes.buffer.slice(
            modBytes.byteOffset,
            modBytes.byteOffset + modBytes.byteLength
          ) as ArrayBuffer
        }

        const result = await compressPdfDocument(sourceBuffer, compressQuality)
        const name = buildSmartExportFileName('compress')
        const saved = await saveOutput(result.bytes, name)
        if (saved) {
          const origMb = (result.originalSize / (1024 * 1024)).toFixed(2)
          const newMb = (result.newSize / (1024 * 1024)).toFixed(2)
          setStatus(
            `Kompresi berhasil! ${origMb} MB → ${newMb} MB (Hemat ${result.savingsPercent}%)`
          )
        }
        return
      }

      // 4. KONVERSI FORMAT UNIVERSAL (CONVERT)
      if (activeTab === 'convert') {
        if (convertItems.length === 0) {
          setStatus('Tambahkan minimal 1 file (Dokumen, Gambar, atau Video) untuk dikonversi')
          return
        }
        for (const item of convertItems) {
          await handleConvertSingleItem(item)
        }
        return
      }

      // 5. KUNCI SANDI (PROTECT)
      if (activeTab === 'protect') {
        if (!currentPdfBuffer) return
        if (protectPassword.length < 4) {
          setStatus('Kata sandi minimal 4 karakter')
          setLoading(false)
          return
        }
        setStatus('Mengenkripsi & mengunci dokumen dengan kata sandi...')
        const hasPendingChanges =
          editedBlocks.some((b) => b.isEdited) ||
          annotations.length > 0 ||
          pages.some((p, idx) => p.rotation !== 0 || p.pageIndex !== idx)
        let sourceBuffer = currentPdfBuffer
        if (hasPendingChanges && pages.length > 0) {
          const modBytes = await exportModifiedPdf(
            currentPdfBuffer,
            pages,
            annotations,
            editedBlocks
          )
          sourceBuffer = modBytes.buffer.slice(
            modBytes.byteOffset,
            modBytes.byteOffset + modBytes.byteLength
          ) as ArrayBuffer
        }

        const encryptedBytes = await encryptPdfDocument(sourceBuffer, protectPassword)
        const name = buildSmartExportFileName('protect')
        const saved = await saveOutput(encryptedBytes, name)
        if (saved) {
          setStatus('Dokumen berhasil dikunci dengan sandi!')
        }
        return
      }

      // 6. EDITOR / PAGES / SIGN (Simpan Hasil Editan / Tanda Tangan / Susun Halaman)
      if (!currentPdfBuffer || pages.length === 0) return
      setStatus('Menyimpan perubahan ke PDF...')
      const outputBytes = await exportModifiedPdf(
        currentPdfBuffer,
        pages,
        annotations,
        editedBlocks
      )
      const actionType =
        activeTab === 'sign' ? 'sign' : activeTab === 'pages' ? 'pages' : 'editor'
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
        const outBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer
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

    const outBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer
    const blob = new Blob([outBuffer])
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
    if (activeTab === 'convert') return convertItems.length
    if (activeTab === 'compress') {
      if (customCompressTarget) return 1
      return pages.length
    }
    return pages.length
  }

  const getPrimaryLabel = () => {
    if (activeTab === 'merge') return 'Gabungkan & Simpan'
    if (activeTab === 'split') {
      return splitMode === 'every-n' ? `Pecah Tiap ${splitNValue} Hal` : 'Ekstrak & Simpan'
    }
    if (activeTab === 'sign') return 'Simpan Dokumen Bertanda Tangan'
    if (activeTab === 'compress') return 'Kompres & Simpan'
    if (activeTab === 'convert') {
      return convertItems.length > 1
        ? `Konversi Semua (${convertItems.length} File)`
        : 'Konversi & Simpan'
    }
    if (activeTab === 'protect') return 'Kunci Dokumen & Simpan'
    return 'Simpan & Download PDF'
  }

  const isStandaloneTab =
    activeTab === 'dashboard' ||
    activeTab === 'merge' ||
    activeTab === 'compress' ||
    activeTab === 'convert'

  return (
    <div
      className={`h-screen flex flex-col ${
        isDark ? 'dark bg-[#0C0D12]' : 'bg-[#EEF1F6] text-slate-800'
      }`}
    >
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

          {activeTab === 'compress' && (
            <CompressStudio
              activePdfName={fileName}
              activePdfSizeBytes={currentPdfBuffer?.byteLength || 0}
              activePdfPageCount={pages.length}
              customTarget={customCompressTarget}
              onSelectCustomTarget={setCustomCompressTarget}
              selectedQuality={compressQuality}
              onSelectQuality={setCompressQuality}
              progressPercent={compressProgress.percent}
              progressEta={compressProgress.eta}
            />
          )}

          {activeTab === 'convert' && (
            <ConvertStudio
              items={convertItems}
              onAddItems={(newItems) => {
                setConvertItems((prev) => [...prev, ...newItems])
                setStatus(`Menambahkan ${newItems.length} file ke daftar konversi`)
              }}
              onUpdateTargetExt={(id, targetExt) => {
                setConvertItems((prev) =>
                  prev.map((item) =>
                    item.id === id ? { ...item, targetExt, status: 'idle' } : item
                  )
                )
              }}
              onRemoveItem={(id) => {
                setConvertItems((prev) => prev.filter((item) => item.id !== id))
              }}
              onClearAll={() => setConvertItems([])}
              onConvertSingle={handleConvertSingleItem}
            />
          )}

          {!isStandaloneTab && (!currentPdfBuffer || pages.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
              <Dropzone
                onFilesSelected={handleFilesSelected}
                onBrowseClick={handleBrowseNative}
                title={`Pilih Dokumen PDF untuk ${activeTab.toUpperCase()}`}
                subtitle="Buka file PDF terlebih dahulu untuk mulai memproses dokumen secara 100% offline."
              />
            </div>
          )}

          {!isStandaloneTab && currentPdfBuffer && pages.length > 0 && (
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
                    if (preset === 'all-except-first')
                      setSplitRange(pages.length > 1 ? `2-${pages.length}` : '1')
                  }}
                />
              )}
              {activeTab === 'sign' && <SignStampStudio />}
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
          onReset={
            activeTab === 'merge'
              ? () => setMergeFiles([])
              : activeTab === 'convert'
              ? () => setConvertItems([])
              : activeTab === 'compress' && customCompressTarget
              ? () => setCustomCompressTarget(null)
              : resetDocument
          }
          isLoading={isLoading}
          statusText={statusText}
        />
      )}
    </div>
  )
}
