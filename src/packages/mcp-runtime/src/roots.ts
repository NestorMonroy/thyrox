/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/roots.ts` — sus 2
 * exportaciones, ninguna omitida.
 *
 * `@modelcontextprotocol/sdk` — declarado en `package.json`, sin
 * `node_modules` enlazado todavía (hueco de entorno preexistente,
 * confirmado con `ls`, no del porte).
 *
 * `getAdditionalDirectoriesForClaudeMd`/`getOriginalCwd`/
 * `subscribeAdditionalDirectories` (`@claude-code-how-works/app-host/bootstrap/state.js`)
 * NO resuelven: `@thyrox/app-host` no declara ese subpath en su mapa de
 * `exports` (declara `./runtime/*.js`, `./main/*.js`, `./state/*`
 * selectores y otros, pero ningún `./bootstrap/*`) — mismo patrón de import
 * colgante que ya documenta `@thyrox/app-host: src/runtime/appStateCompatShim.ts`
 * para un caso análogo. Se envuelven con `require()` diferido: un `import`
 * estático de un paquete cuya base (`@claude-code-how-works/*`) no existe en
 * este árbol hace fallar la carga del MÓDULO ENTERO (`Cannot find module`,
 * medido con `bun -e "import(...)"` antes de esta corrección), no sólo las
 * funciones que los usan. Mismo patrón que ya evita `appStateHooks.ts` de
 * este puerto.
 *
 * Corrección adicional sobre la primera versión de este archivo: la fuente
 * llama `subscribeAdditionalDirectories(...)` A NIVEL DE MÓDULO — un efecto
 * de lado que se ejecutaba al importar. Envolver sólo el import en
 * `require()` no basta si la LLAMADA sigue siendo de módulo: el crash sólo
 * se movería de "resolver el import" a "invocar la función resuelta", en el
 * mismo momento de carga. La suscripción se difiere hasta el primer
 * `registerRootsClient()` — antes de que exista al menos un cliente
 * registrado, `clients` está vacío y la suscripción no tiene a quién
 * notificar, así que diferirla hasta ese punto no cambia el comportamiento
 * observable, sólo el momento en que el `require()` se ejecuta.
 *
 * Notifica a los clientes MCP conectados cuando cambian los directorios
 * adicionales, y expone la raíz de trabajo + esos directorios como
 * "roots" de MCP.
 */
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

function requireAppHostBootstrapState(): {
  getAdditionalDirectoriesForClaudeMd: () => string[]
  getOriginalCwd: () => string
  subscribeAdditionalDirectories: (listener: () => void) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/app-host/bootstrap/state.js')
}

const clients = new Set<Client>()
let subscribed = false

function ensureSubscribedToAdditionalDirectories(): void {
  if (subscribed) return
  subscribed = true
  requireAppHostBootstrapState().subscribeAdditionalDirectories(() => {
    for (const client of clients) {
      void client
        .notification({ method: 'notifications/roots/list_changed' })
        .catch(() => clients.delete(client))
    }
  })
}

export function registerRootsClient(client: Client): void {
  ensureSubscribedToAdditionalDirectories()
  clients.add(client)
}

export function listMcpRoots(): { uri: string }[] {
  const { getAdditionalDirectoriesForClaudeMd, getOriginalCwd } =
    requireAppHostBootstrapState()
  return [getOriginalCwd(), ...getAdditionalDirectoriesForClaudeMd()]
    .filter((value, index, all) => all.indexOf(value) === index)
    .map(directory => ({ uri: `file://${directory}` }))
}
