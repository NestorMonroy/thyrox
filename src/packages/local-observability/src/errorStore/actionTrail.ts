/**
 * Las últimas acciones de la sesión, para adjuntarlas a cada error.
 *
 * Es el equivalente local de los breadcrumbs de Sentry: la acción es un
 * `logEvent`, y se guardan las mismas veinte (`maxBreadcrumbs: 20`) en un anillo
 * en memoria. Registrar una acción no escribe nada; sólo un error la persiste.
 */
export const ACTION_TRAIL_CAPACITY = 20

export type RecordedAction = {
  name: string
  metadata: Record<string, unknown>
  occurredAt: string
}

export type ActionTrail = {
  push(name: string, metadata: Record<string, unknown>, occurredAt: string): void
  snapshot(): RecordedAction[]
}

export function createActionTrail(capacity = ACTION_TRAIL_CAPACITY): ActionTrail {
  const actions: RecordedAction[] = []
  return {
    push(name, metadata, occurredAt) {
      actions.push({ name, metadata, occurredAt })
      if (actions.length > capacity) actions.shift()
    },
    snapshot: () => actions.map(action => ({ ...action })),
  }
}
