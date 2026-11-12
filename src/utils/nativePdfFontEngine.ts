import {
  PDFDocument,
  PDFPage,
  PDFName,
  PDFDict,
  PDFArray,
  PDFNumber,
  PDFOperator,
  PDFHexString,
  decodePDFRawStream,
} from 'pdf-lib'

export interface NativeFontGlyphEntry {
  code: number
  hexLen: number
  widthEm: number
}

export interface NativePdfFontDictionary {
  pdfResourceKey: string // e.g. 'F1' or 'Helvetica-7098480789' (without leading slash)
  baseFontName: string
  subtype: string
  charToGlyph: Map<string, NativeFontGlyphEntry>
}

function hexToUtf16(hexStr: string): string {
  let out = ''
  const padded = hexStr.length % 4 === 0 ? hexStr : hexStr.padStart(4, '0')
  for (let i = 0; i < padded.length; i += 4) {
    const code = parseInt(padded.slice(i, i + 4), 16)
    if (!isNaN(code)) out += String.fromCharCode(code)
  }
  return out
}

function parseToUnicodeStream(cmapStr: string): Map<string, { code: number; hexLen: number }> {
  const charToCode = new Map<string, { code: number; hexLen: number }>()

  // 1. Parse beginbfchar ... endbfchar
  const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g
  let m: RegExpExecArray | null
  while ((m = bfcharRegex.exec(cmapStr)) !== null) {
    const pairRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
    let pm: RegExpExecArray | null
    while ((pm = pairRegex.exec(m[1])) !== null) {
      const code = parseInt(pm[1], 16)
      const ch = hexToUtf16(pm[2])
      if (!isNaN(code) && ch && ch.length === 1 && !charToCode.has(ch)) {
        charToCode.set(ch, { code, hexLen: pm[1].length })
      }
    }
  }

  // 2. Parse beginbfrange ... endbfrange
  const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g
  while ((m = bfrangeRegex.exec(cmapStr)) !== null) {
    const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
    let rm: RegExpExecArray | null
    while ((rm = rangeRegex.exec(m[1])) !== null) {
      const startCode = parseInt(rm[1], 16)
      const endCode = parseInt(rm[2], 16)
      const startUni = parseInt(rm[3], 16)
      const hexLen = rm[1].length
      for (let c = startCode; c <= endCode; c++) {
        const ch = String.fromCharCode(startUni + (c - startCode))
        if (!charToCode.has(ch)) {
          charToCode.set(ch, { code: c, hexLen })
        }
      }
    }
  }

  return charToCode
}

function parseCidWidthsArray(doc: PDFDocument, wObj: any): Map<number, number> {
  const widthMap = new Map<number, number>()
  const wArr = doc.context.lookup(wObj)
  if (!(wArr instanceof PDFArray)) return widthMap

  let i = 0
  while (i < wArr.size()) {
    const first = doc.context.lookup(wArr.get(i))
    if (!(first instanceof PDFNumber)) {
      i++
      continue
    }
    const startCid = first.asNumber()
    const second = doc.context.lookup(wArr.get(i + 1))

    if (second instanceof PDFArray) {
      for (let j = 0; j < second.size(); j++) {
        const wVal = doc.context.lookup(second.get(j))
        if (wVal instanceof PDFNumber) {
          widthMap.set(startCid + j, wVal.asNumber() / 1000)
        }
      }
      i += 2
    } else if (second instanceof PDFNumber) {
      const endCid = second.asNumber()
      const third = doc.context.lookup(wArr.get(i + 2))
      if (third instanceof PDFNumber) {
        const wEm = third.asNumber() / 1000
        for (let c = startCid; c <= endCid; c++) {
          widthMap.set(c, wEm)
        }
      }
      i += 3
    } else {
      i++
    }
  }

  return widthMap
}

export function extractPageNativeFonts(doc: PDFDocument, page: PDFPage): NativePdfFontDictionary[] {
  const result: NativePdfFontDictionary[] = []
  try {
    const resources = page.node.Resources()
    if (!resources) return result
    const fontDict = resources.lookup(PDFName.of('Font'))
    if (!(fontDict instanceof PDFDict)) return result

    for (const [keyName, ref] of fontDict.entries()) {
      const cleanKey = keyName.toString().replace(/^\//, '')
      const fd = doc.context.lookup(ref)
      if (!(fd instanceof PDFDict)) continue

      const subtype = fd.lookup(PDFName.of('Subtype'))?.toString() || ''
      const baseFontName = fd.lookup(PDFName.of('BaseFont'))?.toString().replace(/^\//, '') || cleanKey
      const charToGlyph = new Map<string, NativeFontGlyphEntry>()

      // Check ToUnicode CMap first
      const toUnicodeRef = fd.lookup(PDFName.of('ToUnicode'))
      let rawCharMap = new Map<string, { code: number; hexLen: number }>()
      if (toUnicodeRef) {
        try {
          const decodedBytes = decodePDFRawStream(toUnicodeRef as any).decode()
          let cmapStr = ''
          for (let idx = 0; idx < decodedBytes.length; idx++) {
            cmapStr += String.fromCharCode(decodedBytes[idx])
          }
          rawCharMap = parseToUnicodeStream(cmapStr)
        } catch {
          // ignore
        }
      }

      // Extract widths based on font Subtype
      if (subtype === '/Type0') {
        // Composite CIDFont
        const descFonts = doc.context.lookup(fd.lookup(PDFName.of('DescendantFonts')))
        let cidWidths = new Map<number, number>()
        let defaultWidthEm = 0.556
        if (descFonts instanceof PDFArray && descFonts.size() > 0) {
          const cidFontDict = doc.context.lookup(descFonts.get(0))
          if (cidFontDict instanceof PDFDict) {
            const dw = cidFontDict.lookup(PDFName.of('DW'))
            if (dw instanceof PDFNumber) defaultWidthEm = dw.asNumber() / 1000
            const wEntry = cidFontDict.lookup(PDFName.of('W'))
            if (wEntry) cidWidths = parseCidWidthsArray(doc, wEntry)
          }
        }

        for (const [ch, info] of rawCharMap.entries()) {
          charToGlyph.set(ch, {
            code: info.code,
            hexLen: Math.max(info.hexLen, 4),
            widthEm: cidWidths.get(info.code) ?? defaultWidthEm,
          })
        }
      } else {
        // Simple Font: /Type1, /TrueType, /Type3
        const firstCharObj = fd.lookup(PDFName.of('FirstChar'))
        const firstChar = firstCharObj instanceof PDFNumber ? firstCharObj.asNumber() : 0
        const widthsArr = doc.context.lookup(fd.lookup(PDFName.of('Widths')))

        // Determine width scale factor (Type3 FontMatrix vs standard 1/1000)
        let widthScale = subtype === '/Type3' ? 1.0 : 0.001
        const fontMatrix = doc.context.lookup(fd.lookup(PDFName.of('FontMatrix')))
        if (fontMatrix instanceof PDFArray && fontMatrix.size() > 0) {
          const fm0 = doc.context.lookup(fontMatrix.get(0))
          if (fm0 instanceof PDFNumber && fm0.asNumber() > 0) {
            widthScale = fm0.asNumber()
          }
        }

        const getCodeWidthEm = (code: number): number => {
          if (widthsArr instanceof PDFArray) {
            const wIdx = code - firstChar
            if (wIdx >= 0 && wIdx < widthsArr.size()) {
              const wObj = doc.context.lookup(widthsArr.get(wIdx))
              if (wObj instanceof PDFNumber) {
                const rawW = wObj.asNumber()
                // If rawW is already normalized (< 3) use directly, else multiply by 0.001
                return rawW > 3 ? rawW * 0.001 : rawW * widthScale
              }
            }
          }
          return 0.556
        }

        if (rawCharMap.size > 0) {
          for (const [ch, info] of rawCharMap.entries()) {
            charToGlyph.set(ch, {
              code: info.code,
              hexLen: info.hexLen,
              widthEm: getCodeWidthEm(info.code),
            })
          }
        } else {
          // Standard WinAnsi / Latin1 encoding ( ASCII 32..126 )
          for (let code = 32; code <= 126; code++) {
            const ch = String.fromCharCode(code)
            charToGlyph.set(ch, {
              code,
              hexLen: 2,
              widthEm: getCodeWidthEm(code),
            })
          }
        }
      }

      if (charToGlyph.size > 0) {
        result.push({
          pdfResourceKey: cleanKey,
          baseFontName,
          subtype,
          charToGlyph,
        })
      }
    }
  } catch (e) {
    console.warn('extractPageNativeFonts error:', e)
  }
  return result
}

/**
 * Attempts to draw `text` at `(x, baselineY)` using the page's own native embedded PDF font(s)
 * so every glyph is 100% identical in typeface, stroke weight, and proportions to the original PDF!
 * Returns true if every character in `text` was found in the page's native fonts and drawn.
 */
export function tryDrawWithNativePageFonts(
  page: PDFPage,
  nativeFonts: NativePdfFontDictionary[],
  text: string,
  x: number,
  baselineY: number,
  fontSize: number,
  colorRgb: { r: number; g: number; b: number },
  preferredFontName?: string
): boolean {
  if (nativeFonts.length === 0 || !text) return false

  // Sort native fonts so the preferred font (matching the block's original font) is tried first
  const sortedFonts = [...nativeFonts].sort((a, b) => {
    const aMatch =
      preferredFontName &&
      (a.pdfResourceKey.toLowerCase() === preferredFontName.toLowerCase() ||
        a.baseFontName.toLowerCase().includes(preferredFontName.toLowerCase()))
        ? 1
        : 0
    const bMatch =
      preferredFontName &&
      (b.pdfResourceKey.toLowerCase() === preferredFontName.toLowerCase() ||
        b.baseFontName.toLowerCase().includes(preferredFontName.toLowerCase()))
        ? 1
        : 0
    return bMatch - aMatch
  })

  // Check if all characters in `text` can be resolved from the primary font (or across the page's fonts)
  const resolvedGlyphs: {
    fontKey: string
    subtype: string
    glyph: NativeFontGlyphEntry
  }[] = []

  for (const ch of text) {
    let found: { fontKey: string; subtype: string; glyph: NativeFontGlyphEntry } | null = null
    for (const nf of sortedFonts) {
      const g = nf.charToGlyph.get(ch)
      if (g) {
        found = { fontKey: nf.pdfResourceKey, subtype: nf.subtype, glyph: g }
        break
      }
    }
    if (!found) {
      return false // At least one character is not in the subsetted font; caller will fallback cleanly
    }
    resolvedGlyphs.push(found)
  }

  // Build PDF operators to render each character at its exact native advance position
  const ops: PDFOperator[] = [
    PDFOperator.of('q' as any),
    PDFOperator.of('BT' as any),
    PDFOperator.of('rg' as any, [
      PDFNumber.of(colorRgb.r),
      PDFNumber.of(colorRgb.g),
      PDFNumber.of(colorRgb.b),
    ]),
  ]

  let cursorX = x
  for (const item of resolvedGlyphs) {
    const hexStr = item.glyph.code.toString(16).toUpperCase().padStart(item.glyph.hexLen, '0')
    if (item.subtype === '/Type3') {
      // Type3 fonts in Figma use font size 1 in Tf and scale via Tm matrix
      ops.push(
        PDFOperator.of('Tf' as any, [PDFName.of(item.fontKey), PDFNumber.of(1)]),
        PDFOperator.of('Tm' as any, [
          PDFNumber.of(fontSize),
          PDFNumber.of(0),
          PDFNumber.of(0),
          PDFNumber.of(fontSize),
          PDFNumber.of(cursorX),
          PDFNumber.of(baselineY),
        ]),
        PDFOperator.of('Tj' as any, [PDFHexString.of(hexStr)])
      )
    } else {
      ops.push(
        PDFOperator.of('Tf' as any, [PDFName.of(item.fontKey), PDFNumber.of(fontSize)]),
        PDFOperator.of('Tm' as any, [
          PDFNumber.of(1),
          PDFNumber.of(0),
          PDFNumber.of(0),
          PDFNumber.of(1),
          PDFNumber.of(cursorX),
          PDFNumber.of(baselineY),
        ]),
        PDFOperator.of('Tj' as any, [PDFHexString.of(hexStr)])
      )
    }

    cursorX += item.glyph.widthEm * fontSize
  }

  ops.push(PDFOperator.of('ET' as any), PDFOperator.of('Q' as any))
  page.pushOperators(...ops)
  return true
}
