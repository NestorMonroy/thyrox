/**
 * Porte fiel de `ccnmt: packages/provider/src/connectorTextTypes.ts`
 * (paquete `provider`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO — cero dependencias, ni siquiera de tipo.
 *
 * Tipos de ConnectorText — bloques de streaming de la API de Anthropic
 * para respuestas de conector. Marcador de posición de la decompilación.
 */
export type ConnectorTextBlock = {
  type: string
  connector_text: string
  signature?: string
  [key: string]: unknown
}

export type ConnectorTextDelta = {
  type: string
  connector_text: string
  text?: string
  thinking?: string
  signature?: string
  [key: string]: unknown
}

export const isConnectorTextBlock: (
  block: unknown,
) => block is ConnectorTextBlock = (_block): _block is ConnectorTextBlock =>
  false
