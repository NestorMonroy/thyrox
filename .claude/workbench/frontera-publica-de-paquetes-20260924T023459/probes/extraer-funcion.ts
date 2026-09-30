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
// Resuelve un nombre importado a su chunk de origen (y a su nombre alli).
function origin(name: string): [string, string] | null {
  const re = /import\{([^}]*)\}from"\/\$bunfs\/root\/([^"]+)"/g
  for (let m; (m = re.exec(src)); ) {
    for (const spec of m[1].split(',')) {
      const [a, b] = spec.split(' as ')
      if ((b ?? a) === name) return [m[2], a]
    }
  }
  return null
}
for (const n of names) {
  const esc = n.replace(/\$/g, '\\$')
  const re = new RegExp(`(?:async )?function ${esc}\\(|(?:var|let|const) ${esc}=|[,;]${esc}=`, 'g')
  const m = re.exec(src)
  if (!m) {
    const o = origin(n)
    console.log(o ? `// ${n}: importada de ${o[0]} como ${o[1]}` : `// ${n}: NO DEFINIDA ni importada`)
    continue
  }
  const open = src.indexOf('{', m.index)
  const semi = src.indexOf(';', m.index)
  const end = (m[0].includes('function') || (open !== -1 && open < semi && src.slice(m.index, open).includes('=>'))) ? balanced(open) + 1 : semi
  console.log(`// ${n} @${m.index}\n${src.slice(m.index, end)}\n`)
}
