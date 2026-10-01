// Mide qué tipo de descriptor recibe un hijo como stdin según cómo lo lanza Bun.
import { spawn } from 'node:child_process'

const probe = 'if [ -p /dev/stdin ]; then echo fifo; elif [ -S /dev/stdin ]; then echo socket; else echo other; fi'

const viaNode = await new Promise<string>(resolve => {
  const child = spawn('sh', ['-c', probe], { stdio: ['pipe', 'pipe', 'pipe'] })
  let out = ''
  child.stdout?.on('data', chunk => { out += chunk })
  child.stdin?.end('x')
  child.on('close', () => resolve(out.trim()))
})
console.log(`node:child_process stdio pipe -> ${viaNode}`)

const viaBun = Bun.spawn(['sh', '-c', probe], { stdin: new TextEncoder().encode('x'), stdout: 'pipe' })
console.log(`Bun.spawn stdin Uint8Array -> ${(await new Response(viaBun.stdout).text()).trim()}`)

const viaBunPipe = Bun.spawn(['sh', '-c', probe], { stdin: 'pipe', stdout: 'pipe' })
viaBunPipe.stdin.write('x'); viaBunPipe.stdin.end()
console.log(`Bun.spawn stdin 'pipe' -> ${(await new Response(viaBunPipe.stdout).text()).trim()}`)
