/**
 * Puerto de `ccnmt: packages/headless-sdk/src/controlMessageCompat.ts`
 * (verbatim — sin imports en la fuente).
 *
 * Normaliza `requestId` camelCase → `request_id` snake_case en mensajes de
 * control entrantes (control_request, control_response).
 *
 * Builds antiguos de la app iOS mandan `requestId` por un mapeo CodingKeys
 * de Swift ausente. Sin este shim, `isSDKControlRequest` en el bridge del
 * REPL rechaza el mensaje (comprueba `'request_id' in value`), y el lector
 * de I/O estructurado lee `message.response.request_id` como undefined —
 * ambos descartan el mensaje en silencio.
 *
 * Si están presentes `request_id` y `requestId`, gana snake_case. Muta el
 * objeto en el lugar.
 */
export function normalizeControlMessageKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>
  if ('requestId' in record && !('request_id' in record)) {
    record.request_id = record.requestId
    delete record.requestId
  }
  if (
    'response' in record &&
    record.response !== null &&
    typeof record.response === 'object'
  ) {
    const response = record.response as Record<string, unknown>
    if ('requestId' in response && !('request_id' in response)) {
      response.request_id = response.requestId
      delete response.requestId
    }
  }
  return obj
}
