/**
 * Las clases de consistencia que `@thyrox/shared-state` distingue en modo
 * `multi` (ADR-THYROX-006, revisión 1.1.0): qué hace cada consumidor cuando
 * Redis no responde depende de si necesita una vista GLOBAL entre proxies o
 * le basta con la de su propio proceso.
 *
 * - `requiresGlobalConsistency`: el lease del refresco, una cuota global —lo
 *   que dos proxies tienen que ver igual. En modo `multi` nunca degrada a
 *   memoria local en silencio: si redis falla, la llamada lanza
 *   `SharedStateUnavailableError`, y la siguiente vuelve a intentar redis.
 * - `bestEffortShared`: mejor compartido, pero una vista local momentánea no
 *   rompe nada (una caché, un contador aproximado). Degrada a memoria con
 *   aviso, como el comportamiento de siempre.
 * - `localAllowed`: no necesita compartirse nunca. Usa memoria de este
 *   proceso siempre, aunque redis esté disponible.
 *
 * En modo `single` las tres se comportan igual: con un solo proxy no hay
 * «vista de otro proceso» de la que divergir.
 */
export type ConsistencyClass = 'requiresGlobalConsistency' | 'bestEffortShared' | 'localAllowed'

/**
 * Lo que `requiresGlobalConsistency` exige no puede satisfacerse: en modo
 * `multi`, sin `THYROX_REDIS_URL` declarada, o con redis caído en el instante
 * de la llamada. Nunca se atiende en memoria local — eso sería la vista de
 * un solo proxy disfrazada de vista global.
 */
export class SharedStateUnavailableError extends Error {
  readonly code = 'SHARED_STATE_UNAVAILABLE'
  readonly consistency: ConsistencyClass

  constructor(consistency: ConsistencyClass, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SharedStateUnavailableError'
    this.consistency = consistency
  }
}
