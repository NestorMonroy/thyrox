// ConnectorText types — Anthropic API streaming blocks for connector
// responses. Decompiled placeholder.
// El literal es el del binario (2.1.282: `Bw=["connector_text","tool_addition",…]`).
// Con `type: string` el bloque no se descartaba al estrechar por `type`, y se
// colaba en cada rama de un `switch` sobre el contenido.
export type ConnectorTextBlock = {
  type: 'connector_text'
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
