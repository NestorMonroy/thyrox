// EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
// no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
// Reutiliza las piezas exportadas de checkEnvPrefix.ts (lectura de entorno por
// lenguaje, clase del nombre, producción vs prueba) e imageLifecycle.ts (clase
// y dueño por etiquetas) sobre la observación ya hecha. No escribe baseline.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { classifyName, extractEnvReads, isProductionPath, isTestPath, languageOf } from '../../../../src/verify/checkEnvPrefix.ts'
import { lifecycleOf, ownerOf } from '../../../../src/packages/image-registry/imageLifecycle.ts'

const [root, out, imagesJson] = process.argv.slice(2) as [string, string, string]
const files = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean)
const reads = new Map<string, { files: Set<string>; cls: string }>()
const testTexts: string[] = []
for (const f of files) {
  const lang = languageOf(f)
  if (!lang) continue
  let text: string
  try { text = readFileSync(join(root, f), 'utf8') } catch { continue }
  if (isTestPath(f)) { testTexts.push(text); continue }
  if (!isProductionPath(f)) continue
  for (const r of extractEnvReads(text, lang)) {
    const e = reads.get(r.name) ?? { files: new Set<string>(), cls: classifyName(r.name) }
    e.files.add(f); reads.set(r.name, e)
  }
}
const rows = [...reads].map(([n, e]) => {
  const tested = testTexts.some(t => t.includes(n))
  const family = n.startsWith('THYROX_') ? n.split('_').slice(0, 2).join('_') : n.split('_')[0]
  return `${n}\t${e.cls}\t${family}\t${e.files.size}\t${tested ? 'tested' : 'untested'}`
}).sort()
writeFileSync(join(out, 'env-reads.tsv'), 'name\tclass\tfamily\tproduction_files\ttest\n' + rows.join('\n') + '\n')
const byClass: Record<string, number> = {}
for (const [, e] of reads) byClass[e.cls] = (byClass[e.cls] ?? 0) + 1

const images = JSON.parse(readFileSync(imagesJson, 'utf8')) as { id: string; tags?: string[]; labels?: Record<string, string> }[]
const imageRows = images.map(i => {
  const labels = i.labels ?? {}
  let lifecycle: string
  try { lifecycle = String(lifecycleOf(labels)) } catch (e) { lifecycle = `refused: ${(e as Error).message.slice(0, 60)}` }
  let owner = ''
  try { owner = JSON.stringify(ownerOf(labels) ?? null) } catch { owner = 'unreadable' }
  return `${i.id.slice(0, 12)}\t${(i.tags ?? []).join(',') || '<untagged>'}\t${lifecycle}\t${owner}\t${labels['thyrox.task'] ?? ''}\t${labels['io.thyrox.image.definition'] ?? ''}`
})
writeFileSync(join(out, 'image-lifecycle.tsv'), 'id\ttags\tlifecycle\towner\ttask\tdefinition\n' + imageRows.join('\n') + '\n')
console.log(JSON.stringify({ envNames: reads.size, byClass, images: images.length }))
