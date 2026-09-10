/**
 * Porte fiel de `ccnmt: packages/provider/src/betasConstants.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO de los valores y su forma — los comentarios narrativos de la
 * fuente (historial de versiones, nombres de flags internos por build)
 * se resumen aquí en español en vez de copiarse verbatim, para no
 * reproducir la prosa propia de la fuente. `bun:bundle` ya está en uso en
 * otros paquetes de este árbol; `@thyrox/config` está symlinkeado en
 * `node_modules/@thyrox/` de este paquete, así que `readEnv` resuelve
 * estático (aunque, igual que en la fuente, queda sin usar en el cuerpo
 * del archivo — import inerte que se conserva verbatim).
 */
import { feature } from 'bun:bundle'
import { readEnv } from '@thyrox/config/env/utils'

export const CLAUDE_CODE_20250219_BETA_HEADER = 'claude-code-how-works-how-works-20250219'
export const INTERLEAVED_THINKING_BETA_HEADER = 'interleaved-thinking-2025-05-14'
export const CONTEXT_1M_BETA_HEADER = 'context-1m-2025-08-07'
export const CONTEXT_MANAGEMENT_BETA_HEADER = 'context-management-2025-06-27'
export const STRUCTURED_OUTPUTS_BETA_HEADER = 'structured-outputs-2025-12-15'
export const WEB_SEARCH_BETA_HEADER = 'web-search-2025-03-05'
// El header de tool-search difiere por proveedor: la API de Claude/Foundry
// usa el _1P; Vertex/Bedrock usan el _3P.
export const TOOL_SEARCH_BETA_HEADER_1P = 'advanced-tool-use-2025-11-20'
export const TOOL_SEARCH_BETA_HEADER_3P = 'tool-search-tool-2025-10-19'
export const EFFORT_BETA_HEADER = 'effort-2025-11-24'
export const TASK_BUDGETS_BETA_HEADER = 'task-budgets-2026-03-13'
export const PROMPT_CACHING_SCOPE_BETA_HEADER = 'prompt-caching-scope-2026-01-05'
export const FAST_MODE_BETA_HEADER = 'fast-mode-2026-02-01'
export const REDACT_THINKING_BETA_HEADER = 'redact-thinking-2026-02-12'
export const TOKEN_EFFICIENT_TOOLS_BETA_HEADER = 'token-efficient-tools-2026-03-28'
// Gateado por la feature flag TRANSCRIPT_CLASSIFIER; cadena vacía si está apagada.
export const AFK_MODE_BETA_HEADER = feature('TRANSCRIPT_CLASSIFIER')
  ? 'afk-mode-2026-01-31'
  : ''
// Sólo para usuarios internos (USER_TYPE=ant); cadena vacía para el resto.
export const CLI_INTERNAL_BETA_HEADER =
  process.env.USER_TYPE === 'ant' ? 'cli-internal-2026-02-09' : ''
export const ADVISOR_BETA_HEADER = 'advisor-tool-2026-03-01'

/**
 * Bedrock sólo admite un número limitado de beta headers, y sólo vía
 * extraBodyParams. Este conjunto guarda los que deben ir en
 * extraBodyParams de Bedrock y NO en sus headers.
 */
export const BEDROCK_EXTRA_PARAMS_HEADERS = new Set([
  INTERLEAVED_THINKING_BETA_HEADER,
  CONTEXT_1M_BETA_HEADER,
  TOOL_SEARCH_BETA_HEADER_3P,
])

/**
 * Betas permitidos en el countTokens API de Vertex. Cualquier otro
 * provoca errores 400.
 */
export const VERTEX_COUNT_TOKENS_ALLOWED_BETAS = new Set([
  CLAUDE_CODE_20250219_BETA_HEADER,
  INTERLEAVED_THINKING_BETA_HEADER,
  CONTEXT_MANAGEMENT_BETA_HEADER,
])
export const CACHE_EDITING_BETA_HEADER: string = ''

// Diagnóstico de caché opt-in (gate: CLAUDE_CODE_CACHE_DIAGNOSIS=1). Cuando
// el servidor devuelve diagnóstico por bloque de caché, el runtime puede
// explicar por qué un cache hit no aterrizó (creación vs lectura, deriva de
// la clave, split de TTL 1h/5m, etc.).
export const CACHE_DIAGNOSIS_BETA_HEADER = 'cache-diagnosis-2026-04-07'

// TTL de caché de prompt extendido — más allá del default de 5 min. No va
// en ninguna lista de betas por defecto; sólo se envía si el consumidor lo
// pide explícitamente.
export const EXTENDED_CACHE_TTL_BETA_HEADER = 'extended-cache-ttl-2025-04-11'

// Permite cambiar el system prompt a mitad de conversación. Se activa por
// env (CLAUDE_CODE_MID_CONVERSATION_SYSTEM) o por flag que matchea el
// nombre del modelo. No va en la lista de betas por defecto — se añade por
// petición vía `isMidConversationSystemEnabled` (ver betas.ts).
export const MID_CONVERSATION_SYSTEM_BETA_HEADER = 'mid-conversation-system-2026-04-07'

// Beta que reporta el conteo de tokens de thinking en el servidor. Se añade
// por petición junto a redact-thinking, bajo el mismo predicado (1P +
// interleaved-thinking + interactivo), con su propio gate final (apagado
// por defecto). Ver `getAllModelBetas` en betas.ts.
export const LN_BETA_HEADER = 'ln-2026-05-13'
