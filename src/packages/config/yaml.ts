/**
 * Puerto de `ccnmt: packages/config/yaml.ts` (14 líneas fuente, verbatim).
 * Resuelve `@thyrox/config/yaml`, que dos forward shims ya citaban sin que
 * el archivo existiera: `agent/yaml.ts` y (para `parseYaml` dentro de
 * `frontmatterParser.ts`) este mismo pase. Envoltorio de parseo YAML: usa
 * `Bun.YAML` (nativo, costo cero) bajo Bun; si no, cae al paquete npm
 * `yaml`, cargado con `require()` diferido para que el build nativo de Bun
 * nunca traiga el parser (~270 KB) cuando no hace falta.
 */
export function parseYaml(input: string): unknown {
  if (typeof Bun !== 'undefined') {
    return Bun.YAML.parse(input)
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('yaml') as typeof import('yaml')).parse(input)
}
