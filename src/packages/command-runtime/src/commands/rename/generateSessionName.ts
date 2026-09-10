/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/rename/generateSessionName.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). La fuente son dos líneas: re-exporta TODO de
 * `@claude-code-how-works/permission/commands/rename/generateSessionName.js`,
 * cuyo único símbolo (verificado en la fuente) es `generateSessionName`.
 *
 * Divergencia declarada: ese archivo NO existe en `@thyrox/permission`
 * (paquete fuera del alcance de esta tarea — medido: no hay
 * `commands/rename/` bajo `permission/src`). Se envuelve vía `require()`
 * diferido, igual que el resto de `internal/pendingCrossPackageDeps.ts`:
 * falla al LLAMARSE, no al importar este archivo ni a quien lo consuma.
 */
export function generateSessionName(...args: unknown[]): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: { generateSessionName: (...args: unknown[]) => Promise<string> } =
    require('@thyrox/permission/commands/rename/generateSessionName.js')
  return mod.generateSessionName(...args)
}
