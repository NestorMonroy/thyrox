/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/roots.ts` — sus 2
 * exportaciones, ninguna omitida.
 *
 * `@modelcontextprotocol/sdk` — declarado en `package.json`, sin
 * `node_modules` enlazado todavía.
 *
 * `@claude-code-how-works/app-host/bootstrap/state.js` NO se reapunta:
 * `@thyrox/app-host` no declara ese subpath en su mapa de `exports`
 * (declara `./runtime/*.js`, `./main/*.js`, `./state/*` selectores y
 * otros, pero ningún `./bootstrap/*`) — mismo patrón de import colgante
 * que ya documenta `@thyrox/app-host: src/runtime/appStateCompatShim.ts`
 * para un caso análogo.
 *
 * Notifica a los clientes MCP conectados cuando cambian los directorios
 * adicionales, y expone la raíz de trabajo + esos directorios como
 * "roots" de MCP.
 */
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  getAdditionalDirectoriesForClaudeMd,
  getOriginalCwd,
  subscribeAdditionalDirectories,
} from '@claude-code-how-works/app-host/bootstrap/state.js'

const clients = new Set<Client>()

subscribeAdditionalDirectories(() => {
  for (const client of clients) {
    void client
      .notification({ method: 'notifications/roots/list_changed' })
      .catch(() => clients.delete(client))
  }
})

export function registerRootsClient(client: Client): void {
  clients.add(client)
}

export function listMcpRoots(): { uri: string }[] {
  return [getOriginalCwd(), ...getAdditionalDirectoriesForClaudeMd()]
    .filter((value, index, all) => all.indexOf(value) === index)
    .map(directory => ({ uri: `file://${directory}` }))
}
