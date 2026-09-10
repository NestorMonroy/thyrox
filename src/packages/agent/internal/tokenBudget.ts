/**
 * Presupuesto de tokens de un turno — porte de
 * `ccnmt: packages/agent/internal/tokenBudget.ts`.
 *
 * Decide si el bucle sigue trabajando o para. Tiene DOS condiciones de
 * parada, y la segunda es la que importa: un turno puede quedarse muy por
 * debajo del presupuesto y aun asi no estar avanzando. Medir solo el
 * porcentaje consumido no distingue «va a medio camino» de «ya no produce»,
 * asi que se mide tambien el DELTA entre comprobaciones.
 */

/** Fraccion del presupuesto a partir de la cual se para. */
const COMPLETION_THRESHOLD = 0.9

/** Delta por debajo del cual un turno se considera sin avance. */
const DIMINISHING_THRESHOLD = 500

/** Cuantas continuaciones tienen que acumularse antes de mirar el delta. */
const MIN_CONTINUATIONS_FOR_DIMINISHING = 3

/** El estado que el tracker arrastra entre comprobaciones. */
export type BudgetTracker = {
  continuationCount: number
  lastDeltaTokens: number
  lastGlobalTurnTokens: number
  startedAt: number
}

export type ContinueDecision = {
  action: 'continue'
  nudgeMessage: string
  continuationCount: number
  pct: number
  turnTokens: number
  budget: number
}

export type StopDecision = {
  action: 'stop'
  completionEvent: {
    continuationCount: number
    pct: number
    turnTokens: number
    budget: number
    diminishingReturns: boolean
    durationMs: number
  } | null
}

export type TokenBudgetDecision = ContinueDecision | StopDecision

/** Arranca el tracker. `startedAt` fecha el turno, no la comprobacion. */
export function createBudgetTracker(): BudgetTracker {
  return {
    continuationCount: 0,
    lastDeltaTokens: 0,
    lastGlobalTurnTokens: 0,
    startedAt: Date.now(),
  }
}

/** El aviso que acompana a una continuacion, con su cifra ya formateada. */
function budgetContinuationMessage(
  pct: number,
  turnTokens: number,
  budget: number,
): string {
  const format = (n: number): string => new Intl.NumberFormat('en-US').format(n)
  return (
    `Stopped at ${pct}% of token target ` +
    `(${format(turnTokens)} / ${format(budget)}). Keep working — do not summarize.`
  )
}

/**
 * Decide continuar o parar.
 *
 * Tres paradas sin evento, y las tres significan «esto no aplica»: un
 * subagente tiene su propio presupuesto, y un presupuesto nulo o no
 * positivo no acota nada. Devolver un evento ahi publicaria una medicion
 * de algo que no se midio.
 *
 * La parada CON evento es la unica que informa: distingue en su
 * `diminishingReturns` si se paro por llegar al umbral o por dejar de
 * avanzar, que son dos causas con remedios opuestos.
 */
export function checkTokenBudget(
  tracker: BudgetTracker,
  agentId: string | undefined,
  budget: number | null,
  globalTurnTokens: number,
): TokenBudgetDecision {
  if (agentId || budget === null || budget <= 0) {
    return { action: 'stop', completionEvent: null }
  }

  const turnTokens = globalTurnTokens
  const pct = Math.round((turnTokens / budget) * 100)
  const deltaSinceLastCheck = globalTurnTokens - tracker.lastGlobalTurnTokens

  // Hacen falta DOS deltas cortos seguidos, no uno: un solo turno flojo es
  // ruido, y parar por el descartaria trabajo que iba a llegar.
  const isDiminishing =
    tracker.continuationCount >= MIN_CONTINUATIONS_FOR_DIMINISHING &&
    deltaSinceLastCheck < DIMINISHING_THRESHOLD &&
    tracker.lastDeltaTokens < DIMINISHING_THRESHOLD

  if (!isDiminishing && turnTokens < budget * COMPLETION_THRESHOLD) {
    tracker.continuationCount++
    tracker.lastDeltaTokens = deltaSinceLastCheck
    tracker.lastGlobalTurnTokens = globalTurnTokens
    return {
      action: 'continue',
      nudgeMessage: budgetContinuationMessage(pct, turnTokens, budget),
      continuationCount: tracker.continuationCount,
      pct,
      turnTokens,
      budget,
    }
  }

  // Sin ninguna continuacion previa no hay turno que reportar: el primer
  // cheque ya venia por encima del umbral.
  if (isDiminishing || tracker.continuationCount > 0) {
    return {
      action: 'stop',
      completionEvent: {
        continuationCount: tracker.continuationCount,
        pct,
        turnTokens,
        budget,
        diminishingReturns: isDiminishing,
        durationMs: Date.now() - tracker.startedAt,
      },
    }
  }

  return { action: 'stop', completionEvent: null }
}
