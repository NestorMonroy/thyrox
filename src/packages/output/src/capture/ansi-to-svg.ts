/**
 * Puerto de `ccnmt: packages/output/src/capture/ansi-to-svg.ts` (verbatim
 * en logica; solo se tradujeron los comentarios).
 *
 * Convierte texto de terminal con escapes ANSI a formato SVG. Soporta
 * codigos de color ANSI basicos (colores de primer plano).
 */

import { escapeXml } from '../xml.js'

export type AnsiColor = {
  r: number
  g: number
  b: number
}

// Paleta de color de terminal por defecto (similar a la mayoria de terminales)
const ANSI_COLORS: Record<number, AnsiColor> = {
  30: { r: 0, g: 0, b: 0 }, // negro
  31: { r: 205, g: 49, b: 49 }, // rojo
  32: { r: 13, g: 188, b: 121 }, // verde
  33: { r: 229, g: 229, b: 16 }, // amarillo
  34: { r: 36, g: 114, b: 200 }, // azul
  35: { r: 188, g: 63, b: 188 }, // magenta
  36: { r: 17, g: 168, b: 205 }, // cian
  37: { r: 229, g: 229, b: 229 }, // blanco
  // Colores brillantes
  90: { r: 102, g: 102, b: 102 }, // negro brillante (gris)
  91: { r: 241, g: 76, b: 76 }, // rojo brillante
  92: { r: 35, g: 209, b: 139 }, // verde brillante
  93: { r: 245, g: 245, b: 67 }, // amarillo brillante
  94: { r: 59, g: 142, b: 234 }, // azul brillante
  95: { r: 214, g: 112, b: 214 }, // magenta brillante
  96: { r: 41, g: 184, b: 219 }, // cian brillante
  97: { r: 255, g: 255, b: 255 }, // blanco brillante
}

export const DEFAULT_FG: AnsiColor = { r: 229, g: 229, b: 229 } // gris claro
export const DEFAULT_BG: AnsiColor = { r: 30, g: 30, b: 30 } // gris oscuro

export type TextSpan = {
  text: string
  color: AnsiColor
  bold: boolean
}

export type ParsedLine = TextSpan[]

/**
 * Parsea secuencias de escape ANSI de un texto.
 * Soporta:
 * - Colores basicos (30-37, 90-97)
 * - Modo 256 colores (38;5;n)
 * - Color verdadero 24-bit (38;2;r;g;b)
 */
export function parseAnsi(text: string): ParsedLine[] {
  const lines: ParsedLine[] = []
  const rawLines = text.split('\n')

  for (const line of rawLines) {
    const spans: TextSpan[] = []
    let currentColor = DEFAULT_FG
    let bold = false
    let i = 0

    while (i < line.length) {
      // Verifica si hay una secuencia de escape ANSI
      if (line[i] === '\x1b' && line[i + 1] === '[') {
        // Encuentra el final de la secuencia de escape
        let j = i + 2
        while (j < line.length && !/[A-Za-z]/.test(line[j]!)) {
          j++
        }

        if (line[j] === 'm') {
          // Codigo de color/estilo
          const codes = line
            .slice(i + 2, j)
            .split(';')
            .map(Number)

          let k = 0
          while (k < codes.length) {
            const code = codes[k]!
            if (code === 0) {
              // Reset
              currentColor = DEFAULT_FG
              bold = false
            } else if (code === 1) {
              bold = true
            } else if (code >= 30 && code <= 37) {
              currentColor = ANSI_COLORS[code] || DEFAULT_FG
            } else if (code >= 90 && code <= 97) {
              currentColor = ANSI_COLORS[code] || DEFAULT_FG
            } else if (code === 39) {
              currentColor = DEFAULT_FG
            } else if (code === 38) {
              // Color extendido - revisa el siguiente codigo
              if (codes[k + 1] === 5 && codes[k + 2] !== undefined) {
                // Modo 256 colores: 38;5;n
                const colorIndex = codes[k + 2]!
                currentColor = get256Color(colorIndex)
                k += 2
              } else if (
                codes[k + 1] === 2 &&
                codes[k + 2] !== undefined &&
                codes[k + 3] !== undefined &&
                codes[k + 4] !== undefined
              ) {
                // Color verdadero 24-bit: 38;2;r;g;b
                currentColor = {
                  r: codes[k + 2]!,
                  g: codes[k + 3]!,
                  b: codes[k + 4]!,
                }
                k += 4
              }
            }
            k++
          }
        }

        i = j + 1
        continue
      }

      // Caracter normal - encuentra la extension del texto con el mismo estilo
      const textStart = i
      while (i < line.length && line[i] !== '\x1b') {
        i++
      }

      const spanText = line.slice(textStart, i)
      if (spanText) {
        spans.push({ text: spanText, color: currentColor, bold })
      }
    }

    // Agrega un span vacio si la linea esta vacia (para preservar la linea)
    if (spans.length === 0) {
      spans.push({ text: '', color: DEFAULT_FG, bold: false })
    }

    lines.push(spans)
  }

  return lines
}

/**
 * Obtiene un color de la paleta de 256 colores
 */
function get256Color(index: number): AnsiColor {
  // Colores estandar (0-15)
  if (index < 16) {
    const standardColors: AnsiColor[] = [
      { r: 0, g: 0, b: 0 }, // 0 negro
      { r: 128, g: 0, b: 0 }, // 1 rojo
      { r: 0, g: 128, b: 0 }, // 2 verde
      { r: 128, g: 128, b: 0 }, // 3 amarillo
      { r: 0, g: 0, b: 128 }, // 4 azul
      { r: 128, g: 0, b: 128 }, // 5 magenta
      { r: 0, g: 128, b: 128 }, // 6 cian
      { r: 192, g: 192, b: 192 }, // 7 blanco
      { r: 128, g: 128, b: 128 }, // 8 negro brillante
      { r: 255, g: 0, b: 0 }, // 9 rojo brillante
      { r: 0, g: 255, b: 0 }, // 10 verde brillante
      { r: 255, g: 255, b: 0 }, // 11 amarillo brillante
      { r: 0, g: 0, b: 255 }, // 12 azul brillante
      { r: 255, g: 0, b: 255 }, // 13 magenta brillante
      { r: 0, g: 255, b: 255 }, // 14 cian brillante
      { r: 255, g: 255, b: 255 }, // 15 blanco brillante
    ]
    return standardColors[index] || DEFAULT_FG
  }

  // Cubo de 216 colores (16-231)
  if (index < 232) {
    const i = index - 16
    const r = Math.floor(i / 36)
    const g = Math.floor((i % 36) / 6)
    const b = i % 6
    return {
      r: r === 0 ? 0 : 55 + r * 40,
      g: g === 0 ? 0 : 55 + g * 40,
      b: b === 0 ? 0 : 55 + b * 40,
    }
  }

  // Escala de grises (232-255)
  const gray = (index - 232) * 10 + 8
  return { r: gray, g: gray, b: gray }
}

export type AnsiToSvgOptions = {
  fontFamily?: string
  fontSize?: number
  lineHeight?: number
  paddingX?: number
  paddingY?: number
  backgroundColor?: string
  borderRadius?: number
}

/**
 * Convierte texto ANSI a SVG.
 * Usa elementos <tspan> dentro de un solo <text> por linea para que el
 * renderer maneje el espaciado de caracteres de forma nativa (sin calculo
 * manual de charWidth)
 */
export function ansiToSvg(
  ansiText: string,
  options: AnsiToSvgOptions = {},
): string {
  const {
    fontFamily = 'Menlo, Monaco, monospace',
    fontSize = 14,
    lineHeight = 22,
    paddingX = 24,
    paddingY = 24,
    backgroundColor = `rgb(${DEFAULT_BG.r}, ${DEFAULT_BG.g}, ${DEFAULT_BG.b})`,
    borderRadius = 8,
  } = options

  const lines = parseAnsi(ansiText)

  // Recorta las lineas vacias al final
  while (
    lines.length > 0 &&
    lines[lines.length - 1]!.every(span => span.text.trim() === '')
  ) {
    lines.pop()
  }

  // Estima el ancho segun la linea mas larga (solo para las dimensiones del SVG)
  // Para fuentes monospace, el ancho de caracter es aprox. 0.6 * fontSize
  const charWidthEstimate = fontSize * 0.6
  const maxLineLength = Math.max(
    ...lines.map(spans => spans.reduce((acc, s) => acc + s.text.length, 0)),
  )
  const width = Math.ceil(maxLineLength * charWidthEstimate + paddingX * 2)
  const height = lines.length * lineHeight + paddingY * 2

  // Construye el SVG - usa elementos tspan para que el renderer maneje el
  // posicionamiento de caracteres
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`
  svg += `  <rect width="100%" height="100%" fill="${backgroundColor}" rx="${borderRadius}" ry="${borderRadius}"/>\n`
  svg += `  <style>\n`
  svg += `    text { font-family: ${fontFamily}; font-size: ${fontSize}px; white-space: pre; }\n`
  svg += `    .b { font-weight: bold; }\n`
  svg += `  </style>\n`

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const spans = lines[lineIndex]!
    const y =
      paddingY + (lineIndex + 1) * lineHeight - (lineHeight - fontSize) / 2

    // Construye un solo elemento <text> con hijos <tspan> por cada segmento coloreado
    // xml:space="preserve" evita que SVG colapse los espacios en blanco
    svg += `  <text x="${paddingX}" y="${y}" xml:space="preserve">`

    for (const span of spans) {
      if (!span.text) continue

      const colorStr = `rgb(${span.color.r}, ${span.color.g}, ${span.color.b})`
      const boldClass = span.bold ? ' class="b"' : ''

      svg += `<tspan fill="${colorStr}"${boldClass}>${escapeXml(span.text)}</tspan>`
    }

    svg += `</text>\n`
  }

  svg += `</svg>`

  return svg
}
