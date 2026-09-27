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
const NAME = /(?<![A-Za-z0-9_])CLAUDE_CODE_([A-Z0-9_]+)/g

function lineRenames(lines: string[]): boolean[] {
  return lines.map((line, i) => !line.includes(KEEP) && !(i > 0 && lines[i - 1]!.includes(KEEP)))
}

/** El texto con cada CLAUDE_CODE_<X> fuera de una línea marcada como THYROX_CODE_<X>. */
export function renameEnvPrefix(text: string): string {
  const lines = text.split('\n')
  const eligible = lineRenames(lines)
  return lines.map((line, i) => (eligible[i] ? line.replace(NAME, 'THYROX_CODE_$1') : line)).join('\n')
}

/** Cuántas apariciones cambiaría `renameEnvPrefix`. */
export function countRenames(text: string): number {
  const lines = text.split('\n')
  const eligible = lineRenames(lines)
  return lines.reduce((n, line, i) => n + (eligible[i] ? (line.match(NAME)?.length ?? 0) : 0), 0)
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
