// Revisión de conducta de lo aceptado: compara la salida de Bun.Transpiler
// del archivo contra HEAD y lista las LLAMADAS que desaparecen. Retirar un
// local "sin leer" cuyo inicializador llama algo borra un efecto (el paso
// 099 lo vio: installPluginBindings quitaba opciones de mkdirSync).
// Uso: bun removed_calls.ts <lista-de-archivos>
import { $ } from 'bun'
const files = (await Bun.file(process.argv[2]!).text()).split('\n').filter(Boolean)
const CALL = /([A-Za-z_$][\w$.]*)\s*\(/g
let flagged = 0
for (const f of files) {
  const t = new Bun.Transpiler({ loader: f.endsWith('.tsx') ? 'tsx' : 'ts' })
  const now = t.transformSync(await Bun.file(f).text())
  const head = t.transformSync(await $`git show HEAD:${f}`.text())
  const count = (s: string) => {
    const m = new Map<string, number>()
    for (const [, name] of s.matchAll(CALL)) m.set(name!, (m.get(name!) ?? 0) + 1)
    return m
  }
  const before = count(head), after = count(now)
  const lost = [...before].filter(([n, c]) => (after.get(n) ?? 0) < c).map(([n, c]) => `${n}×${c - (after.get(n) ?? 0)}`)
  const same = now === head
  if (lost.length) { flagged++; console.log(`LLAMADAS PERDIDAS ${f}: ${lost.join(', ')}`) }
  else console.log(`${same ? 'idéntico' : 'sin llamadas perdidas'} ${f}`)
}
console.log(`${flagged} de ${files.length} archivos pierden llamadas al transpilar`)
