/**
 * Estado de bootstrap de app-host — PORTE PARCIAL de
 * `ccnmt: packages/app-host/src/bootstrap/state.ts` (1873 líneas fuente,
 * commit vigente al portar).
 *
 * ccnmt no declara licencia — se cita ruta/nombre de símbolo/conteo y se
 * reimplementa, nunca se pega el cuerpo de la fuente.
 *
 * COBERTURA (contada como en el archivo fuente: declaraciones
 * `export function|type|const|let` más los dos `export {...}` de
 * re-exportación — 229 símbolos exportados en total):
 *
 *   - Slice C (bypass mode):  2 funciones
 *   - Utilidad de test compartida: `resetStateForTests` = 1
 *   -------------------------------------------------------------
 *   TOTAL PORTADO EN ESTE COMMIT: 3 de 229 símbolos exportados por la fuente.
 *
 * Pendiente en pases siguientes de este mismo WP (ya identificado, no
 * inventado): Slice A (telemetría/`meterState`, 21 símbolos) y Slice B
 * (captura de request/`requestCaptureState`, 14 símbolos) — cada uno trae
 * su propio archivo de test característico
 * (`meterState.test.ts`, `requestCaptureState.test.ts`) que aún no
 * aterrizó en este árbol. El resto de los 229 (cwd/projectRoot,
 * contadores de costo/tokens, hooks registrados, teams/cron/skills
 * invocadas, plan mode, canales, latches de cache-header, etc.) no tiene
 * test característico en el alcance de este WP y se declara
 * DESCONOCIDO/pendiente, no se inventa.
 *
 * `resetStateForTests()` en la fuente también reinicia tres variables de
 * módulo ajenas al objeto `State` (`outputTokensAtTurnStart`,
 * `currentTurnTokenBudget`, `budgetContinuationCount`) y una señal
 * (`sessionSwitched.clear()`) — las cuatro pertenecen al slice de
 * seguimiento de costo/tokens, no portado. Se omiten a propósito; ningún
 * test de este WP las ejercita.
 */

// DO NOT ADD MORE STATE HERE — BE JUDICIOUS WITH GLOBAL STATE (heredado de
// la fuente; el resto del array de campos vive fuera de este porte parcial).

type State = {
  // Slice C — bypass mode (bypassModeState)
  sessionBypassPermissionsMode: boolean
}

// ALSO HERE — THINK THRICE BEFORE MODIFYING (heredado de la fuente).
function getInitialState(): State {
  return {
    sessionBypassPermissionsMode: false,
  }
}

const STATE: State = getInitialState()

// ---------------------------------------------------------------------------
// Slice C — bypass mode (bypassModeState)
// ---------------------------------------------------------------------------

export function setSessionBypassPermissionsMode(enabled: boolean): void {
  STATE.sessionBypassPermissionsMode = enabled
}

export function getSessionBypassPermissionsMode(): boolean {
  return STATE.sessionBypassPermissionsMode
}

// ---------------------------------------------------------------------------
// Utilidad de test compartida por las tres slices
// ---------------------------------------------------------------------------

// Only used in tests
export function resetStateForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetStateForTests can only be called in tests')
  }
  Object.entries(getInitialState()).forEach(([key, value]) => {
    STATE[key as keyof State] = value as never
  })
}
