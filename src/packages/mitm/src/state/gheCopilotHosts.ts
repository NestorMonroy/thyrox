/**
 * Hosts de las conexiones GitHub Enterprise Copilot que el MITM debe
 * interceptar, a partir de sus datos propios de proveedor.
 *
 * Porte de la extracción de `omniroute: src/lib/db/providers/migrations.ts`
 * `getGheCopilotHosts` (MIT). La referencia lee además la tabla de
 * conexiones; thyrox no tiene aún un registro de conexiones de proveedor,
 * así que quien lo tenga pasa aquí el `provider_specific_data` de las
 * conexiones `ghe-copilot` activas (texto JSON u objeto ya leído).
 */

const URL_FIELDS = ['gheUrl', 'copilotApiUrl', 'copilotProxyUrl'] as const

function parseProviderData(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function hostnameOf(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value).hostname.toLowerCase() || null
  } catch {
    return null
  }
}

export function gheCopilotHostsFrom(providerSpecificData: readonly unknown[]): string[] {
  const hosts = new Set<string>()
  for (const entry of providerSpecificData) {
    const data = parseProviderData(entry)
    if (!data) continue
    for (const field of URL_FIELDS) {
      const host = hostnameOf(data[field])
      if (host) hosts.add(host)
    }
  }
  return [...hosts]
}
