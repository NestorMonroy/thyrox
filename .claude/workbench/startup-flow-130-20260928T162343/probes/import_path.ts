// El camino de importación más corto desde una entrada hasta el primer módulo que casa el patrón.
// Las claves del metafile son relativas al cwd y las aristas absolutas: las dos se normalizan a absolutas.
import { resolve } from 'node:path'

const [entry, pattern] = [resolve(process.argv[2]!), new RegExp(process.argv[3]!)]
const result = await Bun.build({ entrypoints: [entry], target: 'bun', metafile: true, external: ['*.node'], throw: false })
const inputs = new Map(Object.entries(result.metafile?.inputs ?? {}).map(([key, value]) => [resolve(key), value]))
const parent = new Map<string, string>([[entry, '']])
const queue = [entry]
while (queue.length) {
  const current = queue.shift()!
  if (current !== entry && pattern.test(current)) {
    const chain = [current]
    for (let at = parent.get(current)!; at; at = parent.get(at)!) chain.unshift(at)
    console.log(chain.map(p => p.replace(/^.*\/(packages|node_modules)\//, '$1/')).join('\n  -> '))
    process.exit(0)
  }
  for (const edge of inputs.get(current)?.imports ?? []) {
    const next = resolve(edge.path)
    if (!parent.has(next)) { parent.set(next, current); queue.push(next) }
  }
}
console.log(`no path to ${pattern} among ${inputs.size} inputs`)
