/**
 * Doble del laboratorio de cuantización para las pruebas: escribe en el
 * scratch lo que cada herramienta dejaría, incluida la salida que la
 * validación redirige a `validation/` dentro del montaje.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { LabStep } from '../quantizationLab.js'

const REDIRECT_PATTERN = /> (\S+) 2> (\S+)$/

export interface CapturedToolOutput {
  readonly stdout: string
  readonly stderr: string
}

/** Lo que la herramienta envuelta por `sh -c` habría escrito en sus archivos de salida. */
export function writeCapturedOutput(scratchDir: string, step: LabStep, output: CapturedToolOutput): void {
  const match = REDIRECT_PATTERN.exec(step.command[2] ?? '')
  if (match === null) throw new Error(`el paso no redirige su salida al scratch: ${step.command.join(' ')}`)
  for (const [labPath, content] of [[match[1]!, output.stdout], [match[2]!, output.stderr]] as const) {
    const hostPath = join(scratchDir, labPath.replace(/^\/scratch\/?/, ''))
    mkdirSync(dirname(hostPath), { recursive: true })
    writeFileSync(hostPath, content)
  }
}

/** La herramienta que corre un paso, desenvolviendo el `sh -c` de la validación. */
export function toolOf(step: LabStep): string {
  return step.command[0] === 'sh' ? step.command[3]! : step.command[0]!
}
