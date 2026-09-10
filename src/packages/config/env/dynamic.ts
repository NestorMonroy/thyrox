/**
 * Puerto de `ccnmt: packages/config/env/dynamic.ts` (152 líneas fuente).
 * Funciones de entorno que dependen de `execFileNoThrow` y por eso no
 * pueden vivir en `env/utils.ts` — detección de Docker, sandbox
 * bubblewrap, libc musl, y JetBrains IDE por proceso ancestro.
 * Reimplementación fiel.
 *
 * `feature` de `bun:bundle` — NO RESUELVE en este árbol (verificado con
 * `Bun.resolveSync`: `Cannot find package 'bun:bundle'`). Es un módulo
 * virtual que sólo existe dentro de un build `ant`; mismo precedente que
 * `@thyrox/storage: src/fsOperations.ts` y
 * `@thyrox/local-observability: src/logging/error-log.ts` — la puerta se
 * OMITE en vez de mantener un stub, porque fuera de un build ant
 * `feature(...)` siempre resuelve `false`. Con las dos llamadas a
 * `feature()` fuera, `isMuslEnvironment()` cae siempre al fallback runtime
 * (`muslRuntimeCache`), que es exactamente lo que pasaría en un Bun/Node
 * sin bundlear — no es una divergencia de comportamiento, es la misma rama
 * que la fuente ya toma fuera de un build nativo.
 *
 * `execFileNoThrow` — repuntado vía `require()` diferido
 * (`../internal/pendingCrossPackageDeps.ts`): existe en
 * `@thyrox/shell/execFileNoThrow.js`, sólo falta el symlink de workspace.
 *
 * `getAncestorCommandsAsync` — `@thyrox/shell/genericProcessUtils.js` NO
 * EXISTE en este árbol (verificado con `ls` sobre `src/packages/shell/`);
 * nadie lo ha portado todavía. Se envuelve con `require()` diferido igual
 * que los demás — lanzará en tiempo de ejecución si se invoca. El único
 * llamador es `detectJetBrainsIDEFromParentProcessAsync`, que ya tiene su
 * propio `try/catch` silencioso ("best-effort detection"), así que el fallo
 * no se propaga: `getTerminalWithJetBrainsDetectionAsync` cae a
 * `'pycharm'`.
 *
 * `env`, `JETBRAINS_IDES` de `./paths.js` — `env/paths.ts` NO es uno de los
 * 15 módulos del alcance, y medido (`grep -nE "^import"`) tiene su propia
 * red de dependencias: `lodash-es/memoize`, más CINCO paquetes cruzados
 * (`config/bundledMode`, `provider/oauthConstants`,
 * `shell/findExecutable.js`, `shell/which.js`, `storage/fsOperations.js`).
 * No es una hoja — se bloquea con `require()` diferido en vez de portarse
 * en el sitio, siguiendo el mismo criterio hoja-vs-red que ya decidió
 * `internal/lazySchema.ts` y `git/gitConfigParser.ts` SÍ portarse (sin
 * dependencias propias) y `env/paths.ts` NO.
 */

import { stat } from 'fs/promises'
import { memoize } from '../internal/pendingCrossPackageDeps.js'
import { isEnvTruthy } from './utils.js'

/**
 * `require()` diferido de `./paths.js` — NO EXISTE en este porte
 * (`env/paths.ts` está fuera del alcance de los 15 módulos, ver docstring
 * del archivo). Lanzará si se invoca; los tres call-sites de este archivo
 * que lo usan (`getTerminalWithJetBrainsDetectionAsync`,
 * `getTerminalWithJetBrainsDetection`, `envDynamic`) quedan documentados
 * como bloqueados en sus propios comentarios.
 */
function requireConfigEnvPaths(): {
  env: { platform: 'win32' | 'darwin' | 'linux'; terminal: string | null }
  JETBRAINS_IDES: string[]
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./paths.js')
}

function requireShellExecFileNoThrow(): {
  execFileNoThrow: (
    cmd: string,
    args: string[],
  ) => Promise<{ code: number; stdout: string; stderr: string }>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/execFileNoThrow.js')
}

/**
 * `getAncestorCommandsAsync` — AUSENTE de `@thyrox/shell` (ver docstring del
 * módulo). Se envuelve aparte para que la ausencia sea visible en el
 * call-site.
 */
function requireShellGenericProcessUtils(): {
  getAncestorCommandsAsync: (
    pid: number,
    maxDepth: number,
  ) => Promise<string[]>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/genericProcessUtils.js')
}

// Funciones que requieren execFileNoThrow y por eso no pueden vivir en env.ts

const getIsDocker = memoize(async (): Promise<boolean> => {
  if (process.platform !== 'linux') return false
  // Comprueba la existencia de .dockerenv.
  const { code } = await requireShellExecFileNoThrow().execFileNoThrow(
    'test',
    ['-f', '/.dockerenv'],
  )
  return code === 0
})

function getIsBubblewrapSandbox(): boolean {
  return (
    process.platform === 'linux' &&
    isEnvTruthy(process.env.CLAUDE_CODE_BUBBLEWRAP)
  )
}

// Caché para el fallback runtime de detección de musl (sólo node/sin
// bundlear). En builds nativas de linux, los feature flags resuelven esto
// en tiempo de compilación; aquí SIEMPRE se usa este fallback porque
// `bun:bundle` no resuelve (ver docstring del módulo).
let muslRuntimeCache: boolean | null = null

// Fire-and-forget: puebla la caché de musl para el camino de fallback.
if (process.platform === 'linux') {
  const muslArch = process.arch === 'x64' ? 'x86_64' : 'aarch64'
  void stat(`/lib/libc.musl-${muslArch}.so.1`).then(
    () => {
      muslRuntimeCache = true
    },
    () => {
      muslRuntimeCache = false
    },
  )
}

/**
 * Comprueba si el sistema usa libc MUSL en vez de glibc.
 *
 * La fuente lo resuelve en tiempo de compilación vía flags `IS_LIBC_MUSL`/
 * `IS_LIBC_GLIBC` en builds nativas de linux; aquí esas dos comprobaciones
 * se omiten (`bun:bundle` no resuelve) y siempre se usa el fallback runtime
 * — la misma rama que la fuente toma en node sin bundlear.
 */
function isMuslEnvironment(): boolean {
  if (process.platform !== 'linux') return false
  return muslRuntimeCache ?? false
}

// Caché para la detección async de JetBrains
let jetBrainsIDECache: string | null | undefined

async function detectJetBrainsIDEFromParentProcessAsync(): Promise<
  string | null
> {
  if (jetBrainsIDECache !== undefined) {
    return jetBrainsIDECache
  }

  if (process.platform === 'darwin') {
    jetBrainsIDECache = null
    return null // macOS usa detección por bundle ID, ya manejada aparte.
  }

  try {
    const { JETBRAINS_IDES } = requireConfigEnvPaths()
    // Obtiene los comandos ancestros en una sola llamada (evita bash
    // síncrono en loop).
    const commands = await requireShellGenericProcessUtils().getAncestorCommandsAsync(
      process.pid,
      10,
    )

    for (const command of commands) {
      const lowerCommand = command.toLowerCase()
      // Busca IDEs JetBrains específicos en la línea de comando.
      for (const ide of JETBRAINS_IDES) {
        if (lowerCommand.includes(ide)) {
          jetBrainsIDECache = ide
          return ide
        }
      }
    }
  } catch {
    // Falla en silencio — es una detección best-effort (idéntico a la
    // fuente, que tampoco loguea aquí). No se llama a ningún envoltorio
    // `require()` diferido dentro de este `catch`: si el fallo original fue
    // por AUSENCIA de un módulo, un segundo `require()` fallaría igual y
    // relanzaría, escapando de este bloque — justo lo que el `try/catch`
    // existe para impedir.
  }

  jetBrainsIDECache = null
  return null
}

export async function getTerminalWithJetBrainsDetectionAsync(): Promise<
  string | null
> {
  const { env } = requireConfigEnvPaths()
  // Comprueba terminal JetBrains en Linux/Windows.
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') {
    // En macOS, la detección por bundle ID ya cubre los IDEs JetBrains.
    if (env.platform !== 'darwin') {
      const specificIDE = await detectJetBrainsIDEFromParentProcessAsync()
      return specificIDE || 'pycharm'
    }
  }
  return env.terminal
}

// Versión síncrona que devuelve el resultado cacheado o cae a env.terminal.
// Para compatibilidad hacia atrás — quien llame debería migrar a la versión
// async.
export function getTerminalWithJetBrainsDetection(): string | null {
  const { env } = requireConfigEnvPaths()
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') {
    if (env.platform !== 'darwin') {
      if (jetBrainsIDECache !== undefined) {
        return jetBrainsIDECache || 'pycharm'
      }
      return 'pycharm'
    }
  }
  return env.terminal
}

/**
 * Inicializa la detección de IDE JetBrains de forma asíncrona. Llamar
 * temprano en la inicialización de la app para poblar la caché. Tras
 * resolver, `getTerminalWithJetBrainsDetection()` devolverá resultados
 * precisos.
 */
export async function initJetBrainsDetection(): Promise<void> {
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') {
    await detectJetBrainsIDEFromParentProcessAsync()
  }
}

/**
 * Export combinado con todas las propiedades de `env` más las funciones
 * dinámicas. La fuente lo construye a nivel de módulo con un spread
 * síncrono de `env`; aquí `env` viene de `./paths.js`, que está bloqueado
 * (ver docstring del módulo). Un spread síncrono en la carga del módulo
 * haría fallar la carga ENTERA de este archivo — no sólo las funciones que
 * dependen de `paths.js` — así que se envuelve en un `try/catch` que cae a
 * un `env` mínimo (`platform`/`terminal` derivados de `process` sin las
 * heurísticas de `paths.ts`) en vez de propagar el fallo a cada import de
 * `getIsDocker`/`isMuslEnvironment`, que no dependen de `paths.js` en
 * absoluto.
 */
function buildEnvDynamic(): Record<string, unknown> {
  try {
    return {
      ...requireConfigEnvPaths().env,
      terminal: getTerminalWithJetBrainsDetection(),
      getIsDocker,
      getIsBubblewrapSandbox,
      isMuslEnvironment,
      getTerminalWithJetBrainsDetectionAsync,
      initJetBrainsDetection,
    }
  } catch {
    // `./paths.js` ausente (bloqueado, ver docstring) — env mínimo de
    // degradación en vez de hacer fallar la carga del módulo entero.
    return {
      platform: (['win32', 'darwin'].includes(process.platform)
        ? process.platform
        : 'linux') as 'win32' | 'darwin' | 'linux',
      terminal: null,
      getIsDocker,
      getIsBubblewrapSandbox,
      isMuslEnvironment,
      getTerminalWithJetBrainsDetectionAsync,
      initJetBrainsDetection,
    }
  }
}

export const envDynamic = buildEnvDynamic()
