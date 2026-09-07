/**
 * Sustitutos locales para `@thyrox/command-runtime`, en dos familias — el
 * mismo patrón que `@thyrox/ide: src/internal/pendingCrossPackageDeps.ts`
 * y `@thyrox/provider: src/internal/pendingCrossPackageDeps.ts`:
 *
 * 1. **Envoltorios de `require()` diferido** hacia paquetes hermanos que YA
 *    existen en este árbol (`app-host`, `local-observability`, `permission`,
 *    `config`, `shell`, `storage`) pero no resuelven de forma estática desde
 *    aquí: `@thyrox/command-runtime` **no tiene** ningún
 *    `node_modules/@thyrox/*` symlink todavía (verificado en vivo — su
 *    `package.json` ni siquiera declara `dependencies`), así que un
 *    `import` estático de cualquier especificador `@thyrox/*` hace fallar
 *    la carga del MÓDULO ENTERO, no sólo la función que lo usa. Cuando el
 *    orquestador declare las dependencias en `package.json` y corra
 *    `bun install`, estos envoltorios empiezan a resolver contra los
 *    símbolos reales — no son un stub que sustituye comportamiento, son un
 *    indirect call a un módulo hermano que hoy no se puede enlazar
 *    estáticamente.
 *
 * 2. **Tipos locales mínimos**, documentados como marcador de posición,
 *    para dos casos que NO se resuelven importando el tipo real:
 *
 *    - `ToolUseContext` (real: `@claude-code-how-works/tool-registry/Tool.js`)
 *      y el `Command` de `@claude-code-how-works/agent/command.js`: aunque
 *      un `import type` se borra en tiempo de ejecución (verificado con
 *      Bun — un `import type` de un especificador irresoluble no falla al
 *      correr), `tool-registry` y `agent` los está portando OTRO agente EN
 *      PARALELO en esta misma sesión — acoplar un tipo a un archivo que
 *      puede reestructurarse a mitad de esta sesión es frágil sin
 *      necesidad. Se usa `../types.js:Command` (ya portado, mismo
 *      propósito) y un `ToolUseContext` recortado aquí.
 *    - `HooksSettings`: la fuente la importa de
 *      `@claude-code-how-works/config/types`; en este árbol no existe bajo
 *      ese nombre exacto (`@thyrox/config` declara `HookCommand`,
 *      `BashCommandHook`, … en `settings/schemas/hooks.ts`, forma distinta).
 *      Se recorta aquí un alias mínimo — el campo que la usa
 *      (`BundledSkillDefinition.hooks`) no tiene lógica que dependa de su
 *      forma exacta en este pase.
 */

import type { Command } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// 1. Envoltorios de require() diferido — el paquete hermano YA existe
// ─────────────────────────────────────────────────────────────────────────

/** `getCwd` — `@thyrox/app-host/bootstrap/cwd.js` (ya portado). */
export function requireAppHostCwd(): { getCwd: () => string } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/cwd.js')
}

/**
 * Instalador de bindings de host para el runtime de comandos —
 * `@thyrox/app-host/runtime/installCommandRuntimeBindings.js` (ya portado
 * en `app-host`, aunque ese archivo a su vez cita `./commandRegistryRuntime.js`
 * como colgante — fuera del alcance de este pase). Se invoca por su efecto
 * secundario (instala el binding), sin valor de retorno.
 */
export function requireAppHostInstallCommandRuntimeBindings(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@thyrox/app-host/runtime/installCommandRuntimeBindings.js')
}

/** `logForDebugging` — `@thyrox/local-observability/debug.js` (ya portado). */
export function requireLocalObservabilityDebug(): {
  logForDebugging: (message: string) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/debug.js')
}

/** `logError` — `@thyrox/local-observability/logging/error-log.js` (ya portado). */
export function requireLocalObservabilityLogging(): {
  logError: (error: unknown) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/logging/error-log.js')
}

/**
 * `getBundledSkillsRoot` — `@thyrox/permission/filesystem.js`. NO existe
 * todavía en `@thyrox/permission` (porte parcial declarado de ese paquete:
 * omitida explícitamente, "sin consumidor confirmado" — ver el docstring
 * de `permission/src/filesystem.ts`). `permission` está fuera del alcance
 * de esta tarea (sólo `command-runtime` y `provider`), así que este
 * envoltorio queda apuntando a un símbolo ausente: falla al LLAMARSE, no
 * al importarse, y empezará a resolver el día que `permission` lo porte.
 */
export function requirePermissionFilesystem(): {
  getBundledSkillsRoot: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/permission/filesystem.js')
}

/** `execFileNoThrowWithCwd` — `@thyrox/shell/execFileNoThrow.js` (ya portado). */
export function requireShellExecFileNoThrow(): {
  execFileNoThrowWithCwd: (
    cmd: string,
    args: string[],
    opts: { cwd: string },
  ) => Promise<{ stdout: string; stderr: string; code: number }>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/execFileNoThrow.js')
}

/**
 * `getIsGit`/`gitExe` — `@thyrox/storage/git.js`. Hoy ese archivo sólo
 * porta `normalizeGitRemoteUrl` (porte parcial declarado del paquete
 * `storage`, fuera del alcance de esta tarea); `getIsGit`/`gitExe` quedan
 * ausentes ahí. Mismo caso que `requirePermissionFilesystem`: el
 * envoltorio resuelve el módulo (existe) pero el símbolo puede faltar
 * hasta que `storage` lo porte — eso se descubre al LLAMARLO, no al
 * importar este archivo ni al importar quien lo consuma.
 */
export function requireStorageGit(): {
  getIsGit: () => Promise<boolean>
  gitExe: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/git.js')
}

/**
 * `getCurrentProjectConfig`/`saveCurrentProjectConfig` — `@thyrox/config`
 * (raíz del paquete, `index.ts`). Ver el mismo patrón: el paquete existe,
 * el símbolo puede no estar portado todavía.
 */
export function requireConfigProjectConfig(): {
  getCurrentProjectConfig: () => {
    exampleFiles?: string[]
    exampleFilesGeneratedAt?: number
  }
  saveCurrentProjectConfig: (
    updater: (current: {
      exampleFiles?: string[]
      exampleFilesGeneratedAt?: number
    }) => {
      exampleFiles?: string[]
      exampleFilesGeneratedAt?: number
    },
  ) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}

/** `env` (con `.platform`) — `@thyrox/config/env/index.js`. */
export function requireConfigEnv(): { env: { platform: string } } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/env/index.js')
}

/** `isEnvTruthy`/`readEnv` — `@thyrox/config/env/utils.js` (ya portado). */
export function requireConfigEnvUtils(): {
  isEnvTruthy: (envVar: string | boolean | undefined) => boolean
  readEnv: (name: string) => string | undefined
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/env/utils.js')
}

/**
 * `isVoiceGrowthBookEnabled`/`isVoiceModeEnabled` —
 * `@thyrox/voice/voiceModeEnabled.js` (ya portado).
 */
export function requireVoiceModeEnabled(): {
  isVoiceGrowthBookEnabled: () => boolean
  isVoiceModeEnabled: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/voice/voiceModeEnabled.js')
}

/**
 * `isWorkflowsEnabled` — `@thyrox/agent/goalStopHook.js`. `agent` es uno de
 * los dos paquetes que esta tarea PROHÍBE tocar o esperar (lo está portando
 * otro agente ahora mismo). No se importa estático ni se espera: se
 * envuelve igual que el resto de esta lista — el símbolo YA existe hoy en
 * ese archivo (verificado con grep), así que resuelve en cuanto
 * `command-runtime` declare la dependencia y corra `bun install`.
 */
export function requireAgentGoalStopHook(): {
  isWorkflowsEnabled: () => boolean
  isGoalCommandEnabled: () => boolean
  GOAL_CONDITION_MAX_LENGTH: number
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/agent/goalStopHook.js')
}

/**
 * `generateAwaySummary` — `@thyrox/agent/awaySummary.js`. NO existe
 * todavía en `@thyrox/agent` (medido: `find agent -iname "awaySummary*"`
 * sin resultados) — falla al LLAMARSE, no al importar, mismo criterio que
 * el resto de esta lista.
 */
export function requireAgentAwaySummary(): {
  generateAwaySummary: (
    messages: unknown[],
    signal: AbortSignal,
  ) => Promise<string | null>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/agent/awaySummary.js')
}

/** `getFeatureValue_CACHED_MAY_BE_STALE` — `@thyrox/config/feature-flags.js` (ya portado). */
export function requireConfigFeatureFlags(): {
  getFeatureValue_CACHED_MAY_BE_STALE: <T>(flag: string, fallback?: T) => T | boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/feature-flags.js')
}

/**
 * `getIsNonInteractiveSession`/`getIsRemoteMode` —
 * `@thyrox/app-host/bootstrap/state.js`. Medido: ninguno de los dos está
 * exportado hoy por ese archivo (grep sin resultados), aunque
 * `app-host/src/init.ts` ya los importa desde ahí — discrepancia propia
 * de `app-host` (fuera del alcance de esta tarea, en construcción
 * concurrente). Falla al llamarse, no al importar.
 */
export function requireAppHostBootstrapSessionMode(): {
  getIsNonInteractiveSession: () => boolean
  getIsRemoteMode: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/state.js')
}

/** `isClaudeAISubscriber` — `@thyrox/provider/authAlias.js` (ya portado). */
export function requireProviderAuthAlias(): {
  isClaudeAISubscriber: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/authAlias.js')
}

/** `formatTotalCost` — `@thyrox/provider/costTracker.js` (ya portado). */
export function requireProviderCostTracker(): {
  formatTotalCost: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/costTracker.js')
}

/**
 * `currentLimits` — `@thyrox/provider/claudeAiLimits.js`. NO existe
 * todavía en `@thyrox/provider` a la fecha de este pase (514 líneas en la
 * fuente, fuera del recorte de este pase). Igual que
 * `requirePermissionFilesystem`: falla al LLAMARSE, no al importar.
 */
export function requireProviderClaudeAiLimits(): {
  currentLimits: { isUsingOverage: boolean }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/claudeAiLimits.js')
}

/**
 * `getGitEmail` — `@thyrox/provider/user.js`. `provider` es el OTRO
 * paquete de esta misma tarea: si `user.ts` ya se portó ahí para cuando
 * este envoltorio se llame, resuelve real; si no, falla al llamarse con
 * el mismo mensaje "Cannot find module" que los demás de este archivo.
 */
export function requireProviderUser(): {
  getGitEmail: () => Promise<string | null>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/user.js')
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Tipos locales mínimos — marcador de posición, ver docstring de arriba
// ─────────────────────────────────────────────────────────────────────────

/**
 * Recorte de `ToolUseContext` (real: `tool-registry/Tool.js`, paquete
 * ajeno en construcción concurrente). Sólo el campo que
 * `skills/bundledSkills.ts` necesita para tipar su firma —
 * `getPromptForCommand` nunca lee nada de este objeto en el cuerpo del
 * archivo, sólo lo reenvía.
 */
export type PendingToolUseContext = Record<string, unknown>

/**
 * Recorte de `HooksSettings` (real: `config/types`, forma no portada bajo
 * ese nombre). `BundledSkillDefinition.hooks` no tiene lógica que dependa
 * de su forma exacta en este pase — se guarda y se reenvía tal cual.
 */
export type PendingHooksSettings = Record<string, unknown>

/** Re-exporta el `Command` propio para los consumidores de este archivo. */
export type { Command as PendingAgentCommand }
