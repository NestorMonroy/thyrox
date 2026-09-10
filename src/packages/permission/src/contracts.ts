/**
 * Porte fiel de `ccnmt: packages/permission/src/contracts.ts` (paquete
 * `permission`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO: el único tipo exportado de la fuente — `PermissionHostBindings`
 * — está presente, con los mismos siete campos opcionales.
 *
 * Esta superficie es deliberadamente más angosta que lo que `filesystem.ts`
 * necesita en la práctica (`getOriginalCwd`, `getSessionId`, `getCwd`,
 * `sanitizePath`, `getPlatform`, …): la propia fuente resuelve ese
 * desacuerdo casteando el getter a `any` en su shim `_b()` — "by-design
 * runtime-binding pattern type-system bypass", cita textual del docstring
 * de `filesystem.ts`. Este puerto reproduce el mismo cast, no amplía el
 * tipo.
 */
export type PermissionHostBindings = {
  logDebug?: (message: string, metadata?: unknown) => void
  now?: () => number
  addPermissionRulesToSettings?: (...args: unknown[]) => boolean
  hasAutoMemPathOverride?: () => boolean
  isAutoMemPath?: (absolutePath: string) => boolean
  isAgentMemoryPath?: (absolutePath: string) => boolean
}
