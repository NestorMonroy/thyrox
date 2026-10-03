/**
 * La orden de `bin/infrastructure-bootstrap`: lee de la entrada el arreglo JSON
 * que imprime `thyrox_infrastructure_desired_resource`, toma el valor de cada
 * secreto del entorno de este proceso y materializa los recursos por la
 * primitiva Podman. Una línea por recurso a stdout; los fallos, sin valores
 * secretos, a stderr. Sale con el código de `bootstrapInfrastructure`.
 */

import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { durableVolumeLedgerPath, fileDurableVolumeLedger } from './durableVolumeLedger.ts'
import type { ResourceMaterializationDeps } from '@thyrox/podman-execution/resourceMaterialization.ts'

import { EXIT_REFUSED, bootstrapInfrastructure, parseInfrastructureDeclarations } from './infrastructureBootstrap.ts'

export type CommandOutput = { stdout(line: string): void; stderr(line: string): void }

export type BootstrapCommandContext = {
  input: string
  environment: Readonly<Record<string, string | undefined>>
  ownerPid: number
  output: CommandOutput
  deps?: ResourceMaterializationDeps
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Las dependencias reales de la primitiva, con el libro de volúmenes durables
 * del hogar de datos: un volumen durable que falta tras haber existido se
 * rehúsa en lugar de crearse vacío (H-THYROX-464).
 */
export function bootstrapDeps(environment: Readonly<Record<string, string | undefined>>): ResourceMaterializationDeps {
  return {
    podman: createPodmanExecutor(),
    isProcessAlive: processAlive,
    sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    durableVolumes: fileDurableVolumeLedger(durableVolumeLedgerPath({ ...environment })),
    now: () => new Date(),
  }
}

export async function runBootstrapCommand(context: BootstrapCommandContext): Promise<number> {
  let declarations
  try {
    declarations = parseInfrastructureDeclarations(context.input)
  } catch (error) {
    context.output.stderr(`infrastructure-bootstrap: la entrada no es un arreglo de declaraciones válido: ${error instanceof Error ? error.message : String(error)}`)
    return EXIT_REFUSED
  }
  const report = await bootstrapInfrastructure(context.deps ?? bootstrapDeps(context.environment), declarations, context.environment, context.ownerPid)
  report.lines.forEach(line => context.output.stdout(line))
  report.problems.forEach(problem => context.output.stderr(`infrastructure-bootstrap: ${problem}`))
  return report.exitCode
}
