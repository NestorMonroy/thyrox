/**
 * Puerto de `ccnmt: packages/server/src/upstreamproxy/relay.ts`.
 *
 * Relay CONNECT-sobre-WebSocket para el upstreamproxy de CCR.
 *
 * Escucha en TCP local, acepta HTTP CONNECT de curl/gh/kubectl/etc, y
 * túnelea bytes por WebSocket hacia el endpoint de upstreamproxy de CCR.
 * El lado servidor de CCR termina el túnel, hace MITM de TLS, inyecta
 * credenciales configuradas por la organización (p. ej. DD-API-KEY), y
 * reenvía al upstream real.
 *
 * POR QUÉ WebSocket y no CONNECT crudo: el ingress de CCR es GKE L7 con
 * ruteo por prefijo de path; no hay connect_matcher en cdk-constructs. El
 * túnel de session-ingress (sessions/tunnel/v1alpha/tunnel.proto) ya usa
 * este patrón.
 *
 * Protocolo: los bytes se envuelven en mensajes protobuf UpstreamProxyChunk
 * (`message UpstreamProxyChunk { bytes data = 1; }`) por compatibilidad
 * con gateway.NewWebSocketStreamAdapter del lado servidor.
 *
 * `logForDebugging`/`getWebSocketTLSOptions`/`getWebSocketProxyAgent`/
 * `getWebSocketProxyUrl` — ver `../internal/pendingCrossPackageDeps.js`.
 *
 * La rama Node usa `import('ws')` dinámico, igual que la fuente — no es
 * un rodeo mío por Rule 3 (Bun trae un shim nativo de `ws`, verificado en
 * este turno), sino la propia detección de runtime de ccnmt.
 */
import { createServer, type Socket as NodeSocket } from 'node:net'
import { requireLocalObservabilityDebug, requireProviderMtls, requireProviderProxy } from '../internal/pendingCrossPackageDeps.js'

// El contenedor CCR corre detrás de un gateway de egreso — el outbound
// directo está bloqueado, así que el upgrade de WS tiene que pasar por el
// mismo proxy HTTP CONNECT que usa todo lo demás. El globalThis.WebSocket
// de undici no consulta el dispatcher global para el upgrade, así que bajo
// Node se usa el paquete ws con un agent explícito (mismo patrón que
// SessionsWebSocket). El WebSocket nativo de Bun toma una URL de proxy
// directo. Se precarga en startNodeRelay para que openTunnel siga siendo
// síncrono y la máquina de estados de CONNECT no compita.
type WSCtor = typeof import('ws').default
let nodeWSCtor: WSCtor | undefined

// Intersección de la superficie que toca openTunnel. Tanto el
// globalThis.WebSocket de undici como el paquete ws la satisfacen vía
// handlers onX de estilo propiedad.
type WebSocketLike = Pick<
  WebSocket,
  | 'onopen'
  | 'onmessage'
  | 'onerror'
  | 'onclose'
  | 'send'
  | 'close'
  | 'readyState'
  | 'binaryType'
>

// Tope de buffer por petición de Envoy. Los payloads de Datadog de la
// semana 1 no lo van a tocar, pero se diseña para eso para que un
// git-push no necesite un rewrite del relay.
const MAX_CHUNK_BYTES = 512 * 1024

// El timeout de idle del sidecar es 50s; el ping va bien adentro de eso.
const PING_INTERVAL_MS = 30_000

/**
 * Codifica un mensaje protobuf UpstreamProxyChunk a mano.
 *
 * Para `message UpstreamProxyChunk { bytes data = 1; }` el wire format es:
 *   tag = (field_number << 3) | wire_type = (1 << 3) | 2 = 0x0a
 *   seguido del varint de longitud, seguido de los bytes.
 *
 * protobufjs sería la respuesta general; para un mensaje de un solo campo
 * bytes la codificación a mano son 10 líneas y evita una dependencia en
 * tiempo de ejecución en el hot path.
 */
export function encodeChunk(data: Uint8Array): Uint8Array {
  const len = data.length
  // codificación varint de la longitud — la mayoría de los chunks caben en 1-3 bytes
  const varint: number[] = []
  let n = len
  while (n > 0x7f) {
    varint.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  varint.push(n)
  const out = new Uint8Array(1 + varint.length + len)
  out[0] = 0x0a
  out.set(varint, 1)
  out.set(data, 1 + varint.length)
  return out
}

/**
 * Decodifica un UpstreamProxyChunk. Devuelve el campo data, o null si está malformado.
 * Tolera que el servidor mande un chunk de longitud cero (semántica de keepalive).
 */
export function decodeChunk(buf: Uint8Array): Uint8Array | null {
  if (buf.length === 0) return new Uint8Array(0)
  if (buf[0] !== 0x0a) return null
  let len = 0
  let shift = 0
  let i = 1
  while (i < buf.length) {
    const b = buf[i]!
    len |= (b & 0x7f) << shift
    i++
    if ((b & 0x80) === 0) break
    shift += 7
    if (shift > 28) return null
  }
  if (i + len > buf.length) return null
  return buf.subarray(i, i + len)
}

export type UpstreamProxyRelay = {
  port: number
  stop: () => void
}

type ConnState = {
  ws?: WebSocketLike
  connectBuf: Buffer
  pinger?: ReturnType<typeof setInterval>
  // Bytes que llegaron después de la cabecera CONNECT pero antes de que
  // dispare ws.onopen. TCP puede coalescer CONNECT + ClientHello en un
  // solo paquete, y el callback data del socket puede volver a disparar
  // mientras el handshake de WS sigue en vuelo. Ambos casos perderían
  // bytes en silencio sin este buffer.
  pending: Buffer[]
  wsOpen: boolean
  // Se fija una vez que el 200 Connection Established del servidor ya se
  // reenvió y el túnel está cargando TLS. Después de eso, escribir un 502
  // en texto plano corrompería el stream TLS del cliente — sólo se cierra.
  established: boolean
  // onerror de WS siempre va seguido de onclose; sin esta guarda el
  // segundo handler haría sock.end() sobre un socket ya terminado. Gana
  // el primero que llega.
  closed: boolean
}

/**
 * Abstracción mínima de socket para que el parser de CONNECT y la
 * plomería del túnel WS sean agnósticas de runtime. Las implementaciones
 * manejan el backpressure de escritura internamente: sock.write() de Bun
 * hace escrituras parciales y necesita encolado explícito de la cola;
 * net.Socket de Node bufferea sin condiciones y nunca pierde bytes.
 */
type ClientSocket = {
  write: (data: Uint8Array | string) => void
  end: () => void
}

function newConnState(): ConnState {
  return {
    connectBuf: Buffer.alloc(0),
    pending: [],
    wsOpen: false,
    established: false,
    closed: false,
  }
}

/**
 * Arranca el relay. Devuelve el puerto efímero al que se enlazó y una
 * función stop. Usa Bun.listen cuando está disponible, si no
 * net.createServer de Node — el contenedor CCR corre el CLI bajo Node, no Bun.
 */
export async function startUpstreamProxyRelay(opts: {
  wsUrl: string
  sessionId: string
  token: string
}): Promise<UpstreamProxyRelay> {
  const { logForDebugging } = requireLocalObservabilityDebug()

  const authHeader =
    'Basic ' + Buffer.from(`${opts.sessionId}:${opts.token}`).toString('base64')
  // El upgrade de WS en sí está auth-gateado (proto authn: PRIVATE_API) —
  // el gateway quiere el JWT de session-ingress en la petición de
  // upgrade, separado del Proxy-Authorization que viaja dentro del
  // CONNECT tuneleado.
  const wsAuthHeader = `Bearer ${opts.token}`

  const relay =
    typeof Bun !== 'undefined'
      ? startBunRelay(opts.wsUrl, authHeader, wsAuthHeader)
      : await startNodeRelay(opts.wsUrl, authHeader, wsAuthHeader)

  logForDebugging(`[upstreamproxy] relay listening on 127.0.0.1:${relay.port}`)
  return relay
}

function startBunRelay(
  wsUrl: string,
  authHeader: string,
  wsAuthHeader: string,
): UpstreamProxyRelay {
  const { logForDebugging } = requireLocalObservabilityDebug()

  // Los sockets TCP de Bun no auto-bufferean escrituras parciales:
  // sock.write() devuelve el conteo de bytes realmente entregados al
  // kernel, y el resto se descarta en silencio. Cuando el buffer del
  // kernel se llena, se encola la cola y el handler drain la vacía. Es
  // por-socket porque el closure del adapter sobrevive a llamadas
  // individuales del handler.
  type BunState = ConnState & { writeBuf: Uint8Array[] }

  const server = Bun.listen<BunState>({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open(sock) {
        sock.data = { ...newConnState(), writeBuf: [] }
      },
      data(sock, data) {
        const st = sock.data
        const adapter: ClientSocket = {
          write: payload => {
            const bytes =
              typeof payload === 'string'
                ? Buffer.from(payload, 'utf8')
                : payload
            if (st.writeBuf.length > 0) {
              st.writeBuf.push(bytes)
              return
            }
            const n = sock.write(bytes)
            if (n < bytes.length) st.writeBuf.push(bytes.subarray(n))
          },
          end: () => sock.end(),
        }
        handleData(adapter, st, data, wsUrl, authHeader, wsAuthHeader)
      },
      drain(sock) {
        const st = sock.data
        while (st.writeBuf.length > 0) {
          const chunk = st.writeBuf[0]!
          const n = sock.write(chunk)
          if (n < chunk.length) {
            st.writeBuf[0] = chunk.subarray(n)
            return
          }
          st.writeBuf.shift()
        }
      },
      close(sock) {
        cleanupConn(sock.data)
      },
      error(sock, err) {
        logForDebugging(`[upstreamproxy] client socket error: ${err.message}`)
        cleanupConn(sock.data)
      },
    },
  })

  return {
    port: server.port,
    stop: () => server.stop(true),
  }
}

// Exportado para que los tests puedan ejercitar el camino Node
// directamente — el test runner es Bun, así que el dispatch de runtime en
// startUpstreamProxyRelay siempre elige Bun.
export async function startNodeRelay(
  wsUrl: string,
  authHeader: string,
  wsAuthHeader: string,
): Promise<UpstreamProxyRelay> {
  const { logForDebugging } = requireLocalObservabilityDebug()

  nodeWSCtor = (await import('ws')).default
  const states = new WeakMap<NodeSocket, ConnState>()

  const server = createServer(sock => {
    const st = newConnState()
    states.set(sock, st)
    // sock.write() de Node bufferea internamente — un retorno false
    // señala backpressure pero los bytes ya están encolados, así que no
    // hace falta rastreo de cola para la corrección. Los payloads de la
    // semana 1 no van a estresar el buffer.
    const adapter: ClientSocket = {
      write: payload => {
        sock.write(typeof payload === 'string' ? payload : Buffer.from(payload))
      },
      end: () => sock.end(),
    }
    sock.on('data', (data: Buffer) =>
      handleData(adapter, st, data, wsUrl, authHeader, wsAuthHeader),
    )
    sock.on('close', () => cleanupConn(states.get(sock)))
    sock.on('error', err => {
      logForDebugging(`[upstreamproxy] client socket error: ${err.message}`)
      cleanupConn(states.get(sock))
    })
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr === null || typeof addr === 'string') {
        reject(new Error('upstreamproxy: server has no TCP address'))
        return
      }
      resolve({
        port: addr.port,
        stop: () => server.close(),
      })
    })
  })
}

/**
 * Handler compartido de datos por conexión. La fase 1 acumula la
 * petición CONNECT; la fase 2 reenvía bytes del cliente por el túnel WS.
 */
function handleData(
  sock: ClientSocket,
  st: ConnState,
  data: Buffer,
  wsUrl: string,
  authHeader: string,
  wsAuthHeader: string,
): void {
  // Fase 1: acumula hasta ver la petición CONNECT completa (terminada por
  // CRLF CRLF). curl/gh la mandan en un solo paquete, pero no se asume.
  if (!st.ws) {
    st.connectBuf = Buffer.concat([st.connectBuf, data])
    const headerEnd = st.connectBuf.indexOf('\r\n\r\n')
    if (headerEnd === -1) {
      // Guarda contra un cliente que nunca manda CRLFCRLF.
      if (st.connectBuf.length > 8192) {
        sock.write('HTTP/1.1 400 Bad Request\r\n\r\n')
        sock.end()
      }
      return
    }
    const reqHead = st.connectBuf.subarray(0, headerEnd).toString('utf8')
    const firstLine = reqHead.split('\r\n')[0] ?? ''
    const m = firstLine.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i)
    if (!m) {
      sock.write('HTTP/1.1 405 Method Not Allowed\r\n\r\n')
      sock.end()
      return
    }
    // Guarda cualquier byte que haya llegado después de la cabecera
    // CONNECT para que openTunnel lo vacíe una vez que el WS esté abierto.
    const trailing = st.connectBuf.subarray(headerEnd + 4)
    if (trailing.length > 0) {
      st.pending.push(Buffer.from(trailing))
    }
    st.connectBuf = Buffer.alloc(0)
    openTunnel(sock, st, firstLine, wsUrl, authHeader, wsAuthHeader)
    return
  }
  // Fase 2: el WS ya existe. Si no está OPEN todavía, bufferea;
  // ws.onopen lo vaciará. Una vez abierto, bombea los bytes del cliente al WS en chunks.
  if (!st.wsOpen) {
    st.pending.push(Buffer.from(data))
    return
  }
  forwardToWs(st.ws, data)
}

function openTunnel(
  sock: ClientSocket,
  st: ConnState,
  connectLine: string,
  wsUrl: string,
  authHeader: string,
  wsAuthHeader: string,
): void {
  const { getWebSocketTLSOptions } = requireProviderMtls()
  const { getWebSocketProxyAgent, getWebSocketProxyUrl } = requireProviderProxy()

  // core/websocket/stream.go elige JSON vs binary-proto a partir de la
  // cabecera Content-Type de la petición de upgrade (por defecto JSON).
  // Sin application/proto el servidor hace protojson.Unmarshal de
  // nuestros chunks binarios hechos a mano y falla en silencio con EOF.
  const headers = {
    'Content-Type': 'application/proto',
    Authorization: wsAuthHeader,
  }
  let ws: WebSocketLike
  if (nodeWSCtor) {
    ws = new nodeWSCtor(wsUrl, {
      headers,
      agent: getWebSocketProxyAgent(wsUrl),
      ...getWebSocketTLSOptions(),
    }) as unknown as WebSocketLike
  } else {
    ws = new globalThis.WebSocket(wsUrl, {
      headers,
      proxy: getWebSocketProxyUrl(wsUrl),
      tls: getWebSocketTLSOptions() || undefined,
    } as unknown as string[]) as unknown as WebSocketLike
  }
  ws.binaryType = 'arraybuffer'
  st.ws = ws

  ws.onopen = () => {
    // El primer chunk lleva la línea CONNECT más Proxy-Authorization
    // para que el servidor pueda autenticar el túnel y saber host:puerto
    // destino. El servidor responde con su propio "HTTP/1.1 200" por el
    // túnel; sólo se reenvía.
    const head =
      `${connectLine}\r\n` + `Proxy-Authorization: ${authHeader}\r\n` + `\r\n`
    ws.send(encodeChunk(new Uint8Array(Buffer.from(head, 'utf8'))) as never)
    // Vacía lo que haya llegado mientras el handshake de WS estaba en
    // vuelo — bytes finales del paquete CONNECT y cualquier callback
    // data() que haya disparado antes de onopen.
    st.wsOpen = true
    for (const buf of st.pending) {
      forwardToWs(ws, buf)
    }
    st.pending = []
    // No todas las implementaciones de WS exponen ping(); un chunk vacío
    // funciona como keepalive a nivel de aplicación que el servidor puede ignorar.
    st.pinger = setInterval(sendKeepalive, PING_INTERVAL_MS, ws)
  }

  ws.onmessage = ev => {
    const raw =
      ev.data instanceof ArrayBuffer
        ? new Uint8Array(ev.data)
        : new Uint8Array(Buffer.from(ev.data as string))
    const payload = decodeChunk(raw)
    if (payload && payload.length > 0) {
      st.established = true
      sock.write(payload)
    }
  }

  ws.onerror = ev => {
    const msg =
      'message' in ev ? String((ev as unknown as { message: unknown }).message) : 'websocket error'
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging(`[upstreamproxy] ws error: ${msg}`)
    if (st.closed) return
    st.closed = true
    if (!st.established) {
      sock.write('HTTP/1.1 502 Bad Gateway\r\n\r\n')
    }
    sock.end()
    cleanupConn(st)
  }

  ws.onclose = () => {
    if (st.closed) return
    st.closed = true
    sock.end()
    cleanupConn(st)
  }
}

function sendKeepalive(ws: WebSocketLike): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(encodeChunk(new Uint8Array(0)) as never)
  }
}

function forwardToWs(ws: WebSocketLike, data: Buffer): void {
  if (ws.readyState !== WebSocket.OPEN) return
  for (let off = 0; off < data.length; off += MAX_CHUNK_BYTES) {
    const slice = new Uint8Array(data.subarray(off, off + MAX_CHUNK_BYTES))
    ws.send(encodeChunk(slice) as never)
  }
}

function cleanupConn(st: ConnState | undefined): void {
  if (!st) return
  if (st.pinger) clearInterval(st.pinger)
  if (st.ws && st.ws.readyState <= WebSocket.OPEN) {
    try {
      st.ws.close()
    } catch {
      // ya se está cerrando
    }
  }
  st.ws = undefined
}
