/**
 * El único punto por el que la primitiva habla con Podman. Cada módulo del
 * paquete compone argv y lo entrega a un `PodmanExecutor` inyectado, así que
 * sus suites corren con un doble; el ejecutor real de este archivo lanza el
 * binario que `thyrox_toolchain_require_podman` resolvió, o `podman` del PATH.
 */

import { spawn } from 'node:child_process'

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
 * Corre un binario y recoge su salida completa; rechaza sólo si no se pudo
 * lanzar. Sin `stdin` declarado no abre la entrada; con él, la escribe y la
 * cierra, así un valor sensible nunca viaja en argv.
 */
export function runCommand(bin: string, args: readonly string[], options: PodmanRunOptions = {}): Promise<PodmanCommandResult> {
  return new Promise((resolve, reject) => {
    const stdinMode = options.stdin === undefined ? 'ignore' : 'pipe'
    const child = spawn(bin, [...args], { stdio: [stdinMode, 'pipe', 'pipe'] })
    if (options.stdin !== undefined) child.stdin?.end(options.stdin)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
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
