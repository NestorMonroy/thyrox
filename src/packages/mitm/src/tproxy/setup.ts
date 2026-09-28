/**
 * Aplicar y revertir TPROXY de forma transaccional: un apply a medias nunca
 * deja reglas de firewall ni de enrutado atrás. El ejecutor se inyecta, así que
 * la orquestación se prueba sin root; el de verdad usa `execFile` con un
 * arreglo de argumentos, nunca una cadena de shell.
 *
 * Porte de `omniroute: src/mitm/tproxy/setup.ts` (MIT).
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { buildTproxyApplyCommands, buildTproxyRevertCommands, type TproxyConfig, validateTproxyConfig } from './commands.ts'

const execFileAsync = promisify(execFile)

/** Corre un comando. */
export type CommandRunner = (bin: string, args: string[]) => Promise<void>

const defaultRunner: CommandRunner = async (bin, args) => {
  await execFileAsync(bin, args, { env: process.env })
}

/**
 * Activa la intercepción en orden. Si un paso falla, revierte todo lo que
 * pudiera haber quedado y relanza el error original.
 */
export async function applyTproxy(cfg: TproxyConfig, run: CommandRunner = defaultRunner): Promise<void> {
  const invalid = validateTproxyConfig(cfg)
  if (invalid) throw new Error(invalid)
  try {
    for (const cmd of buildTproxyApplyCommands(cfg)) await run(cmd.bin, cmd.args)
  } catch (err) {
    await revertTproxy(cfg, run)
    throw err instanceof Error ? err : new Error(String(err))
  }
}

/**
 * Desactiva la intercepción. Idempotente: cada paso puede fallar porque su
 * regla no está (un apply parcial, una caída previa), y ese fallo se traga
 * para que la limpieza llegue siempre al final. `repairMitm` puede llamarla
 * sin condiciones.
 */
export async function revertTproxy(cfg: TproxyConfig, run: CommandRunner = defaultRunner): Promise<void> {
  for (const cmd of buildTproxyRevertCommands(cfg)) {
    try {
      await run(cmd.bin, cmd.args)
    } catch {
      // La regla, la ruta o la entrada de regla ya no estaban.
    }
  }
}
