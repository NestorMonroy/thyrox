/**
 * Puerto de `ccnmt: packages/output/src/contracts.ts` (verbatim, sin
 * cambios de forma — el archivo fuente no declara ningun import).
 *
 * El contrato minimo que un "target" de salida cumple: recibe un
 * `OutputEvent` y decide que hacer con el (imprimirlo, guardarlo,
 * ignorarlo). `JsonOutputTarget`, `SilentOutputTarget` y
 * `TerminalOutputTarget` (en `./targets/`) son las tres implementaciones
 * portadas; `CapturingOutputTarget` (en `./testing/`) es la cuarta, de
 * prueba.
 */
export type OutputEvent =
  | { type: 'message'; value: unknown }
  | { type: 'tool_progress'; value: unknown }
  | { type: 'error'; error: unknown }
  | { type: 'permission'; value: unknown }
  | { type: string; [key: string]: unknown }

export type OutputTarget = {
  emit(event: OutputEvent): Promise<void> | void
  flush?(): Promise<void> | void
  close?(): Promise<void> | void
}
