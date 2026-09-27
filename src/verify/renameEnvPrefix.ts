/**
 * Renombra las variables CLAUDE_CODE_* a THYROX_CODE_* en el texto.
 *
 * Directiva del ejecutor 2026-09-27: thyrox es el único cliente, y lo que lee
 * o escribe como su configuración se llama THYROX_CODE_*. Las CLAUDE_CODE_*
 * son del cliente ajeno. Un sitio que trata a propósito su entorno —retirar su
 * credencial del entorno de un ítem, por ejemplo— conserva el nombre con la
 * marca `thyrox-rename: keep` en la misma línea o en la anterior.
 *
 * Idempotente por construcción: el patrón no casa THYROX_CODE_*, así que una
 * segunda pasada no cambia nada (H-THYROX-171 registra lo que costó un
 * renombre global que no lo era).
 *
 * Uso:
 *   bun src/verify/renameEnvPrefix.ts <archivo>...          reescribe
 *   bun src/verify/renameEnvPrefix.ts --check <archivo>...  exit 1 si queda alguno
 */
import { readFileSync, writeFileSync } from 'node:fs'

const KEEP = 'thyrox-rename: keep'
const NAME = /(?<![A-Za-z0-9_])CLAUDE_CODE_([A-Z0-9_]+)(?![A-Za-z0-9_])/g

/**
 * Constantes CLAUDE_CODE_* que NO son variables de entorno: nombran la
 * identidad o el protocolo del cliente ajeno y se conservan. La suite exige
 * que toda constante así declarada en `src/` esté aquí, de modo que una nueva
 * no pueda quedar renombrada en silencio.
 */
export const FOREIGN_CONSTANTS: ReadonlySet<string> = new Set([
  'CLAUDE_CODE_20250219_BETA_HEADER', // valor 'claude-code-20250219' en anthropic-beta
  'CLAUDE_CODE_SETTINGS_SCHEMA_URL', // esquema de los settings del cliente ajeno
  'CLAUDE_CODE_DOCS_MAP_URL', // mapa de su documentación
  'CLAUDE_CODE_GUIDE_AGENT', // agente guía de ese cliente
  'CLAUDE_CODE_GUIDE_AGENT_TYPE', // su tipo, 'claude-code-guide'
])

function renameToken(token: string, rest: string): string {
  return FOREIGN_CONSTANTS.has(token) ? token : `THYROX_CODE_${rest}`
}

/**
 * Qué líneas lleva protegidas la marca keep: la línea que la contiene, y la
 * siguiente sólo cuando la marca va en una línea de comentario propia. Una
 * marca al final de una línea de código protege esa línea y nada más; si no,
 * un elemento de lista marcado protegía también al siguiente.
 */
export function keepFlags(lines: string[]): boolean[] {
  const commentOnly = (line: string) => /^\s*(\/\/|#|\*|\/\*)/.test(line)
  return lines.map(
    (line, i) => line.includes(KEEP) || (i > 0 && lines[i - 1]!.includes(KEEP) && commentOnly(lines[i - 1]!)),
  )
}

function lineRenames(lines: string[]): boolean[] {
  return keepFlags(lines).map(kept => !kept)
}

/** El texto con cada CLAUDE_CODE_<X> fuera de una línea marcada como THYROX_CODE_<X>. */
export function renameEnvPrefix(text: string): string {
  const lines = text.split('\n')
  const eligible = lineRenames(lines)
  return lines.map((line, i) => (eligible[i] ? line.replace(NAME, renameToken) : line)).join('\n')
}

/** Cuántas apariciones cambiaría `renameEnvPrefix`. */
export function countRenames(text: string): number {
  const lines = text.split('\n')
  const eligible = lineRenames(lines)
  return lines.reduce((n, line, i) => n + (eligible[i] ? [...line.matchAll(NAME)].filter(m => !FOREIGN_CONSTANTS.has(m[0])).length : 0), 0)
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const check = argv.includes('--check')
  const files = argv.filter(a => !a.startsWith('--'))
  let pending = 0
  let touched = 0
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const n = countRenames(text)
    if (n === 0) continue
    touched++
    pending += n
    if (check) console.log(`${file}: ${n}`)
    else writeFileSync(file, renameEnvPrefix(text))
  }
  console.log(`renameEnvPrefix: ${check ? 'pendientes' : 'renombradas'} ${pending} en ${touched} archivo(s) (alcance medido: ${files.length} archivo(s))`)
  process.exit(check && pending ? 1 : 0)
}
