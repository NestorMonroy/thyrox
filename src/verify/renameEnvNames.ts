/**
 * Renombra una lista explícita de nombres de entorno CLAUDE_<X> a THYROX_<X>.
 *
 * Complementa a `renameEnvPrefix.ts`, que cubre CLAUDE_CODE_*. Para CLAUDE_*
 * sin `CODE_` no se puede renombrar el prefijo entero: también nombra
 * constantes de TypeScript que no son variables de entorno
 * (CLAUDE_OPUS_4_7_CONFIG, CLAUDE_AI_AUTHORIZE_URL). La lista la produce el
 * gate `checkEnvPrefix.ts`, que sólo cuenta lecturas de entorno, y este guion
 * renombra esos nombres en todas sus apariciones y ningún otro. Respeta la
 * marca `thyrox-rename: keep` con la misma regla de alcance (`keepFlags`).
 *
 * Uso:
 *   bun src/verify/renameEnvNames.ts --names <archivo> <archivo>...
 *   bun src/verify/renameEnvNames.ts --names <archivo> --check <archivo>...
 * El archivo de nombres lleva uno por línea.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { keepFlags } from './renameEnvPrefix.ts'

function patternFor(names: ReadonlySet<string>): RegExp {
  for (const name of names) {
    if (!/^CLAUDE_[A-Z0-9_]+$/.test(name)) throw new Error(`no es un nombre CLAUDE_<X>: ${name}`)
  }
  const alternatives = [...names].sort((a, b) => b.length - a.length).join('|')
  return new RegExp(`(?<![A-Za-z0-9_])(?:${alternatives})(?![A-Za-z0-9_])`, 'g')
}

/** El texto con cada nombre de la lista, fuera de una línea marcada, como THYROX_<X>. */
export function renameEnvNames(text: string, names: ReadonlySet<string>): string {
  const pattern = patternFor(names)
  const lines = text.split('\n')
  const kept = keepFlags(lines)
  return lines.map((line, i) => (kept[i] ? line : line.replace(pattern, m => `THYROX_${m.slice('CLAUDE_'.length)}`))).join('\n')
}

/** Cuántas apariciones cambiaría `renameEnvNames`. */
export function countNameRenames(text: string, names: ReadonlySet<string>): number {
  const pattern = patternFor(names)
  const lines = text.split('\n')
  const kept = keepFlags(lines)
  return lines.reduce((n, line, i) => n + (kept[i] ? 0 : (line.match(pattern)?.length ?? 0)), 0)
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const namesAt = argv.indexOf('--names')
  if (namesAt === -1 || !argv[namesAt + 1]) {
    console.error('renameEnvNames: falta --names <archivo>; no se renombra nada.')
    process.exit(2)
  }
  const names = new Set(readFileSync(argv[namesAt + 1]!, 'utf8').split('\n').map(l => l.trim()).filter(Boolean))
  const check = argv.includes('--check')
  const files = argv.filter((a, i) => !a.startsWith('--') && i !== namesAt + 1)
  let pending = 0
  let touched = 0
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const n = countNameRenames(text, names)
    if (n === 0) continue
    touched++
    pending += n
    if (check) console.log(`${file}: ${n}`)
    else writeFileSync(file, renameEnvNames(text, names))
  }
  console.log(`renameEnvNames: ${check ? 'pendientes' : 'renombradas'} ${pending} en ${touched} archivo(s) (alcance medido: ${files.length} archivo(s), ${names.size} nombre(s))`)
  process.exit(check && pending ? 1 : 0)
}
