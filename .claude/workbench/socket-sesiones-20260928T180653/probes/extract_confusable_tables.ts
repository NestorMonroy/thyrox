/**
 * Extrae las tablas N y M de chunk-0grnxhq4.js (2.1.283) a un módulo
 * TypeScript. Los literales son sólo datos (cadenas y mapas); se evalúan
 * aislados para resolver los escapes de JavaScript tal cual los ve el motor.
 */
const source = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-0grnxhq4.js').text()

const nStart = source.indexOf('var N=new Map(') + 'var N='.length
const nEnd = source.indexOf(');', nStart) + 1
const mStart = source.indexOf('var M={') + 'var M='.length
const mEnd = source.indexOf('},eu=', mStart) + 1
const latin = new Function(`return ${source.slice(nStart, nEnd)}`)() as Map<string, string>
const script = new Function(`return ${source.slice(mStart, mEnd)}`)() as Record<string, string>

const ascii = (text: string) => JSON.stringify(text).replace(/[\u007f-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
const lines = [
  '/**',
  ' * Tablas de confundibles de `chunk-0grnxhq4.js` de 2.1.283, generadas por',
  ' * `.claude/workbench/socket-sesiones-20260928T180653/probes/extract_confusable_tables.ts`.',
  ' * `LATIN_CONFUSABLES` es `N`: por cada letra o dígito ASCII, los caracteres',
  ' * que se leen como él. `SCRIPT_LOOKALIKES` es `M`: letras cirílicas y griegas',
  ' * con forma latina. No se editan a mano.',
  ' */',
  'export const LATIN_CONFUSABLES: ReadonlyMap<string, string> = new Map([',
  ...[...latin].map(([key, value]) => `  [${ascii(key)}, ${ascii(value)}],`),
  '])',
  '',
  'export const SCRIPT_LOOKALIKES: Readonly<Record<string, string>> = {',
  ...Object.entries(script).map(([key, value]) => `  ${ascii(key)}: ${ascii(value)},`),
  '}',
]
process.stdout.write(`${lines.join('\n')}\n`)
process.stderr.write(`N=${latin.size} M=${Object.keys(script).length}\n`)
