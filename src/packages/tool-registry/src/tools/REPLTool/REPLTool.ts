/**
 * Marcador de la herramienta REPL: la fuente (ccb) la declara deshabilitada
 * (`isEnabled: () => false`), así que la hidratación de `runAgentTelemetry`
 * no hace nada hasta que exista una implementación real. Era un `.js` sin
 * tipos ni entrada en el mapa de exportaciones, y su único consumidor no
 * resolvía el módulo.
 */
export const REPLTool: { name: string; isEnabled: () => boolean } = {
  name: 'REPLTool',
  isEnabled: () => false,
}
