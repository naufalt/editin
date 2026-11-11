import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib'
import { PageInfo } from '../store/documentStore'
import { CanvasAnnotation } from '../types/annotations'

// Setup pdfjs worker using local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js'

export async function loadPdfPages(buffer: ArrayBuffer): Promise<PageInfo[]> {
  // Use slice() to prevent detaching original buffer when transferred to worker
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const pages: PageInfo[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: 0.5 }) // Preview scale
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

export async function renderPageToThumbnail(
  buffer: ArrayBuffer,
  pageNumber: number,
  scale = 0.6
): Promise<string> {
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

  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function exportModifiedPdf(
  originalBuffer: ArrayBuffer,
  pages: PageInfo[],
  annotations: CanvasAnnotation[] = []
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0))
  const outDoc = await PDFDocument.create()
  const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica)

  for (let i = 0; i < pages.length; i++) {
    const pageInfo = pages[i]
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageInfo.pageIndex])
    
    if (pageInfo.rotation !== 0) {
      copiedPage.setRotation(degrees(pageInfo.rotation))
    }

    const { width, height } = copiedPage.getSize()

    // Burn annotations for this page
    const pageAnnotations = annotations.filter((a) => a.pageIndex === i)
    for (const ann of pageAnnotations) {
      const pdfX = (ann.x / 100) * width
      // PDF coordinate system starts from bottom-left
      const pdfY = height - (ann.y / 100) * height

      if (ann.type === 'text' && ann.text) {
        copiedPage.drawText(ann.text, {
          x: pdfX,
          y: pdfY - 14,
          size: ann.fontSize || 16,
          font: helveticaFont,
          color: rgb(0, 0, 0),
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
