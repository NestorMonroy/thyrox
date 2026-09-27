/**
 * Expande los shims `export * from '@thyrox/…'` con sus nombres de VALOR.
 *
 * Un shim de paquete —un archivo que sólo hace `export * from '@thyrox/x/…'`—
 * que además es entrada del build rompe `bun build` 1.3.11: toda importación
 * con nombre que otra entrada haga a través de él cae con «No matching
 * export», aunque en ejecución resuelva. Reproducido en el banco
 * `broken-imports-*` (sonda mínima y sonda en `repl`). Con los nombres de
 * valor declarados al lado del `*`, construye; los tipos siguen viajando por
 * el `*`, que se conserva.
 *
 * Los nombres salen de `Bun.Transpiler.scan` —valores, sin tipos— siguiendo
 * cada `export * from` (no los `export type * from`) con `Bun.resolveSync`,
 * el mismo resolutor que carga el módulo. `default` no se incluye: `export *`
 * no lo reexporta.
 *
 * Uso:
 *   bun src/verify/expandStarShims.ts <archivo>...          reescribe
 *   bun src/verify/expandStarShims.ts --check <archivo>...  exit 1 si alguno difiere
 *
 * Ciego a: nombres que el destino publica en tiempo de ejecución
 * (`module.exports[x] = …`).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname } from 'node:path'

const MARK = '// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no'
const MARK_TAIL = '// los ve a través de un `export *` externo cuando el shim también es entrada.'
const STAR = /^export\s+\*\s+from\s+['"](@thyrox\/[^'"]+)['"]\s*;?$/
const GENERATED = /^export\s+\{[^}]*\}\s+from\s+['"](@thyrox\/[^'"]+)['"]\s*;?$/

function codeLines(text: string): string[] {
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, '')
  return noBlock
    .split('\n')
    .map(l => l.replace(/^\s*\/\/.*$/, '').trim())
    .filter(l => l !== '')
}

/** El especificador del shim, o null si el archivo no es un shim `export *` de @thyrox. */
export function isStarShim(text: string): string | null {
  const lines = codeLines(text)
  const star = lines[0]?.match(STAR)
  if (!star) return null
  if (lines.length === 1) return star[1] ?? null
  const generated = lines.length === 2 ? lines[1]?.match(GENERATED) : null
  return generated && generated[1] === star[1] ? (star[1] ?? null) : null
}

function transpilerFor(path: string): Bun.Transpiler {
  const ext = extname(path)
  const loader = ext === '.tsx' ? 'tsx' : ext === '.jsx' ? 'jsx' : ext.endsWith('ts') ? 'ts' : 'js'
  return new Bun.Transpiler({ loader })
}

/** Los nombres de valor que `path` exporta, siguiendo `export * from` en cadena. */
export function valueExportNames(path: string, seen: Set<string> = new Set()): Set<string> {
  const names = new Set<string>()
  if (seen.has(path)) return names
  seen.add(path)
  const text = readFileSync(path, 'utf8')
  for (const name of transpilerFor(path).scan(text).exports) if (name !== 'default') names.add(name)
  for (const m of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*export\s+\*\s+from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1]
    if (spec === undefined) continue
    let target: string
    try {
      target = Bun.resolveSync(spec, dirname(path))
    } catch {
      continue
    }
    if (target.includes('/node_modules/') && !target.includes('/node_modules/@thyrox/')) continue
    for (const n of valueExportNames(target, seen)) names.add(n)
  }
  return names
}

function targetOf(shimPath: string, spec: string): string {
  return Bun.resolveSync(spec, dirname(shimPath))
}

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : 1)

/** El texto del shim con su bloque de nombres regenerado; lo demás se conserva. */
export function expandShim(shimPath: string): string {
  const text = readFileSync(shimPath, 'utf8')
  const spec = isStarShim(text)
  if (spec === null) throw new Error(`${shimPath}: no es un shim export * de @thyrox`)
  const names = [...valueExportNames(targetOf(shimPath, spec))].sort(byName)
  const kept = text
    .split('\n')
    .filter(l => l !== MARK && l !== MARK_TAIL && !GENERATED.test(l.trim()))
    .join('\n')
    .replace(/\n+$/, '')
  if (names.length === 0) return `${kept}\n`
  return `${kept}\n${MARK}\n${MARK_TAIL}\nexport { ${names.join(', ')} } from '${spec}'\n`
}

/** Qué le falta y qué le sobra al bloque declarado frente al destino; null si no es shim. */
export function checkShim(shimPath: string): { spec: string; missing: string[]; extra: string[] } | null {
  const text = readFileSync(shimPath, 'utf8')
  const spec = isStarShim(text)
  if (spec === null) return null
  const declared = new Set<string>()
  for (const line of codeLines(text)) {
    const m = line.match(/^export\s+\{([^}]*)\}\s+from/)
    if (m?.[1]) for (const part of m[1].split(',')) if (part.trim()) declared.add(part.trim())
  }
  const actual = valueExportNames(targetOf(shimPath, spec))
  return {
    spec,
    missing: [...actual].filter(n => !declared.has(n)).sort(),
    extra: [...declared].filter(n => !actual.has(n)).sort(),
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const check = argv.includes('--check')
  const files = argv.filter(a => !a.startsWith('--'))
  let drift = 0
  let shims = 0
  for (const file of files) {
    const result = checkShim(file)
    if (result === null) continue
    shims++
    if (check) {
      if (result.missing.length || result.extra.length) {
        drift++
        console.log(`${file}: faltan ${result.missing.length} [${result.missing.slice(0, 5).join(', ')}] · sobran ${result.extra.length} [${result.extra.slice(0, 5).join(', ')}]`)
      }
    } else {
      writeFileSync(file, expandShim(file))
    }
  }
  console.log(`expandStarShims: ${check ? `${drift} shim(s) desalineado(s)` : 'reescritos'} (alcance medido: ${shims} shim(s) de ${files.length} archivo(s))`)
  process.exit(check && drift ? 1 : 0)
}
