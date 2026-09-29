/**
 * Resuelve `redis-server` para las pruebas del adaptador `redis` por el
 * toolchain del proveedor (`thyrox_toolchain_require_redis`), no por el PATH
 * suelto: así rige el mismo opt-in de instalación (`THYROX_INSTALL_REDIS`) y
 * la misma re-comprobación del binario que en cualquier otro consumidor.
 *
 * El shell se lanza con stdin ignorado: en este entorno el stdin heredado es
 * un socket del anfitrión que no se cierra, y cualquier lectura colgaría.
 */
import { join } from 'node:path'

const TOOLCHAIN = join(import.meta.dir, '..', '..', '..', 'lib', 'toolchain.sh')

export function resolveRedisServerFromToolchain(env: Record<string, string | undefined> = process.env): string {
  const result = Bun.spawnSync(
    ['bash', '-c', 'source "$1" && thyrox_toolchain_require_redis && printf %s "$THYROX_TOOLCHAIN_REDIS_BIN"', 'resolve', TOOLCHAIN],
    { env: env as Record<string, string>, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
  )
  const stdout = result.stdout.toString()
  if (result.exitCode !== 0 || stdout === '') {
    throw new Error(
      `thyrox_toolchain_require_redis no resolvió redis-server (exit ${result.exitCode}): ` +
        result.stderr.toString().trim(),
    )
  }
  return stdout
}
