/**
 * El protocolo de sugerencias del harness.
 *
 * Un CLI o un SDK que corra bajo el harness puede emitir a stderr una etiqueta
 * autocerrada `<thyrox-hint />` —que las herramientas de shell fusionan con
 * stdout—. El harness barre la salida de la herramienta buscándola, la RETIRA
 * antes de que llegue al modelo, y le muestra a la persona una propuesta de
 * instalación. Nada se infiere y nada se ejecuta por iniciativa propia.
 *
 * Aquí viven las dos mitades: el parseador y un almacén de módulo con la
 * sugerencia pendiente. El almacén es una sola RANURA, no una cola: se propone
 * como mucho una vez por sesión, así que acumular no compra nada.
 *
 * ADVERTENCIA DE SINGLETON: `pendingHint` y `shownThisSession` son ranuras de
 * proceso. Todo consumidor pasa por este archivo; duplicar el almacén rompe la
 * garantía de «una vez por sesión» sin ningún error visible.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/claudeCodeHints.ts`
 * (195 líneas, 9 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** —mismo
 * nombre de módulo, mismo sitio, mismos nombres y firmas— y no se copia.
 *
 * DIVERGENCIA DECLARADA (una): el literal de la etiqueta. La fuente escribe
 * `<claude-code-how-works-how-works-hint`, que es un artefacto de su propio
 * renombrado —la sustitución `claude-code` → `claude-code-how-works` se aplicó
 * dos veces sobre la misma cadena—. La etiqueta nombra el PROTOCOLO de este
 * harness, no el de aquél, así que aquí es `<thyrox-hint`. Copiar el literal
 * corrupto habría fijado en el contrato con terceros el error de un `sed`.
 */

import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { createSignal } from '@thyrox/config/signal'

export type ClaudeCodeHintType = 'plugin'

export type ClaudeCodeHint = {
  /** La versión del protocolo que declara quien emite. Otra se descarta. */
  v: number
  /** Discriminador. La v1 define sólo `plugin`. */
  type: ClaudeCodeHintType
  /**
   * La carga. Para `type: 'plugin'`: un `nombre@mercado` con la forma que
   * acepta `parsePluginIdentifier`.
   */
  value: string
  /**
   * El primer token del comando que produjo la sugerencia. Se enseña en la
   * propuesta para que quien la lea note si la herramienta que emitió y el
   * plugin que recomienda no casan.
   */
  sourceCommand: string
}

/** Las versiones del protocolo que este harness entiende. */
const SUPPORTED_VERSIONS = new Set([1])

/** Los tipos que entiende en esas versiones. */
const SUPPORTED_TYPES = new Set<string>(['plugin'])

/**
 * La etiqueta exterior, ANCLADA a la línea entera en modo multilínea: una
 * etiqueta enterrada en una línea mayor —un log que la cite, por ejemplo— se
 * ignora. Sin ese anclaje, el registro de otro programa podría proponer una
 * instalación. El blanco de los extremos sí se tolera: hay SDK que rellenan
 * stderr.
 */
const HINT_TAG_RE = /^[ \t]*<thyrox-hint\s+([^>]*?)\s*\/>[ \t]*$/gm

/**
 * Los atributos. Acepta `clave="valor"` y `clave=valor` —esta última termina
 * en un blanco o en el cierre `/>`—. Un valor con blancos o comillas usa la
 * forma entrecomillada, que NO admite secuencias de escape: si hicieran falta,
 * sube la versión del protocolo en vez de estirar esta expresión.
 */
const ATTR_RE = /(\w+)=(?:"([^"]*)"|([^\s/>]+))/g

/**
 * Barre la salida de una herramienta de shell buscando etiquetas, y devuelve
 * las sugerencias con la salida ya SIN ellas. Lo retirado es lo que ve el
 * modelo: la sugerencia es un canal lateral del harness, no contenido.
 *
 * @param output la salida cruda, con stderr entremezclado.
 * @param command el comando que la produjo; su primer token se guarda como
 *   `sourceCommand`.
 */
export function extractClaudeCodeHints(
  output: string,
  command: string,
): { hints: ClaudeCodeHint[]; stripped: string } {
  // Camino rápido: sin la apertura no hay trabajo ni reserva de memoria.
  if (!output.includes('<thyrox-hint')) {
    return { hints: [], stripped: output }
  }

  const sourceCommand = firstCommandToken(command)
  const hints: ClaudeCodeHint[] = []

  const stripped = output.replace(HINT_TAG_RE, rawLine => {
    const attrs = parseAttrs(rawLine)
    const v = Number(attrs.v)
    const type = attrs.type
    const value = attrs.value

    if (!SUPPORTED_VERSIONS.has(v)) {
      logForDebugging(
        `[claudeCodeHints] dropped hint with unsupported v=${attrs.v}`,
      )
      return ''
    }
    if (!type || !SUPPORTED_TYPES.has(type)) {
      logForDebugging(
        `[claudeCodeHints] dropped hint with unsupported type=${type}`,
      )
      return ''
    }
    if (!value) {
      logForDebugging('[claudeCodeHints] dropped hint with empty value')
      return ''
    }

    hints.push({ v, type: type as ClaudeCodeHintType, value, sourceCommand })
    return ''
  })

  // Retirar una línea deja su hueco: los saltos que la rodeaban siguen ahí.
  // Se colapsan para que la salida que ve el modelo no crezca en blanco
  // vertical por cada sugerencia emitida.
  const collapsed =
    hints.length > 0 || stripped !== output
      ? stripped.replace(/\n{3,}/g, '\n\n')
      : stripped

  return { hints, stripped: collapsed }
}

function parseAttrs(tagBody: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of tagBody.matchAll(ATTR_RE)) {
    attrs[m[1]!] = m[2] ?? m[3] ?? ''
  }
  return attrs
}

function firstCommandToken(command: string): string {
  const trimmed = command.trim()
  const spaceIdx = trimmed.search(/\s/)
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
}

// ============================================================================
// El almacén de la sugerencia pendiente (interfaz de `useSyncExternalStore`).
//
// Una sola ranura: la escritura gana si ya había algo, porque un CLI que emita
// en cada invocación acumularía sin fin. El diálogo se muestra como mucho una
// vez por sesión; después, escribir es un no-op.
//
// Quien escriba debe filtrar ANTES —¿ya instalado?, ¿ya se mostró?, ¿se llegó
// al tope?—; ese filtro es de cada tipo de sugerencia. Este módulo se mantiene
// agnóstico para que un tipo futuro reuse el mismo almacén.
// ============================================================================

let pendingHint: ClaudeCodeHint | null = null
let shownThisSession = false
const pendingHintChanged = createSignal()
const notify = pendingHintChanged.emit

/** Escritura cruda. Quien llame filtra antes (ver el comentario de arriba). */
export function setPendingHint(hint: ClaudeCodeHint): void {
  if (shownThisSession) return
  pendingHint = hint
  notify()
}

/**
 * Vacía la ranura SIN levantar la bandera de sesión — para una sugerencia
 * rechazada: un rechazo no consume la única oportunidad que hay.
 */
export function clearPendingHint(): void {
  if (pendingHint !== null) {
    pendingHint = null
    notify()
  }
}

/** Levanta la bandera. Sólo cuando un diálogo se mostró de verdad. */
export function markShownThisSession(): void {
  shownThisSession = true
}

export const subscribeToPendingHint = pendingHintChanged.subscribe

export function getPendingHintSnapshot(): ClaudeCodeHint | null {
  return pendingHint
}

export function hasShownHintThisSession(): boolean {
  return shownThisSession
}

/** Reinicio, sólo para pruebas. */
export function _resetClaudeCodeHintStore(): void {
  pendingHint = null
  shownThisSession = false
}

export const _test = {
  parseAttrs,
  firstCommandToken,
}
