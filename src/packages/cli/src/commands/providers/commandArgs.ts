/**
 * La primera palabra suelta de los argumentos de un verbo, saltando los
 * valores de las banderas que llevan uno: en `--name main openai` el
 * posicional es `openai`, no `main`.
 */
export function firstPositional(args: string[], valueFlags: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (!arg.startsWith('--')) return arg
    if (!arg.includes('=') && valueFlags.includes(arg.slice(2))) i++
  }
  return undefined
}
