/**
 * Adaptación de `ccnmt: packages/app-host/src/context/notifications.tsx`.
 * Capa 0 (sin cita a paquete hermano ausente) — porte verbatim, sin
 * divergencias. `Theme` se importa `type`-only desde `@anthropic/ink` —
 * ese paquete es el fork de Ink vendorizado en `ccnmt`, no publicado ni
 * instalado en este árbol (mismo hallazgo que
 * `@thyrox/app-host: src/index.ts` ya documenta para
 * `context/QueuedMessageContext.tsx`). Al usarse sólo como
 * `keyof Theme` (posición de tipo), el import se borra al transpilar —
 * verificado empíricamente en este pase (`bun test` con un import `type`
 * a un especificador irresoluble pasa sin error) — así que el módulo
 * carga sin necesitar que `@anthropic/ink` esté instalado. Instalarlo es
 * decisión del ejecutor, no de este pase.
 */
import type * as React from 'react'
import { useCallback, useEffect } from 'react'
import { useAppStateStore, useSetAppState } from '../state/AppState.js'
import type { Theme } from '@anthropic/ink'

type Priority = 'low' | 'medium' | 'high' | 'immediate'

type BaseNotification = {
  key: string
  /**
   * Claves de notificaciones que esta notificación invalida.
   * Si una notificación es invalidada, se elimina de la cola
   * y, si está mostrándose, se limpia de inmediato.
   */
  invalidates?: string[]
  priority: Priority
  timeoutMs?: number
  /**
   * Combina notificaciones con la misma clave, como Array.reduce().
   * Se llama como fold(accumulator, incoming) cuando llega una
   * notificación con una clave que ya coincide con una en la cola o
   * mostrándose. Devuelve la notificación fusionada (debe seguir
   * llevando fold hacia adelante para futuras fusiones).
   */
  fold?: (accumulator: Notification, incoming: Notification) => Notification
}

type TextNotification = BaseNotification & {
  text: string
  color?: keyof Theme
}

type JSXNotification = BaseNotification & {
  jsx: React.ReactNode
}

type AddNotificationFn = (content: Notification) => void
type RemoveNotificationFn = (key: string) => void

export type Notification = TextNotification | JSXNotification

const DEFAULT_TIMEOUT_MS = 8000

// Guarda el timeout actual para poder limpiarlo cuando llegan
// notificaciones inmediatas.
let currentTimeoutId: NodeJS.Timeout | null = null

export function useNotifications(): {
  addNotification: AddNotificationFn
  removeNotification: RemoveNotificationFn
} {
  const store = useAppStateStore()
  const setAppState = useSetAppState()

  // Procesa la cola cuando la notificación actual termina o la cola cambia.
  const processQueue = useCallback(() => {
    setAppState(prev => {
      const next = getNext(prev.notifications.queue)
      if (prev.notifications.current !== null || !next) {
        return prev
      }

      currentTimeoutId = setTimeout(
        (setAppState, nextKey, processQueue) => {
          currentTimeoutId = null
          setAppState(prev => {
            // Compara por clave, no por referencia, para tolerar
            // notificaciones re-creadas.
            if (prev.notifications.current?.key !== nextKey) {
              return prev
            }
            return {
              ...prev,
              notifications: {
                queue: prev.notifications.queue,
                current: null,
              },
            }
          })
          processQueue()
        },
        next.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        setAppState,
        next.key,
        processQueue,
      )

      return {
        ...prev,
        notifications: {
          queue: prev.notifications.queue.filter(_ => _ !== next),
          current: next,
        },
      }
    })
  }, [setAppState])

  const addNotification = useCallback<AddNotificationFn>(
    (notif: Notification) => {
      // Maneja notificaciones de prioridad inmediata.
      if (notif.priority === 'immediate') {
        // Limpia cualquier timeout existente: se va a mostrar una nueva
        // notificación inmediata.
        if (currentTimeoutId) {
          clearTimeout(currentTimeoutId)
          currentTimeoutId = null
        }

        // Arma el timeout de la notificación inmediata.
        currentTimeoutId = setTimeout(
          (setAppState, notif, processQueue) => {
            currentTimeoutId = null
            setAppState(prev => {
              // Compara por clave, no por referencia, para tolerar
              // notificaciones re-creadas.
              if (prev.notifications.current?.key !== notif.key) {
                return prev
              }
              return {
                ...prev,
                notifications: {
                  queue: prev.notifications.queue.filter(
                    _ => !notif.invalidates?.includes(_.key),
                  ),
                  current: null,
                },
              }
            })
            processQueue()
          },
          notif.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          setAppState,
          notif,
          processQueue,
        )

        // Muestra la notificación inmediata de una vez.
        setAppState(prev => ({
          ...prev,
          notifications: {
            current: notif,
            queue:
              // Sólo re-encola la notificación actual si no es inmediata.
              [
                ...(prev.notifications.current
                  ? [prev.notifications.current]
                  : []),
                ...prev.notifications.queue,
              ].filter(
                _ =>
                  _.priority !== 'immediate' &&
                  !notif.invalidates?.includes(_.key),
              ),
          },
        }))
        return // IMPORTANTE: sale de addNotification para las inmediatas
      }

      // Maneja notificaciones no inmediatas.
      setAppState(prev => {
        // ¿Se puede fusionar con una notificación existente de la misma clave?
        if (notif.fold) {
          // Fusiona con la actual si las claves coinciden.
          if (prev.notifications.current?.key === notif.key) {
            const folded = notif.fold(prev.notifications.current, notif)
            // Reinicia el timeout de la notificación fusionada.
            if (currentTimeoutId) {
              clearTimeout(currentTimeoutId)
              currentTimeoutId = null
            }
            currentTimeoutId = setTimeout(
              (setAppState, foldedKey, processQueue) => {
                currentTimeoutId = null
                setAppState(p => {
                  if (p.notifications.current?.key !== foldedKey) {
                    return p
                  }
                  return {
                    ...p,
                    notifications: {
                      queue: p.notifications.queue,
                      current: null,
                    },
                  }
                })
                processQueue()
              },
              folded.timeoutMs ?? DEFAULT_TIMEOUT_MS,
              setAppState,
              folded.key,
              processQueue,
            )

            return {
              ...prev,
              notifications: {
                current: folded,
                queue: prev.notifications.queue,
              },
            }
          }

          // Fusiona con una notificación en cola si las claves coinciden.
          const queueIdx = prev.notifications.queue.findIndex(
            _ => _.key === notif.key,
          )
          if (queueIdx !== -1) {
            const folded = notif.fold(
              prev.notifications.queue[queueIdx]!,
              notif,
            )
            const newQueue = [...prev.notifications.queue]
            newQueue[queueIdx] = folded
            return {
              ...prev,
              notifications: {
                current: prev.notifications.current,
                queue: newQueue,
              },
            }
          }
        }

        // Sólo agrega a la cola si no está ya presente (evita duplicados).
        const queuedKeys = new Set(prev.notifications.queue.map(_ => _.key))
        const shouldAdd =
          !queuedKeys.has(notif.key) &&
          prev.notifications.current?.key !== notif.key

        if (!shouldAdd) return prev

        const invalidatesCurrent =
          prev.notifications.current !== null &&
          notif.invalidates?.includes(prev.notifications.current.key)

        if (invalidatesCurrent && currentTimeoutId) {
          clearTimeout(currentTimeoutId)
          currentTimeoutId = null
        }

        return {
          ...prev,
          notifications: {
            current: invalidatesCurrent ? null : prev.notifications.current,
            queue: [
              ...prev.notifications.queue.filter(
                _ =>
                  _.priority !== 'immediate' &&
                  !notif.invalidates?.includes(_.key),
              ),
              notif,
            ],
          },
        }
      })

      // Procesa la cola después de agregar la notificación.
      processQueue()
    },
    [setAppState, processQueue],
  )

  const removeNotification = useCallback<RemoveNotificationFn>(
    (key: string) => {
      setAppState(prev => {
        const isCurrent = prev.notifications.current?.key === key
        const inQueue = prev.notifications.queue.some(n => n.key === key)

        if (!isCurrent && !inQueue) {
          return prev
        }

        if (isCurrent && currentTimeoutId) {
          clearTimeout(currentTimeoutId)
          currentTimeoutId = null
        }

        return {
          ...prev,
          notifications: {
            current: isCurrent ? null : prev.notifications.current,
            queue: prev.notifications.queue.filter(n => n.key !== key),
          },
        }
      })

      processQueue()
    },
    [setAppState, processQueue],
  )

  // Procesa la cola al montar si ya hay notificaciones en el estado
  // inicial. Lectura imperativa (no useAppState): una suscripción en un
  // efecto de sólo-montaje sería vestigial y haría re-renderizar a cada
  // caller ante cualquier cambio de la cola.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (store.getState().notifications.queue.length > 0) {
      processQueue()
    }
  }, [])

  return { addNotification, removeNotification }
}

const PRIORITIES: Record<Priority, number> = {
  immediate: 0,
  high: 1,
  medium: 2,
  low: 3,
}
export function getNext(queue: Notification[]): Notification | undefined {
  if (queue.length === 0) return undefined
  return queue.reduce((min, n) =>
    PRIORITIES[n.priority] < PRIORITIES[min.priority] ? n : min,
  )
}
