// Extrae del chunk del binario la definicion de una funcion o var por nombre
// minificado, balanceando llaves y saltando cadenas, plantillas y regex simples.
// Uso: bun extraer-funcion.ts <chunk.js> <nombre>...
const [chunk, ...names] = process.argv.slice(2)
const src = await Bun.file(chunk).text()
function balanced(from: number): number {
  let depth = 0, i = from
  for (; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; else if (q === '`' && src[i] === '$' && src[i+1] === '{') { i = balanced(i+1) } i++ }
      continue
    }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
  }
  return i
}
for (const n of names) {
  const esc = n.replace(/\$/g, '\\$')
  const re = new RegExp(`(?:async )?function ${esc}\\(|(?:var|let|const) ${esc}=|[,;]${esc}=`, 'g')
  const m = re.exec(src)
  if (!m) { console.log(`// ${n}: NO DEFINIDA en el chunk (importada)`); continue }
  const open = src.indexOf('{', m.index)
  const semi = src.indexOf(';', m.index)
  const end = (m[0].includes('function') || (open !== -1 && open < semi && src.slice(m.index, open).includes('=>'))) ? balanced(open) + 1 : semi
  console.log(`// ${n} @${m.index}\n${src.slice(m.index, end)}\n`)
}
