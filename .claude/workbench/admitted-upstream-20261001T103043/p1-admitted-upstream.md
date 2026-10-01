# P1 — El relé admitido del proxy local (TASK-THYROX-0700, ADR-007 1.14.0, M8)

Archivo: `src/packages/provider/src/proxy/openaiCompat/admittedUpstream.ts`
(contrato y docstring ya escritos; sólo `startAdmittedUpstream` está por
implementar). Pruebas: `src/packages/provider/src/proxy/__tests__/admittedUpstream.test.ts`.

- `Bun.serve` en `127.0.0.1`, puerto 0; `baseUrl` = `http://127.0.0.1:<puerto>/v1`.
- Por petición POST: leer el JSON; sin `model` string → 400 OpenAI, sin admitir.
  `source.admit({ requestId: newRequestId(), client, model })`.
- `admitted`: POST a `${ticket.unit.endpoint}${ruta}` (la ruta que llegó, con
  `/v1`), cuerpo con `model = ticket.grant.artifact.modelId`, cabeceras de
  contenido. Devolver estado, cabeceras y cuerpo del runtime; el cuerpo se
  envuelve para llamar `finish(admissionId)` exactamente una vez al terminar o
  al cancelarse. Si el fetch al runtime lanza: 502 `upstream_unreachable` y
  `finish` igual.
- `refused`/`failed`: 503 con `{ error: { type, message } }` (`admission_refused`
  / `admission_failed`), el mensaje nombra etapa y causa; sin `finish`.
- `admit` que lanza: 503 `coordinator_unavailable` con el mensaje del error.
- `stop()` cierra el servidor.
