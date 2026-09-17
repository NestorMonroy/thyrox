/**
 * Extrae la cadena del medidor de limite de uso de 2.1.274, POR LITERAL.
 *
 * Ningun ancla es un nombre de binding: el payload esta minificado y los
 * renombra entre builds — la tabla de ventanas era `E0e` en 2.1.266 y es
 * `x0` en 2.1.274. Los literales son datos del programa y sobreviven.
 */
import { extractByLiteral, type Declaration } from '../../../src/packages/binary/src/declaration.ts'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BANK = '.claude/workbench/extract-declaration-by-literal-20260917T082400'
const CHUNK = '_references/claude-code-bin/2.1.274/bunfs-root/chunk-ayyj05ne.js'
const src = readFileSync(CHUNK, 'utf8')

/** Ancla -> que se espera recuperar. El ancla es SIEMPRE un literal. */
const ANCHORS: { literal: string; purpose: string }[] = [
  { literal: 'seven_day_overage_included', purpose: 'tabla de ventanas' },
  { literal: 'anthropic-ratelimit-unified-', purpose: 'lectura de las tres cabeceras' },
  { literal: '31536000', purpose: 'predicado de frescura' },
  { literal: 'surpassedThreshold', purpose: 'umbral rebasado' },
  { literal: 'resets_at', purpose: 'reposicion' },
  { literal: 'used_percentage', purpose: 'composicion del payload publicado' },
]

const byRange = new Map<string, Declaration & { anchors: string[] }>()
for (const { literal } of ANCHORS) {
  for (const d of extractByLiteral(src, literal)) {
    const key = `${d.start}:${d.end}`
    const prev = byRange.get(key)
    if (prev) prev.anchors.push(literal)
    else byRange.set(key, { ...d, anchors: [literal] })
  }
}

const found = [...byRange.values()].sort((a, b) => a.start - b.start)
const lines = found.map((d) => JSON.stringify({
  binding: d.binding,
  kind: d.kind,
  start: d.start,
  end: d.end,
  bytes: d.end - d.start,
  anchors: d.anchors,
  text: d.text,
}))
writeFileSync(join(BANK, 'salidas', 'rate-limit-chain-2.1.274.jsonl'), lines.join('\n') + '\n')

for (const { literal, purpose } of ANCHORS) {
  const hits = found.filter((d) => d.anchors.includes(literal))
  console.log(`${literal.padEnd(30)} -> ${String(hits.length).padStart(2)} decl  (${purpose})`)
}
console.log('---')
console.log('declaraciones unicas:', found.length)
console.log('bindings:', found.map((d) => d.binding ?? '(anonimo)').join(' '))
