/** Salida de una orden de línea de comandos, inyectable para probarla sin proceso aparte. */

export interface CommandOutput {
  stdout(line: string): void
  stderr(line: string): void
}

export const processOutput: CommandOutput = {
  stdout: line => { process.stdout.write(`${line}\n`) },
  stderr: line => { process.stderr.write(`${line}\n`) },
}

/** Códigos de salida comunes a las órdenes del paquete. */
export const EXIT_OK = 0
export const EXIT_NOT_APPROVED = 1
export const EXIT_REFUSED = 2
