/**
 * Las 80 claves de settings del cliente, con veredicto por clave.
 *
 * El criterio lo fijó el ejecutor (2026-09-02): *«yo quitaría la de aws, pero
 * dejaría las de git, y creo que sólo quitaría las de servicios externos como
 * aws»*. Es más inclusivo que la primera clasificación —que adoptaba 8 de 80—
 * y cambia la pregunta: ya no es «¿qué usamos?» sino «¿qué apunta a un
 * servicio que no es nuestro?».
 *
 * Tres estados, y el del medio es el que evita la mentira por omisión:
 *
 * - **consumida** — el harness la lee y hace algo con ella.
 * - **declarada** — el esquema la tipa y la valida, pero **todavía nadie la
 *   consume**. Se declara para que un error de tecleo se detecte y para que
 *   la deuda quede contada, no escondida.
 * - **diferida** — apunta a un servicio externo que **hoy** no operamos. No se
 *   declara, y si aparece en un archivo el cargador **avisa** nombrando el
 *   motivo. No es un descarte: cada una lleva la **condición** que la traería
 *   de vuelta.
 *
 * La tercera se llamó «retirada» en la primera versión. El ejecutor lo
 * corrigió el mismo día —*«me parece bien las 17 … pero quedan a un futuro»*—
 * y el nombre importaba: «retirada» se lee como *nunca*, y lo que hay es
 * *todavía no*. Sin condición escrita, «a futuro» es un cajón sin llave; es
 * la misma exigencia que `hallazgo-abierto-genera-sucesor.md` hace de un
 * hallazgo con alcance abierto.
 *
 * La lista es la medida en `ccb: packages/config/settings/types.ts:264-1152`,
 * verbatim y en su orden.
 */
export const CLIENT_SETTING_KEYS = [
  '$schema', 'apiKeyHelper', 'awsCredentialExport', 'awsAuthRefresh', 'gcpAuthRefresh',
  'fileSuggestion', 'respectGitignore', 'cleanupPeriodDays', 'env', 'attribution',
  'includeCoAuthoredBy', 'includeGitInstructions', 'dynamicWorkflowSize', 'askUserQuestionTimeout',
  'permissions', 'modelType', 'model', 'availableModels', 'modelOverrides',
  'enableAllProjectMcpServers', 'enabledMcpjsonServers', 'disabledMcpjsonServers',
  'allowedMcpServers', 'deniedMcpServers', 'hooks', 'worktree', 'disableAllHooks',
  'defaultShell', 'allowManagedHooksOnly', 'allowedHttpHookUrls', 'httpHookAllowedEnvVars',
  'allowManagedPermissionRulesOnly', 'allowManagedMcpServersOnly', 'strictPluginOnlyCustomization',
  'statusLine', 'enabledPlugins', 'extraKnownMarketplaces', 'strictKnownMarketplaces',
  'blockedMarketplaces', 'forceLoginMethod', 'forceLoginOrgUUID', 'otelHeadersHelper',
  'outputStyle', 'viewMode', 'language', 'skipWebFetchPreflight', 'sandbox',
  'wslInheritsWindowsSettings', 'spinnerTipsEnabled', 'spinnerVerbs', 'spinnerTipsOverride',
  'syntaxHighlightingDisabled', 'terminalTitleFromRename', 'tui', 'alwaysThinkingEnabled',
  'effortLevel', 'advisorModel', 'fastMode', 'fastModePerSessionOptIn', 'promptSuggestionEnabled',
  'showClearContextOnPlanAccept', 'agent', 'companyAnnouncements', 'pluginConfigs', 'remote',
  'autoUpdatesChannel', 'minimumVersion', 'plansDirectory', 'channelsEnabled',
  'allowedChannelPlugins', 'prefersReducedMotion', 'autoMemoryEnabled', 'autoMemoryDirectory',
  'autoDreamEnabled', 'showThinkingSummaries', 'skipDangerousModePermissionPrompt',
  'disableAutoMode', 'sshConfigs', 'claudeMdExcludes', 'pluginTrustMessage',
] as const

export type ClientSettingKey = (typeof CLIENT_SETTING_KEYS)[number]
export type KeyStatus = 'consumida' | 'declarada' | 'diferida'

/**
 * Las diferidas, con su motivo y su condición de entrada. Cada una nombra el servicio ajeno al que
 * apunta — ése es el criterio, y decirlo permite discutir cada caso por
 * separado en vez de discutir la lista entera.
 *
 * Siete van marcadas como **juicio**: no son proveedores de nube, pero sí
 * servicios que no operamos. Si el ejecutor las quiere dentro, se mueven a
 * `declarada` cambiando una línea.
 */
const DIFERIDAS: Record<string, { motivo: string; condicion: string }> = {
  awsCredentialExport: {
    motivo: 'servicio externo: credenciales de AWS; no usamos Bedrock',
    condicion: 'si se adopta Bedrock como adaptador de proveedor (bloque 2)',
  },
  awsAuthRefresh: {
    motivo: 'servicio externo: refresco de credenciales de AWS',
    condicion: 'si se adopta Bedrock como adaptador de proveedor (bloque 2)',
  },
  gcpAuthRefresh: {
    motivo: 'servicio externo: refresco de credenciales de Google Cloud',
    condicion: 'si se adopta Vertex como adaptador de proveedor (bloque 2)',
  },
  otelHeadersHelper: {
    motivo: 'servicio externo: colector OpenTelemetry ajeno',
    condicion: 'si la observabilidad del bloque 8 exporta a un colector externo',
  },
  companyAnnouncements: {
    motivo: 'servicio externo: canal de avisos del fabricante del cliente',
    condicion: 'si el harness se distribuye con un canal de avisos propio',
  },
  autoUpdatesChannel: {
    motivo: 'servicio externo: canal de actualización del cliente, que no distribuimos',
    condicion: 'si el harness se distribuye como binario con canal de actualización',
  },
  minimumVersion: {
    motivo: 'servicio externo: política de versión del cliente, que no distribuimos',
    condicion: 'si el harness se distribuye como binario con política de versión',
  },
  channelsEnabled: {
    motivo: 'servicio externo: canales de distribución del cliente',
    condicion: 'si el harness se distribuye por canales',
  },
  remote: {
    motivo: 'servicio externo: el servicio remoto del cliente, no el nuestro',
    condicion: 'si el harness expone un servicio remoto propio',
  },
  forceLoginMethod: {
    motivo: 'servicio externo (juicio): método de inicio de sesión del proveedor',
    condicion: 'si el harness gestiona su propio inicio de sesión (precondición: T-011, la credencial)',
  },
  forceLoginOrgUUID: {
    motivo: 'servicio externo (juicio): organización del proveedor de inicio de sesión',
    condicion: 'si el harness gestiona su propio inicio de sesión (precondición: T-011, la credencial)',
  },
  extraKnownMarketplaces: {
    motivo: 'servicio externo (juicio): mercados de plugins de terceros',
    condicion: 'si existe un sistema de plugins propio con mercados',
  },
  strictKnownMarketplaces: {
    motivo: 'servicio externo (juicio): mercados de plugins de terceros',
    condicion: 'si existe un sistema de plugins propio con mercados',
  },
  blockedMarketplaces: {
    motivo: 'servicio externo (juicio): mercados de plugins de terceros',
    condicion: 'si existe un sistema de plugins propio con mercados',
  },
  allowedChannelPlugins: {
    motivo: 'servicio externo (juicio): plugins servidos por canal',
    condicion: 'si existe un sistema de plugins propio servido por canal',
  },
  pluginTrustMessage: {
    motivo: 'servicio externo (juicio): confianza sobre plugins de terceros',
    condicion: 'si existe un sistema de plugins propio con terceros',
  },
  sshConfigs: {
    motivo: 'servicio externo (juicio): máquinas remotas por SSH, que no operamos',
    condicion: 'si el harness llega a operar máquinas remotas por SSH',
  },
}

/** Las que el harness ya lee y usa hoy. */
const CONSUMIDAS = new Set<string>([
  '$schema', 'model', 'advisorModel', 'effortLevel', 'permissions', 'hooks', 'disableAllHooks',
  'env', 'attribution', 'includeCoAuthoredBy',
])

export const KEY_STATUS: Record<string, KeyStatus> = Object.fromEntries(
  CLIENT_SETTING_KEYS.map((k) => [
    k,
    DIFERIDAS[k] ? 'diferida' : CONSUMIDAS.has(k) ? 'consumida' : 'declarada',
  ]),
)

export function deferredReason(key: string): string | undefined {
  return DIFERIDAS[key]?.motivo
}

/** Qué tendría que existir para que esta clave entre. Sin esto, «a futuro» no significa nada. */
export function deferredCondition(key: string): string | undefined {
  return DIFERIDAS[key]?.condicion
}

export function keysByStatus(): Record<KeyStatus, string[]> {
  const out: Record<KeyStatus, string[]> = { consumida: [], declarada: [], diferida: [] }
  for (const k of CLIENT_SETTING_KEYS) out[KEY_STATUS[k]].push(k)
  return out
}

/** Las diferidas que aparecen en un archivo: se avisan, no rompen la carga. */
export function deferredKeysPresent(data: unknown): { key: string; reason: string }[] {
  if (typeof data !== 'object' || data === null) return []
  return Object.keys(data)
    .filter((k) => DIFERIDAS[k])
    .map((k) => ({
      key: k,
      reason: `${DIFERIDAS[k].motivo}; todavía no se declara — entraría ${DIFERIDAS[k].condicion}`,
    }))
}
