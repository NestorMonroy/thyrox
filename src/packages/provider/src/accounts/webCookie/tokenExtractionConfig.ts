/**
 * Cómo se inicia sesión en cada proveedor de cookie web y de dónde se extrae
 * la credencial una vez dentro: cookie, `localStorage`, `sessionStorage` o
 * una cabecera de una petición autenticada. Lo consume el inicio de sesión en
 * navegador; el demonio de vigencia usa su página de inicio.
 *
 * Porte de `omniroute: open-sse/services/tokenExtractionConfig.ts` (MIT).
 */

export type TokenSource = { type: 'cookie'; name: string; domain?: string } | { type: 'localStorage'; key: string } | { type: 'sessionStorage'; key: string } | { type: 'header'; name: string }

export interface PollingConfig {
  /** Milisegundos entre dos intentos de extracción. */
  pollInterval: number
  /** Plazo total del inicio de sesión. */
  timeout: number
  /** Espera mínima antes del primer intento. */
  minLoginTime: number
}

export interface TokenExtractionConfig {
  /** El id del proveedor, el mismo que usa su ejecutor. */
  providerId: string
  displayName: string
  loginUrl: string
  /** La página de inicio: fija el dominio de las cookies. */
  homeUrl: string
  /** Si la URL actual la cumple, el inicio de sesión probablemente terminó. */
  successUrlPattern?: RegExp
  tokenSources: TokenSource[]
  pollingConfig: PollingConfig
  /** Las instrucciones que ve quien inicia sesión. */
  instructions: string
  cookieDomain?: string
}

const DEFAULT_POLLING: PollingConfig = { pollInterval: 1000, timeout: 300_000, minLoginTime: 5000 }
const QUICK_POLLING: PollingConfig = { pollInterval: 800, timeout: 120_000, minLoginTime: 3000 }

function config(providerId: string, displayName: string, loginUrl: string, homeUrl: string, tokenSources: TokenSource[], instructions: string, opts?: { successUrlPattern?: RegExp; pollingConfig?: Partial<PollingConfig>; cookieDomain?: string }): TokenExtractionConfig {
  return { providerId, displayName, loginUrl, homeUrl, tokenSources, instructions, pollingConfig: { ...DEFAULT_POLLING, ...opts?.pollingConfig }, successUrlPattern: opts?.successUrlPattern, cookieDomain: opts?.cookieDomain }
}

const RAW_CONFIGS: TokenExtractionConfig[] = [
  config(
    "claude-web",
    "Anthropic Web (claude.ai)",
    "https://claude.ai/login",
    "https://claude.ai",
    [{ type: "cookie", name: "sessionKey", domain: ".claude.ai" }],
    "Log in to your Anthropic account at claude.ai. After login, the session cookie will be extracted automatically."
  ),

  config(
    "gemini-web",
    "Gemini Web",
    "https://gemini.google.com/app",
    "https://gemini.google.com",
    [
      { type: "cookie", name: "__Secure-1PSID", domain: ".google.com" },
      { type: "cookie", name: "__Secure-1PSIDTS", domain: ".google.com" },
    ],
    "Log in to your Google account at gemini.google.com. Both __Secure-1PSID and __Secure-1PSIDTS cookies will be extracted.",
    { cookieDomain: ".google.com" }
  ),

  config(
    "grok-web",
    "Grok Web",
    "https://grok.com/login",
    "https://grok.com",
    [{ type: "cookie", name: "sso", domain: ".grok.com" }],
    "Log in to your xAI account at grok.com. The sso session cookie will be extracted."
  ),

  config(
    "perplexity-web",
    "Perplexity Web",
    "https://www.perplexity.ai/login",
    "https://www.perplexity.ai",
    [{ type: "cookie", name: "__Secure-next-auth.session-token", domain: ".perplexity.ai" }],
    "Log in to Perplexity. The __Secure-next-auth.session-token cookie will be extracted.",
    { cookieDomain: ".perplexity.ai" }
  ),

  config(
    "deepseek-web",
    "DeepSeek Web",
    "https://chat.deepseek.com/sign_in",
    "https://chat.deepseek.com",
    [
      { type: "cookie", name: "user-token", domain: ".deepseek.com" },
      { type: "localStorage", key: "userToken" },
    ],
    "Log in to DeepSeek at chat.deepseek.com. The user-token cookie will be extracted.",
    { cookieDomain: ".deepseek.com" }
  ),

  config(
    "volcengine-console",
    "Volcano Engine Ark Console",
    "https://console.volcengine.com/ark/region:cn-beijing/subscription/coding-plan",
    "https://console.volcengine.com",
    [
      { type: "cookie", name: "digest", domain: ".volcengine.com" },
      { type: "cookie", name: "AccountID", domain: ".volcengine.com" },
      { type: "cookie", name: "csrfToken", domain: ".volcengine.com" },
      { type: "cookie", name: "userInfo", domain: ".volcengine.com" },
    ],
    "Log in to the Volcano Engine Ark console. The console session is used to discover Agent/Coding Plan API keys and live quota usage.",
    {
      cookieDomain: ".volcengine.com",
      successUrlPattern: /console\.volcengine\.com\/ark/i,
      pollingConfig: { timeout: 300_000, minLoginTime: 3000 },
    }
  ),

  config(
    "kimi-web",
    "Kimi (Moonshot)",
    "https://www.kimi.com/",
    "https://www.kimi.com",
    [
      { type: "localStorage", key: "access_token" },
      { type: "cookie", name: "kimi-auth", domain: ".kimi.com" },
    ],
    "Log in to Kimi at www.kimi.com. The current access_token will be extracted from localStorage; kimi-auth remains a legacy fallback.",
    { cookieDomain: ".kimi.com" }
  ),

  config(
    "blackbox-web",
    "Blackbox AI",
    "https://app.blackbox.ai/login",
    "https://app.blackbox.ai",
    [
      { type: "cookie", name: "connect.sid", domain: ".blackbox.ai" },
      { type: "localStorage", key: "token" },
    ],
    "Log in to Blackbox AI at app.blackbox.ai using Google/GitHub. The session cookie will be extracted.",
    { cookieDomain: ".blackbox.ai" }
  ),

  config(
    "poe-web",
    "Poe (Quora)",
    "https://poe.com/login",
    "https://poe.com",
    [{ type: "cookie", name: "p-b", domain: ".poe.com" }],
    "Log in to Poe at poe.com. The session cookie will be extracted.",
    { cookieDomain: ".poe.com" }
  ),

  config(
    "copilot-web",
    "Microsoft Copilot",
    "https://copilot.microsoft.com/",
    "https://copilot.microsoft.com",
    [{ type: "header", name: "Authorization" }],
    "Log in with your Microsoft account at copilot.microsoft.com. The bearer access token will be extracted from an authenticated request."
  ),

  config(
    "duckduckgo-web",
    "DuckDuckGo AI Chat",
    "https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1",
    "https://duckduckgo.com",
    [{ type: "cookie", name: "duckai", domain: ".duckduckgo.com" }],
    "Open DuckDuckGo AI Chat. Some models may require a free account. The duckai cookie will be extracted.",
    {
      cookieDomain: ".duckduckgo.com",
      pollingConfig: QUICK_POLLING,
    }
  ),

  config(
    "doubao-web",
    "Dola (ByteDance)",
    "https://www.dola.com/",
    "https://www.dola.com",
    [
      { type: "cookie", name: "sessionid", domain: ".dola.com" },
      { type: "cookie", name: "ttwid", domain: ".dola.com" },
      { type: "cookie", name: "s_v_web_id", domain: ".dola.com" },
    ],
    "Log in to Dola at www.dola.com with your ByteDance account. sessionid, ttwid, and s_v_web_id will be extracted.",
    { cookieDomain: ".dola.com" }
  ),

  config(
    "t3-chat-web",
    "T3 Chat",
    "https://t3.chat/login",
    "https://t3.chat",
    [{ type: "localStorage", key: "token" }],
    "Log in to T3 Chat at t3.chat using Google/GitHub. The token from localStorage will be extracted.",
    { pollingConfig: QUICK_POLLING }
  ),

  config(
    "venice-web",
    "Venice AI",
    "https://venice.ai/login",
    "https://venice.ai",
    [
      { type: "cookie", name: "venice_session", domain: ".venice.ai" },
      { type: "localStorage", key: "token" },
    ],
    "Log in to Venice AI at venice.ai. The session cookie will be extracted.",
    { cookieDomain: ".venice.ai" }
  ),

  config(
    "v0-vercel-web",
    "v0 by Vercel",
    "https://v0.dev/login",
    "https://v0.dev",
    [{ type: "cookie", name: "__Secure-next-auth.session-token", domain: ".v0.dev" }],
    "Log in to v0.dev with your Vercel/Google/GitHub account. The session cookie will be extracted.",
    { cookieDomain: ".v0.dev" }
  ),

  config(
    "muse-spark-web",
    "Meta AI (Muse)",
    "https://www.meta.ai/",
    "https://www.meta.ai",
    [{ type: "cookie", name: "session", domain: ".meta.ai" }],
    "Log in to Meta AI at meta.ai with your Facebook/Instagram account. The session cookie will be extracted.",
    { cookieDomain: ".meta.ai" }
  ),

  config(
    "adapta-web",
    "Adapta AI",
    "https://agent.adapta.one/login",
    "https://agent.adapta.one",
    [{ type: "cookie", name: "__session", domain: ".adapta.one" }],
    "Log in to Adapta at agent.adapta.one. The session token will be extracted.",
    { cookieDomain: ".adapta.one" }
  ),

  config(
    "veoaifree-web",
    "VeoAI Free",
    "https://veoaifree.com/",
    "https://veoaifree.com",
    [{ type: "cookie", name: "wordpress_logged_in", domain: ".veoaifree.com" }],
    "Log in to VeoAI Free at veoaifree.com. The WordPress session cookie will be extracted.",
    {
      cookieDomain: ".veoaifree.com",
      pollingConfig: QUICK_POLLING,
    }
  ),

  config(
    "chatglm-web",
    "ChatGLM (Zhipu AI)",
    "https://chatglm.cn/",
    "https://chatglm.cn",
    [
      { type: "cookie", name: "chatglm_session", domain: ".chatglm.cn" },
      { type: "localStorage", key: "token" },
    ],
    "Log in to ChatGLM at chatglm.cn with your phone number. The session token will be extracted.",
    { cookieDomain: ".chatglm.cn" }
  ),

  config(
    "xiaomimimo-web",
    "Xiaomi MiMo AI Studio",
    "https://aistudio.xiaomimimo.com/login",
    "https://aistudio.xiaomimimo.com",
    [
      { type: "cookie", name: "session", domain: ".xiaomimimo.com" },
      { type: "localStorage", key: "access_token" },
    ],
    "Log in to Xiaomi MiMo AI Studio at aistudio.xiaomimimo.com. The session token will be extracted.",
    { cookieDomain: ".xiaomimimo.com" }
  ),

  config(
    "manus-web",
    "Manus AI",
    "https://manus.im/login",
    "https://manus.im",
    [
      { type: "cookie", name: "manus_session", domain: ".manus.im" },
      { type: "localStorage", key: "auth_token" },
    ],
    "Log in to Manus at manus.im. The session cookie will be extracted.",
    { cookieDomain: ".manus.im" }
  ),

  config(
    "zai-web",
    "Z.ai Web",
    "https://chat.z.ai/",
    "https://chat.z.ai",
    [{ type: "localStorage", key: "token" }],
    'Log in to Z.ai at chat.z.ai. The Local Storage value named "token" is extracted; chat CAPTCHA is handled by the browser transport.'
  ),
];

const CONFIG_MAP = new Map<string, TokenExtractionConfig>(RAW_CONFIGS.map(entry => [entry.providerId, entry]))

export function getExtractionConfig(providerId: string): TokenExtractionConfig | undefined {
  return CONFIG_MAP.get(providerId)
}

export function listExtractionConfigs(): TokenExtractionConfig[] {
  return [...RAW_CONFIGS]
}

/** El mapa compartido, por id de proveedor. */
export const TOKEN_EXTRACTION_CONFIGS: ReadonlyMap<string, TokenExtractionConfig> = CONFIG_MAP
