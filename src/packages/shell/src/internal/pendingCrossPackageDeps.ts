/**
 * Sustitutos locales para `@thyrox/shell` — mismo patrón que
 * `@thyrox/config: internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/ide: src/internal/pendingCrossPackageDeps.ts`: un envoltorio
 * de `require()` diferido por símbolo cruzado que la fuente (`ccnmt`)
 * importa y que hoy no tiene contraparte portada.
 *
 * Un `import` estático de un especificador que no resuelve hace fallar
 * la carga del MÓDULO ENTERO, no sólo la función que lo usa. Envolver el
 * `require()` en una función deja que el módulo se cargue igual, y el
 * fallo (si lo hay) queda acotado al call site que de verdad invoca la
 * pieza ausente — no al `import` del archivo completo.
 *
 * BLOQUEADOS — el `require()` lanzará si se invoca:
 *
 * - `getGlobalConfig`/`saveGlobalConfig` — `ccnmt:
 *   packages/config/global/config.ts`. `@thyrox/config` no lo porta
 *   todavía (`managedEnv.ts` de ese mismo paquete ya lo documenta como
 *   pendiente, mismo símbolo, mismo motivo: «no está entre los módulos
 *   portados en ningún pase hasta ahora»). Lo usan
 *   `terminal/iTermBackup.ts` y `terminal/appleTerminalBackup.ts` para
 *   persistir el estado de "backup de preferencias de terminal en
 *   progreso" entre sesiones.
 * - `isInBundledMode` — `ccnmt: packages/config/bundledMode.ts`. No
 *   existe archivo homónimo en `@thyrox/config` (medido: `find . -iname
 *   "*bundledMode*"` no devuelve nada). Lo usa
 *   `sandbox/sandboxRipgrepResolver.ts` para decidir el fallback de
 *   ripgrep vendorizado en modo desarrollo.
 * - `ensureExtractedRipgrepForSandbox` — `ccnmt:
 *   packages/tool-registry/embeddedRgExtractor.ts`. El paquete
 *   `tool-registry` NO EXISTE como miembro de este workspace (el más
 *   cercano, `@thyrox/tools`, tiene otra forma: `agent.ts`,
 *   `agentDefinitions.ts`, `plan.ts`, `registry.ts`, `skill.ts`,
 *   `tasks.ts`, `web.ts` — sin extractor de ripgrep). Lo usa el mismo
 *   `sandbox/sandboxRipgrepResolver.ts` para el camino Linux + binario
 *   standalone.
 * - `isEnvDefinedFalsy` — DISTINTO de los tres anteriores: el archivo
 *   dueño (`@thyrox/config/env/utils.ts`) SÍ existe y SÍ resuelve — sólo
 *   le falta este símbolo puntual (porta `isEnvTruthy`/`readEnv`/
 *   `getAllEnv`, no éste; ver el docstring de ese archivo). El
 *   `require()` no valida el binding con nombre al resolver, así que se
 *   comprueba el tipo explícitamente en vez de confiar en que el `try`
 *   lo habría atrapado — mismo patrón que
 *   `@thyrox/config: managedEnv.ts#requireSettingsConstants`. Lo usa
 *   `providers/shellToolUtils.ts`.
 *
 * @module
 */

export function requireGlobalConfig(): {
  getGlobalConfig: () => {
    iterm2SetupInProgress?: boolean
    iterm2BackupPath?: string
    appleTerminalSetupInProgress?: boolean
    appleTerminalBackupPath?: string
  }
  saveGlobalConfig: (
    updater: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/global/config.js')
}

export function requireConfigBundledMode(): {
  isInBundledMode: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/bundledMode.js')
}

export function requireToolRegistryEmbeddedRgExtractor(): {
  ensureExtractedRipgrepForSandbox: () => string | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/tool-registry/embeddedRgExtractor.js')
}

export function requireConfigEnvUtils(): {
  isEnvDefinedFalsy: (envVar: string | boolean | undefined) => boolean
} {
  const fallback = {
    isEnvDefinedFalsy: () => {
      throw new Error(
        'isEnvDefinedFalsy no está portado aún en @thyrox/config/env/utils.ts',
      )
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: { isEnvDefinedFalsy?: (envVar: string | boolean | undefined) => boolean } =
    require('@thyrox/config/env/utils')
  return typeof mod.isEnvDefinedFalsy === 'function'
    ? { isEnvDefinedFalsy: mod.isEnvDefinedFalsy }
    : fallback
}
