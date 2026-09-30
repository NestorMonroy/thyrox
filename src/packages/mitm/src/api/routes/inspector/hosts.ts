/**
 * Los hosts propios que el inspector captura: listarlos, añadir uno con su
 * entrada de DNS, activarlo o no, y quitarlo con su entrada.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{hosts,hosts/[host]}/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'
import { z } from 'zod'

import { addDNSEntries, removeDNSEntries } from '../../../dns/dnsConfig.ts'
import { getCachedPassword } from '../../../manager.ts'
import { InspectorCustomHostSchema } from '../../../schemas/inspector.ts'
import { addCustomHost, listCustomHosts, removeCustomHost, toggleCustomHost } from '../../../state/inspectorCustomHosts.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { inspectorPath } from './basePath.ts'

export interface HostsFile {
  add(hosts: string[], password: string): Promise<void>
  remove(hosts: string[], password: string): Promise<void>
}

export interface HostRouteDeps {
  db: Database
  /** La contraseña de sudo que dejó en caché el arranque del MITM, si la hay. */
  cachedPassword: () => string | null
  dns: HostsFile
}

export function realHostRouteDeps(db: Database): HostRouteDeps {
  return {
    db,
    cachedPassword: getCachedPassword,
    dns: {
      add: (hosts, password) => addDNSEntries(hosts, password),
      remove: (hosts, password) => removeDNSEntries(hosts, password),
    },
  }
}

const NO_DNS_PASSWORD_WARNING = 'DNS routing requires the MITM proxy to be running with a cached sudo password'

/** Un nombre de host: etiquetas de 1 a 63 caracteres, sin guion en los bordes. */
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i

const CustomHostBodySchema = InspectorCustomHostSchema.extend({
  // El host va tal cual al archivo de hosts: un salto de línea escribiría otra entrada.
  host: z.string().regex(HOSTNAME, 'host must be a valid hostname'),
})

const HostToggleSchema = z.object({ enabled: z.boolean() })

/** Un 204 con el aviso de DNS en una cabecera, si lo hay. */
function noContent(dnsWarning?: string): Response {
  return new Response(null, { status: 204, headers: dnsWarning ? { 'x-dns-warning': dnsWarning } : undefined })
}

export function createHostRoutes(deps: HostRouteDeps): ApiRoute[] {
  const { db } = deps
  return [
    {
      method: 'GET',
      path: inspectorPath('/hosts'),
      handler: () => Response.json({ hosts: listCustomHosts(db) }),
    },
    {
      method: 'POST',
      path: inspectorPath('/hosts'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, CustomHostBodySchema)
        if (!body.ok) return body.response
        const { host, kind, label } = body.data
        addCustomHost(db, host, kind, label ?? undefined)
        const password = deps.cachedPassword()
        if (!password) return Response.json({ ok: true, host, warning: NO_DNS_PASSWORD_WARNING }, { status: 201 })
        try {
          await deps.dns.add([host], password)
        } catch (err) {
          const warning = `DNS routing entry could not be added: ${sanitizeErrorMessage(String(err))}`
          return Response.json({ ok: true, host, warning }, { status: 201 })
        }
        return Response.json({ ok: true, host }, { status: 201 })
      },
    },
    {
      method: 'PATCH',
      path: inspectorPath('/hosts/:host'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, HostToggleSchema)
        if (!body.ok) return body.response
        toggleCustomHost(db, params.host, body.data.enabled)
        const updated = listCustomHosts(db).find(h => h.host === params.host)
        return updated ? Response.json(updated) : errorResponse({ status: 404, message: 'Host not found' })
      },
    },
    {
      method: 'DELETE',
      path: inspectorPath('/hosts/:host'),
      handler: async ({ params }) => {
        removeCustomHost(db, params.host)
        const password = deps.cachedPassword()
        if (!password) return noContent(NO_DNS_PASSWORD_WARNING)
        try {
          await deps.dns.remove([params.host], password)
        } catch {
          // Una cabecera sólo admite ASCII: sin raya larga.
          return noContent(`DNS entry for ${params.host} could not be removed - restart the proxy or remove manually`)
        }
        return noContent()
      },
    },
  ]
}
