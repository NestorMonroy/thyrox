/**
 * El puerto del estado compartido en caliente entre instancias del proxy
 * (ADR-THYROX-006, revisión 1.1.0).
 *
 * Aquí va sólo lo que dice qué está ocurriendo AHORA entre procesos: un lease
 * que una sola instancia puede tener, un contador por ventana de tiempo y un
 * valor que caduca. Lo que es verdad de forma persistente —credenciales,
 * hallazgos, errores, tareas— sigue en `@thyrox/store`.
 *
 * Dos adaptadores lo implementan: `memory` (un solo proxy) y `redis`
 * (`THYROX_REDIS_URL`). Los dos pasan la misma suite de contrato
 * (`contract.ts`), así que un consumidor no distingue cuál tiene detrás
 * salvo por el alcance: `memory` sólo coordina dentro de su proceso.
 *
 * Con varias instancias (`THYROX_PROXY_MODE=multi`), un `SharedStateStore`
 * suelto ya no basta: qué hacer cuando redis falla depende de si el
 * consumidor necesita ver lo mismo que los demás proxies o le basta con la
 * vista de su propio proceso. Esa distinción es `ConsistencyClass`
 * (`consistency.ts`), y `openSharedStateStore` (`factory.ts`) la resuelve por
 * `forConsistency(cls)`, no este puerto: la interfaz de abajo describe un
 * almacén ya elegido, sea cual sea su procedencia.
 */
export interface SharedStateStore {
  /**
   * Suma `by` (1 si falta) al contador de `key` en la ventana fija de
   * `windowMs` que está en curso, y devuelve el total de esa ventana. Al
   * empezar una ventana nueva el contador vuelve a cero.
   */
  incrementWindow(key: string, windowMs: number, by?: number): Promise<number>
  /**
   * Toma el lease `key` para `owner` durante `ttlMs`. Devuelve `true` si lo
   * obtuvo, o si ya era de `owner` (y entonces lo renueva). Un lease caducado
   * queda libre para cualquiera.
   */
  acquireLease(key: string, owner: string, ttlMs: number): Promise<boolean>
  /** Suelta el lease sólo si su dueño es `owner`. Devuelve `true` si lo soltó. */
  releaseLease(key: string, owner: string): Promise<boolean>
  /** El valor de `key`, o `null` si no existe o ya caducó. */
  getWithTtl(key: string): Promise<string | null>
  /** Guarda `value` en `key` hasta que pasen `ttlMs`. */
  setWithTtl(key: string, value: string, ttlMs: number): Promise<void>
  /** Libera la conexión o los temporizadores del adaptador. */
  close(): Promise<void>
}
