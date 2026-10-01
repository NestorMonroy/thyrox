/**
 * La orden de `bin/infrastructure-bootstrap`: lee de la entrada el arreglo JSON
 * que imprime `thyrox_infrastructure_desired_resource`, toma el valor de cada
 * secreto del entorno de este proceso y materializa los recursos por la
 * primitiva Podman. Una línea por recurso a stdout; los fallos, sin valores
 * secretos, a stderr. Sale con el código de `bootstrapInfrastructure`.
 */

import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
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

function realDeps(): ResourceMaterializationDeps {
  return {
    podman: createPodmanExecutor(),
    isProcessAlive: processAlive,
    sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
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
  const report = await bootstrapInfrastructure(context.deps ?? realDeps(), declarations, context.environment, context.ownerPid)
  report.lines.forEach(line => context.output.stdout(line))
  report.problems.forEach(problem => context.output.stderr(`infrastructure-bootstrap: ${problem}`))
  return report.exitCode
}
