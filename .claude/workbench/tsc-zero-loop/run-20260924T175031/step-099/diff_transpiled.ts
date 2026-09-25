// Diff de la salida de Bun.Transpiler (archivo actual contra HEAD): sólo lo
// que cambia en ejecución, sin anotaciones de tipos.
import { $ } from 'bun'
for (const f of process.argv.slice(2)) {
  const t = new Bun.Transpiler({ loader: f.endsWith('.tsx') ? 'tsx' : 'ts' })
  const now = t.transformSync(await Bun.file(f).text())
  const head = t.transformSync(await $`git show HEAD:${f}`.text())
  await Bun.write('.claude/cache/tr-head.js', head)
  await Bun.write('.claude/cache/tr-now.js', now)
  const out = await $`diff -U1 .claude/cache/tr-head.js .claude/cache/tr-now.js`.nothrow().text()
  console.log(`=== ${f}`)
  console.log(out.split('\n').slice(2).join('\n'))
}
