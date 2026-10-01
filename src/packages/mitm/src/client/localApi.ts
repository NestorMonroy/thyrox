/**
 * El cliente de las rutas locales del MITM: pide JSON y, ante una respuesta
 * no 2xx, lanza el mensaje ya saneado que el servidor puso en su cuerpo, o el
 * estado HTTP si no trae ninguno.
 *
 * Porte de las funciones comunes de `omniroute:
 * src/lib/inspector/tproxyCaptureApi.ts` y `agentBridgeMaintenanceApi.ts`
 * (MIT), que las repetían; aquí el `fetch` y la base se inyectan, porque el
 * cliente es la línea de órdenes y no un navegador en el mismo origen.
 */
export interface LocalApiClient {
  requestJson<T>(path: string, init?: RequestInit): Promise<T>
}

export function createLocalApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch): LocalApiClient {
  const base = baseUrl.replace(/\/+$/, '')
  return {
    async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
      const res = await fetchImpl(`${base}${path}`, init)
      if (!res.ok) throw new Error(await errorMessage(res))
      return (await res.json()) as T
    },
  }
}

async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? `HTTP ${res.status}`
}

/** Un cuerpo JSON con su cabecera. */
export function jsonBody(value: unknown): Pick<RequestInit, 'headers' | 'body'> {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
}
