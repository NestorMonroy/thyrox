#!/usr/bin/env bun
/**
 * Sonda: ¿alcanza una unidad el socket del coordinador con las mismas
 * condiciones que el pool le da a un ítem (red del anfitrión, directorio del
 * socket montado de sólo lectura, variable exportada)? Imprime el uid, el
 * resultado de `list` o el error exacto de la conexión.
 */
import { ModelCoordinatorClient } from '@thyrox/model-scheduling/coordinatorClient.ts'

const socketPath = process.env.THYROX_MODEL_COORDINATOR_SOCKET ?? ''
console.log(`uid=${process.getuid?.()} socket=${socketPath || '(sin variable)'}`)
try {
  const client = await ModelCoordinatorClient.connect(socketPath)
  console.log(`list=${JSON.stringify(await client.list())}`)
  await client.close()
} catch (error) {
  console.log(`error=${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`)
  process.exit(1)
}
