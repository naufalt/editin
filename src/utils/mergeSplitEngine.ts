import { PDFDocument } from 'pdf-lib'

export interface MergeItem {
  id: string
  name: string
  size: number
  buffer: ArrayBuffer
  pageCount: number
}

// 1. Merge multiple PDF ArrayBuffers into a single Uint8Array
export async function mergePdfDocuments(files: MergeItem[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create()

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.buffer)
    const indices = srcDoc.getPageIndices()
    const copiedPages = await mergedDoc.copyPages(srcDoc, indices)
    copiedPages.forEach((page) => mergedDoc.addPage(page))
  }

  return await mergedDoc.save()
}

// 2. Parse human range input like "1-3, 5, 8-10" into 0-based page indices
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const cleanStr = rangeStr.trim()
  if (!cleanStr) return []

  const parts = cleanStr.split(',').map((p) => p.trim())
  const pageIndices = new Set<number>()

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim())
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end))
        const max = Math.min(maxPages, Math.max(start, end))
        for (let i = min; i <= max; i++) {
          pageIndices.add(i - 1)
        }
      }
    } else {
      const single = parseInt(part, 10)
      if (!isNaN(single) && single >= 1 && single <= maxPages) {
        pageIndices.add(single - 1)
      }
    }
  }

  return Array.from(pageIndices).sort((a, b) => a - b)
}

// 3. Split PDF by custom range
export async function splitPdfByRange(
  sourceBuffer: ArrayBuffer,
  rangeStr: string,
  totalPageCount: number
): Promise<Uint8Array> {
  const targetIndices = parsePageRange(rangeStr, totalPageCount)
  if (targetIndices.length === 0) {
    throw new Error('Rentang halaman tidak valid atau di luar jangkauan')
  }

  const srcDoc = await PDFDocument.load(sourceBuffer.slice(0))
  const outDoc = await PDFDocument.create()

  const copiedPages = await outDoc.copyPages(srcDoc, targetIndices)
  copiedPages.forEach((page) => outDoc.addPage(page))

  return await outDoc.save()
}

// 4. Split PDF every N pages into chunks
export async function splitPdfEveryNPages(
  sourceBuffer: ArrayBuffer,
  n: number,
  totalPageCount: number
): Promise<{ chunkIndex: number; rangeLabel: string; bytes: Uint8Array }[]> {
  if (n <= 0) throw new Error('Nilai N harus lebih besar dari 0')
  const srcDoc = await PDFDocument.load(sourceBuffer.slice(0))
  const results: { chunkIndex: number; rangeLabel: string; bytes: Uint8Array }[] = []

  let currentStart = 0
  let chunkNum = 1

  while (currentStart < totalPageCount) {
    const currentEnd = Math.min(currentStart + n, totalPageCount)
    const indices: number[] = []
    for (let i = currentStart; i < currentEnd; i++) {
      indices.push(i)
    }

    const chunkDoc = await PDFDocument.create()
    const copied = await chunkDoc.copyPages(srcDoc, indices)
    copied.forEach((p) => chunkDoc.addPage(p))
    const chunkBytes = await chunkDoc.save()

    results.push({
      chunkIndex: chunkNum,
      rangeLabel: `Hal ${currentStart + 1}-${currentEnd}`,
      bytes: chunkBytes,
    })

    currentStart = currentEnd
    chunkNum++
  }

  return results
}
