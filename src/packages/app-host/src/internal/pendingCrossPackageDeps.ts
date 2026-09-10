/**
 * Sustitutos locales para dos símbolos que este paquete necesita y que
 * hoy NO resuelven de forma estática desde `@thyrox/app-host` — mismo
 * patrón consolidado que `@thyrox/mcp-runtime: src/internal/pendingCrossPackageDeps.ts`
 * y `@thyrox/ide: src/internal/pendingCrossPackageDeps.ts`: un archivo, cada
 * entrada con su cita de origen, su divergencia exacta y su condición de
 * retiro — en vez de reescribir el mismo cuerpo (o el mismo `require()`
 * fallido) en cada archivo de `app-host` que lo necesita.
 *
 * 1. `isInProcessTeammateTask` — REIMPLEMENTACIÓN FIEL. El símbolo real
 *    vive en `@thyrox/swarm: src/tasks/types.ts` (que SÍ lo exporta, vía
 *    `./tasks/types.js` y el barrel `.`), pero `@thyrox/swarm` NO está
 *    declarado como dependencia de `@thyrox/app-host` en su
 *    `package.json` — verificado en este turno:
 *
 *    ```
 *    $ cd src/packages/app-host && bun -e \
 *        "require.resolve('@thyrox/swarm/tasks/types.js')"
 *    Cannot find module '@thyrox/swarm/tasks/types.js' …
 *    ```
 *
 *    Sin symlink en `node_modules/@thyrox/swarm`, un `require()` diferido
 *    (el patrón de categoría 1 de `ide`) fallaría igual que el import
 *    estático — no es "todavía no exporta el subpath", es "el paquete no
 *    está enlazado". El símbolo es puro y su cuerpo cabe verbatim (cuatro
 *    líneas, cero dependencias propias — igual criterio que
 *    `state/store.ts` ya aplica para `createStore`), así que se
 *    reimplementa aquí en vez de fabricar un `require()` que no
 *    resolvería. Añadir `"@thyrox/swarm": "workspace:*"` al
 *    `package.json` de este paquete es la condición de retiro: cuando
 *    exista el symlink, este sustituto se borra y los call-sites importan
 *    directo de `@thyrox/swarm`.
 *
 * 2. `saveCurrentProjectConfig` — PUNTO DE INYECCIÓN, no-op por defecto.
 *    El símbolo real vive en `ccnmt: packages/config/global/config.ts`,
 *    módulo (`config/global/config.js`) ausente ENTERO en
 *    `@thyrox/config` — verificado con `Bun.resolveSync` desde este
 *    paquete: "Cannot find module '@thyrox/config/global/config.js'".
 *    Mismo hallazgo, mismo criterio y mismo nombre de función que
 *    `@thyrox/updater: src/internal/globalConfigCompat.ts` ya documenta
 *    para `getGlobalConfig`/`saveGlobalConfig` — ese archivo no se
 *    reutiliza aquí porque `app-host` no depende de `@thyrox/updater` (ni
 *    debería, para no crear un acoplamiento cruzado nuevo); se replica el
 *    mismo patrón, acotado al símbolo que `context/stats.tsx` necesita.
 *    El único llamador (`StatsProvider`'s `flush`, en un handler de
 *    `process.on('exit', …)`) ya tolera la pérdida de la escritura: es
 *    persistencia de métricas de sesión, best-effort, no una operación
 *    cuyo fallo deba propagarse. Se retira cuando
 *    `@thyrox/config/global/config.js` exista y exporte
 *    `saveCurrentProjectConfig`.
 */

export function isInProcessTeammateTask(task: unknown): boolean {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    (task as { type: unknown }).type === 'in_process_teammate'
  )
}

type ProjectConfigLike = Record<string, unknown>
type SaveCurrentProjectConfigApi = {
  saveCurrentProjectConfig: (
    updater: (current: ProjectConfigLike) => ProjectConfigLike,
  ) => void
}

let _cachedSaveCurrentProjectConfig: SaveCurrentProjectConfigApi | null | undefined

function tryGetSaveCurrentProjectConfigApi(): SaveCurrentProjectConfigApi | null {
  if (_cachedSaveCurrentProjectConfig !== undefined) {
    return _cachedSaveCurrentProjectConfig
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cachedSaveCurrentProjectConfig = require(
      '@thyrox/config/global/config.js',
    ) as SaveCurrentProjectConfigApi
  } catch {
    _cachedSaveCurrentProjectConfig = null
  }
  return _cachedSaveCurrentProjectConfig
}

export function saveCurrentProjectConfig(
  updater: (current: ProjectConfigLike) => ProjectConfigLike,
): void {
  tryGetSaveCurrentProjectConfigApi()?.saveCurrentProjectConfig(updater)
}
