import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib'
import { PageInfo } from '../store/documentStore'
import { CanvasAnnotation } from '../types/annotations'
import { EditableTextBlock } from './textExtractEngine'

// Setup pdfjs worker using local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js'

function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 }
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  }
}

export async function loadPdfPages(buffer: ArrayBuffer): Promise<PageInfo[]> {
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const pages: PageInfo[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: 0.5 })
    pages.push({
      pageIndex: i - 1,
      pageNumber: i,
      rotation: 0,
      width: viewport.width,
      height: viewport.height,
    })
  }

  return pages
}

export async function renderPageToCanvas(
  buffer: ArrayBuffer,
  pageNumber: number,
  scale = 2.0
): Promise<HTMLCanvasElement> {
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot get canvas 2d context')

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise

  return canvas
}

export async function renderPageToThumbnail(
  buffer: ArrayBuffer,
  pageNumber: number,
  scale = 1.0
): Promise<string> {
  const canvas = await renderPageToCanvas(buffer, pageNumber, scale)
  return canvas.toDataURL('image/jpeg', 0.92)
}

export async function exportModifiedPdf(
  originalBuffer: ArrayBuffer,
  pages: PageInfo[],
  annotations: CanvasAnnotation[] = [],
  editedBlocks: EditableTextBlock[] = []
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0))
  const outDoc = await PDFDocument.create()

  // Embed standard font families (Sans-Serif, Serif, Mono) for 1:1 matching
  const helvetica = await outDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await outDoc.embedFont(StandardFonts.HelveticaOblique)
  const helveticaBoldOblique = await outDoc.embedFont(StandardFonts.HelveticaBoldOblique)

  const times = await outDoc.embedFont(StandardFonts.TimesRoman)
  const timesBold = await outDoc.embedFont(StandardFonts.TimesRomanBold)
  const timesItalic = await outDoc.embedFont(StandardFonts.TimesRomanItalic)
  const timesBoldItalic = await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

  const courier = await outDoc.embedFont(StandardFonts.Courier)
  const courierBold = await outDoc.embedFont(StandardFonts.CourierBold)

  for (let i = 0; i < pages.length; i++) {
    const pageInfo = pages[i]
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageInfo.pageIndex])
    
    if (pageInfo.rotation !== 0) {
      copiedPage.setRotation(degrees(pageInfo.rotation))
    }

    const { width, height } = copiedPage.getSize()

    // 1. Burn ONLY edited text blocks with 1:1 sampled background color, text color & font family
    const pageEditedBlocks = editedBlocks.filter(
      (b) => b.isEdited && b.pageNumber === pageInfo.pageIndex + 1
    )

    for (const b of pageEditedBlocks) {
      const bgRgb = hexToRgbNormalized(b.bgColor || '#ffffff')
      const fgRgb = hexToRgbNormalized(b.textColor || '#000000')

      // Tight mask over original glyph bounds so adjacent lines/table borders are untouched
      const maskX = b.pdfX - 0.5
      const maskY = b.pdfBaselineY - b.pdfFontSize * 0.21
      const maskW = b.pdfWidth + 1.5
      const maskH = b.pdfFontSize * 1.06

      copiedPage.drawRectangle({
        x: maskX,
        y: maskY,
        width: maskW,
        height: maskH,
        color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
      })

      if (b.str.trim().length > 0) {
        const famLower = (b.fontFamily || '').toLowerCase()
        const isSerif = famLower.includes('serif') || famLower.includes('times') || famLower.includes('georgia')
        const isMono = famLower.includes('mono') || famLower.includes('courier') || famLower.includes('consolas')

        let fontToUse = helvetica
        if (isMono) {
          fontToUse = b.isBold ? courierBold : courier
        } else if (isSerif) {
          if (b.isBold && b.isItalic) fontToUse = timesBoldItalic
          else if (b.isBold) fontToUse = timesBold
          else if (b.isItalic) fontToUse = timesItalic
          else fontToUse = times
        } else {
          if (b.isBold && b.isItalic) fontToUse = helveticaBoldOblique
          else if (b.isBold) fontToUse = helveticaBold
          else if (b.isItalic) fontToUse = helveticaOblique
          else fontToUse = helvetica
        }

        copiedPage.drawText(b.str, {
          x: b.pdfX,
          y: b.pdfBaselineY,
          size: b.pdfFontSize || 11,
          font: fontToUse,
          color: rgb(fgRgb.r, fgRgb.g, fgRgb.b),
        })
      }
    }

    // 2. Burn User Annotations (Custom Text, Whiteout, Images, Signatures)
    const pageAnnotations = annotations.filter((a) => a.pageIndex === i)
    for (const ann of pageAnnotations) {
      const pdfX = (ann.x / 100) * width
      const pdfY = height - (ann.y / 100) * height

      if (ann.type === 'text' && ann.text) {
        const fg = hexToRgbNormalized(ann.color || '#000000')
        copiedPage.drawText(ann.text, {
          x: pdfX,
          y: pdfY - 14,
          size: ann.fontSize || 15,
          font: helvetica,
          color: rgb(fg.r, fg.g, fg.b),
        })
      } else if (ann.type === 'whiteout') {
        const boxWidth = ((ann.width || 20) / 100) * width
        const boxHeight = ((ann.height || 4) / 100) * height
        copiedPage.drawRectangle({
          x: pdfX,
          y: pdfY - boxHeight,
          width: boxWidth,
          height: boxHeight,
          color: rgb(1, 1, 1),
        })
      } else if (ann.type === 'image' && ann.imageDataUrl) {
        try {
          const imgBase64 = ann.imageDataUrl.split(',')[1]
          const imgBytes = Uint8Array.from(atob(imgBase64), (c) => c.charCodeAt(0))
          let embeddedImage
          if (ann.imageDataUrl.includes('image/png')) {
            embeddedImage = await outDoc.embedPng(imgBytes)
          } else {
            embeddedImage = await outDoc.embedJpg(imgBytes)
          }

          const imgWidth = ((ann.width || 25) / 100) * width
          const aspectRatio = embeddedImage.height / embeddedImage.width
          const imgHeight = imgWidth * aspectRatio

          copiedPage.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY - imgHeight,
            width: imgWidth,
            height: imgHeight,
          })
        } catch (e) {
          console.error('Failed to embed image in PDF:', e)
        }
      }
    }

    outDoc.addPage(copiedPage)
  }

  return await outDoc.save()
}
