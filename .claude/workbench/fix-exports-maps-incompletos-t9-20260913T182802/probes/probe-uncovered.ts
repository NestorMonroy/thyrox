import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const raiz = '/home/user/thyrox'
const paquetesDir = join(raiz, 'src', 'packages')

function destino(valor: unknown): string | null {
  if (typeof valor === 'string') return valor
  if (valor && typeof valor === 'object') {
    const v = valor as Record<string, unknown>
    for (const k of ['import', 'require', 'default', 'types']) {
      if (typeof v[k] === 'string') return v[k] as string
    }
  }
  return null
}

function sourceModulesOf(pkgDir: string): string[] {
  const srcDir = join(pkgDir, 'src')
  if (!existsSync(srcDir)) return []
  const out: string[] = []
  const recorrer = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry === '__pycache__' || entry === 'node_modules') continue
        recorrer(full)
      } else if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !entry.endsWith('.d.ts')) {
        out.push(full.slice(pkgDir.length + 1))
      }
    }
  }
  recorrer(srcDir)
  return out.sort()
}

function subpathFor(pkgDir: string, moduleRelPath: string): string {
  const sinExt = moduleRelPath.replace(/^src\//, '').replace(/\.tsx?$/, '')
  const base = sinExt.endsWith('/index') ? sinExt.slice(0, -'/index'.length) : null
  const conHermano = base !== null && (
    existsSync(join(pkgDir, 'src', `${base}.ts`)) || existsSync(join(pkgDir, 'src', `${base}.tsx`))
  )
  return './' + (conHermano ? sinExt : sinExt.replace(/\/index$/, ''))
}

function resolveSubpath(exportsMap: Record<string, unknown>, subpath: string): string | null {
  const exacto = destino(exportsMap[subpath])
  if (exacto !== undefined && exacto !== null) return exacto
  let mejorPrefijo = ''
  let mejorDestino: string | null = null
  for (const [clave, valor] of Object.entries(exportsMap)) {
    const estrella = clave.indexOf('*')
    if (estrella === -1) continue
    const prefijo = clave.slice(0, estrella)
    const sufijo = clave.slice(estrella + 1)
    if (!subpath.startsWith(prefijo) || !subpath.endsWith(sufijo)) continue
    if (subpath.length < prefijo.length + sufijo.length) continue
    if (prefijo.length < mejorPrefijo.length) continue
    mejorPrefijo = prefijo
    const comodin = subpath.slice(prefijo.length, subpath.length - sufijo.length)
    const plantilla = destino(valor)
    mejorDestino = plantilla ? plantilla.replace('*', comodin) : null
  }
  return mejorDestino
}

for (const entry of readdirSync(paquetesDir).sort()) {
  const dir = join(paquetesDir, entry)
  if (!statSync(dir).isDirectory()) continue
  const pkgJsonPath = join(dir, 'package.json')
  if (!existsSync(pkgJsonPath)) continue
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
  if (!pkg.exports || !pkg.name) continue
  const sinCubrir = sourceModulesOf(dir).filter(
    m => resolveSubpath(pkg.exports, subpathFor(dir, m)) !== './' + m,
  )
  if (sinCubrir.length > 0) {
    console.log(`\n=== ${pkg.name} (${entry}) ===`)
    for (const m of sinCubrir) {
      console.log(`  ${m}  ->  subpath esperado: ${subpathFor(dir, m)}`)
    }
    console.log(`  exports actuales: ${JSON.stringify(pkg.exports, null, 2).split('\n').join('\n  ')}`)
  }
}
