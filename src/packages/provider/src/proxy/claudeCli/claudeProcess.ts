/**
 * Un proceso `claude -p` lanzado por el upstream: recibe su mensaje de
 * usuario por stdin —una línea `stream-json`, como hace la propia
 * referencia con su hijo (`chunk-n94xvwy3.js`, `ie`)— y entrega su stdout
 * como eventos ya parseados. La forma `command: { executable, prefixArgs }`
 * es la de `selfInvocation` en ese mismo símbolo: permite lanzar el binario
 * real o un doble por intérprete sin que el upstream sepa la diferencia.
 *
 * El stderr se conserva por su cola, que es lo que explica un hijo que
 * muere sin `result`.
 */
import { parseStreamJsonLine, type StreamJsonEvent } from './streamJson.ts'

const STDERR_TAIL_BYTES = 4096

export type CliCommand = { executable: string; prefixArgs?: readonly string[] }

export type CliSpawnOptions = {
  command: CliCommand
  args: readonly string[]
  cwd?: string
  env: Record<string, string | undefined>
  /** La línea `stream-json` con el mensaje de usuario. */
  inputLine: string
}

export type CliProcess = {
  events: AsyncIterable<StreamJsonEvent>
  /** El código de salida, con el stderr ya drenado. */
  exited: Promise<number>
  stderrTail: () => string
  malformedLines: () => number
  kill: () => void
}

export type SpawnCli = (options: CliSpawnOptions) => CliProcess

async function* linesOf(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      yield buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
  }
  if (buffer !== '') yield buffer
}

export function spawnCliProcess(options: CliSpawnOptions): CliProcess {
  const child = Bun.spawn([options.command.executable, ...(options.command.prefixArgs ?? []), ...options.args], {
    cwd: options.cwd,
    env: options.env,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  child.stdin.write(`${options.inputLine}\n`)
  child.stdin.end()

  let stderr = ''
  const stderrDrained = (async () => {
    const decoder = new TextDecoder()
    for await (const chunk of child.stderr) stderr = (stderr + decoder.decode(chunk, { stream: true })).slice(-STDERR_TAIL_BYTES)
  })()

  let malformed = 0
  async function* events(): AsyncGenerator<StreamJsonEvent> {
    for await (const line of linesOf(child.stdout)) {
      const parsed = parseStreamJsonLine(line)
      if (parsed.kind === 'event') yield parsed.event
      if (parsed.kind === 'malformed') malformed += 1
    }
  }

  return {
    events: events(),
    exited: child.exited.then(async code => {
      await stderrDrained
      return code
    }),
    stderrTail: () => stderr.trim(),
    malformedLines: () => malformed,
    kill: () => child.kill(),
  }
}
