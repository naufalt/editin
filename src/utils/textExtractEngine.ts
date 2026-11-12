import * as pdfjsLib from 'pdfjs-dist'

export interface EditableTextBlock {
  id: string
  pageNumber: number
  str: string
  originalStr: string
  x: number             // Percentage (0 - 100) from left
  y: number             // Percentage (0 - 100) from top
  width: number         // Percentage (0 - 100)
  height: number        // Percentage (0 - 100)
  baselineYRatio: number // Baseline Y percentage from top (0 - 100)
  fontSizeRatio: number  // Font size relative to page height (0 - 100)
  pdfFontSize: number   // Original PDF point size
  pdfX: number          // Original PDF X coordinate
  pdfBaselineY: number  // Original PDF baseline Y coordinate
  pdfWidth: number      // Original PDF width
  pdfHeight: number     // Original PDF height
  fontFamily: string
  textColor: string     // Extracted hex color e.g. '#111827'
  bgColor: string       // Sampled exact background color under text e.g. '#ffffff'
  isBold: boolean
  isItalic: boolean
  isEdited: boolean
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Extract and group glyph fragments into natural, cohesive line/column blocks
// and sample exact text color & background color from the rendered canvas
export async function extractPageTextBlocks(
  buffer: ArrayBuffer,
  pageNumber: number,
  renderedCanvas?: HTMLCanvasElement
): Promise<EditableTextBlock[]> {
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.0 })
  const textContent = await page.getTextContent()
  const styles = (textContent as any).styles || {}

  interface RawGlyph {
    str: string
    tx: number
    ty: number
    w: number
    h: number
    fontName: string
    fontFamily: string
  }

  const rawItems: RawGlyph[] = []

  for (const item of textContent.items as any[]) {
    if (!item.str || item.str.trim() === '') continue
    const tx = item.transform[4]
    const ty = item.transform[5]
    const fontScaleY = Math.hypot(item.transform[2], item.transform[3])
    const h = fontScaleY || item.height || 10
    const w = item.width || (item.str.length * h * 0.5)
    const styleInfo = styles[item.fontName] || {}

    rawItems.push({
      str: item.str,
      tx,
      ty,
      w,
      h,
      fontName: item.fontName || '',
      fontFamily: styleInfo.fontFamily || 'sans-serif',
    })
  }

  // Sort top-to-bottom (ty descending in PDF coords), then left-to-right (tx ascending)
  rawItems.sort((a, b) => {
    if (Math.abs(a.ty - b.ty) > Math.min(a.h, b.h) * 0.45) {
      return b.ty - a.ty
    }
    return a.tx - b.tx
  })

  // Group adjacent items on the same baseline that belong to the same column/phrase
  const groups: RawGlyph[][] = []
  let currentGroup: RawGlyph[] = []

  for (const item of rawItems) {
    if (currentGroup.length === 0) {
      currentGroup.push(item)
    } else {
      const prev = currentGroup[currentGroup.length - 1]
      const maxH = Math.max(prev.h, item.h)
      const onSameBaseline = Math.abs(prev.ty - item.ty) <= maxH * 0.4
      const horizontalGap = item.tx - (prev.tx + prev.w)
      const isSameColumnPhrase = horizontalGap >= -maxH * 0.3 && horizontalGap <= maxH * 1.1

      if (onSameBaseline && isSameColumnPhrase) {
        currentGroup.push(item)
      } else {
        groups.push(currentGroup)
        currentGroup = [item]
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  const ctx = renderedCanvas ? renderedCanvas.getContext('2d') : null
  const blocks: EditableTextBlock[] = []

  groups.forEach((group, idx) => {
    let combinedStr = ''
    for (let i = 0; i < group.length; i++) {
      const curr = group[i]
      if (i > 0) {
        const prev = group[i - 1]
        const gap = curr.tx - (prev.tx + prev.w)
        if (gap > curr.h * 0.18 && !prev.str.endsWith(' ') && !curr.str.startsWith(' ')) {
          combinedStr += ' '
        }
      }
      combinedStr += curr.str
    }
    combinedStr = combinedStr.trim()
    if (!combinedStr) return

    const minTx = Math.min(...group.map((it) => it.tx))
    const maxTx = Math.max(...group.map((it) => it.tx + it.w))
    const avgBaselineTy = group.reduce((acc, it) => acc + it.ty, 0) / group.length
    const maxH = Math.max(...group.map((it) => it.h))

    // Tighter ascent/descent bounding box so table borders are never touched
    const pdfBottom = avgBaselineTy - maxH * 0.20
    const pdfTop = avgBaselineTy + maxH * 0.84
    const boxW = Math.max(maxTx - minTx, maxH * 0.5)
    const boxH = pdfTop - pdfBottom

    const xPct = (minTx / viewport.width) * 100
    const yPct = ((viewport.height - pdfTop) / viewport.height) * 100
    const wPct = (boxW / viewport.width) * 100
    const hPct = (boxH / viewport.height) * 100
    const baselineYRatio = ((viewport.height - avgBaselineTy) / viewport.height) * 100
    const fontSizeRatio = (maxH / viewport.height) * 100

    const fontLower = (group[0].fontName + ' ' + group[0].fontFamily).toLowerCase()
    const isBold =
      fontLower.includes('bold') ||
      fontLower.includes('black') ||
      fontLower.includes('heavy') ||
      fontLower.includes('semibold') ||
      fontLower.includes('medium') ||
      fontLower.includes('demi')
    const isItalic = fontLower.includes('italic') || fontLower.includes('oblique')

    // Sample background color and foreground ink color from rendered canvas if available
    let bgColor = '#ffffff'
    let textColor = '#000000'

    if (ctx && renderedCanvas) {
      try {
        const cw = renderedCanvas.width
        const ch = renderedCanvas.height
        const pxX = Math.max(0, Math.min(cw - 1, Math.floor((xPct / 100) * cw)))
        const pxY = Math.max(0, Math.min(ch - 1, Math.floor((yPct / 100) * ch)))
        const pxW = Math.max(2, Math.min(cw - pxX, Math.ceil((wPct / 100) * cw)))
        const pxH = Math.max(2, Math.min(ch - pxY, Math.ceil((hPct / 100) * ch)))

        // Sample corner pixel just outside/top-left of glyph box for accurate background color
        const bgSampleX = Math.max(0, pxX - 2)
        const bgSampleY = Math.max(0, pxY + 1)
        const bgPixel = ctx.getImageData(bgSampleX, bgSampleY, 1, 1).data
        if (bgPixel[3] > 200) {
          bgColor = rgbToHex(bgPixel[0], bgPixel[1], bgPixel[2])
        }

        // Sample darkest/most-contrasting pixel inside the glyph box for accurate ink color
        const imgData = ctx.getImageData(pxX, pxY, Math.min(pxW, 40), pxH).data
        let minLum = 9999
        let bestR = 0
        let bestG = 0
        let bestB = 0
        for (let p = 0; p < imgData.length; p += 4) {
          const r = imgData[p]
          const g = imgData[p + 1]
          const b = imgData[p + 2]
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          if (lum < minLum) {
            minLum = lum
            bestR = r
            bestG = g
            bestB = b
          }
        }
        if (minLum < 220) {
          textColor = rgbToHex(bestR, bestG, bestB)
        }
      } catch {
        // Fallback to black on white
      }
    }

    blocks.push({
      id: `block_${pageNumber}_${idx}`,
      pageNumber,
      str: combinedStr,
      originalStr: combinedStr,
      x: Math.max(0, xPct),
      y: Math.max(0, yPct),
      width: Math.max(wPct, 1.0),
      height: Math.max(hPct, 1.0),
      baselineYRatio,
      fontSizeRatio,
      pdfFontSize: maxH,
      pdfX: minTx,
      pdfBaselineY: avgBaselineTy,
      pdfWidth: boxW,
      pdfHeight: boxH,
      fontFamily: group[0].fontFamily,
      textColor,
      bgColor,
      isBold,
      isItalic,
      isEdited: false,
    })
  })

  return blocks
}
