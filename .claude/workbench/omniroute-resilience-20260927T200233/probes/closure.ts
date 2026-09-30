/**
 * Cierre transitivo de importaciones locales de un módulo de OmniRoute:
 * archivos y líneas que arrastra su porte. Uso: bun run closure.ts <raíz> <módulo>...
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const [root, ...entries] = process.argv.slice(2)
for (const entry of entries) {
  const seen = new Map<string, number>()
  const stack = [resolve(root!, entry)]
  while (stack.length > 0) {
    const file = stack.pop()!
    if (seen.has(file) || !existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    seen.set(file, text.split('\n').length)
    for (const match of text.matchAll(/(?:import|export)[^'"]*?from\s+["'](\.[^"']+)["']/g)) {
      let target = resolve(dirname(file), match[1]!)
      if (!/\.[cm]?[jt]sx?$/.test(target)) target = [`${target}.ts`, join(target, 'index.ts')].find(existsSync) ?? target
      stack.push(target)
    }
  }
  const lines = [...seen.values()].reduce((a, b) => a + b, 0)
  console.log(`${entry}\t${seen.size} archivos\t${lines} líneas`)
  for (const [file, count] of [...seen].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${count}\t${relative(root!, file)}`)
}
