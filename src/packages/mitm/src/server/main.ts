/**
 * El proceso del servidor MITM: lee la configuración del entorno, abre el
 * store del AgentBridge, escucha, y cierra limpio con SIGTERM o SIGINT. Un
 * error al escuchar o al arrancar sale con código 1 y un mensaje saneado,
 * que es lo que el gestor lee del proceso hijo.
 *
 * Porte de `startMitmServer` y el final de `omniroute: src/mitm/server.cjs`
 * (MIT). El store se cierra al salir; la referencia no tenía store propio.
 */
import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import { openMitmStateStore } from '../state/stateStore.ts'
import { createMitmServer } from './mitmServer.ts'
import { readMitmServerConfig } from './serverConfig.ts'

function listenFailure(error: NodeJS.ErrnoException, port: number): string {
  if (error.code === 'EADDRINUSE') return `Port ${port} already in use`
  if (error.code === 'EACCES') return `Permission denied for port ${port}`
  return `Failed to listen on port ${port}: ${sanitizeErrorMessage(error)}`
}

async function main(): Promise<void> {
  const config = readMitmServerConfig()
  const db = openMitmStateStore()
  let handle
  try {
    handle = await createMitmServer(config, { db })
  } catch (error) {
    db.close()
    process.stderr.write(`[MITM] ${sanitizeErrorMessage(error)}\n`)
    process.exit(1)
  }
  // Los manejadores van antes de escuchar: quien lanza el servidor puede
  // mandar la señal en cuanto lee «ready on», y sin manejador la acción por
  // defecto termina con 130 sin cerrar la base.
  const shutdown = () => {
    void handle.close().then(() => {
      db.close()
      process.exit(0)
    })
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  try {
    await handle.listen()
  } catch (error) {
    db.close()
    process.stderr.write(`[MITM] ${listenFailure(error as NodeJS.ErrnoException, config.localPort)}\n`)
    process.exit(1)
  }
}

await main()
