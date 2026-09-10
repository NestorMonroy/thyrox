/**
 * DIVERGENCIA DE ALCANCE, declarada: `../json.ts` importa `logError` de
 * `@claude-code-how-works/local-observability/logging` — paquete hermano
 * ausente en este árbol (medido con `ls /home/user/thyrox/src/packages/`,
 * 2026-09-06). La fuente completa (`ccnmt: packages/local-observability/
 * src/logging/error-log.ts`) delega en un sink de error-log con cola de
 * eventos y comprobaciones de `--hard-fail`/Bedrock/Vertex/Foundry/
 * `DISABLE_ERROR_REPORTING`; nada de eso es exercitado por los tests de
 * este pase (json.test.ts mockea `logError` a un no-op para que un
 * "malformed JSON" no ensucie stdout, así que el contenido real de esta
 * función nunca se observa).
 *
 * Se reimplementa aquí el mínimo con el que el test corre: un wrapper
 * trivial sobre `console.error`, mismo fallback que usa
 * `agent/internal/logging.ts` de este árbol cuando el host no está
 * instalado (mismo patrón, otro paquete — aquí no hay `AgentHostBindings`
 * de las que depender porque `storage` es un paquete hoja).
 */
export function logError(error: unknown): void {
  console.error(error)
}
