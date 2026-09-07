/**
 * Porte fiel de `ccnmt: packages/provider/src/emptyUsage.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO. `@thyrox/headless-sdk` está symlinkeado en
 * `node_modules/@thyrox/` de este paquete — el `import type` resuelve
 * estático (y aunque no resolviera, se borra al transpilar).
 *
 * Objeto de uso inicializado en cero. Vive separado de `logging.ts` para
 * que `bridge/replBridge.ts` lo importe sin arrastrar transitivamente
 * `errors.ts` → `messages.ts` → `BashTool.tsx` → medio árbol.
 */
import type { NonNullableUsage } from '@thyrox/headless-sdk/sdkUtilityTypes.js'

export const EMPTY_USAGE: Readonly<NonNullableUsage> = {
  input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: 'standard',
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  inference_geo: '',
  iterations: [],
  speed: 'standard',
}
