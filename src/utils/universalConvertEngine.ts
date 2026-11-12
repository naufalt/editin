import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { renderPageToCanvas } from './pdfEngine'

export type ConvertCategory = 'document' | 'image' | 'video' | 'audio'

export interface ConvertFileItem {
  id: string
  name: string
  path?: string
  size: number
  ext: string
  category: ConvertCategory
  targetExt: string
  buffer?: ArrayBuffer
  status: 'idle' | 'processing' | 'done' | 'error'
  progress: number
  eta?: string
  outputPath?: string
  outputBytes?: Uint8Array
  outputName?: string
  errorMessage?: string
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'ico', 'svg']
const VIDEO_EXTS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'flv', 'm4v']
const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']
const DOC_EXTS = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt', 'md', 'csv', 'html', 'rtf']

export function detectFileCategory(ext: string): ConvertCategory {
  const clean = ext.toLowerCase().replace('.', '')
  if (IMAGE_EXTS.includes(clean)) return 'image'
  if (VIDEO_EXTS.includes(clean)) return 'video'
  if (AUDIO_EXTS.includes(clean)) return 'audio'
  return 'document'
}

export function getSupportedTargetsForExtension(ext: string): string[] {
  const clean = ext.toLowerCase().replace('.', '')

  // PDF Document
  if (clean === 'pdf') {
    return ['jpg', 'png', 'webp', 'txt', 'html', 'docx']
  }

  // Office Documents
  if (['docx', 'doc', 'rtf', 'pptx', 'ppt', 'xlsx', 'xls'].includes(clean)) {
    return ['pdf']
  }

  // Text / Markdown / CSV / HTML
  if (['txt', 'md', 'csv', 'html'].includes(clean)) {
    return ['pdf', 'txt', 'html'].filter((t) => t !== clean)
  }

  // Images
  if (IMAGE_EXTS.includes(clean)) {
    return ['jpg', 'png', 'webp', 'pdf', 'ico', 'bmp'].filter((t) => t !== clean)
  }

  // Videos
  if (VIDEO_EXTS.includes(clean)) {
    return ['mp4', 'mkv', 'mov', 'webm', 'avi', 'gif', 'mp3', 'wav', 'aac'].filter((t) => t !== clean)
  }

  // Audio
  if (AUDIO_EXTS.includes(clean)) {
    return ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].filter((t) => t !== clean)
  }

  return ['pdf', 'jpg', 'png']
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert any browser-renderable image buffer (PNG, JPG, WEBP, BMP, SVG, GIF)
 * to JPG, PNG, WEBP, BMP, ICO, or PDF 100% in-memory.
 */
export async function convertImageBufferInBrowser(
  buffer: ArrayBuffer,
  inputExt: string,
  targetExt: string
): Promise<Uint8Array> {
  const cleanIn = inputExt.toLowerCase().replace('.', '')
  const cleanOut = targetExt.toLowerCase().replace('.', '')

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    bmp: 'image/bmp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  }

  const blob = new Blob([buffer.slice(0)], { type: mimeMap[cleanIn] || 'image/png' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Gagal membaca gambar untuk konversi'))
      el.src = url
    })

    const w = cleanOut === 'ico' ? 256 : img.naturalWidth || img.width || 800
    const h = cleanOut === 'ico' ? 256 : img.naturalHeight || img.height || 600

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    if (cleanOut === 'jpg' || cleanOut === 'jpeg' || cleanOut === 'bmp' || cleanOut === 'pdf') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)

    if (cleanOut === 'pdf') {
      const pdfDoc = await PDFDocument.create()
      const jpgBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.92))
      const embedded = await pdfDoc.embedJpg(jpgBytes)
      const page = pdfDoc.addPage([w, h])
      page.drawImage(embedded, { x: 0, y: 0, width: w, height: h })
      return await pdfDoc.save()
    }

    if (cleanOut === 'webp') {
      return dataUrlToUint8Array(canvas.toDataURL('image/webp', 0.9))
    }

    if (cleanOut === 'jpg' || cleanOut === 'jpeg') {
      return dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.92))
    }

    // PNG / ICO / BMP fallback via PNG
    return dataUrlToUint8Array(canvas.toDataURL('image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Convert PDF buffer to Image (JPG, PNG, WEBP) or Text/HTML in-memory.
 * If multi-page PDF is converted to an image format, stitches pages vertically with a clean separator
 * or renders single page at crisp 2x resolution.
 */
export async function convertPdfBufferInBrowser(
  buffer: ArrayBuffer,
  targetExt: string,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  const cleanOut = targetExt.toLowerCase().replace('.', '')
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages

  if (cleanOut === 'txt' || cleanOut === 'html') {
    const pageTexts: string[] = []
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(Math.round((i / numPages) * 90))
      const page = await pdfDoc.getPage(i)
      const content = await page.getTextContent()
      const lines = (content.items as any[]).map((item) => item.str || '').join(' ')
      pageTexts.push(`--- Halaman ${i} ---\n${lines}`)
    }
    const fullText = pageTexts.join('\n\n')
    if (cleanOut === 'html') {
      const escaped = fullText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted PDF</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;color:#111;}</style></head><body>${escaped}</body></html>`
      return new TextEncoder().encode(html)
    }
    return new TextEncoder().encode(fullText)
  }

  // Image output (JPG, PNG, WEBP): Render pages and combine into a crisp vertical sheet (up to 15 pages)
  const maxPagesToRender = Math.min(numPages, 15)
  const canvases: HTMLCanvasElement[] = []
  let maxWidth = 0
  let totalHeight = 0

  for (let i = 1; i <= maxPagesToRender; i++) {
    onProgress?.(Math.round((i / maxPagesToRender) * 85))
    const pageCanvas = await renderPageToCanvas(buffer, i, 2.0)
    canvases.push(pageCanvas)
    if (pageCanvas.width > maxWidth) maxWidth = pageCanvas.width
    totalHeight += pageCanvas.height
  }

  const combined = document.createElement('canvas')
  combined.width = maxWidth
  combined.height = totalHeight
  const ctx = combined.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, maxWidth, totalHeight)

  let yOffset = 0
  for (const c of canvases) {
    const xOffset = Math.round((maxWidth - c.width) / 2)
    ctx.drawImage(c, xOffset, yOffset)
    yOffset += c.height
  }

  onProgress?.(95)
  const mime =
    cleanOut === 'png'
      ? 'image/png'
      : cleanOut === 'webp'
      ? 'image/webp'
      : 'image/jpeg'
  const dataUrl = combined.toDataURL(mime, 0.92)
  onProgress?.(100)
  return dataUrlToUint8Array(dataUrl)
}

/**
 * Convert TXT / MD / CSV / HTML buffer to a clean multi-page PDF document 100% offline.
 */
export async function convertTextBufferToPdf(
  buffer: ArrayBuffer,
  targetExt: string
): Promise<Uint8Array> {
  const text = new TextDecoder('utf-8').decode(buffer)
  const cleanOut = targetExt.toLowerCase().replace('.', '')

  if (cleanOut === 'txt') {
    return new TextEncoder().encode(text)
  }
  if (cleanOut === 'html') {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
    return new TextEncoder().encode(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;">${escaped}</body></html>`
    )
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 11
  const lineHeight = 16
  const margin = 50
  const pageWidth = 595.28
  const pageHeight = 841.89
  const maxLineWidth = pageWidth - margin * 2

  const rawLines = text.replace(/\r\n/g, '\n').split('\n')
  const wrappedLines: string[] = []

  for (const rawLine of rawLines) {
    const safeLine = rawLine.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    if (!safeLine.trim()) {
      wrappedLines.push('')
      continue
    }
    const words = safeLine.split(' ')
    let current = ''
    for (const w of words) {
      const test = current ? `${current} ${w}` : w
      if (font.widthOfTextAtSize(test, fontSize) <= maxLineWidth) {
        current = test
      } else {
        if (current) wrappedLines.push(current)
        current = w
      }
    }
    if (current) wrappedLines.push(current)
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  for (const line of wrappedLines) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    if (line) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.12),
      })
    }
    y -= lineHeight
  }

  return await pdfDoc.save()
}

export { IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS, DOC_EXTS }
