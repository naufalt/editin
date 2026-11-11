export interface CanvasAnnotation {
  id: string
  pageIndex: number
  type: 'text' | 'image' | 'whiteout' | 'stamp'
  x: number // Relative X in percentage (0 - 100)
  y: number // Relative Y in percentage (0 - 100)
  width?: number
  height?: number
  // Text specifics
  text?: string
  fontSize?: number
  color?: string
  fontFamily?: string
  // Image specifics
  imageDataUrl?: string
}
