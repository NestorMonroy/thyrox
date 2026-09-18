import type { CliHostBindings } from './contracts.js'

let cliHostBindings: CliHostBindings | null = null

export function installCliHostBindings(bindings: CliHostBindings): void {
  cliHostBindings = bindings
}

export function getCliHostBindings(): CliHostBindings {
  if (!cliHostBindings) {
    throw new Error(
      'CLI host bindings have not been installed. Install host bindings before using @thyrox/cli runtime APIs.',
    )
  }
  return cliHostBindings
}

