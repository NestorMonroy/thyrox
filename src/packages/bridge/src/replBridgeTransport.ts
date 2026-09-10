/**
 * Abstracción de transporte para replBridge. Cubre exactamente la
 * superficie que replBridge.ts usa contra HybridTransport, para que la
 * elección v1/v2 quede confinada al sitio de construcción.
 *
 * - v1: HybridTransport (lecturas WS + escrituras POST a Session-Ingress)
 * - v2: SSETransport (lecturas) + CCRClient (escrituras a CCR v2 /worker/*)
 *
 * El camino de escritura v2 pasa por CCRClient.writeEvent →
 * SerialBatchEventUploader, NO por SSETransport.write() — SSETransport.write()
 * apunta a la forma de URL POST de Session-Ingress, que está mal para
 * CCR v2.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/replBridgeTransport.ts`
 * PARA `ReplBridgeTransport` y `createV1ReplTransport` (2 de 3 exports,
 * completos). `createV2ReplTransport` — el 3er export — está
 * DECLARADO COMO BLOQUEADO, no omitido: existe con su firma exacta y
 * lanza al invocarse. Bloqueo: envuelve `CCRClient`
 * (`ccnmt: packages/cli/src/transports/ccrClient.ts`, 998 líneas) y
 * `SSETransport` (`ccnmt: packages/cli/src/transports/SSETransport.ts`,
 * 718 líneas) — dos clases de transporte HTTP/SSE con heartbeat,
 * backoff y batching real, medido ausentes en `@thyrox/cli` (0 hits de
 * `ccrClient`/`SSETransport` ahí). Es el mismo caso que
 * `createPtyAdopter`/`spawnPtyHost` en `@thyrox/daemon`: pertenecen de
 * verdad a OTRO dominio (`@thyrox/cli`), no un olvido. Se retira cuando
 * `@thyrox/cli` porte ambas clases Y `@thyrox/bridge` sea miembro del
 * workspace.
 *
 * `HybridTransport`/`SessionState` son sólo-tipo (se borran al
 * compilar) — se citan `@thyrox/cli`/`@thyrox/storage`, mismo convenio
 * que el resto del árbol, aunque `@thyrox/cli` aún no porte ese archivo
 * exacto. `updateSessionIngressAuthToken` es sustituto — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import type { StdoutMessage } from '@thyrox/headless-sdk/controlTypes.js'
import type { HybridTransport } from '@thyrox/cli/transports/HybridTransport.js'
import type { SessionState } from '@thyrox/storage/sessionState.js'
import { updateSessionIngressAuthToken } from './internal/pendingCrossPackageDeps.js'
import { registerWorker } from './workSecret.js'

export type ReplBridgeTransport = {
  write(message: StdoutMessage): Promise<void>
  writeBatch(messages: StdoutMessage[]): Promise<void>
  close(): void
  isConnectedStatus(): boolean
  getStateLabel(): string
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
  setOnConnect(callback: () => void): void
  connect(): void
  /**
   * Marca de agua alta de los números de secuencia de eventos del
   * stream de lectura subyacente. replBridge lee esto antes de
   * intercambiar transportes para que el nuevo pueda continuar desde
   * donde el viejo se quedó (si no, el servidor reproduce toda la
   * historia de la sesión desde seq 0).
   *
   * v1 devuelve 0 — el WS de Session-Ingress no usa números de
   * secuencia SSE; el replay al reconectar lo maneja el cursor de
   * mensajes del lado servidor.
   */
  getLastSequenceNum(): number
  /**
   * Conteo monótono de batches descartados vía maxConsecutiveFailures.
   * Se toma un snapshot antes de writeBatch() y se compara después para
   * detectar descartes silenciosos (writeBatch() resuelve normalmente
   * incluso cuando se descartaron batches). v2 devuelve 0 — el camino
   * de escritura v2 no fija maxConsecutiveFailures.
   */
  readonly droppedBatchCount: number
  /**
   * Estado PUT /worker (sólo v2; v1 es un no-op). `requires_action` le
   * dice al backend que hay un prompt de permiso pendiente — claude.ai
   * muestra el indicador "waiting for input". Los llamadores
   * REPL/daemon no necesitan esto (el usuario mira el REPL localmente);
   * los llamadores worker multi-sesión sí.
   */
  reportState(state: SessionState): void
  /** PUT /worker external_metadata (sólo v2; v1 es un no-op). */
  reportMetadata(metadata: Record<string, unknown>): void
  /**
   * POST /worker/events/{id}/delivery (sólo v2; v1 es un no-op). Puebla
   * las columnas processing_at/processed_at de CCR. `received` lo
   * dispara automáticamente CCRClient en cada frame SSE y no se expone
   * aquí.
   */
  reportDelivery(eventId: string, status: 'processing' | 'processed'): void
  /**
   * Vacía la cola de escritura antes de close() (sólo v2; v1 resuelve
   * de inmediato — los POSTs de HybridTransport ya se esperan por
   * escritura).
   */
  flush(): Promise<void>
}

/**
 * Adaptador v1: HybridTransport ya tiene la superficie completa
 * (extiende WebSocketTransport, que tiene setOnConnect +
 * getStateLabel). Este es un wrapper no-op que existe sólo para que la
 * variable `transport` de replBridge tenga un único tipo.
 */
export function createV1ReplTransport(
  hybrid: HybridTransport,
): ReplBridgeTransport {
  return {
    write: msg => hybrid.write(msg),
    writeBatch: msgs => hybrid.writeBatch(msgs),
    close: () => hybrid.close(),
    isConnectedStatus: () => hybrid.isConnectedStatus(),
    getStateLabel: () => hybrid.getStateLabel(),
    setOnData: cb => hybrid.setOnData(cb),
    setOnClose: cb => hybrid.setOnClose(cb),
    setOnConnect: cb => hybrid.setOnConnect(cb),
    connect: () => void hybrid.connect(),
    // El WS v1 de Session-Ingress no usa números de secuencia SSE; la
    // semántica de replay es distinta. Siempre devuelve 0 para que la
    // lógica de carryover de seq-num en replBridge sea un no-op para v1.
    getLastSequenceNum: () => 0,
    get droppedBatchCount() {
      return hybrid.droppedBatchCount
    },
    reportState: () => {},
    reportMetadata: () => {},
    reportDelivery: () => {},
    flush: () => Promise.resolve(),
  }
}

/** Opciones de `createV2ReplTransport` — puerto fiel de la firma de la fuente. */
export type CreateV2ReplTransportOpts = {
  sessionUrl: string
  ingressToken: string
  sessionId: string
  /**
   * Marca de agua alta del número de secuencia SSE del transporte
   * anterior. Se pasa al nuevo SSETransport para que su primer
   * connect() envíe from_sequence_num / Last-Event-ID y el servidor
   * reanude desde donde el stream viejo se quedó. Sin esto, cada
   * intercambio de transporte le pide al servidor reproducir toda la
   * historia de la sesión desde seq 0.
   */
  initialSequenceNum?: number
  /**
   * Worker epoch de la respuesta de POST /bridge. Cuando se provee, el
   * servidor ya adelantó el epoch (la llamada /bridge ES el registro —
   * ver server PR #293280). Cuando se omite (camino v1 CCR-v2 vía el
   * poll loop de replBridge.ts), se llama registerWorker como antes.
   */
  epoch?: number
  /** Intervalo de heartbeat de CCRClient. Default 20s si se omite. */
  heartbeatIntervalMs?: number
  /** ±fracción de jitter por beat. Default 0 (sin jitter) si se omite. */
  heartbeatJitterFraction?: number
  /**
   * Cuando es true, omite abrir el stream de lectura SSE — sólo se
   * activa el camino de escritura de CCRClient. Se usa para adjuntos en
   * modo espejo que reenvían eventos pero nunca reciben prompts
   * entrantes ni control requests.
   */
  outboundOnly?: boolean
  /**
   * Fuente de cabecera de auth por instancia. Cuando se provee,
   * CCRClient + SSETransport leen la auth de este closure en vez de la
   * env var de proceso CLAUDE_CODE_SESSION_ACCESS_TOKEN. Obligatorio
   * para llamadores que manejan varias sesiones concurrentes — el
   * camino por env var se pisa entre sesiones. Cuando se omite, cae a
   * la env var (llamadores de una sola sesión).
   */
  getAuthToken?: () => string | undefined
}

/**
 * Adaptador v2: envuelve SSETransport (lecturas) + CCRClient
 * (escrituras, heartbeat, estado, seguimiento de entrega).
 *
 * BLOQUEADO — ver el docstring del módulo. `CCRClient` y `SSETransport`
 * son dominio de `@thyrox/cli`, no de bridge, y `@thyrox/cli` aún no
 * las porta. Esta función existe con la firma exacta de la fuente
 * (contrato de tipos completo) y lanza al invocarse, en vez de
 * omitirse en silencio.
 */
export async function createV2ReplTransport(
  _opts: CreateV2ReplTransportOpts,
): Promise<ReplBridgeTransport> {
  // Referenciados para que el linter no marque los imports como sin
  // uso mientras la función está bloqueada — se usan de verdad en
  // cuanto @thyrox/cli porte ccrClient.ts/SSETransport.ts.
  void updateSessionIngressAuthToken
  void registerWorker
  throw new Error(
    'createV2ReplTransport: bloqueado — @thyrox/cli aún no porta ' +
      'CCRClient (ccrClient.ts, 998 líneas fuente) ni SSETransport ' +
      '(SSETransport.ts, 718 líneas fuente). Ver el docstring de este ' +
      'módulo. Usar createV1ReplTransport mientras tanto.',
  )
}
