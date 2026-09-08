/**
 * El banco de trabajo (#80). Extraído de `bin/harness.ts` en #205 sin cambio
 * de conducta.
 */
import { join } from 'node:path'
import { checkWorkbench, scaffoldWorkbench } from '../../../../workbench/manifest.ts'
import { flag, hasFlag } from '../entry/flags.ts'

export function workbenchCommand(argv: string[], cwd: string): number {
  const nuevo = flag(argv, 'workbench-new')
  if (nuevo !== undefined) {
    const dir = scaffoldWorkbench(flag(argv, 'eventos') ?? join(cwd, '.claude', 'eventos'), nuevo)
    process.stdout.write(`${dir}\n`)
    for (const p of checkWorkbench(dir)) {
      process.stderr.write(`  falta ${p.key ?? ''}: ${p.problem}\n`)
    }
    return 0
  }
  const objetivo = flag(argv, 'workbench-check')
  const problemas = checkWorkbench(objetivo!)
  for (const p of problemas) process.stdout.write(`  ${p.problem}\n`)
  process.stdout.write(`workbench-check: ${problemas.length} problema(s) en ${objetivo}\n`)
  return problemas.length > 0 && hasFlag(argv, 'strict') ? 1 : 0
}
