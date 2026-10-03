/**
 * Antes de usar Redis u Ollama, el consumidor no confía en el estado que
 * Podman persistió: pide a `local_control_plane_ready` que deje listo el
 * plano de control local (TASK-THYROX-0727, P0d de TASK-THYROX-0912).
 *
 * Esa entrada compone dos autoridades: `podman_lock_recovery` repara el
 * desfase de locks conocido tras un reinicio, e `infrastructure_ensure`
 * reconcilia lo declarado, lo persistido y lo que corre de verdad (un
 * `running` con el PID muerto es stale y se recrea) y corre el health check.
 * Este módulo es la puerta que obliga a pasar por ella. Si la
 * infraestructura no queda sana, el consumidor rehúsa con la causa en vez de
 * correr sin ella.
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export interface EnsureResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** Reconcilia los contenedores pedidos y devuelve el resultado del ensure. */
export type InfrastructureEnsure = (containers: readonly string[]) => Promise<EnsureResult>

export const REDIS_CONTAINER = 'thyrox-redis'
export const OLLAMA_CONTAINER = 'thyrox-ollama'

export class InfrastructureNotReadyError extends Error {
  constructor(readonly containers: readonly string[], readonly exitCode: number, detail: string) {
    super(`la infraestructura ${containers.join(', ')} no quedó sana tras reconciliar (exit ${exitCode}): ${detail.trim() || 'sin detalle'}`)
    this.name = 'InfrastructureNotReadyError'
  }
}

/**
 * Reconcilia y devuelve si se puede seguir; si no, publica la causa por
 * `reportRefusal`. Para los consumidores que tratan cualquier otro error como
 * propio y no pueden dejar pasar éste.
 */
export async function infrastructureReady(
  containers: readonly string[],
  ensure: InfrastructureEnsure,
  reportRefusal: (message: string) => void,
): Promise<boolean> {
  try {
    await requireInfrastructure(containers, ensure)
    return true
  } catch (error) {
    if (!(error instanceof InfrastructureNotReadyError)) throw error
    reportRefusal(error.message)
    return false
  }
}

/** Reconcilia y exige que los contenedores queden sanos; si no, lanza con la causa. */
export async function requireInfrastructure(containers: readonly string[], ensure: InfrastructureEnsure): Promise<void> {
  const result = await ensure(containers)
  if (result.exitCode !== 0) throw new InfrastructureNotReadyError(containers, result.exitCode, result.stderr)
}

/** La entrada real: `bin/local_control_plane_ready` del árbol de thyrox. */
export function localControlPlaneReadyCommand(thyroxRoot: string): InfrastructureEnsure {
  return containers => new Promise(resolve => {
    const child = spawn('bash', [join(thyroxRoot, 'bin', 'local_control_plane_ready'), ...containers], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', error => resolve({ exitCode: 127, stdout, stderr: `${stderr}${error.message}` }))
    child.on('close', code => resolve({ exitCode: code ?? 1, stdout, stderr }))
  })
}
