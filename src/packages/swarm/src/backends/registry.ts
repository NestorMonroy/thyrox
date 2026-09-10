/**
 * Qué respaldo de panel usa esta sesión, y con qué ejecutor se engendra un
 * compañero.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/registry.ts` (470 líneas,
 * 12 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** y no se copia.
 *
 * DOS CIRCULARIDADES ROTAS A PROPÓSITO, y las dos por importación dinámica:
 *
 * 1. **Los respaldos se registran a sí mismos.** `TmuxBackend.ts` e
 *    `ITermBackend.ts` importan de aquí `registerTmuxBackend` /
 *    `registerITermBackend` y los llaman al cargarse. Si este módulo los
 *    importara de forma estática, el ciclo se cerraría en tiempo de carga.
 * 2. **`InProcessBackend` cuelga de once archivos que vuelven aquí.** Su
 *    cadena —`InProcessBackend` → `spawnInProcess` → `teamHelpers` → este
 *    registro— es un componente fuertemente conexo, y la importación diferida
 *    dentro de `getInProcessBackend()` es lo que lo abre.
 *
 * DIVERGENCIA DECLARADA: ninguna en la conducta.
 */
import {
  getIsNonInteractiveSession,
  getPlatform,
  logForDebugging,
} from '../adapters/appRuntime.js'
import {
  isInITerm2,
  isInsideTmux,
  isInsideTmuxSync,
  isIt2CliAvailable,
  isTmuxAvailable,
} from './detection.js'
import { getPreferTmuxOverIterm2 } from './it2Setup.js'
import { createPaneBackendExecutor } from './PaneBackendExecutor.js'
import { getTeammateModeFromSnapshot } from './teammateModeSnapshot.js'
import type {
  BackendDetectionResult,
  PaneBackend,
  PaneBackendType,
  TeammateExecutor,
} from './types.js'

/**
 * El respaldo elegido, cacheado.
 *
 * Una vez detectado queda fijo mientras viva el proceso: el entorno —dentro de
 * tmux, dentro de iTerm2, qué está instalado— no cambia a media sesión, y
 * volver a medirlo cuesta un subproceso por cada compañero que se engendra.
 */
let cachedBackend: PaneBackend | null = null

/** El resultado completo de la detección, con su metadata. */
let cachedDetectionResult: BackendDetectionResult | null = null

/** Si los dos respaldos ya se cargaron y se registraron. */
let backendsRegistered = false

/** El ejecutor en proceso, cacheado. */
let cachedInProcessBackend: TeammateExecutor | null = null

/** El ejecutor de panel, cacheado, envolviendo al respaldo detectado. */
let cachedPaneBackendExecutor: TeammateExecutor | null = null

/**
 * Si un engendro anterior cayó al modo en proceso por no haber ningún respaldo
 * de panel disponible.
 *
 * Una vez marcado, la interfaz —el aviso, el menú de equipos— refleja lo que
 * de verdad está pasando en vez de lo que la configuración prometía.
 */
let inProcessFallbackActive = false

/** Las dos clases que los respaldos registran al cargarse. */
let TmuxBackendClass: (new () => PaneBackend) | null = null
let ITermBackendClass: (new () => PaneBackend) | null = null

/**
 * Carga los dos respaldos para que `getBackendByType()` pueda construirlos.
 *
 * A diferencia de `detectAndGetBackend()`, esto NUNCA lanza subprocesos ni
 * falla: es la opción barata cuando sólo hace falta el registro de clases
 * —por ejemplo, para matar un panel cuyo tipo de respaldo ya está guardado—.
 */
export async function ensureBackendsRegistered(): Promise<void> {
  if (backendsRegistered) return
  await import('./TmuxBackend.js')
  await import('./ITermBackend.js')
  backendsRegistered = true
}

/** Registra la clase de tmux. La llama `TmuxBackend.ts` al cargarse. */
export function registerTmuxBackend(backendClass: new () => PaneBackend): void {
  TmuxBackendClass = backendClass
}

/** Registra la clase de iTerm2. La llama `ITermBackend.ts` al cargarse. */
export function registerITermBackend(
  backendClass: new () => PaneBackend,
): void {
  logForDebugging(
    `[registry] registerITermBackend called, class=${backendClass?.name || 'undefined'}`,
  )
  ITermBackendClass = backendClass
}

function createTmuxBackend(): PaneBackend {
  // Rehusar aquí y no devolver `null`: con `null` el fallo aparece en la
  // primera llamada a un método, lejos de su causa. Lo que falta es el
  // registro, y el mensaje lo nombra.
  if (!TmuxBackendClass) {
    throw new Error(
      'TmuxBackend not registered. Import TmuxBackend.ts before using the registry.',
    )
  }
  return new TmuxBackendClass()
}

function createITermBackend(): PaneBackend {
  if (!ITermBackendClass) {
    throw new Error(
      'ITermBackend not registered. Import ITermBackend.ts before using the registry.',
    )
  }
  return new ITermBackendClass()
}

/**
 * Elige el respaldo de panel de esta sesión.
 *
 * El orden ES la decisión:
 *
 * 1. **Dentro de tmux, siempre tmux**, aunque el terminal sea iTerm2. Los
 *    paneles nativos de iTerm2 no ven los de tmux, así que el compañero
 *    saldría fuera de la vista del líder.
 * 2. **En iTerm2 con `it2` vivo**, paneles nativos.
 * 3. **En iTerm2 sin `it2`**, tmux como respaldo — y se señala que falta la
 *    puesta a punto, salvo que el usuario ya haya elegido tmux.
 * 4. **Fuera de ambos**, tmux en sesión externa.
 * 5. **Sin tmux**, se rehúsa con las instrucciones de ESTA plataforma.
 */
export async function detectAndGetBackend(): Promise<BackendDetectionResult> {
  await ensureBackendsRegistered()

  if (cachedDetectionResult) {
    logForDebugging(
      `[BackendRegistry] Using cached backend: ${cachedDetectionResult.backend.type}`,
    )
    return cachedDetectionResult
  }

  logForDebugging('[BackendRegistry] Starting backend detection...')

  const insideTmux = await isInsideTmux()
  const inITerm2 = isInITerm2()

  logForDebugging(
    `[BackendRegistry] Environment: insideTmux=${insideTmux}, inITerm2=${inITerm2}`,
  )

  if (insideTmux) {
    logForDebugging(
      '[BackendRegistry] Selected: tmux (running inside tmux session)',
    )
    const backend = createTmuxBackend()
    cachedBackend = backend
    cachedDetectionResult = { backend, isNative: true, needsIt2Setup: false }
    return cachedDetectionResult
  }

  if (inITerm2) {
    const preferTmux = getPreferTmuxOverIterm2()
    if (preferTmux) {
      logForDebugging(
        '[BackendRegistry] User prefers tmux over iTerm2, skipping iTerm2 detection',
      )
    } else {
      const it2Available = await isIt2CliAvailable()
      logForDebugging(
        `[BackendRegistry] iTerm2 detected, it2 CLI available: ${it2Available}`,
      )

      if (it2Available) {
        logForDebugging(
          '[BackendRegistry] Selected: iterm2 (native iTerm2 with it2 CLI)',
        )
        const backend = createITermBackend()
        cachedBackend = backend
        cachedDetectionResult = { backend, isNative: true, needsIt2Setup: false }
        return cachedDetectionResult
      }
    }

    const tmuxAvailable = await isTmuxAvailable()
    logForDebugging(
      `[BackendRegistry] it2 not available, tmux available: ${tmuxAvailable}`,
    )

    if (tmuxAvailable) {
      logForDebugging(
        '[BackendRegistry] Selected: tmux (fallback in iTerm2, it2 setup recommended)',
      )
      const backend = createTmuxBackend()
      cachedBackend = backend
      cachedDetectionResult = {
        backend,
        isNative: false,
        // Sólo se propone la puesta a punto a quien NO ha elegido ya tmux: al
        // que la eligió se le repetiría el aviso en cada engendro.
        needsIt2Setup: !preferTmux,
      }
      return cachedDetectionResult
    }

    logForDebugging(
      '[BackendRegistry] ERROR: iTerm2 detected but no it2 CLI and no tmux',
    )
    throw new Error(
      'iTerm2 detected but it2 CLI not installed. Install it2 with: pip install it2',
    )
  }

  const tmuxAvailable = await isTmuxAvailable()
  logForDebugging(
    `[BackendRegistry] Not in tmux or iTerm2, tmux available: ${tmuxAvailable}`,
  )

  if (tmuxAvailable) {
    logForDebugging('[BackendRegistry] Selected: tmux (external session mode)')
    const backend = createTmuxBackend()
    cachedBackend = backend
    cachedDetectionResult = { backend, isNative: false, needsIt2Setup: false }
    return cachedDetectionResult
  }

  logForDebugging('[BackendRegistry] ERROR: No pane backend available')
  throw new Error(getTmuxInstallInstructions())
}

/**
 * Las instrucciones para instalar tmux, por plataforma.
 *
 * Dar la receta de otra plataforma es peor que no dar ninguna: se sigue al pie
 * de la letra y no funciona.
 */
function getTmuxInstallInstructions(): string {
  switch (getPlatform()) {
    case 'macos':
      return `To use agent swarms, install tmux:
  brew install tmux
Then start a tmux session with: tmux new-session -s claude`

    case 'linux':
    case 'wsl':
      return `To use agent swarms, install tmux:
  sudo apt install tmux    # Ubuntu/Debian
  sudo dnf install tmux    # Fedora/RHEL
Then start a tmux session with: tmux new-session -s claude`

    case 'windows':
      return `To use agent swarms, you need tmux which requires WSL (Windows Subsystem for Linux).
Install WSL first, then inside WSL run:
  sudo apt install tmux
Then start a tmux session with: tmux new-session -s claude`

    default:
      return `To use agent swarms, install tmux using your system's package manager.
Then start a tmux session with: tmux new-session -s claude`
  }
}

/** Construye un respaldo por tipo explícito, saltándose la detección. */
export function getBackendByType(type: PaneBackendType): PaneBackend {
  switch (type) {
    case 'tmux':
      return createTmuxBackend()
    case 'iterm2':
      return createITermBackend()
  }
}

/** El respaldo cacheado, o `null` si la detección no ha corrido. */
export function getCachedBackend(): PaneBackend | null {
  return cachedBackend
}

/**
 * El resultado cacheado de la detección, o `null`.
 *
 * Su `isNative` dice si los compañeros se ven en paneles del propio terminal.
 */
export function getCachedDetectionResult(): BackendDetectionResult | null {
  return cachedDetectionResult
}

/**
 * Deja constancia de que un engendro cayó al modo en proceso por falta de
 * respaldo de panel.
 */
export function markInProcessFallback(): void {
  logForDebugging('[BackendRegistry] Marking in-process fallback as active')
  inProcessFallbackActive = true
}

/** El modo de compañero de esta sesión, congelado al arrancar. */
function getTeammateMode(): 'auto' | 'tmux' | 'in-process' {
  return getTeammateModeFromSnapshot()
}

/**
 * Si el compañero corre dentro de este proceso en vez de en un panel.
 *
 * - `in-process` → siempre sí; `tmux` → siempre no.
 * - `auto` → decide el entorno: dentro de tmux o de iTerm2 hay panel, así que
 *   no; fuera de ambos, sí.
 */
export function isInProcessEnabled(): boolean {
  // Una sesión no interactiva no tiene terminal donde mostrar un panel: un
  // compañero en tmux ahí es un proceso escondido que nadie puede leer.
  if (getIsNonInteractiveSession()) {
    logForDebugging(
      '[BackendRegistry] isInProcessEnabled: true (non-interactive session)',
    )
    return true
  }

  const mode = getTeammateMode()

  let enabled: boolean
  if (mode === 'in-process') {
    enabled = true
  } else if (mode === 'tmux') {
    enabled = false
  } else {
    // El respaldo queda pegado SÓLO en `auto`: describe lo que el entorno no
    // pudo dar, no una preferencia, así que un cambio explícito a `tmux` a
    // media sesión debe seguir surtiendo efecto.
    if (inProcessFallbackActive) {
      logForDebugging(
        '[BackendRegistry] isInProcessEnabled: true (fallback after pane backend unavailable)',
      )
      return true
    }
    enabled = !isInsideTmuxSync() && !isInITerm2()
  }

  logForDebugging(
    `[BackendRegistry] isInProcessEnabled: ${enabled} (mode=${mode}, insideTmux=${isInsideTmuxSync()}, inITerm2=${isInITerm2()})`,
  )
  return enabled
}

/**
 * A qué resuelve el modo de esta sesión.
 *
 * A diferencia de `getTeammateModeFromSnapshot`, que puede devolver `auto`,
 * esto devuelve lo que `auto` significa en el entorno actual.
 */
export function getResolvedTeammateMode(): 'in-process' | 'tmux' {
  return isInProcessEnabled() ? 'in-process' : 'tmux'
}

/**
 * El ejecutor en proceso, cargado de forma diferida y cacheado.
 *
 * El `await import()` es la segunda circularidad que la cabecera declara: la
 * cadena `InProcessBackend` -> `spawnInProcess` -> `teamHelpers` -> este
 * registro es un componente fuertemente conexo, y diferir la carga hasta la
 * primera llamada es lo que lo abre.
 */
export async function getInProcessBackend(): Promise<TeammateExecutor> {
  if (!cachedInProcessBackend) {
    const { createInProcessBackend } = await import('./InProcessBackend.js')
    cachedInProcessBackend = createInProcessBackend()
  }
  return cachedInProcessBackend
}

/**
 * El ejecutor con que engendrar un compañero.
 *
 * `preferInProcess` es una preferencia del llamador, no una orden: el modo de
 * la sesión sigue mandando. Así el llamador no tiene que saber en qué modo
 * corre para pedir un ejecutor.
 */
export async function getTeammateExecutor(
  preferInProcess: boolean = false,
): Promise<TeammateExecutor> {
  if (preferInProcess && isInProcessEnabled()) {
    logForDebugging('[BackendRegistry] Using in-process executor')
    return await getInProcessBackend()
  }

  logForDebugging('[BackendRegistry] Using pane backend executor')
  return getPaneBackendExecutor()
}

async function getPaneBackendExecutor(): Promise<TeammateExecutor> {
  if (!cachedPaneBackendExecutor) {
    const detection = await detectAndGetBackend()
    cachedPaneBackendExecutor = createPaneBackendExecutor(detection.backend)
    logForDebugging(
      `[BackendRegistry] Created PaneBackendExecutor wrapping ${detection.backend.type}`,
    )
  }
  return cachedPaneBackendExecutor
}

/** Borra todo lo cacheado para volver a detectar. Sólo para pruebas. */
export function resetBackendDetection(): void {
  cachedBackend = null
  cachedDetectionResult = null
  cachedInProcessBackend = null
  cachedPaneBackendExecutor = null
  backendsRegistered = false
  inProcessFallbackActive = false
}
