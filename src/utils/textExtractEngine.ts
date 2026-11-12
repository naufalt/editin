import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib'

export type DetectedFontCategory = 'sans' | 'serif' | 'mono'

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
  realFontName: string  // Actual PDF BaseFont e.g. 'Inter-Regular', 'Helvetica'
  fontCategory: DetectedFontCategory
  textColor: string     // Extracted hex color e.g. '#111827'
  bgColor: string       // Sampled exact background color under text e.g. '#ffffff'
  isBold: boolean
  isItalic: boolean
  isEdited: boolean
}

// Sanitize invisible/unsupported Unicode dashes, quotes, and spaces so WinAnsi/PDF fonts never render '□'
export function sanitizePdfText(input: string): string {
  return input
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-') // All Unicode hyphens/dashes -> ASCII '-'
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")                   // Smart single quotes -> ASCII "'"
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')                   // Smart double quotes -> ASCII '"'
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')      // Non-breaking & zero-width spaces -> ' '
    .replace(/\u2026/g, '...')                                     // Ellipsis -> '...'
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Classify font based on actual PDF BaseFont name (NOT pdfjs fallback 'serif')
export function classifyFontName(rawName: string): {
  cleanName: string
  category: DetectedFontCategory
  isBold: boolean
  isItalic: boolean
} {
  // Strip 6-letter subset prefix e.g. "BCDEFG+Inter-Medium" -> "Inter-Medium"
  const cleanName = rawName.replace(/^\//, '').replace(/^[A-Z]{6}\+/, '')
  const lower = cleanName.toLowerCase()

  const isBold =
    lower.includes('bold') ||
    lower.includes('black') ||
    lower.includes('heavy') ||
    lower.includes('semibold') ||
    lower.includes('demi') ||
    lower.includes('medium') ||
    lower.endsWith('-bd') ||
    lower.endsWith(',bold')

  const isItalic =
    lower.includes('italic') ||
    lower.includes('oblique') ||
    lower.endsWith('-it')

  // Check monospace first
  const isMono =
    lower.includes('mono') ||
    lower.includes('courier') ||
    lower.includes('consolas') ||
    lower.includes('menlo') ||
    lower.includes('fira') ||
    lower.includes('code')

  if (isMono) {
    return { cleanName: cleanName || 'Inter', category: 'mono', isBold, isItalic }
  }

  // Check explicit true serif fonts (ignore generic 'serif' fallback unless it's truly Times/Georgia/Garamond/Cambria)
  const isTrueSerif =
    lower.includes('times') ||
    lower.includes('georgia') ||
    lower.includes('garamond') ||
    lower.includes('cambria') ||
    lower.includes('palatino') ||
    lower.includes('baskerville') ||
    lower.includes('minion') ||
    lower.includes('caslon') ||
    lower.includes('bodoni') ||
    lower.includes('century') ||
    lower.includes('Merriweather'.toLowerCase()) ||
    lower.includes('playfair') ||
    lower.includes('lora') ||
    lower.includes('cmr') // Computer Modern Roman

  if (isTrueSerif) {
    return { cleanName: cleanName || 'Times New Roman', category: 'serif', isBold, isItalic }
  }

  // Default to clean modern Sans-Serif (Inter / Helvetica / Arial / Segoe UI / Roboto / Plus Jakarta / etc.)
  return { cleanName: cleanName || 'Inter', category: 'sans', isBold, isItalic }
}

// Inspect PDF page Resources/Font dictionary to get true BaseFont names
async function getPageBaseFontList(buffer: ArrayBuffer, pageNumber: number): Promise<string[]> {
  try {
    const doc = await PDFDocument.load(buffer.slice(0))
    const page = doc.getPages()[pageNumber - 1]
    if (!page) return []
    const resources = page.node.Resources()
    if (!resources) return []
    const fontDict = resources.lookup(PDFName.of('Font'))
    const names: string[] = []
    if (fontDict instanceof PDFDict) {
      for (const [, ref] of fontDict.entries()) {
        const fd = doc.context.lookup(ref)
        if (fd instanceof PDFDict) {
          const bf = fd.lookup(PDFName.of('BaseFont'))
          if (bf) {
            names.push(bf.toString())
          }
        }
      }
    }
    return names
  } catch {
    return []
  }
}

export async function extractPageTextBlocks(
  buffer: ArrayBuffer,
  pageNumber: number,
  renderedCanvas?: HTMLCanvasElement
): Promise<EditableTextBlock[]> {
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({
    data,
    standardFontDataUrl: './standard_fonts/',
    cMapUrl: './cmaps/',
    cMapPacked: true,
  })
  const pdfDoc = await loadingTask.promise
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.0 })
  const textContent = await page.getTextContent()
  const styles = (textContent as any).styles || {}

  // Trigger operatorList so page.commonObjs is populated with true FontFaceObject metadata
  try {
    await page.getOperatorList()
  } catch {
    // ignore
  }

  // Also inspect page font resources via pdf-lib as fallback
  const pageBaseFonts = await getPageBaseFontList(buffer, pageNumber)

  // Map each pdfjs internal font key (e.g. 'g_d0_f1') to its real PDF font name
  const resolvedFontMap: Record<string, {
    realName: string
    category: DetectedFontCategory
    isBold: boolean
    isItalic: boolean
  }> = {}

  for (const fontKey of Object.keys(styles)) {
    let rawFontName = ''
    let commonBold = false
    let commonItalic = false

    try {
      const commonFont = (page as any).commonObjs?.get(fontKey)
      if (commonFont) {
        rawFontName = commonFont.name || commonFont.loadedName || ''
        commonBold = Boolean(commonFont.bold)
        commonItalic = Boolean(commonFont.italic)
      }
    } catch {
      // Not in commonObjs
    }

    if (!rawFontName && pageBaseFonts.length > 0) {
      rawFontName = pageBaseFonts[0]
    }

    const info = classifyFontName(rawFontName)
    resolvedFontMap[fontKey] = {
      realName: info.cleanName,
      category: info.category,
      isBold: info.isBold || commonBold,
      isItalic: info.isItalic || commonItalic,
    }
  }

  interface RawGlyph {
    str: string
    tx: number
    ty: number
    w: number
    h: number
    fontName: string
  }

  const rawItems: RawGlyph[] = []

  for (const item of textContent.items as any[]) {
    if (!item.str || item.str.trim() === '') continue
    const cleanStr = sanitizePdfText(item.str)
    if (!cleanStr.trim()) continue

    const tx = item.transform[4]
    const ty = item.transform[5]
    const fontScaleY = Math.hypot(item.transform[2], item.transform[3])
    const h = fontScaleY || item.height || 10
    const w = item.width || (cleanStr.length * h * 0.5)

    rawItems.push({
      str: cleanStr,
      tx,
      ty,
      w,
      h,
      fontName: item.fontName || '',
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
    combinedStr = sanitizePdfText(combinedStr.trim())
    if (!combinedStr) return

    const minTx = Math.min(...group.map((it) => it.tx))
    const maxTx = Math.max(...group.map((it) => it.tx + it.w))
    const avgBaselineTy = group.reduce((acc, it) => acc + it.ty, 0) / group.length
    const maxH = Math.max(...group.map((it) => it.h))

    // Tight ascent/descent bounding box
    const pdfBottom = avgBaselineTy - maxH * 0.21
    const pdfTop = avgBaselineTy + maxH * 0.85
    const boxW = Math.max(maxTx - minTx, maxH * 0.5)
    const boxH = pdfTop - pdfBottom

    const xPct = (minTx / viewport.width) * 100
    const yPct = ((viewport.height - pdfTop) / viewport.height) * 100
    const wPct = (boxW / viewport.width) * 100
    const hPct = (boxH / viewport.height) * 100
    const baselineYRatio = ((viewport.height - avgBaselineTy) / viewport.height) * 100
    const fontSizeRatio = (maxH / viewport.height) * 100

    const resolvedFont = resolvedFontMap[group[0].fontName] || {
      realName: 'Inter',
      category: 'sans' as DetectedFontCategory,
      isBold: false,
      isItalic: false,
    }

    // Sample background color and foreground ink color from rendered canvas
    let bgColor = '#ffffff'
    let textColor = '#111827'

    if (ctx && renderedCanvas) {
      try {
        const cw = renderedCanvas.width
        const ch = renderedCanvas.height
        const pxX = Math.max(0, Math.min(cw - 1, Math.floor((xPct / 100) * cw)))
        const pxY = Math.max(0, Math.min(ch - 1, Math.floor((yPct / 100) * ch)))
        const pxW = Math.max(2, Math.min(cw - pxX, Math.ceil((wPct / 100) * cw)))
        const pxH = Math.max(2, Math.min(ch - pxY, Math.ceil((hPct / 100) * ch)))

        const bgSampleX = Math.max(0, pxX - 2)
        const bgSampleY = Math.max(0, pxY + 1)
        const bgPixel = ctx.getImageData(bgSampleX, bgSampleY, 1, 1).data
        if (bgPixel[3] > 200) {
          bgColor = rgbToHex(bgPixel[0], bgPixel[1], bgPixel[2])
        }

        const imgData = ctx.getImageData(pxX, pxY, Math.min(pxW, 40), pxH).data
        let minLum = 9999
        let bestR = 17
        let bestG = 24
        let bestB = 39
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
        if (minLum < 225) {
          textColor = rgbToHex(bestR, bestG, bestB)
        }
      } catch {
        // Fallback
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
      fontFamily: resolvedFont.category,
      realFontName: resolvedFont.realName,
      fontCategory: resolvedFont.category,
      textColor,
      bgColor,
      isBold: resolvedFont.isBold,
      isItalic: resolvedFont.isItalic,
      isEdited: false,
    })
  })

  return blocks
}
