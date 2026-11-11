import * as pdfjsLib from 'pdfjs-dist'

export interface EditableTextBlock {
  id: string
  pageNumber: number
  str: string
  originalStr: string
  x: number          // Percentage (0 - 100) from left
  y: number          // Percentage (0 - 100) from top
  width: number      // Percentage (0 - 100)
  height: number     // Percentage (0 - 100)
  fontSizeRatio: number // Font size relative to page height (0 - 100)
  pdfFontSize: number   // Original PDF point size
  pdfX: number          // Original PDF X coordinate
  pdfBaselineY: number  // Original PDF baseline Y coordinate
  pdfWidth: number      // Original PDF width
  pdfHeight: number     // Original PDF height
  fontFamily: string
  isBold: boolean
  isItalic: boolean
  isEdited: boolean
}

// Extract and group glyph fragments into natural, cohesive line/column blocks
export async function extractPageTextBlocks(
  buffer: ArrayBuffer,
  pageNumber: number
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
    hasEOL: boolean
  }

  const rawItems: RawGlyph[] = []

  for (const item of textContent.items as any[]) {
    if (!item.str || item.str.trim() === '') continue
    // item.transform = [scaleX, skewY, skewX, scaleY, tx, ty]
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
      hasEOL: Boolean(item.hasEOL),
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
      // Keep items in the same block only if gap is small (< 1.2x font height),
      // so table columns ("Description", "Qty", "Unit price", "Amount") stay separate blocks!
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

  const blocks: EditableTextBlock[] = []

  groups.forEach((group, idx) => {
    // Reconstruct string with intelligent spacing based on gap between glyphs
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
    // Baseline in PDF coordinates
    const avgBaselineTy = group.reduce((acc, it) => acc + it.ty, 0) / group.length
    const maxH = Math.max(...group.map((it) => it.h))

    // Ascent is ~0.82 * fontSize above baseline, descent is ~0.22 * fontSize below baseline
    const pdfBottom = avgBaselineTy - maxH * 0.22
    const pdfTop = avgBaselineTy + maxH * 0.88
    const boxW = Math.max(maxTx - minTx, maxH * 0.5)
    const boxH = pdfTop - pdfBottom

    // Convert to percentage (origin top-left)
    const xPct = (minTx / viewport.width) * 100
    const yPct = ((viewport.height - pdfTop) / viewport.height) * 100
    const wPct = (boxW / viewport.width) * 100
    const hPct = (boxH / viewport.height) * 100
    const fontSizeRatio = (maxH / viewport.height) * 100

    const fontLower = (group[0].fontName + ' ' + group[0].fontFamily).toLowerCase()
    const isBold = fontLower.includes('bold') || fontLower.includes('black') || fontLower.includes('heavy') || fontLower.includes('semibold') || fontLower.includes('medium')
    const isItalic = fontLower.includes('italic') || fontLower.includes('oblique')

    blocks.push({
      id: `block_${pageNumber}_${idx}`,
      pageNumber,
      str: combinedStr,
      originalStr: combinedStr,
      x: Math.max(0, xPct),
      y: Math.max(0, yPct),
      width: Math.max(wPct, 1.2),
      height: Math.max(hPct, 1.2),
      fontSizeRatio,
      pdfFontSize: maxH,
      pdfX: minTx,
      pdfBaselineY: avgBaselineTy,
      pdfWidth: boxW,
      pdfHeight: boxH,
      fontFamily: group[0].fontFamily,
      isBold,
      isItalic,
      isEdited: false,
    })
  })

  return blocks
}
