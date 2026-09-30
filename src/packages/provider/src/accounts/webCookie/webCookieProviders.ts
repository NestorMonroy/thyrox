/**
 * Los proveedores de cookie web y el host contra el que se sondea su sesión.
 * `null` declara un proveedor sin host de API: sólo publica su sitio, y
 * sondearlo daría una redirección o un 200 de la SPA con cualquier cookie.
 *
 * Porte de los identificadores de `omniroute: src/shared/constants/providers/web-cookie.ts`,
 * del `baseUrl` de su entrada en `open-sse/config/providerRegistry.ts` y de los
 * conjuntos de `src/lib/providers/validation/transport.ts` (MIT).
 */

export const WEB_COOKIE_PROBE_BASE_URLS: Readonly<Record<string, string | null>> = Object.freeze({
  'chatgpt-web': 'https://chatgpt.com',
  'chatgpt-web-codex': 'https://chatgpt.com',
  'grok-web': 'https://grok.com/rest/app-chat/conversations/new',
  'gemini-web': 'https://gemini.google.com/app',
  'perplexity-web': 'https://www.perplexity.ai/rest/sse/perplexity_ask',
  'blackbox-web': 'https://app.blackbox.ai/api/chat',
  'muse-spark-web': 'https://www.meta.ai/api/graphql',
  'claude-web': 'https://claude.ai/api/organizations',
  'deepseek-web': 'https://chat.deepseek.com/api/v0/chat/completion',
  'copilot-web': 'wss://copilot.microsoft.com/c/api/chat?api-version=2',
  'copilot-m365-web': 'wss://substrate.office.com/m365Copilot/Chathub',
  't3-web': 'https://t3.chat/api/chat',
  'inner-ai': 'https://chatapi.innerai.com/chat',
  'adapta-web': 'https://agent.adapta.one/api/chat/stream/v1',
  lmarena: 'https://arena.ai/nextjs-api/stream/create-evaluation',
  'yuanbao-web': 'https://yuanbao.tencent.com/api/chat',
  'tencent-aistudio-web': 'https://aistudio.tencent.ai/api/chat',
  huggingchat: 'https://huggingface.co/chat/conversation',
  'poe-web': null,
  'venice-web': null,
  'v0-vercel-web': null,
  'kimi-web': 'https://www.kimi.ai',
  'doubao-web': 'https://www.dola.com/chat/completion',
  'zenmux-free': 'https://zenmux.ai/api/anthropic/v1/messages',
  'tinycms-web': 'https://gov.freegpt.win/api/openai/oneapi/v1/chat/completions',
  'zai-web': 'https://chat.z.ai',
  promptql: 'https://data.prompt.ql.app/promptql/playground-v2-hge/v1/graphql',
  'notion-web': 'https://app.notion.com/api/v3/runInferenceTranscript',
  'adobe-firefly': null,
  hyperagent: 'https://hyperagent.com/api/threads',
  'conol-web': 'https://conol.ai/api/sessions',
  maxai: 'https://api.maxai.me',
  uc: 'https://internal-6.pubyar.com',
})

/**
 * Hosts cuyo `baseUrl` es un endpoint de conversación, no una raíz de API:
 * `/models` nunca existió ahí, así que sólo un 401/403 dice algo.
 */
export const WEB_COOKIE_PROVIDERS_WITHOUT_MODELS_API: ReadonlySet<string> = new Set(['huggingchat', 'grok-web', 'notion-web', 't3-web', 'yuanbao-web', 'copilot-web', 'copilot-m365-web'])

/** Proveedores catalogados cuyo host es una consola, no una API: no se sondean. Hoy vacío. */
export const WEB_COOKIE_PROVIDERS_WITHOUT_AUTH_PROBE: ReadonlySet<string> = new Set()

/** Proveedores cuya redirección en el sondeo no dice nada de la sesión. */
export const WEB_COOKIE_PROVIDERS_WITH_UNRELIABLE_MODELS_PROBE: ReadonlySet<string> = new Set(['lmarena'])

export function isWebCookieProvider(provider: unknown): boolean {
  return Object.hasOwn(WEB_COOKIE_PROBE_BASE_URLS, String(provider || '').toLowerCase())
}
