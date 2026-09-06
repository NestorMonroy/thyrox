/**
 * El parseo de argumentos y el resumen de diferencia del CLI de emisión.
 * Separado de `bin/emit.ts` por la misma razón que en el paquete de
 * agentes: que un test pueda ejercitar el parseo sin invocar el binario.
 */

export type EmitPlan = { check: boolean } | { error: string }

export function parseArgs(argv: string[]): EmitPlan {
  const known = new Set(['--check'])
  for (const arg of argv) {
    if (!known.has(arg)) {
      return { error: `argumento desconocido: ${arg}` }
    }
  }
  return { check: argv.includes('--check') }
}

/** Un resumen legible de en qué difieren dos textos — no el diff completo. */
export function diffSummary(expected: string, actual: string): string {
  const expectedLines = expected.split('\n')
  const actualLines = actual.split('\n')
  const max = Math.max(expectedLines.length, actualLines.length)
  for (let i = 0; i < max; i++) {
    const e = expectedLines[i]
    const a = actualLines[i]
    if (e !== a) {
      return (
        `  línea ${i + 1}:\n` +
        `    esperado: ${JSON.stringify(e ?? '<fin de archivo>')}\n` +
        `    en disco: ${JSON.stringify(a ?? '<fin de archivo>')}`
      )
    }
  }
  return '  (los textos son iguales — no debería llegar aquí)'
}
