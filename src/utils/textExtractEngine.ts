import * as pdfjsLib from 'pdfjs-dist'

export interface EditableTextBlock {
  id: string
  str: string
  originalStr: string
  x: number          // Percentage (0 - 100)
  y: number          // Percentage (0 - 100)
  width: number      // Percentage (0 - 100)
  height: number     // Percentage (0 - 100)
  fontSize: number   // px
  fontFamily: string
  isEdited: boolean
}

// Group glyph fragments into natural, cohesive line blocks
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

  const rawItems: {
    str: string
    tx: number
    ty: number
    w: number
    h: number
    fontName: string
  }[] = []

  for (const item of textContent.items as any[]) {
    if (!item.str || item.str.trim() === '') continue
    const tx = item.transform[4]
    const ty = item.transform[5]
    const w = item.width || 10
    const h = item.height || Math.abs(item.transform[3]) || 12

    rawItems.push({
      str: item.str,
      tx,
      ty,
      w,
      h,
      fontName: item.fontName || 'sans-serif',
    })
  }

  // Sort top-to-bottom (ty descending), then left-to-right (tx ascending)
  rawItems.sort((a, b) => {
    if (Math.abs(a.ty - b.ty) > 4) {
      return b.ty - a.ty
    }
    return a.tx - b.tx
  })

  // Group adjacent items on the same baseline
  const lines: typeof rawItems[] = []
  let currentLine: typeof rawItems = []

  for (const item of rawItems) {
    if (currentLine.length === 0) {
      currentLine.push(item)
    } else {
      const prev = currentLine[currentLine.length - 1]
      const onSameLine = Math.abs(prev.ty - item.ty) < Math.max(prev.h, item.h) * 0.4
      const isNearby = item.tx - (prev.tx + prev.w) < prev.h * 1.5

      if (onSameLine && isNearby) {
        currentLine.push(item)
      } else {
        lines.push(currentLine)
        currentLine = [item]
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  // Convert lines into exact percentage bounding boxes
  const blocks: EditableTextBlock[] = []

  lines.forEach((line, lineIndex) => {
    const minTx = Math.min(...line.map((it) => it.tx))
    const maxTx = Math.max(...line.map((it) => it.tx + it.w))
    const minTy = Math.min(...line.map((it) => it.ty))
    const maxTy = Math.max(...line.map((it) => it.ty + it.h))
    const avgH = line.reduce((acc, it) => acc + it.h, 0) / line.length
    const combinedStr = line.map((it) => it.str).join(' ').trim()

    if (!combinedStr) return

    const lineW = maxTx - minTx
    const lineH = maxTy - minTy || avgH

    // Convert to percentage top-left origin
    const xPct = (minTx / viewport.width) * 100
    const yPct = ((viewport.height - maxTy) / viewport.height) * 100
    const wPct = (lineW / viewport.width) * 100
    const hPct = (lineH / viewport.height) * 100

    blocks.push({
      id: `block_${pageNumber}_${lineIndex}`,
      str: combinedStr,
      originalStr: combinedStr,
      x: Math.max(0, xPct),
      y: Math.max(0, yPct),
      width: Math.max(wPct, 2),
      height: Math.max(hPct, 1.5),
      fontSize: Math.round(avgH * 0.95) || 12,
      fontFamily: line[0].fontName,
      isEdited: false,
    })
  })

  return blocks
}
