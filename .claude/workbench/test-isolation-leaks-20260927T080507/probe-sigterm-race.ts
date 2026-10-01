// Sonda: mata el lanzador en cuanto imprime su URL y cuenta cómo sale.
const BIN = new URL('../../../src/packages/provider/bin/anthropicMockServer.ts', import.meta.url).pathname
const tries = Number(process.argv[2] ?? 10)
const codes: Record<string, number> = {}
for (let i = 0; i < tries; i++) {
  const proc = Bun.spawn(['bun', 'run', BIN], { stdout: 'pipe', stderr: 'pipe' })
  const reader = proc.stdout.getReader()
  let first = ''
  while (!first.includes('\n')) {
    const { value, done } = await reader.read()
    if (done) break
    first += new TextDecoder().decode(value)
  }
  proc.kill('SIGTERM')
  const code = String(await proc.exited)
  codes[code] = (codes[code] ?? 0) + 1
}
console.log(JSON.stringify(codes))
