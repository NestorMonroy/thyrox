// Compara la salida de Bun.Transpiler del archivo actual y de su versión en HEAD.
import { $ } from 'bun'
const files = (await Bun.file(process.argv[2]!).text()).split('\n').filter(Boolean)
let differ = 0
for (const f of files) {
  const loader = f.endsWith('.tsx') ? 'tsx' : 'ts'
  const t = new Bun.Transpiler({ loader })
  const now = t.transformSync(await Bun.file(f).text())
  const head = t.transformSync(await $`git show HEAD:${f}`.text())
  if (now !== head) { differ++; console.log('DIFIERE', f) }
}
console.log(`${files.length - differ} de ${files.length} idénticos al transpilar`)
