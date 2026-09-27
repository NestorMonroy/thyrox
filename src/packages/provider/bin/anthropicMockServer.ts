#!/usr/bin/env bun
/**
 * El proxy local de la Messages API como proceso, para quien no puede
 * importar `startAnthropicMockServer`: el pool de ítems es shell.
 *
 * Imprime `url=<loopback>` en la primera línea de stdout y atiende hasta
 * SIGTERM o SIGINT, cuando cierra y sale 0. Con `--requests-log <archivo>`
 * añade una línea por petición —método, ruta, modelo y clase de credencial—:
 * quien lo lanza cuenta ahí que los ítems llegaron al proxy y no a otro sitio.
 *
 * Sirve para medir lo que corre en local —la memoria de `thyrox -p`, que es
 * lo que GNU Time ve— sin credencial: el proveedor exige una, y aquí basta
 * un marcador que nunca sale del loopback.
 *
 * Métrica: el proceso cliente completo contra respuestas mínimas.
 * Ciega a: el tamaño de una respuesta real y a las herramientas que un turno
 * real invoca; la memoria que eso añade no aparece contra este servidor.
 */
import { appendFileSync } from 'node:fs'
import { startAnthropicMockServer } from '../src/anthropicMockServer.ts'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

/**
 * Qué CLASE de credencial trajo la petición —la cabecera, nunca su valor—:
 * el registro es un archivo, y una credencial real que llegara aquí por error
 * no debe quedar escrita en él.
 */
function authKind(headers: Record<string, string | string[] | undefined>): string {
  if (headers['authorization'] !== undefined) return 'authorization'
  if (headers['x-api-key'] !== undefined) return 'x-api-key'
  return 'none'
}

const requestsLog = argument('--requests-log')
const server = await startAnthropicMockServer({
  host: '127.0.0.1',
  respond: (body, request) => {
    if (requestsLog) {
      const model = (body as { model?: string } | null)?.model ?? '-'
      appendFileSync(requestsLog, `${request.method} ${request.path} ${model} auth=${authKind(request.headers)}\n`)
    }
    return {}
  },
})
// Los manejadores van ANTES de anunciar la URL: la URL es la señal de «listo»,
// y quien la recibe puede mandar SIGTERM en seguida. Anunciar primero dejaba
// una ventana en la que la señal mataba el proceso con 143 (11 de 40 bajo
// carga, banco `test-isolation-leaks-20260927T080507`).
const stop = (): void => { void server.close().then(() => process.exit(0)) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdout.write(`url=${server.url}\n`)
