// Cierre transitivo de un conjunto de funciones del binario: extrae cada
// definicion (siguiendo imports entre chunks) y recorre los identificadores
// que referencia. Publica nombre, chunk, bytes y profundidad en TSV.
// Uso: bun cierre-binario.ts <dir-bunfs> <chunk-inicial> <max-prof> <nombre>...
const [dir, first, maxDepthS, ...roots] = process.argv.slice(2)
const maxDepth = Number(maxDepthS)
const cache = new Map<string, string>()
const text = async (c: string) => cache.get(c) ?? (cache.set(c, await Bun.file(`${dir}/${c}`).text()), cache.get(c)!)
function balanced(src: string, from: number): number {
  let depth = 0
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++ } continue }
    if (c === '{') depth++; else if (c === '}' && --depth === 0) return i
  }
  return src.length
}
async function define(chunk: string, name: string): Promise<[string, string] | null> {
  const src = await text(chunk)
  const esc = name.replace(/\$/g, '\\$')
  const m = new RegExp(`(?:async )?function\\*? ?${esc}\\(|(?<![\\w$.])${esc}=(?!=)`).exec(src)
  if (m && (m[0].includes('function') || /^(var|let|const)|[,;{]/.test(src.slice(m.index - 4, m.index)))) {
    const open = src.indexOf('{', m.index), semi = src.indexOf(';', m.index)
    const isFn = m[0].includes('function') || (open !== -1 && (semi === -1 || open < semi))
    return [chunk, src.slice(m.index, isFn ? balanced(src, open) + 1 : semi)]
  }
  const re = /import\{([^}]*)\}from"\/\$bunfs\/root\/([^"]+)"/g
  for (let im; (im = re.exec(src)); ) for (const spec of im[1].split(',')) {
    const [a, b] = spec.split(' as '); if ((b ?? a) === name && a && im[2]) return define(im[2], a)
  }
  return null
}
const seen = new Map<string, number>(), out: string[] = []
let frontier = roots.map((r) => [first, r] as [string, string])
for (let d = 0; d <= maxDepth && frontier.length; d++) {
  const next: [string, string][] = []
  for (const [chunk, n] of frontier) {
    const key = n; if (seen.has(key)) continue; seen.set(key, d)
    const def = await define(chunk, n); if (!def) continue
    out.push(`${n}\t${def[0]}\t${def[1].length}\t${d}`)
    await Bun.write(`${process.env.OUT_DIR}/${n.replace(/\$/g, '_S_')}.js`, def[1])
    const body = def[1].replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""')
    for (const id of new Set(body.match(/(?<![\w$.])[A-Za-z_$][\w$]{1,4}(?=\()/g) ?? []))
      if (!seen.has(id) && !/^(if|for|new|let|var|of|in|return|typeof|while|switch|catch|function|async|await|Set|Map|Array|Object|String|Number|Boolean|Math|Date|JSON|Error|RegExp|Symbol|Promise)$/.test(id)) next.push([def[0], id])
  }
  frontier = next
}
console.log(out.join('\n'))
