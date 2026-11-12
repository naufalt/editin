import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, PDFOperator, PDFNumber, degrees, rgb, StandardFonts } from 'pdf-lib'
import { PageInfo } from '../store/documentStore'
import { CanvasAnnotation } from '../types/annotations'
import { EditableTextBlock, sanitizePdfText } from './textExtractEngine'
import { extractPageNativeFonts, tryDrawWithNativePageFonts } from './nativePdfFontEngine'

// Setup pdfjs worker using local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js'

const PDFJS_FONT_OPTIONS = {
  standardFontDataUrl: './standard_fonts/',
  cMapUrl: './cmaps/',
  cMapPacked: true,
}

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
  const loadingTask = pdfjsLib.getDocument({ data, ...PDFJS_FONT_OPTIONS })
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
  const loadingTask = pdfjsLib.getDocument({ data, ...PDFJS_FONT_OPTIONS })
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
  const courierOblique = await outDoc.embedFont(StandardFonts.CourierOblique)
  const courierBoldOblique = await outDoc.embedFont(StandardFonts.CourierBoldOblique)

  for (let i = 0; i < pages.length; i++) {
    const pageInfo = pages[i]
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageInfo.pageIndex])
    
    if (pageInfo.rotation !== 0) {
      copiedPage.setRotation(degrees(pageInfo.rotation))
    }

    const { width, height } = copiedPage.getSize()

    // 1. Burn ONLY edited text blocks with 1:1 sampled background color, text color & native PDF font
    const pageEditedBlocks = editedBlocks.filter(
      (b) => b.isEdited && b.pageNumber === pageInfo.pageIndex + 1
    )

    // Extract the page's own native embedded PDF fonts (ToUnicode + Widths)
    const nativePageFonts = pageEditedBlocks.length > 0
      ? extractPageNativeFonts(outDoc, copiedPage)
      : []

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

      const cleanText = sanitizePdfText(b.str)
      if (cleanText.trim().length > 0) {
        const ptSize = b.pdfFontSize || 11
        const category = b.fontCategory || 'sans'

        // First try drawing with the PDF's own native embedded font (100% identical glyphs & metrics!)
        let drawnWithNative = false
        if (category === 'sans' && !b.isBold && !b.isItalic) {
          drawnWithNative = tryDrawWithNativePageFonts(
            copiedPage,
            nativePageFonts,
            cleanText,
            b.pdfX,
            b.pdfBaselineY,
            ptSize,
            fgRgb,
            b.realFontName
          )
        }

        if (!drawnWithNative) {
          let fontToUse = helvetica
          if (category === 'mono') {
            if (b.isBold && b.isItalic) fontToUse = courierBoldOblique
            else if (b.isBold) fontToUse = courierBold
            else if (b.isItalic) fontToUse = courierOblique
            else fontToUse = courier
          } else if (category === 'serif') {
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

          // Calculate exact character spacing (Tc) calibration so standard font matches original glyph width 1:1
          let calibratedTc = 0
          const origClean = sanitizePdfText(b.originalStr || '')
          if (origClean.length > 1 && b.pdfWidth > 0) {
            try {
              const stdOrigWidth = fontToUse.widthOfTextAtSize(origClean, ptSize)
              const rawDiffPerChar = (b.pdfWidth - stdOrigWidth) / origClean.length
              if (Math.abs(rawDiffPerChar) <= ptSize * 0.15) {
                calibratedTc = rawDiffPerChar
              }
            } catch {
              calibratedTc = 0
            }
          }

          if (calibratedTc !== 0) {
            copiedPage.pushOperators(PDFOperator.of('Tc' as any, [PDFNumber.of(calibratedTc)]))
          }

          copiedPage.drawText(cleanText, {
            x: b.pdfX,
            y: b.pdfBaselineY,
            size: ptSize,
            font: fontToUse,
            color: rgb(fgRgb.r, fgRgb.g, fgRgb.b),
          })

          if (calibratedTc !== 0) {
            copiedPage.pushOperators(PDFOperator.of('Tc' as any, [PDFNumber.of(0)]))
          }
        }
      }
    }

    // 2. Burn User Annotations (Custom Text, Whiteout, Images, Signatures)
    const pageAnnotations = annotations.filter((a) => a.pageIndex === i)
    for (const ann of pageAnnotations) {
      const pdfX = (ann.x / 100) * width
      const pdfY = height - (ann.y / 100) * height

      if (ann.type === 'text' && ann.text) {
        const fg = hexToRgbNormalized(ann.color || '#000000')
        const cleanAnnText = sanitizePdfText(ann.text)
        if (cleanAnnText.trim()) {
          copiedPage.drawText(cleanAnnText, {
            x: pdfX,
            y: pdfY - 14,
            size: ann.fontSize || 15,
            font: helvetica,
            color: rgb(fg.r, fg.g, fg.b),
          })
        }
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
