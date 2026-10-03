# P2 — servidor y cliente del coordinador sobre un socket UNIX

Tarea: TASK-THYROX-0734 (tarjeta 96). Archivos tuyos: `src/packages/model-scheduling/coordinatorServer.ts`,
`coordinatorClient.ts` y `coordinatorProtocol.ts`. Pruebas: `__tests__/coordinatorTransport.test.ts`.

Lee completos los tres archivos (contratos y docstrings) y, como precedente del árbol para UDS con JSON por línea,
`src/packages/daemon/src/socketServer.ts` y `socketProto.ts` (reutiliza la forma, no importes el daemon).

- Protocolo: una petición y una respuesta por línea JSON (`CoordinatorRequest` → `CoordinatorResponse`). Una línea que
  no es JSON o que no es una petición conocida responde `{ ok: false, code: 'EBADREQ' }` y la conexión sigue viva;
  `proto` distinto de `MODEL_COORDINATOR_PROTO`, `EPROTO`.
- Servidor: crea el directorio del socket con modo 0700; lock `<socket>.lock` con el PID: si su dueño vive,
  `CoordinatorAlreadyRunningError`; si no, lo reemplaza. Retira un socket viejo antes de escuchar; el socket queda en
  0600. Cada conexión recuerda los `admissionId` que admitió; al cerrarse llama a `finish` por los que no soltó.
  `close()` deja de aceptar, cierra conexiones (soltando sus tickets) y retira socket y lock.
- Cliente: `connect` falla con `CoordinatorUnavailableError` si no hay socket o nadie escucha. Las peticiones de un
  cliente se serializan sobre su conexión; `close()` la cierra.
