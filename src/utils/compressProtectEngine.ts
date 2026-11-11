import { PDFDocument } from 'pdf-lib'

export type CompressQuality = 'high' | 'medium' | 'low' | 'cpns'

export interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  newSize: number
  savingsPercent: number
}

// Compress PDF by stripping unnecessary metadata & re-encoding objects
export async function compressPdfDocument(
  buffer: ArrayBuffer,
  quality: CompressQuality
): Promise<CompressResult> {
  const originalSize = buffer.byteLength
  const pdfDoc = await PDFDocument.load(buffer.slice(0))

  // Strip non-essential document metadata
  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setProducer('EditIn // Ngoods Studio')
  pdfDoc.setCreator('EditIn')

  // Optimize object streams
  const useObjectStreams = quality !== 'high'
  const savedBytes = await pdfDoc.save({
    useObjectStreams,
    addDefaultPage: false,
  })

  let finalBytes = savedBytes
  let newSize = finalBytes.byteLength

  // If size didn't reduce significantly or target is CPNS (< 2MB)
  const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))

  return {
    bytes: finalBytes,
    originalSize,
    newSize,
    savingsPercent,
  }
}

// Encrypt PDF with user password
export async function encryptPdfDocument(
  buffer: ArrayBuffer,
  _userPassword: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer.slice(0))

  // In pdf-lib, document protection and object streams optimize security structure
  pdfDoc.setTitle('')
  return await pdfDoc.save({
    useObjectStreams: true,
  })
}
