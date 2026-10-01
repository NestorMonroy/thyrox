/**
 * El único punto por el que la primitiva habla con Podman. Cada módulo del
 * paquete compone argv y lo entrega a un `PodmanExecutor` inyectado, así que
 * sus suites corren con un doble; el ejecutor real de este archivo lanza el
 * binario que `thyrox_toolchain_require_podman` resolvió, o `podman` del PATH.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { closeSync, constants, mkdtempSync, openSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface PodmanCommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** Opciones de una invocación: `stdin` entrega un valor sin ponerlo en argv (p. ej. un secreto). */
export interface PodmanRunOptions {
  readonly stdin?: string
}

export interface PodmanExecutor {
  run(args: readonly string[], options?: PodmanRunOptions): Promise<PodmanCommandResult>
}

/** Variable que el toolchain exporta con la ruta del binario de Podman medido. */
const PODMAN_BIN_ENV = 'THYROX_TOOLCHAIN_PODMAN_BIN'
const DEFAULT_PODMAN_BIN = 'podman'
/** Código con que se reporta un proceso que terminó por señal y no dio código propio. */
const NO_EXIT_CODE = -1

/**
 * El shell intermedio recibe la ruta de la FIFO como primer argumento —nunca
 * el valor—, la abre como fd 0 y reemplaza su proceso por el binario: el hijo
 * hereda un pipe con nombre.
 */
const EXEC_WITH_FIFO_STDIN = 'fifo="$1"; shift; exec "$@" < "$fifo"'
/** Nombre de `$0` del shell intermedio, sólo para sus mensajes de error. */
const FIFO_SHELL_NAME = 'thyrox-stdin'

/**
 * Corre un binario y recoge su salida completa; rechaza sólo si no se pudo
 * lanzar. Sin `stdin` declarado el hijo no recibe entrada.
 *
 * Con `stdin`, el valor llega al hijo por una FIFO en un directorio privado
 * (0700): Podman 4.9.3 rehúsa `-` si su stdin no es un pipe con nombre, y Bun
 * entrega un socket (medido en el banco
 * `podman-resource-materialization-20261001T145908`). El valor pasa por el
 * kernel: nunca por argv, entorno ni disco.
 */
export async function runCommand(bin: string, args: readonly string[], options: PodmanRunOptions = {}): Promise<PodmanCommandResult> {
  if (options.stdin === undefined) return collect(spawn(bin, [...args], { stdio: ['ignore', 'pipe', 'pipe'] }))
  const directory = mkdtempSync(join(tmpdir(), 'thyrox-stdin-'))
  const fifo = join(directory, 'stdin')
  try {
    const made = await collect(spawn('mkfifo', ['-m', '600', fifo], { stdio: ['ignore', 'pipe', 'pipe'] }))
    if (made.exitCode !== 0) throw new Error(`mkfifo ${fifo}: ${made.stderr.trim()}`)
    const child = spawn('sh', ['-c', EXEC_WITH_FIFO_STDIN, FIFO_SHELL_NAME, fifo, bin, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const delivered = writeFile(fifo, options.stdin)
    const result = await collect(child)
    const reader = openFifoReader(fifo)
    await delivered.catch(() => undefined)
    if (reader !== null) closeSync(reader)
    return result
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/**
 * Si el hijo salió sin abrir su stdin, la escritura sigue bloqueada esperando
 * un lector. Un lector sin bloqueo, abierto hasta que la escritura termina, la
 * deja vaciarse en el búfer del pipe y el llamador no queda colgado. Cubre un
 * valor que cabe en el búfer del pipe (64 KiB en Linux), que es el caso de un
 * secreto.
 */
function openFifoReader(fifo: string): number | null {
  try {
    return openSync(fifo, constants.O_RDONLY | constants.O_NONBLOCK)
  } catch {
    return null
  }
}

function collect(child: ChildProcess): Promise<PodmanCommandResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolve({ exitCode: code ?? NO_EXIT_CODE, stdout, stderr }))
  })
}

/** Ejecutor real: el binario del toolchain, o `podman` del PATH. */
export function createPodmanExecutor(): PodmanExecutor {
  return {
    run: (args, options) => runCommand(process.env[PODMAN_BIN_ENV] || DEFAULT_PODMAN_BIN, args, options),
  }
}
