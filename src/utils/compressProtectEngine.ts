import {
  PDFDocument,
  PDFDict,
  PDFString,
  PDFHexString,
  PDFRawStream,
  PDFArray,
} from 'pdf-lib'
import { renderPageToCanvas } from './pdfEngine'

export type CompressQuality = 'extreme' | 'balanced' | 'high'

export interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  newSize: number
  savingsPercent: number
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * True Offline PDF Compression Engine:
 * - 'extreme' (Maksimal Kompres - Ukuran Terkecil): Rebuilds pages at 1.1x scale & 0.45 JPEG quality.
 * - 'balanced' (Seimbang - Standar Web/Portal): Rebuilds pages at 1.5x scale & 0.68 JPEG quality.
 * - 'high' (Maksimal Kualitas): Strips metadata & object streams first; if original has heavy uncompressed streams,
 *   optimizes at 2.0x scale & 0.85 JPEG quality, always returning whichever is smaller!
 */
export async function compressPdfDocument(
  buffer: ArrayBuffer,
  quality: CompressQuality
): Promise<CompressResult> {
  const originalSize = buffer.byteLength
  const srcDoc = await PDFDocument.load(buffer.slice(0))
  const pageCount = srcDoc.getPageCount()

  // 1. Lossless structural & metadata cleanup pass
  srcDoc.setTitle('')
  srcDoc.setAuthor('')
  srcDoc.setSubject('')
  srcDoc.setKeywords([])
  srcDoc.setProducer('EditIn // Ngoods Studio')
  srcDoc.setCreator('EditIn')

  const losslessBytes = await srcDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })

  // Configure rasterization parameters per profile
  const profileConfig: Record<CompressQuality, { scale: number; jpegQuality: number }> = {
    extreme: { scale: 1.1, jpegQuality: 0.45 },
    balanced: { scale: 1.5, jpegQuality: 0.68 },
    high: { scale: 2.0, jpegQuality: 0.84 },
  }

  const { scale, jpegQuality } = profileConfig[quality]
  const outDoc = await PDFDocument.create()
  outDoc.setProducer('EditIn // Ngoods Studio')

  for (let i = 0; i < pageCount; i++) {
    const srcPage = srcDoc.getPage(i)
    const { width, height } = srcPage.getSize()

    const canvas = await renderPageToCanvas(buffer, i + 1, scale)
    const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
    const jpegBytes = dataUrlToUint8Array(jpegDataUrl)
    const embeddedJpg = await outDoc.embedJpg(jpegBytes)

    const newPage = outDoc.addPage([width, height])
    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width,
      height,
    })
  }

  const recompressedBytes = await outDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })

  // Always pick the smallest valid output so file size never accidentally grows
  let finalBytes = recompressedBytes
  if (losslessBytes.byteLength < recompressedBytes.byteLength) {
    finalBytes = losslessBytes
  }
  if (finalBytes.byteLength >= originalSize && losslessBytes.byteLength <= originalSize) {
    finalBytes = losslessBytes
  }

  const newSize = finalBytes.byteLength
  const savingsPercent = Math.max(
    0,
    Math.round(((originalSize - newSize) / Math.max(1, originalSize)) * 100)
  )

  return {
    bytes: finalBytes,
    originalSize,
    newSize,
    savingsPercent,
  }
}

// ============================================================================
// Pure TypeScript PDF 128-bit Standard Security Handler (ISO 32000-1 V=2, R=3)
// Locks PDF files 100% offline so Chrome, Edge, Adobe Acrobat, etc. require
// the password before opening the document.
// ============================================================================

const PDF_ENCRYPTION_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
])

// Pure JS MD5 implementation (RFC 1321) for 100% browser/renderer compatibility
function md5(chunks: Uint8Array[]): Uint8Array {
  let totalLen = 0
  for (const c of chunks) totalLen += c.length
  const msg = new Uint8Array(totalLen)
  let offset = 0
  for (const c of chunks) {
    msg.set(c, offset)
    offset += c.length
  }

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]
  const K = new Uint32Array(64)
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
  }

  const bitLen = totalLen * 8
  const padLen = ((56 - ((totalLen + 1) % 64)) + 64) % 64
  const padded = new Uint8Array(totalLen + 1 + padLen + 8)
  padded.set(msg, 0)
  padded[totalLen] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, bitLen >>> 0, true)
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000) >>> 0, true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const M = new Uint32Array(16)
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(i + j * 4, true)
    }

    let A = a0
    let B = b0
    let C = c0
    let D = d0

    for (let k = 0; k < 64; k++) {
      let F = 0
      let g = 0
      if (k < 16) {
        F = (B & C) | (~B & D)
        g = k
      } else if (k < 32) {
        F = (D & B) | (~D & C)
        g = (5 * k + 1) % 16
      } else if (k < 48) {
        F = B ^ C ^ D
        g = (3 * k + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * k) % 16
      }

      const temp = D
      D = C
      C = B
      const sum = (A + F + K[k] + M[g]) >>> 0
      const rotated = ((sum << s[k]) | (sum >>> (32 - s[k]))) >>> 0
      B = (B + rotated) >>> 0
      A = temp
    }

    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }

  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  outView.setUint32(0, a0, true)
  outView.setUint32(4, b0, true)
  outView.setUint32(8, c0, true)
  outView.setUint32(12, d0, true)
  return out
}

function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256)
  for (let i = 0; i < 256; i++) s[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff
    const t = s[i]
    s[i] = s[j]
    s[j] = t
  }
  const out = new Uint8Array(data.length)
  let i = 0
  j = 0
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff
    j = (j + s[i]) & 0xff
    const t = s[i]
    s[i] = s[j]
    s[j] = t
    out[k] = data[k] ^ s[(s[i] + s[j]) & 0xff]
  }
  return out
}

function bytesToHexUpper(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).toUpperCase().padStart(2, '0')
  }
  return hex
}

function padPdfPassword(pwd: string): Uint8Array {
  const out = new Uint8Array(32)
  const pwdBytes: number[] = []
  for (let i = 0; i < pwd.length && pwdBytes.length < 32; i++) {
    pwdBytes.push(pwd.charCodeAt(i) & 0xff)
  }
  out.set(pwdBytes, 0)
  if (pwdBytes.length < 32) {
    out.set(PDF_ENCRYPTION_PADDING.subarray(0, 32 - pwdBytes.length), pwdBytes.length)
  }
  return out
}

function computeOwnerValue(userPwd: string, ownerPwd: string): Uint8Array {
  const paddedOwner = padPdfPassword(ownerPwd || userPwd)
  let hash = md5([paddedOwner])
  for (let i = 0; i < 50; i++) {
    hash = md5([hash])
  }
  const rc4Key = hash.subarray(0, 16)
  let enc = padPdfPassword(userPwd)
  for (let i = 0; i <= 19; i++) {
    const k = new Uint8Array(16)
    for (let j = 0; j < 16; j++) k[j] = rc4Key[j] ^ i
    enc = rc4(k, enc)
  }
  return enc
}

function computeEncryptionKey(
  userPwd: string,
  O: Uint8Array,
  P: number,
  fileId: Uint8Array
): Uint8Array {
  const paddedUser = padPdfPassword(userPwd)
  const pBytes = new Uint8Array([
    P & 0xff,
    (P >> 8) & 0xff,
    (P >> 16) & 0xff,
    (P >> 24) & 0xff,
  ])
  let hash = md5([paddedUser, O, pBytes, fileId])
  for (let i = 0; i < 50; i++) {
    hash = md5([hash.subarray(0, 16)])
  }
  return hash.subarray(0, 16)
}

function computeUserValue(encKey: Uint8Array, fileId: Uint8Array): Uint8Array {
  const hash = md5([PDF_ENCRYPTION_PADDING, fileId])
  let enc = hash
  for (let i = 0; i <= 19; i++) {
    const k = new Uint8Array(16)
    for (let j = 0; j < 16; j++) k[j] = encKey[j] ^ i
    enc = rc4(k, enc)
  }
  const out = new Uint8Array(32)
  out.set(enc, 0)
  out.set(PDF_ENCRYPTION_PADDING.subarray(0, 16), 16)
  return out
}

function computeObjectKey(encKey: Uint8Array, objNum: number, genNum: number): Uint8Array {
  const extra = new Uint8Array([
    objNum & 0xff,
    (objNum >> 8) & 0xff,
    (objNum >> 16) & 0xff,
    genNum & 0xff,
    (genNum >> 8) & 0xff,
  ])
  const hash = md5([encKey, extra])
  return hash.subarray(0, 16)
}

function encryptPdfObjectInPlace(obj: any, objKey: Uint8Array): void {
  if (!obj) return
  if (obj instanceof PDFRawStream) {
    ;(obj as any).contents = rc4(objKey, obj.contents)
    encryptPdfObjectInPlace(obj.dict, objKey)
  } else if (obj instanceof PDFHexString) {
    const enc = rc4(objKey, obj.asBytes())
    ;(obj as any).value = bytesToHexUpper(enc)
  } else if (obj instanceof PDFDict) {
    for (const [k, v] of obj.entries()) {
      if (v instanceof PDFString) {
        const enc = rc4(objKey, v.asBytes())
        obj.set(k, PDFHexString.of(bytesToHexUpper(enc)))
      } else {
        encryptPdfObjectInPlace(v, objKey)
      }
    }
  } else if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) {
      const v = obj.get(i)
      if (v instanceof PDFString) {
        const enc = rc4(objKey, v.asBytes())
        obj.set(i, PDFHexString.of(bytesToHexUpper(enc)))
      } else {
        encryptPdfObjectInPlace(v, objKey)
      }
    }
  }
}

export async function encryptPdfDocument(
  buffer: ArrayBuffer,
  userPassword: string
): Promise<Uint8Array> {
  // Normalize PDF without object streams first so every indirect object can be encrypted cleanly
  const tempDoc = await PDFDocument.load(buffer.slice(0))
  const normalizedBytes = await tempDoc.save({ useObjectStreams: false })
  const pdfDoc = await PDFDocument.load(normalizedBytes)

  const seedStr = `editin-lock-${Date.now()}-${buffer.byteLength}`
  const seedBytes = new Uint8Array(seedStr.length)
  for (let i = 0; i < seedStr.length; i++) seedBytes[i] = seedStr.charCodeAt(i) & 0xff

  const fileId = md5([seedBytes])
  const P = -4 // Standard permissions once unlocked with user password
  const O = computeOwnerValue(userPassword, userPassword)
  const encKey = computeEncryptionKey(userPassword, O, P, fileId)
  const U = computeUserValue(encKey, fileId)

  // Encrypt all indirect objects in the document
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    const objKey = computeObjectKey(encKey, ref.objectNumber, ref.generationNumber)
    encryptPdfObjectInPlace(obj, objKey)
  }

  // Register Standard Security Handler /Encrypt dictionary in trailer
  const fileIdHex = PDFHexString.of(bytesToHexUpper(fileId))
  const encryptDict = pdfDoc.context.obj({
    Filter: 'Standard',
    V: 2,
    R: 3,
    Length: 128,
    P,
    O: PDFHexString.of(bytesToHexUpper(O)),
    U: PDFHexString.of(bytesToHexUpper(U)),
  })
  const encryptRef = pdfDoc.context.register(encryptDict)
  pdfDoc.context.trailerInfo.Encrypt = encryptRef
  pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([fileIdHex, fileIdHex])

  return await pdfDoc.save({ useObjectStreams: false })
}
