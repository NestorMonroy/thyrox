import { feature } from 'bun:bundle'
import { useEffect, useRef } from 'react'
import {
  type AppState,
  useAppState,
  useAppStateStore,
  useSetAppState,
} from './appStateHooks.js'
import type { ToolPermissionContext } from '@claude-code-how-works/tool-registry/Tool.js'
import { getIsRemoteMode } from '@claude-code-how-works/app-host/bootstrap/state.js'
import {
  createDisabledBypassPermissionsContext,
  shouldDisableBypassPermissions,
  verifyAutoModeGateAccess,
} from './permissionSetup.js'

let bypassPermissionsCheckRan = false

export async function checkAndDisableBypassPermissionsIfNeeded(
  toolPermissionContext: ToolPermissionContext,
  setAppState: (f: (prev: AppState) => AppState) => void,
): Promise<void> {
  // Copia de `ccnmt: packages/permission/src/bypassPermissionsKillswitch.ts`
  // con los comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Comprobar si hay que deshabilitar `bypassPermissions` según la puerta de
  // Statsig. Se hace una sola vez, antes de la primera consulta, para tener el
  // valor de la puerta más reciente.
  if (bypassPermissionsCheckRan) {
    return
  }
  bypassPermissionsCheckRan = true

  if (!toolPermissionContext.isBypassPermissionsModeAvailable) {
    return
  }

  const shouldDisable = await shouldDisableBypassPermissions()
  if (!shouldDisable) {
    return
  }

  setAppState(prev => {
    return {
      ...prev,
      toolPermissionContext: createDisabledBypassPermissionsContext(
        prev.toolPermissionContext,
      ),
    }
  })
}

/**
 * Reinicia la bandera de correr-una-sola-vez de
 * `checkAndDisableBypassPermissionsIfNeeded`. Se llama después de /login, para
 * que la comprobación de la puerta se rehaga con la organización nueva.
 */
export function resetBypassPermissionsCheck(): void {
  bypassPermissionsCheckRan = false
}

export function useKickOffCheckAndDisableBypassPermissionsIfNeeded(): void {
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
  const setAppState = useSetAppState()

  // Correr una sola vez, al montar el componente
  useEffect(() => {
    if (getIsRemoteMode()) return
    void checkAndDisableBypassPermissionsIfNeeded(
      toolPermissionContext,
      setAppState,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

let autoModeCheckRan = false

export async function checkAndDisableAutoModeIfNeeded(
  toolPermissionContext: ToolPermissionContext,
  setAppState: (f: (prev: AppState) => AppState) => void,
  fastMode?: boolean,
): Promise<void> {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    if (autoModeCheckRan) {
      return
    }
    autoModeCheckRan = true

    const { updateContext, notification } = await verifyAutoModeGateAccess(
      toolPermissionContext,
      fastMode,
    )
    setAppState(prev => {
      // Aplicar la transformación al contexto ACTUAL, no a la instantánea
      // rancia que se le pasó a `verifyAutoModeGateAccess`. Un shift-tab a
      // mitad de turno puede adelantar al `await` asíncrono de GrowthBook que
      // hay dentro; expandir aquí un contexto rancio revertiría el cambio de
      // modo del usuario.
      const nextCtx = updateContext(prev.toolPermissionContext)
      const newState =
        nextCtx === prev.toolPermissionContext
          ? prev
          : { ...prev, toolPermissionContext: nextCtx }
      if (!notification) return newState
      return {
        ...newState,
        notifications: {
          ...newState.notifications,
          queue: [
            ...newState.notifications.queue,
            {
              key: 'auto-mode-gate-notification',
              text: notification,
              color: 'warning' as const,
              priority: 'high' as const,
            },
          ],
        },
      }
    })
  }
}

/**
 * Reinicia la bandera de correr-una-sola-vez de
 * `checkAndDisableAutoModeIfNeeded`. Se llama después de /login, para que la
 * comprobación de la puerta se rehaga con la organización nueva.
 */
export function resetAutoModeGateCheck(): void {
  autoModeCheckRan = false
}

export function useKickOffCheckAndDisableAutoModeIfNeeded(): void {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const fastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()
  const store = useAppStateStore()
  const isFirstRunRef = useRef(true)

  // Corre al montar (la comprobación de arranque) Y cada vez que cambia el
  // modelo o el modo rápido (expulsión o restauración del carrusel). Vigilar
  // los dos campos de modelo cubre /model, el selector de Cmd+P, /config y los
  // caminos de `onSetModel` del bridge; `fastMode` cubre `/fast on|off` para el
  // cortacircuitos `tengu_auto_mode_config.disableFastMode`. De los caminos sin
  // interfaz de `print.ts` se encarga la comprobación síncrona
  // `isAutoModeGateEnabled()`.
  useEffect(() => {
    if (getIsRemoteMode()) return
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
    } else {
      resetAutoModeGateCheck()
    }
    void checkAndDisableAutoModeIfNeeded(
      store.getState().toolPermissionContext,
      setAppState,
      fastMode,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainLoopModel, mainLoopModelForSession, fastMode])
}
