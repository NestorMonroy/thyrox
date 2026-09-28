/**
 * El cierre de Sentry que el apagado invoca, sin cargar Sentry.
 *
 * `initSentry` (`./sentry.ts`) registra aquí su cierre al inicializarse; el
 * apagado sólo importa este módulo. Así un arranque que nunca inicializa
 * Sentry —sin `SENTRY_DSN`— no paga `@sentry/node` al importar el apagado
 * (#130: era una de las aristas pesadas del arranque).
 */
export type SentryCloser = (timeoutMs: number) => Promise<unknown>

let closer: SentryCloser | undefined

/** Registra (o retira, con `undefined`) el cierre de la instancia viva. */
export function registerSentryCloser(next: SentryCloser | undefined): void {
  closer = next
}

/** Vacía y cierra Sentry si alguien lo inicializó; si no, no hace nada. */
export async function closeSentry(timeoutMs = 2000): Promise<void> {
  if (!closer) return
  try {
    await closer(timeoutMs)
  } catch {
    // Ignorar — ya nos estamos apagando de todas formas.
  }
}
