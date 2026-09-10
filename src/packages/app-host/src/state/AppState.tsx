/**
 * Puerto de `ccnmt: packages/app-host/src/state/AppState.tsx` (203 líneas
 * fuente). El provider de React que expone `AppStoreContext` y los hooks
 * de lectura/escritura (`useAppState`, `useSetAppState`,
 * `useAppStateStore`, `useAppStateMaybeOutsideOfProvider`) sobre el store
 * genérico de `./store.ts` (este mismo pase).
 *
 * Cobertura: 100 % de la SUPERFICIE (los 7 símbolos exportados de valor +
 * los 6 tipos), con 4 divergencias declaradas — todas resueltas con el
 * MISMO patrón que la fuente ya usa para `VoiceProvider`
 * (`feature('VOICE_MODE') ? require(...) : passthrough`): un require()
 * perezoso con fallback silencioso, nunca un `import` estático de un
 * miembro ausente (que rompería el archivo ENTERO al cargar, no sólo al
 * invocar — ver `agent/frontmatterParser.ts` y
 * `app-host/src/runtime/installProviderBindings.ts` para el mismo
 * criterio aplicado a otros archivos de este árbol).
 *
 * Las 4 divergencias, cada una con su gap medido:
 *
 * 1. `getDefaultAppState` (`./AppStateStore.js` en la fuente) — el
 *    HERMANO `./AppStateStore.ts` de este mismo paquete YA EXISTE, pero
 *    su propio `export { getDefaultAppState } from './AppStateCompat.js'`
 *    apunta a un archivo que TAMPOCO existe (declarado en su propio
 *    docstring: "cita 29 veces a paquetes hermanos… queda colgante").
 *    Medido: `bun -e "import('./AppStateStore.ts')"` falla con
 *    `Cannot find module './AppStateCompat.js'` — el fallo es
 *    PRE-EXISTENTE a este pase, no introducido por él. Los TIPOS
 *    (`AppState`, `AppStateStore`) sí se importan estáticos —
 *    `import type` se borra en runtime y no intenta resolver el módulo
 *    (verificado con un caso de prueba aislado) — pero el VALOR se defiere
 *    con `require()`, mismo patrón que
 *    `app-host/src/runtime/appStateCompatShim.ts` ya aplica a este mismo
 *    símbolo en otro archivo.
 * 2. `applySettingsChange` (`@claude-code-how-works/config/applySettingsChange`
 *    en la fuente) — `@thyrox/config` no tiene ese módulo (es
 *    `config/settings/applySettingsChange.ts` en ccnmt; no portado aquí,
 *    fuera de los 16). Defiere con `require()`.
 * 3. `createDisabledBypassPermissionsContext`/
 *    `isBypassPermissionsModeDisabled`
 *    (`@claude-code-how-works/permission/permissionSetup`) — no existe
 *    `permissionSetup.ts` en `@thyrox/permission` — medido:
 *    `find src/packages/permission -iname "permissionSetup*"` → vacío.
 *    Defiere con `require()`; si falla, el efecto de montaje no hace nada
 *    (el bypass mode no se deshabilita automáticamente al montar, que es
 *    exactamente el caso que este código maneja — sin él, la carrera que
 *    describe el comentario original queda sin mitigar).
 * 4. `MailboxProvider` (`../context/mailbox.js`) — sibling de app-host que
 *    NO existe (ni en este pase ni en ninguno anterior) — medido:
 *    `find src/packages/app-host -iname "mailbox*"` → vacío. Componente
 *    JSX con fallback passthrough (mismo patrón que `VoiceProvider`, pero
 *    gateado por `try/catch` en vez de por feature flag — la fuente no
 *    gatea `MailboxProvider` con ningún flag).
 * 5. `useSettingsChange` (`@claude-code-how-works/repl/hooks/useSettingsChange.js`)
 *    — el paquete `repl` no existe en absoluto en este árbol — medido:
 *    `ls src/packages | grep repl` → vacío. Se resuelve UNA vez a nivel de
 *    módulo (no por render, para no violar Rules of Hooks) a la función
 *    real o a un no-op; sin ella, los cambios externos de settings.json
 *    (file watcher) NO se propagan al AppState de este componente — el
 *    resto de la app sigue funcionando, sólo se pierde la sincronización
 *    reactiva.
 */
import { feature } from 'bun:bundle'
import React, {
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from 'react'
import type { SettingSource } from '@thyrox/config/constants'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { createStore } from './store.ts'
import type { AppState, AppStateStore } from './AppStateStore.ts'

// Divergencia 1 — ver docstring del módulo.
function getDefaultAppStateSafe(): AppState {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./AppStateStore.js') as {
      getDefaultAppState: () => AppState
    }
    return mod.getDefaultAppState()
  } catch {
    return {} as AppState
  }
}

// Divergencia 2 — ver docstring del módulo.
function applySettingsChangeSafe(
  source: SettingSource,
  setState: (updater: (prev: AppState) => AppState) => void,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@thyrox/config/applySettingsChange.js') as {
      applySettingsChange: typeof applySettingsChangeSafe
    }
    mod.applySettingsChange(source, setState)
  } catch {
    // config/applySettingsChange no está portado — no-op.
  }
}

// Divergencia 3 — ver docstring del módulo.
type PermissionSetupMod = {
  createDisabledBypassPermissionsContext: <T>(prev: T) => T
  isBypassPermissionsModeDisabled: () => boolean
}
function requirePermissionSetup(): PermissionSetupMod | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/permission/permissionSetup.js') as PermissionSetupMod
  } catch {
    return undefined
  }
}

// Divergencia 4 — ver docstring del módulo. Passthrough si el paquete
// hermano `../context/mailbox.js` no existe.
const MailboxProvider: (props: {
  children: React.ReactNode
}) => React.ReactNode = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../context/mailbox.js') as {
      MailboxProvider: (props: { children: React.ReactNode }) => React.ReactNode
    }).MailboxProvider
  } catch {
    return ({ children }: { children: React.ReactNode }) => children
  }
})()

// Divergencia 5 — ver docstring del módulo. Resuelto una sola vez a nivel
// de módulo — nunca condicional dentro del render — para no violar Rules
// of Hooks.
const useSettingsChange: (
  onChange: (source: SettingSource) => void,
) => void = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/repl/hooks/useSettingsChange.js') as {
      useSettingsChange: (onChange: (source: SettingSource) => void) => void
    }).useSettingsChange
  } catch {
    return () => {}
  }
})()

// DCE: el contexto de voz es sólo-ant. Los builds externos reciben un
// passthrough. En este entorno (sin build de Bun con el flag fijado)
// `feature('VOICE_MODE')` evalúa a `false`, así que SIEMPRE se toma el
// passthrough — verificado, no supuesto.
/* eslint-disable @typescript-eslint/no-require-imports */
const VoiceProvider: (props: { children: React.ReactNode }) => React.ReactNode =
  feature('VOICE_MODE')
    ? require('@thyrox/voice/voiceContext.js').VoiceProvider
    : ({ children }) => children

/* eslint-enable @typescript-eslint/no-require-imports */

// Reexportado para que los callers existentes puedan importar via este
// módulo en vez de entrar directo a `./AppStateStore.ts`, igual que la
// fuente.
export type {
  AppState,
  AppStateStore,
} from './AppStateStore.ts'

export const AppStoreContext = React.createContext<AppStateStore | null>(null)

type Props = {
  children: React.ReactNode
  initialState?: AppState
  store?: AppStateStore
  onChangeAppState?: (args: { newState: AppState; oldState: AppState }) => void
}

const HasAppStateContext = React.createContext<boolean>(false)

export function AppStateProvider({
  children,
  initialState,
  store: externalStore,
  onChangeAppState,
}: Props): React.ReactNode {
  // No permitir AppStateProviders anidados.
  const hasAppStateContext = useContext(HasAppStateContext)
  if (hasAppStateContext) {
    throw new Error(
      'AppStateProvider can not be nested within another AppStateProvider',
    )
  }

  // El store se crea una sola vez y nunca cambia — un valor de contexto
  // estable significa que el provider nunca dispara re-renders. Los
  // consumidores se suscriben a slices vía useSyncExternalStore
  // (useAppState(selector)).
  const [store] = useState(
    () =>
      externalStore ??
      createStore<AppState>(
        initialState ?? getDefaultAppStateSafe(),
        onChangeAppState,
      ),
  )

  // Comprueba al montar si el bypass mode debería deshabilitarse. Maneja
  // la carrera donde los settings remotos cargan ANTES de que este
  // componente monte, así que la notificación de cambio de settings se
  // mandó cuando no había listeners suscritos. En sesiones subsecuentes,
  // el remote-settings.json cacheado se lee durante el setup inicial,
  // pero en la primera sesión el fetch remoto puede completar antes de
  // que React monte.
  useEffect(() => {
    const permissionSetup = requirePermissionSetup()
    if (!permissionSetup) return
    const { toolPermissionContext } = store.getState()
    if (
      toolPermissionContext.isBypassPermissionsModeAvailable &&
      permissionSetup.isBypassPermissionsModeDisabled()
    ) {
      logForDebugging(
        'Disabling bypass permissions mode on mount (remote settings loaded before mount)',
      )
      store.setState(prev => ({
        ...prev,
        toolPermissionContext: permissionSetup.createDisabledBypassPermissionsContext(
          prev.toolPermissionContext,
        ),
      }))
    }
  }, [])

  // Escucha cambios externos de settings y los sincroniza a AppState.
  // Asegura que los cambios del file watcher se propaguen por la app —
  // compartido con el camino headless/SDK vía applySettingsChange.
  const onSettingsChange = useEffectEvent((source: SettingSource) =>
    applySettingsChangeSafe(source, store.setState),
  )
  useSettingsChange(onSettingsChange)

  return (
    <HasAppStateContext.Provider value={true}>
      <AppStoreContext.Provider value={store}>
        <MailboxProvider>
          <VoiceProvider>{children}</VoiceProvider>
        </MailboxProvider>
      </AppStoreContext.Provider>
    </HasAppStateContext.Provider>
  )
}

function useAppStore(): AppStateStore {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new ReferenceError(
      'useAppState/useSetAppState cannot be called outside of an <AppStateProvider />',
    )
  }
  return store
}

/**
 * Se suscribe a un slice de AppState. Sólo re-renderiza cuando el valor
 * seleccionado cambia (comparado vía Object.is).
 *
 * Para múltiples campos independientes, llamar el hook varias veces.
 * NO devolver objetos nuevos desde el selector — Object.is siempre los
 * verá como cambiados. Seleccionar en su lugar una referencia de
 * sub-objeto existente.
 */
export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()

  const get = () => {
    const state = store.getState()
    const selected = selector(state)

    if (process.env.USER_TYPE === 'ant' && state === selected) {
      throw new Error(
        `Your selector in \`useAppState(${selector.toString()})\` returned the original state, which is not allowed. You must instead return a property for optimised rendering.`,
      )
    }

    return selected
  }

  return useSyncExternalStore(store.subscribe, get, get)
}

/**
 * Obtiene el updater setAppState sin suscribirse a ningún estado.
 * Devuelve una referencia estable que nunca cambia — componentes que sólo
 * usan este hook nunca re-renderizan por cambios de estado.
 */
export function useSetAppState(): (
  updater: (prev: AppState) => AppState,
) => void {
  return useAppStore().setState
}

/**
 * Obtiene el store directamente (para pasar getState/setState a código
 * no-React).
 */
export function useAppStateStore(): AppStateStore {
  return useAppStore()
}

const NOOP_SUBSCRIBE = () => () => {}

/**
 * Versión segura de useAppState que devuelve undefined si se llama fuera
 * de AppStateProvider. Útil para componentes que pueden renderizarse en
 * contextos donde AppStateProvider no está disponible.
 */
export function useAppStateMaybeOutsideOfProvider<T>(
  selector: (state: AppState) => T,
): T | undefined {
  const store = useContext(AppStoreContext)
  return useSyncExternalStore(store ? store.subscribe : NOOP_SUBSCRIBE, () =>
    store ? selector(store.getState()) : undefined,
  )
}
