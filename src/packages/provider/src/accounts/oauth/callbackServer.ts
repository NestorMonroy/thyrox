/**
 * El servidor local que recibe la redirección de un inicio de sesión OAuth:
 * responde al navegador con una página que se cierra sola y entrega la query
 * de la redirección. Escucha sólo en loopback.
 *
 * Porte de `omniroute: src/lib/oauth/utils/server.ts` (MIT).
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

const CALLBACK_PATHS = ['/callback', '/auth/callback']
const DEFAULT_TIMEOUT_MS = 300_000
const LOOPBACK = '127.0.0.1'

const SUCCESS_PAGE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .success { color: #22c55e; font-size: 3rem; }
    h1 { margin: 1rem 0; }
    p { color: #666; }
    #countdown { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">&#10003;</div>
    <h1>Authentication Successful</h1>
    <p id="message">Closing in <span id="countdown">3</span> seconds...</p>
  </div>
  <script>
    let count = 3;
    const countdown = document.getElementById("countdown");
    const message = document.getElementById("message");
    const timer = setInterval(() => {
      count--;
      countdown.textContent = count;
      if (count <= 0) {
        clearInterval(timer);
        window.close();
        setTimeout(() => {
          message.textContent = "Please close this tab manually.";
        }, 500);
      }
    }, 1000);
  </script>
</body>
</html>`

export interface CallbackServerOptions {
  /** Un proveedor que exige un puerto registrado lo fija; sin él, el sistema elige uno libre. */
  fixedPort?: number | null
  timeoutMs?: number
}

export interface CallbackServer {
  host: string
  port: number
  /** La query de la primera redirección que llega a una ruta de callback. */
  callback: Promise<Record<string, string>>
  close(): void
}

function listen(server: Server, port: number): Promise<AddressInfo> {
  return new Promise((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      reject(error.code === 'EADDRINUSE' && port
        ? new Error(`Port ${port} is already in use. Please close other applications using this port.`)
        : error)
    })
    server.listen(port, LOOPBACK, () => resolve(server.address() as AddressInfo))
  })
}

export async function startCallbackServer(options: CallbackServerOptions = {}): Promise<CallbackServer> {
  let deliver!: (params: Record<string, string>) => void
  let fail!: (error: Error) => void
  const callback = new Promise<Record<string, string>>((resolve, reject) => {
    deliver = resolve
    fail = reject
  })

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${LOOPBACK}`)
    if (!CALLBACK_PATHS.includes(url.pathname)) {
      response.writeHead(404)
      response.end('Not found')
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(SUCCESS_PAGE)
    deliver(Object.fromEntries(url.searchParams))
  })

  const bound = await listen(server, options.fixedPort ?? 0)
  const timer = setTimeout(() => fail(new Error('Authentication timeout')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  void callback.then(() => clearTimeout(timer), () => {})

  return {
    host: bound.address,
    port: bound.port,
    callback,
    close() {
      clearTimeout(timer)
      server.close()
    },
  }
}
