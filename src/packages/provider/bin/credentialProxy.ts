#!/usr/bin/env bun
/**
 * El proxy de credencial como proceso (`bin/provider-credential-proxy`).
 *
 *   credentialProxy --socket <ruta> [--upstream <url>]
 *
 * Resuelve su credencial con la cadena de `credentials.ts` en SU entorno,
 * escucha en `<ruta>` y reenvía al servicio (por defecto `ANTHROPIC_BASE_URL`
 * o `https://api.anthropic.com`). Imprime `socket=<ruta>` cuando ya escucha y
 * atiende hasta SIGTERM o SIGINT, cuando cierra, borra el socket y sale 0.
 *
 * Quien lo lanza reparte a sus hijos sólo `ANTHROPIC_UNIX_SOCKET=<ruta>` y el
 * marcador `ssh-placeholder` como credencial: ningún hijo ve el secreto.
 *
 * Sin credencial rehúsa con exit 2 y no escucha: un proxy sin credencial
 * aceptaría peticiones que el servicio rechazaría una a una.
 */
import { openExistingConnectionStore } from '../src/accounts/connectionStoreHome.ts'
import { resolveCredential } from '../src/credentials.ts'
import { startCredentialProxy } from '../src/credentialProxy.ts'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const socketPath = argument('--socket')
if (!socketPath) {
  process.stderr.write('credentialProxy: falta --socket <ruta>\n')
  process.exit(2)
}
const upstream = argument('--upstream') ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
// El proxy resuelve la credencial una vez al arrancar; la conexión del store es
// la última fuente de la cadena, así que se abre sólo para esa lectura.
const opened = openExistingConnectionStore()
const credential = resolveCredential(process.env, undefined, opened?.store)
opened?.close()
if (credential.source === 'none' || credential.source === 'proxy') {
  process.stderr.write(
    'credentialProxy: sin credencial propia — declara ANTHROPIC_AUTH_TOKEN, THYROX_CODE_OAUTH_TOKEN, ' +
      'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR o ANTHROPIC_API_KEY en el entorno del proxy' +
      (credential.error ? ` (${credential.error})` : '') + '. NO se escucha.\n',
  )
  process.exit(2)
}

const proxy = await startCredentialProxy({ socketPath, upstream, credential })
// Los manejadores van ANTES de anunciar: el anuncio es la señal de «listo»,
// y quien lo lee puede mandar SIGTERM en seguida.
const stop = (): void => { void proxy.close().then(() => process.exit(0)) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdout.write(`socket=${proxy.socketPath}\n`)
