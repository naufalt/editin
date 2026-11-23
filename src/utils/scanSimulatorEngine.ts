import { PDFDocument } from 'pdf-lib'
import { renderPageToCanvas } from './pdfEngine'

export type ScanColorMode = 'color' | 'grayscale' | 'bw' // Asli Berwarna, Hitam Putih (Grayscale), atau Monokrom Fotokopi (B&W)

export interface ScanSimulatorOptions {
  tiltAngle: number // -2.0 s/d +2.0 derajat rotasi acak
  colorMode: ScanColorMode
  noiseIntensity: number // 0 s/d 50
  contrast: number // -20 s/d +40
  brightness: number // -20 s/d +40
  blur: number // 0 s/d 1.5 px (mensimulasikan lensa scanner optik)
  pageShadow: boolean // Efek gradasi bayangan di lipatan tepi kertas
}

export const DEFAULT_SCAN_OPTIONS: ScanSimulatorOptions = {
  tiltAngle: 0.6,
  colorMode: 'color',
  noiseIntensity: 18,
  contrast: 15,
  brightness: 5,
  blur: 0.4,
  pageShadow: true,
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
 * Menerapkan efek scanner realistis pada HTML Canvas:
 * 1. Rotasi kemiringan mikroskopis (micro-tilt) yang acak per lembar (-tilt s/d +tilt)
 * 2. Filter lensa optik scanner (contrast, brightness, desaturasi warna)
 * 3. Noise / grain tekstur serat kertas fisik
 * 4. Bayangan tepi scanner bed (shadow vignette)
 */
export async function applyScanEffectToPage(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  options: ScanSimulatorOptions,
  pageRandomSeed = 1
): Promise<HTMLCanvasElement> {
  // Render lembaran PDF pada resolusi tinggi 2.0x agar teks tetap tajam
  const baseCanvas = await renderPageToCanvas(pdfBuffer, pageNumber, 2.0)
  const origW = baseCanvas.width
  const origH = baseCanvas.height

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = origW
  outputCanvas.height = origH
  const ctx = outputCanvas.getContext('2d')
  if (!ctx) throw new Error('Gagal mendapatkan 2D context canvas')

  // Background kertas scanner: sedikit off-white hangat (#FAFAF9) seperti kertas HVS sungguhan
  ctx.fillStyle = options.colorMode === 'bw' ? '#FFFFFF' : '#FAFAF8'
  ctx.fillRect(0, 0, origW, origH)

  // Hitung sudut kemiringan per lembar: berosilasi sedikit berdasarkan nomor halaman agar realistis
  const pseudoRandom = Math.sin(pageRandomSeed * 997 + pageNumber * 13)
  const angleInDegrees = (options.tiltAngle * pseudoRandom)
  const angleInRadians = (angleInDegrees * Math.PI) / 180

  ctx.save()
  // Posisikan origin rotasi di tengah halaman
  ctx.translate(origW / 2, origH / 2)
  ctx.rotate(angleInRadians)

  // Terapkan sedikit filter blur lensa scanner & brightness
  if (options.blur > 0) {
    ctx.filter = `blur(${options.blur}px)`
  }

  ctx.drawImage(baseCanvas, -origW / 2, -origH / 2, origW, origH)
  ctx.restore()

  // Reset filter untuk pass pemrosesan pixel gambar
  ctx.filter = 'none'

  // Ambil pixel data untuk manipulasi warna (grayscale, contrast, noise, dll.)
  const imgData = ctx.getImageData(0, 0, origW, origH)
  const data = imgData.data

  // Precompute kontras factor
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast))
  const brightnessOffset = options.brightness * 1.2
  const noiseScale = options.noiseIntensity

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // 1. Color Mode Transformation
    if (options.colorMode === 'grayscale') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = gray
      g = gray
      b = gray
    } else if (options.colorMode === 'bw') {
      // Monokrom mesin fotokopi
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const mono = gray > 145 ? 255 : 20
      r = mono
      g = mono
      b = mono
    }

    // 2. Brightness & Contrast
    if (options.contrast !== 0) {
      r = contrastFactor * (r - 128) + 128
      g = contrastFactor * (g - 128) + 128
      b = contrastFactor * (b - 128) + 128
    }

    if (brightnessOffset !== 0) {
      r += brightnessOffset
      g += brightnessOffset
      b += brightnessOffset
    }

    // 3. Noise / Kertas Grain
    if (noiseScale > 0) {
      const noise = (Math.random() - 0.5) * noiseScale
      r += noise
      g += noise
      b += noise
    }

    // Clamp 0..255
    data[i] = Math.max(0, Math.min(255, r))
    data[i + 1] = Math.max(0, Math.min(255, g))
    data[i + 2] = Math.max(0, Math.min(255, b))
  }

  ctx.putImageData(imgData, 0, 0)

  // 4. Efek bayangan kaca tepi scanner (Scanner Vignette / Glass Bed Shadow)
  if (options.pageShadow) {
    const shadowGrad = ctx.createLinearGradient(0, 0, 0, 24)
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.06)')
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shadowGrad
    ctx.fillRect(0, 0, origW, 24)

    const sideShadow = ctx.createLinearGradient(0, 0, 16, 0)
    sideShadow.addColorStop(0, 'rgba(0,0,0,0.04)')
    sideShadow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sideShadow
    ctx.fillRect(0, 0, 16, origH)
  }

  return outputCanvas
}

/**
 * Memproses seluruh berkas PDF menjadi berkas PDF Efek Scanner Fisik
 */
export async function generateScannedPdf(
  originalBuffer: ArrayBuffer,
  options: ScanSimulatorOptions,
  onProgress?: (data: { current: number; total: number; percent: number }) => void
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0))
  const pageCount = srcDoc.getPageCount()
  const outDoc = await PDFDocument.create()
  outDoc.setProducer('EditIn Scanner Simulator // Ngoods Studio')

  const seed = Math.random() * 100

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1
    onProgress?.({
      current: pageNum,
      total: pageCount,
      percent: Math.round(((i + 0.2) / pageCount) * 90),
    })

    const srcPage = srcDoc.getPage(i)
    const { width, height } = srcPage.getSize()

    const pageCanvas = await applyScanEffectToPage(originalBuffer, pageNum, options, seed)
    const jpegQuality = options.colorMode === 'bw' ? 0.75 : 0.82
    const jpegDataUrl = pageCanvas.toDataURL('image/jpeg', jpegQuality)
    const jpegBytes = dataUrlToUint8Array(jpegDataUrl)
    const embeddedImg = await outDoc.embedJpg(jpegBytes)

    const newPage = outDoc.addPage([width, height])
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height,
    })
  }

  onProgress?.({
    current: pageCount,
    total: pageCount,
    percent: 100,
  })

  return await outDoc.save({ useObjectStreams: true })
}
