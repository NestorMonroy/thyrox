/** Lo que comparten las órdenes que corren el laboratorio de modelos: su imagen y la forma de sus opciones. */

export const LAB_IMAGE_ENV = 'THYROX_QUANTIZER_IMAGE'
export const DEFAULT_LAB_IMAGE = 'localhost/thyrox-model-quantizer:dev'
export const EXIT_LEASE_BUSY = 4

/** `--clave valor` repetido; una clave sin valor o un argumento suelto no son una orden válida. */
export function optionsOf(argv: readonly string[]): Record<string, string> | undefined {
  const options: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index]!, argv[index + 1]]
    if (!flag.startsWith('--') || value === undefined) return undefined
    options[flag.slice(2)] = value
  }
  return options
}
