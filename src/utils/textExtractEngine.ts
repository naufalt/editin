import * as pdfjsLib from 'pdfjs-dist'

export interface ExtractedTextItem {
  id: string
  str: string
  x: number          // Percentage (0 - 100)
  y: number          // Percentage (0 - 100)
  width: number      // Percentage (0 - 100)
  height: number     // Percentage (0 - 100)
  fontSize: number
  fontFamily?: string
}

// Extract exact text positions and bounding boxes from a PDF page
export async function extractPageTextItems(
  buffer: ArrayBuffer,
  pageNumber: number
): Promise<ExtractedTextItem[]> {
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.0 })
  const textContent = await page.getTextContent()

  const items: ExtractedTextItem[] = []

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i] as any
    if (!item.str || item.str.trim() === '') continue

    // item.transform = [scaleX, skewY, skewX, scaleY, tx, ty]
    const tx = item.transform[4]
    const ty = item.transform[5]
    const itemWidth = item.width || 20
    const itemHeight = item.height || Math.abs(item.transform[3]) || 12

    // Convert PDF coordinates (origin bottom-left) to percentage (origin top-left)
    const xPct = (tx / viewport.width) * 100
    const yPct = ((viewport.height - ty - itemHeight) / viewport.height) * 100
    const wPct = (itemWidth / viewport.width) * 100
    const hPct = (itemHeight / viewport.height) * 100

    items.push({
      id: `extracted_${pageNumber}_${i}_${Date.now()}`,
      str: item.str,
      x: Math.max(0, xPct),
      y: Math.max(0, yPct),
      width: Math.max(wPct, 2),
      height: Math.max(hPct, 1.8),
      fontSize: Math.round(itemHeight * 0.9) || 12,
      fontFamily: item.fontName,
    })
  }

  return items
}
