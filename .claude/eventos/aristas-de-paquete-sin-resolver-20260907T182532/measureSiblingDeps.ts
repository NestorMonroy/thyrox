// Que hermanos importa cada paquete, contra los que declara en `dependencies`.
// Es la precondicion de #239: `bun install` solo crea el enlace de lo
// DECLARADO. Instalar sin declarar borraria los symlinks ad-hoc y dejaria el
// arbol peor que antes — el suite pasa hoy gracias a ellos.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SIBLING = /from\s+['"]@thyrox\/([a-z0-9-]+)/g

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const packages = readdirSync('.').filter((name) => {
  try { return statSync(join(name, 'package.json')).isFile() } catch { return false }
}).sort()

let totalUndeclared = 0
for (const name of packages) {
  const manifest = JSON.parse(readFileSync(join(name, 'package.json'), 'utf8'))
  const declared = new Set(Object.keys(manifest.dependencies ?? {}))
  const imported = new Set<string>()
  for (const file of walk(name)) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(SIBLING)) {
      if (match[1] !== name) imported.add(`@thyrox/${match[1]}`)
    }
  }
  const undeclared = [...imported].filter((dep) => !declared.has(dep)).sort()
  totalUndeclared += undeclared.length
  if (undeclared.length) console.log(`${name}  (declara ${declared.size}, importa ${imported.size})\n   SIN DECLARAR  ${undeclared.join(' ')}`)
}
console.log(`\n${packages.length} paquetes · ${totalUndeclared} dependencias de hermano importadas y no declaradas`)
