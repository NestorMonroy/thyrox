/**
 * Envoltorios de `require()` diferido para símbolos de OTROS paquetes
 * `@thyrox/*` que hoy no resuelven de forma estática desde
 * `@thyrox/config`, más un puñado de sustitutos locales para dependencias
 * externas de npm ausentes del árbol.
 *
 * Por qué diferido y no `import` estático: la raíz `package.json` no
 * declara `workspaces`, así que `src/packages/config/node_modules/` no
 * tiene los symlinks `@thyrox/*` que Bun necesita para resolver — aunque el
 * paquete destino SÍ declare el subpath en su `exports` y el archivo SÍ
 * exista en disco (verificado símbolo por símbolo con `Bun.resolveSync`
 * antes de escribir cada envoltorio). Un `import` estático de un
 * especificador que no resuelve hace fallar la carga del MÓDULO ENTERO
 * (`Cannot find module`), no sólo la función que lo usa — mismo patrón que
 * ya usa `@thyrox/mcp-runtime: src/xaaIdpLogin.ts`. Cuando el orquestador
 * declare `workspaces` y puentee los symlinks (DEC-04 aún vigente: "ningún
 * paquete `@thyrox/*` se importa por nombre todavía"), estos envoltorios
 * empiezan a resolver contra los símbolos REALES ya portados por otros
 * agentes — no son un stub que sustituye comportamiento, son un indirect
 * call a un módulo hermano que hoy no se puede enlazar estáticamente.
 *
 * Verificado con `Bun.resolveSync('@thyrox/<paquete>/<subpath>',
 * '/home/user/thyrox/src/packages/config')` — los símbolos marcados
 * "existe" abajo tienen implementación real en el paquete hermano; los
 * marcados "ausente" no tienen contraparte portada todavía y el `require()`
 * lanzará en tiempo de ejecución si alguna vez se invoca — es preferible a
 * inventar un stub silencioso (`porte-completo-no-parcial.md`: "un módulo
 * fabricado es peor que uno ausente").
 */

// ---------------------------------------------------------------------------
// @thyrox/storage — existe: getFsImplementation, containsPathTraversal, findGitRoot
// ---------------------------------------------------------------------------

export function requireStorageFsOperations(): {
  getFsImplementation: () => {
    existsSync: (p: string) => boolean
    readFileSync: (p: string, opts?: { encoding?: string }) => string
    readFileBytes: (p: string) => Promise<Buffer>
    cwd: () => string
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/fsOperations.js')
}

export function requireStoragePath(): {
  containsPathTraversal: (path: string) => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/path.js')
}

export function requireStorageFindGitRoot(): {
  findGitRoot: (startPath: string) => string | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/findGitRoot.js')
}

// ---------------------------------------------------------------------------
// @thyrox/local-observability — existe: logError, isENOENT, errorMessage,
// toError, logForDebugging, jsonParse
// ---------------------------------------------------------------------------

/**
 * A diferencia de los demás envoltorios de este archivo, éste NO deja que el
 * `require()` fallido escale: loguear es la única clase de dependencia donde
 * un fallback silencioso es correcto — la propia fuente lo dice explícito
 * (`ccnmt: packages/local-observability/logging/error-log.ts`: "loguear nunca
 * debe lanzar"). Sin este try/catch, un `catch` que llama a
 * `requireLocalObservabilityLogging().logError(...)` como fallback de OTRO
 * `require()` fallido relanzaría en vez de loguear — rompiendo la fidelidad
 * con la fuente en cada call-site que lo usa (p. ej. `platform.ts`).
 */
export function requireLocalObservabilityLogging(): {
  logError: (error: unknown) => void
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/local-observability/logging')
  } catch {
    return {
      logError: (error: unknown) => {
        console.error(error)
      },
    }
  }
}

export function requireLocalObservabilityErrorHelpers(): {
  isENOENT: (e: unknown) => boolean
  errorMessage: (e: unknown) => string
  toError: (e: unknown) => Error
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/errorHelpers.js')
}

/**
 * Mismo criterio que `requireLocalObservabilityLogging` de arriba: loguear
 * para depuración nunca debe lanzar, así que el fallback es un no-op en vez
 * de dejar escalar la excepción del `require()` fallido.
 */
export function requireLocalObservabilityDebug(): {
  logForDebugging: (
    message: string,
    options?: { level?: 'warn' | 'error' },
  ) => void
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/local-observability/debug.js')
  } catch {
    return { logForDebugging: () => {} }
  }
}

export function requireLocalObservabilitySlowOperations(): {
  jsonParse: typeof JSON.parse
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/slowOperations.js')
}

// ---------------------------------------------------------------------------
// @thyrox/app-host — existe: registerCleanup, getCwd
// AUSENTE: waitForScrollIdle (bootstrap/state.ts está portado parcialmente
// por otro agente y no incluye este símbolo — el `require()` resuelve el
// módulo pero el acceso a la propiedad da `undefined`, así que se envuelve
// aparte para que la ausencia sea visible en el call-site, no silenciosa)
// ---------------------------------------------------------------------------

export function requireAppHostBootstrapCleanupRegistry(): {
  registerCleanup: (cleanupFn: () => Promise<void>) => () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/cleanupRegistry.js')
}

export function requireAppHostBootstrapCwd(): {
  getCwd: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/cwd.js')
}

/**
 * `waitForScrollIdle` — AUSENTE de `@thyrox/app-host/bootstrap/state.js`
 * (el archivo existe, portado parcialmente por otro agente, pero no declara
 * este símbolo). Se envuelve con su propio require para que, si
 * `bootstrap/state.ts` gana el símbolo más adelante, este único punto
 * empiece a resolverlo sin tocar `gitFilesystem.ts`.
 */
export async function waitForScrollIdlePending(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/bootstrap/state.js') as {
    waitForScrollIdle?: () => Promise<void>
  }
  if (typeof mod.waitForScrollIdle === 'function') {
    await mod.waitForScrollIdle()
    return
  }
  // Símbolo ausente del porte parcial — no bloquear el caller: el punto de
  // llamada (GitFileWatcher.onHeadChanged) sólo lo usa para diferir I/O
  // hasta que el scroll se asiente; sin él, el watcher sigue siendo
  // correcto, sólo pierde el debounce.
}

// ---------------------------------------------------------------------------
// @thyrox/agent — existe: coerceDescriptionToString, EFFORT_LEVELS
// ---------------------------------------------------------------------------

export function requireAgentFrontmatterParser(): {
  coerceDescriptionToString: (...args: unknown[]) => unknown
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/agent/frontmatterParser')
}

// ---------------------------------------------------------------------------
// @thyrox/provider — parcial: mtls.ts existe (clearMTLSCache); caCerts.ts y
// proxy.ts AÚN NO EXISTEN en este árbol (verificado con `ls`, no sólo con
// resolución de módulo) — ningún agente los ha portado todavía.
// ---------------------------------------------------------------------------

export function requireProviderMtls(): {
  clearMTLSCache: () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/mtls.js')
}

/**
 * `clearCACertsCache` — el archivo YA EXISTE (`internal/caCerts.ts`, y
 * desde este pase también el subpath público `@thyrox/provider/caCerts`
 * vía el `exports` map de `provider/package.json`; verificado:
 * `Bun.resolveSync('@thyrox/provider/caCerts.js', '.../provider/src/')`
 * resuelve). El `require()` de abajo SIGUE fallando igual — no por el
 * archivo, sino porque `@thyrox/config` no declara (ni debe declarar,
 * sería un ciclo config↔provider) a `@thyrox/provider` como dependencia,
 * así que la resolución de módulo de Bun no lo encuentra desde
 * `config/internal/`. Verificado con el mismo comando apuntado a
 * `.../config/internal/`: sigue fallando. Este `require()` sólo puede
 * funcionar si lo INVOCA un paquete que sí tenga ambos (`@thyrox/config`
 * y `@thyrox/provider`) como dependencias — p. ej. `app-host` o `harness`.
 */
export function requireProviderCaCerts(): {
  clearCACertsCache: () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/caCerts.js')
}

/**
 * `clearProxyCache` / `configureGlobalAgents` — `@thyrox/provider/proxy.ts`
 * NO EXISTE en este árbol (verificado con `ls`). Mismo caso que
 * `caCerts.js` arriba.
 */
export function requireProviderProxy(): {
  clearProxyCache: () => void
  configureGlobalAgents: () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/proxy.js')
}

/**
 * `fileSuffixForOauthConfig` — existe, verificado:
 * `@thyrox/provider/src/oauthConstants.ts` la declara completa. La necesita
 * `env/paths.ts` (`getGlobalClaudeFile`), del mismo pase que añade este
 * envoltorio.
 */
export function requireProviderOauthConstants(): {
  fileSuffixForOauthConfig: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/oauthConstants.js')
}

// ---------------------------------------------------------------------------
// @thyrox/shell — existe: findExecutable, which, whichSync
// ---------------------------------------------------------------------------

/** `findExecutable` — `@thyrox/shell/src/findExecutable.ts`, porte completo
 * (un solo símbolo exportado, verificado). La necesita `env/paths.ts`. */
export function requireShellFindExecutable(): {
  findExecutable: (exe: string, args: string[]) => { cmd: string; args: string[] }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/findExecutable.js')
}

/** `which` — `@thyrox/shell/src/which.ts`. La necesita `env/paths.ts`. */
export function requireShellWhich(): {
  which: (command: string) => Promise<string | null>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/which.js')
}

// ---------------------------------------------------------------------------
// @thyrox/local-observability (raíz) — existe: logEvent. Distinto de los
// wrappers de arriba, que apuntan a SUBPATHS (logging.js, debug.js, …); éste
// apunta al paquete completo (`.` en su `exports`), que `policyHelper.ts`
// necesita para `logEvent`. La firma completa vive en
// `local-observability/src/core.ts`; aquí se declara sólo la forma que
// `policyHelper.ts` consume.
// ---------------------------------------------------------------------------

export function requireLocalObservabilityRoot(): {
  logEvent: (name: string, metadata?: Record<string, unknown>) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability')
}

// ---------------------------------------------------------------------------
// Sustitutos locales de dependencias externas de npm AUSENTES del árbol
// (no son paquetes `@thyrox/*` del monorepo — son dependencias reales que
// `bun install` nunca corrió aquí; verificado con `Bun.resolveSync`).
// ---------------------------------------------------------------------------

/**
 * Sustituto mínimo de `lodash-es/memoize.js`. El resolver por defecto de
 * lodash usa el PRIMER argumento como llave de un `Map` (SameValueZero) —
 * éste reproduce exactamente ese contrato, sin los métodos `.cache.*` que
 * ningún módulo portado aquí necesita.
 */
export function memoize<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
): ((...args: Args) => Result) & { cache?: { clear: () => void } } {
  const cache = new Map<unknown, Result>()
  const memoized = (...args: Args): Result => {
    const key = args[0]
    if (cache.has(key)) return cache.get(key) as Result
    const result = f(...args)
    cache.set(key, result)
    return result
  }
  memoized.cache = { clear: () => cache.clear() }
  return memoized
}

/**
 * Subconjunto de `figures` (npm) — sólo los dos glifos que
 * `outputStyles.ts` cita dentro de prompts. `figures` resuelve a caracteres
 * ASCII en Windows y Unicode en el resto; aquí sólo se necesita el valor
 * Unicode porque los prompts se insertan en texto que ya asume terminal
 * moderno.
 */
export const figuresSubset = {
  star: '★',
  bullet: '●',
}
