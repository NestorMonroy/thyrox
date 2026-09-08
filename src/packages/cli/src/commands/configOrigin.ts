/**
 * `--config-origin`: de qué fuente salió cada clave de configuración.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta — vivía inline
 * dentro de `main()`, que es donde la cascada de `argv.includes` lo dejaba.
 */
import { loadFrom } from '../entry/settings.ts'

export function configOriginCommand(argv: string[], cwd: string): number {
  const r = loadFrom(argv, cwd)
  for (const e of r.errors) process.stderr.write(`aviso: ${e.path} — ${e.message}\n`)
  for (const [clave, fuente] of Object.entries(r.origin)) {
    process.stdout.write(`${clave}\t${fuente}\n`)
  }
  return 0
}
