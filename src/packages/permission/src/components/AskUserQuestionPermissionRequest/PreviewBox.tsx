import React, { Suspense, use, useMemo } from 'react'
import { useSettings } from '@claude-code-how-works/repl/hooks/useSettings.js'
import { useTerminalSize } from '@anthropic/ink'
import { Ansi, Box, Text, stringWidth, useTheme } from '@anthropic/ink'
import {
  type CliHighlight,
  getCliHighlightPromise,
} from '@claude-code-how-works/output/utils/cliHighlight.js'
import { applyMarkdown } from '@claude-code-how-works/output/markdown.js'
import sliceAnsi from '@claude-code-how-works/output/utils/sliceAnsi.js'

type PreviewBoxProps = {
  /** Copia de `ccnmt: packages/permission/src/components/AskUserQuestionPermissionRequest/PreviewBox.tsx`
   * con los comentarios traducidos; el cuerpo es el de la fuente.
   *
   * El contenido de vista previa a mostrar. El markdown se renderiza con
   * resaltado de sintaxis para los bloques de código (```ts, ```py, etc.).
   * También admite texto llano de varias líneas. */
  content: string
  /** Máximo de líneas a mostrar antes de truncar. @default 20 */
  maxLines?: number
  /** Altura mínima, en líneas, de la caja de vista previa. Si el contenido es más corto, se rellena. */
  minHeight?: number
  /** Ancho mínimo de la caja de vista previa. @default 40 */
  minWidth?: number
  /** Ancho máximo disponible para esta caja (el del contenedor, por ejemplo). */
  maxWidth?: number
}

const BOX_CHARS = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  teeLeft: '├',
  teeRight: '┤',
}

/**
 * Una caja monoespaciada con borde para mostrar contenido de vista previa.
 * Trunca con un indicador el contenido que excede `maxLines`. El componente
 * padre debe pasar `maxLines` a partir de su presupuesto de altura
 * disponible.
 */
export function PreviewBox(props: PreviewBoxProps): React.ReactNode {
  const settings = useSettings()
  if (settings.syntaxHighlightingDisabled) {
    return <PreviewBoxBody {...props} highlight={null} />
  }
  return (
    <Suspense fallback={<PreviewBoxBody {...props} highlight={null} />}>
      <PreviewBoxWithHighlight {...props} />
    </Suspense>
  )
}

function PreviewBoxWithHighlight(props: PreviewBoxProps): React.ReactNode {
  const highlight = use(getCliHighlightPromise())
  return <PreviewBoxBody {...props} highlight={highlight} />
}

function PreviewBoxBody({
  content,
  maxLines,
  minHeight,
  minWidth = 40,
  maxWidth,
  highlight,
}: PreviewBoxProps & { highlight: CliHighlight | null }): React.ReactNode {
  const { columns: terminalWidth } = useTerminalSize()
  const [theme] = useTheme()
  const effectiveMaxWidth = maxWidth ?? terminalWidth - 4

  // Usar el `maxLines` que se pase, o un valor por defecto razonable
  const effectiveMaxLines = maxLines ?? 20

  // Renderizar el markdown con resaltado de sintaxis para los bloques de
  // código. `applyMarkdown` devuelve una cadena con estilos ANSI (negrita,
  // colores, etc.) que aquí se parte en líneas. `stringWidth` y `sliceAnsi`,
  // más abajo, tratan bien los códigos ANSI.
  const rendered = useMemo(
    () => applyMarkdown(content, theme, highlight),
    [content, theme, highlight],
  )
  const contentLines = rendered.split('\n')
  const isTruncated = contentLines.length > effectiveMaxLines

  // Truncar a `effectiveMaxLines`
  const truncatedLines = isTruncated
    ? contentLines.slice(0, effectiveMaxLines)
    : contentLines

  // Rellenar el contenido con líneas vacías si es más corto que `minHeight`,
  // pero sin pasar nunca del límite de truncado — si no, el relleno deshace
  // el truncado.
  const effectiveMinHeight = Math.min(minHeight ?? 0, effectiveMaxLines)
  const paddingNeeded = Math.max(
    0,
    effectiveMinHeight - truncatedLines.length - (isTruncated ? 1 : 0),
  )
  const lines =
    paddingNeeded > 0
      ? [...truncatedLines, ...Array<string>(paddingNeeded).fill('')]
      : truncatedLines

  // Calcular el ancho del contenido (el ancho visual máximo de línea, tratando unicode, emoji y CJK)
  const contentWidth = Math.max(
    minWidth,
    ...lines.map(line => stringWidth(line)),
  )
  // Sumar 2 por el relleno del borde, y capar al ancho del contenedor para que no haya salto de línea
  const boxWidth = Math.min(contentWidth + 4, effectiveMaxWidth)
  const innerWidth = boxWidth - 4 // Descontar los bordes y el relleno

  // Renderizar el borde superior
  const topBorder = `${BOX_CHARS.topLeft}${BOX_CHARS.horizontal.repeat(boxWidth - 2)}${BOX_CHARS.topRight}`

  // Renderizar el borde inferior
  const bottomBorder = `${BOX_CHARS.bottomLeft}${BOX_CHARS.horizontal.repeat(boxWidth - 2)}${BOX_CHARS.bottomRight}`

  // Construir la barra separadora del truncado (por ejemplo ├─── ✂ ─── 42 lines hidden ──────┤)
  const truncationBar = isTruncated
    ? (() => {
        const hiddenCount = contentLines.length - effectiveMaxLines
        const label = `${BOX_CHARS.horizontal.repeat(3)} \u2702 ${BOX_CHARS.horizontal.repeat(3)} ${hiddenCount} lines hidden `
        const labelWidth = stringWidth(label)
        const fillWidth = Math.max(0, boxWidth - 2 - labelWidth)
        return `${BOX_CHARS.teeLeft}${label}${BOX_CHARS.horizontal.repeat(fillWidth)}${BOX_CHARS.teeRight}`
      })()
    : null

  return (
    <Box flexDirection="column">
      <Text dimColor>{topBorder}</Text>

      {lines.map((line, index) => {
        // Rellenar o truncar la línea hasta el ancho interior, midiendo por
        // ancho visual para unicode, emoji y CJK. `sliceAnsi` trata bien las
        // secuencias de escape ANSI; `stringWidth` las descarta antes de
        // medir.
        const lineWidth = stringWidth(line)
        const displayLine =
          lineWidth > innerWidth ? sliceAnsi(line, 0, innerWidth) : line
        const padding = ' '.repeat(
          Math.max(0, innerWidth - stringWidth(displayLine)),
        )

        return (
          <Box key={index} flexDirection="row">
            <Text dimColor>{BOX_CHARS.vertical} </Text>
            <Ansi>{displayLine}</Ansi>
            <Text dimColor>
              {padding} {BOX_CHARS.vertical}
            </Text>
          </Box>
        )
      })}

      {truncationBar && <Text color="warning">{truncationBar}</Text>}

      <Text dimColor>{bottomBorder}</Text>
    </Box>
  )
}
