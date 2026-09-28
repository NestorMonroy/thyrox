// Cuántos módulos quedan cargados tras importar el objetivo, repartidos por paquete.
const target = process.argv[2]!
await import(target)
const loaded = Object.keys(require.cache)
const byPackage = new Map<string, number>()
for (const path of loaded) {
  const match = path.match(/packages\/([^/]+)\//) ?? path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)
  const key = match ? match[1]! : '(other)'
  byPackage.set(key, (byPackage.get(key) ?? 0) + 1)
}
console.log(`${loaded.length} modules\t${target}`)
for (const [name, count] of [...byPackage].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${String(count).padStart(6)}  ${name}`)
process.exit(0)
