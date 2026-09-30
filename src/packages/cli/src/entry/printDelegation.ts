/**
 * `thyrox -p` como máscara de `claude -p`.
 *
 * Cuando thyrox no tiene credencial propia y hay un `claude` en el PATH, la
 * misma invocación la atiende el cliente, que resuelve su autenticación solo:
 * thyrox no lee ni reenvía ninguna credencial. Medido en
 * `.claude/workbench/claude-p-from-shell-20260928T234121/`.
 *
 * No delega lo que es propio de thyrox: un proveedor distinto de `http`, una
 * grabación, una conexión del store, un store o un prompt de sistema propios.
 * El hijo recibe su propia sesión: un `claude -p` hijo hereda la de quien lo
 * lanza si no se le da otra.
 */
import { randomUUID } from 'node:crypto'
import type { ConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { resolveCredential, type ReadFd } from '@thyrox/provider/credentials'

type Env = Record<string, string | undefined>

export type PrintDelegationDecision =
  | { delegate: true; claudePath: string }
  | { delegate: false; reason: string }

/** Las banderas que sólo tienen sentido en el bucle propio de thyrox. */
const THYROX_ONLY_FLAGS = ['--grabacion', '--connection', '--store', '--system']

function flagValue(argv: string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string
    if (a === name) return argv[i + 1]
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1)
  }
  return undefined
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.some((a) => a === name || a.startsWith(`${name}=`))
}

export function decidePrintDelegation(
  argv: string[],
  env: Env,
  findExecutable: (name: string) => string | null,
  readFd?: ReadFd,
  store?: ConnectionStore,
): PrintDelegationDecision {
  const provider = flagValue(argv, '--provider') ?? 'http'
  if (provider !== 'http') return { delegate: false, reason: `el proveedor ${provider} es de thyrox` }
  const own = THYROX_ONLY_FLAGS.find((flag) => hasFlag(argv, flag))
  if (own) return { delegate: false, reason: `${own} es una bandera de thyrox` }
  if (resolveCredential(env, readFd, store).source !== 'none') return { delegate: false, reason: 'thyrox tiene credencial propia' }
  const claudePath = findExecutable('claude')
  if (!claudePath) return { delegate: false, reason: 'sin credencial propia y sin un claude en el PATH al que delegar' }
  return { delegate: true, claudePath }
}

export function delegatedArgv(argv: string[], newSessionId: () => string = randomUUID): string[] {
  return hasFlag(argv, '--session-id') ? [...argv] : [...argv, '--session-id', newSessionId()]
}

/** Corre `claude` con la línea dada; su salida pasa a la de thyrox y su código se devuelve. */
export async function runDelegatedPrint(claudePath: string, argv: string[], stdin: string | null, env: Env): Promise<number> {
  const child = Bun.spawn([claudePath, ...argv], {
    stdin: stdin === null ? 'inherit' : new TextEncoder().encode(stdin),
    stdout: 'pipe',
    stderr: 'pipe',
    env: env as Record<string, string>,
  })
  const relay = async (stream: ReadableStream<Uint8Array>, write: (s: string) => unknown) => {
    const decoder = new TextDecoder()
    for await (const chunk of stream) write(decoder.decode(chunk, { stream: true }))
  }
  await Promise.all([
    relay(child.stdout, (s) => process.stdout.write(s)),
    relay(child.stderr, (s) => process.stderr.write(s)),
  ])
  return await child.exited
}
