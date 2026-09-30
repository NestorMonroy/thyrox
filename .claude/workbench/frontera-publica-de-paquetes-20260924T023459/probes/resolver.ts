// Resuelve cada par (especificador, directorio del importador) con el resolutor
// de Bun y publica el archivo resultante, o ERR. Entrada: TSV por stdin.
const lines = (await Bun.stdin.text()).split('\n').filter(Boolean)
const out: string[] = []
for (const line of lines) {
  const [spec, dir] = line.split('\t')
  let resolved: string
  try {
    resolved = Bun.resolveSync(spec, dir)
  } catch {
    resolved = 'ERR'
  }
  out.push(`${spec}\t${dir}\t${resolved}`)
}
console.log(out.join('\n'))
