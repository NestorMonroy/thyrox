/**
 * Porte PARCIAL de `ccnmt: packages/command-runtime/src/commands/fork/fork.tsx`.
 *
 * La fuente exporta 1 funcion (`deriveForkSlug`) + 1 componente de comando
 * (`call: LocalJSXCommandCall`, el cuerpo que arma y despacha el subagente
 * fork). Este porte trae solo `deriveForkSlug` — 1 de 2 simbolos.
 *
 * `call` NO se porta: depende de `runAgent` y `ToolUseContext` de
 * `@claude-code-how-works/tool-registry`, de JSX (el archivo es `.tsx`), y de
 * `buildEffectiveSystemPrompt` — ninguno existe en este arbol. `deriveForkSlug`
 * es la unica pieza autocontenida (sin imports) y es exactamente la que
 * `forkSlug.test.ts` ejercita.
 */

export function deriveForkSlug(directive: string): string {
  return (
    directive
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'fork'
  )
}
