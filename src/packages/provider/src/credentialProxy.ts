/**
 * El proxy de credencial: escucha en un socket Unix y reenvía cada petición al
 * servicio del modelo con SU credencial.
 *
 * Es la otra mitad del túnel que el cliente ya porta (`tunnelSocket`, `i1` de
 * 2.1.283): quien habla por el socket lleva el marcador `ssh-placeholder` en
 * lugar de la credencial, y la credencial real sólo existe en este proceso.
 * Así los procesos que se lanzan —cada `thyrox -p` de un pool— no heredan un
 * secreto: heredan una ruta de socket.
 *
 * La credencial se resuelve con la cadena de `credentials.ts` en el proceso
 * del proxy; nunca se toma de la petición. Las cabeceras de autenticación que
 * traiga la petición se descartan, marcador incluido.
 *
 * Contrato del ejecutable y extractos: `.claude/workbench/unix-socket-proxy-*`
 * (`i1`, `dt`, `at`, `nRe`, obtenidos con `bin/binary`).
 */
import { rmSync } from 'node:fs'
import { authHeaders, type Credential } from './credentials.ts'

/** Cabeceras que describen la credencial o el salto, y que no se reenvían. */
const DROPPED_HEADERS = ['authorization', 'x-api-key', 'host', 'connection', 'content-length']

export type CredentialProxyOptions = {
  /** Ruta del socket Unix donde escucha. Si existe, se reemplaza. */
  socketPath: string
  /** Origen del servicio, p. ej. `https://api.anthropic.com`. */
  upstream: string
  /** La credencial propia del proxy (`resolveCredential()` en su proceso). */
  credential: Credential
}

export type CredentialProxy = {
  socketPath: string
  close(): Promise<void>
}

export async function startCredentialProxy(options: CredentialProxyOptions): Promise<CredentialProxy> {
  const injected = authHeaders(options.credential)
  if (Object.keys(injected).length === 0) {
    throw new Error(
      `el proxy necesita una credencial propia y resolvió «${options.credential.source}»` +
        (options.credential.error ? ` (${options.credential.error})` : ''),
    )
  }
  const upstream = options.upstream.replace(/\/+$/, '')
  rmSync(options.socketPath, { force: true })

  const server = Bun.serve({
    unix: options.socketPath,
    async fetch(request) {
      const url = new URL(request.url)
      const headers = new Headers(request.headers)
      for (const name of DROPPED_HEADERS) headers.delete(name)
      for (const [name, value] of Object.entries(injected)) headers.set(name, value)
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
      const response = await fetch(`${upstream}${url.pathname}${url.search}`, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        redirect: 'manual',
        // Sin el corte de 300 s del fetch de Bun: detrás puede haber un modelo
        // local en el prefill; el plazo es del cliente y del proxy (A6 r7).
        timeout: false,
      } as RequestInit)
      // El cuerpo se devuelve como flujo: una respuesta SSE llega evento a
      // evento, no al terminar.
      return new Response(response.body, { status: response.status, headers: response.headers })
    },
  })

  return {
    socketPath: options.socketPath,
    async close() {
      await server.stop(true)
      rmSync(options.socketPath, { force: true })
    },
  }
}
