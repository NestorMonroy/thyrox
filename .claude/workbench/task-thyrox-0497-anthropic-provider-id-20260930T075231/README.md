# TASK-THYROX-0497 — cómo se nombra el proveedor de Anthropic al dar de alta una credencial

Banco de la sesión que implementa el ítem (worktree del pool, 2026-09-30).
Pregunta: `providers add anthropic --dry-run` guarda `"provider": "anthropic"`
y `resolveCredential` busca `ANTHROPIC_PROVIDER_ID = 'claude'`
(`src/packages/provider/src/accounts/imports/anthropicAuthFile.ts:15`). ¿Qué
nombre gobierna, y qué hace la referencia?

## Lo que la referencia (claude-code 2.1.283) hace

Corpus: `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/`,
sólo lectura (`rg`, `python3` para recortar la línea minificada).

| Símbolo / literal | Chunk:línea | Qué hace | Decisión |
|---|---|---|---|
| `Pe()` | `chunk-4h0c4z04.js:11` | Devuelve `"gateway"`, `"bedrock"`, `"foundry"`, `"anthropicAws"`, `"anthropicGoogleCloud"`, `"mantle"`, `"vertex"` o `"firstParty"` según `CLAUDE_CODE_USE_*`. Es el eje de **transporte/despliegue**, no un id de cuenta. | No se porta como id de proveedor: thyrox ya tiene ese eje en `connections.ts` (`protocol: 'anthropic'`). |
| `"firstParty"` | 11 apariciones en `chunk-csayct82.js`, 1 en cada uno de otros 9 chunks (`rg -c`) | El valor de `Pe()` cuando se habla con `api.anthropic.com` directo. | Divergencia declarada: no es un nombre de proveedor almacenado. |
| `primaryApiKey` | `chunk-t6pwageh.js:77-79` (`HF()`, `ZF()`, `YLr()`) | La clave de API guardada por `/login`, en la config del usuario; se lee como `{key, source:"/login managed key"}`. **Sin nombre de proveedor**: el binario sólo conoce a Anthropic. | Divergencia: thyrox guarda N proveedores en `provider_connections`, así que la fila necesita un id. |
| `claudeAiOauth` | `chunk-t6pwageh.js:78`, `chunk-m5drh1xg.js:29`, `chunk-8kctp40x.js:19` | La cuenta OAuth guardada (`accessToken`, `refreshToken`, `expiresAt`, `scopes`), bajo la clave `claudeAiOauth` del archivo de credenciales. Tampoco lleva id de proveedor. | Mismo motivo. `anthropicAuthFile.ts` ya porta esta forma al exportar. |
| `Fv(e,t)` con `switch(r.provider){case"anthropic": …}` | `chunk-wg7ts4cy.js:234` (offset 5019 de la línea) | Construye los upstreams del gateway desde una config: **cuando la referencia nombra al proveedor, lo llama `"anthropic"`**, con `auth.api_key` → `x-api-key` o `auth.oauth_token` → `Authorization: Bearer` + beta OAuth. | Es el único sitio del binario donde `provider` es un dato con nombre; thyrox lo porta igual en el proxy (`proxy/upstreamRouting.ts:107`, `proxy/modelsList.ts:59`: `upstream.provider === 'anthropic'`). |

Métrica: apariciones del literal en los chunks `.js` del corpus con `rg -c`
y `rg -o` con contexto; lectura directa de la línea 234 del chunk con Python
(`str.find` sobre la línea, ventana de 2200+900 caracteres).
Ciega a: código que construya el nombre por concatenación o lo reciba del
servidor; a chunks comprimidos (`.zst`) que `rg` no descomprime. La
cifra de `firstParty` cuenta literales, no llamadas a `Pe()`.

## Lo que el árbol ya decidió (medido, no supuesto)

`rg -n "'claude'|'anthropic'" src/packages/provider/src` (sin tests), agrupado:

- **Id de la cuenta en el store = `claude`**: `credentials.ts` (`ANTHROPIC_PROVIDER_ID`),
  `oauth/flowRegistry.ts:42` (la clave del flujo es lo que `persistOAuthConnection`
  guarda como `provider`), `refresh/providerRefreshDispatch.ts:121`,
  `refresh/providerCredentials.ts:24`, `refresh/health/refreshCircuit.ts:21,26`,
  `claudeExtraUsage.ts:78,168`, `oauthPersistence.ts` (`SAME_ACCOUNT_BY_PROVIDER.claude`).
  Y `imports/cliProxyAuthImport.ts:18-19` ya traduce **`anthropic → claude`** al importar.
- **`anthropic` como nombre del upstream / de la receta de sonda**:
  `accounts/apiKeyProbe.ts` (`PROBE_RECIPES.anthropic`), `proxy/upstreamRouting.ts:107`,
  `proxy/modelsList.ts:59`, `connections.ts` (`protocol: 'anthropic'`).
- `proxy/session/affinitySelector.ts:324` los declara **alias del mismo
  espacio**: `canonicalLcpProvider('anthropic') === 'claude'`.

Métrica: conteo de sitios por literal en `src/packages/provider/src`, sin `__tests__`.
Ciega a: consumidores fuera de `provider` (p. ej. `cli`) y a filas ya
guardadas en un store real con `provider: 'anthropic'` por el defecto que
esta tarea cierra.

## Decisión

1. **El id de la conexión de Anthropic en el store es `claude`**, porque es lo
   que ya escriben `providers login claude` y leen `resolveCredential` y el
   refresco. Cambiar `ANTHROPIC_PROVIDER_ID` está fuera de los archivos del
   ítem y rompería las filas OAuth existentes.
2. **La CLI acepta las dos grafías** —`anthropic` (la de la referencia y de la
   receta de sonda) y `claude`— y guarda una: `canonicalProviderId` en
   `cli/src/commands/providers/providerId.ts`. Es la misma traducción de
   `cliProxyAuthImport.ts`, ahora también en `add`, `import`, el selector y
   `login`.
3. **La sonda de clave recibe el nombre de su receta**: `apiKeyProbeProvider('claude') === 'anthropic'`.
   `testVerbs.ts` traduce antes de llamar a `testDeps.probe`; así `providers test`
   sobre una fila `claude`/`apikey` llega al `/messages` del proxy local en
   vez de «Provider test not supported».
4. **Divergencia declarada**: la referencia no nombra su propia credencial
   (`primaryApiKey`, `claudeAiOauth`); cuando nombra un proveedor en config
   dice `anthropic`. Thyrox conserva `anthropic` para upstreams del proxy y
   `claude` para cuentas del store; el puente entre ambos vive en un solo
   módulo de la CLI.
5. **`providers login claude` exige `THYROX_CLAUDE_OAUTH_CLIENT_ID` antes de
   abrir nada**: `oauthLogin.ts` comprueba el `clientId` del flujo antes de
   `runOAuthLogin`; hoy el flujo ya rehusaba, pero después de abrir el
   servidor de callback (`loginRunner.ts: runCodeLogin` arranca el servidor y
   luego llama a `generateAuthData`).

## Lo que queda fuera de este ítem

- `ANTHROPIC_PROVIDER_ID` no está exportado por `@thyrox/provider/package.json`
  (`rg '"./accounts/imports/anthropicAuthFile"'` → 0). La CLI declara el
  literal en `providerId.ts` y lo fija por conducta: la prueba de extremo a
  extremo guarda con `providers add anthropic` y lee con `resolveCredential`
  sobre el mismo store cifrado. Añadir el export es un cambio en
  `provider/package.json`, fuera de la lista.
- La sonda contra el proxy local con credencial del store (C3) no existe
  todavía; aquí la prueba apunta `providerSpecificData.baseUrl` al servidor
  de loopback `startAnthropicMockServer`, que es el mismo mecanismo que
  usará el proxy de C3.

## Controles de anulación (medidos sobre 67 casos de los cinco archivos de prueba de `providers`)

| Rama retirada | Caen | Sobreviven |
|---|---|---|
| `canonicalProviderId` → identidad | 10 (alta ×2 grafías, import, sonda, unidad, e2e ×4, login alias, selector) | 57 |
| `apiKeyProbeProvider` → identidad | 3 (unidad, sonda en `testVerbs`, e2e `providers test`) | 64 |
| `testVerbs` sin `probeByRecipeName` | 2 (sonda en `testVerbs`, e2e `providers test`) | 65 |
| selector sin alias de proveedor | 3 (selector, sonda por selector `anthropic`, e2e `providers test`) | 64 |
| `oauthLogin` sin comprobación previa del client id | 1 (rehúsa antes de abrir servidor: el doble cuenta 1 servidor) | 66 |
| `loginVerb` sin grafía canónica | 1 (`login anthropic` → `claude`) | 66 |

Métrica: `(fail)` de `bun test` sobre los cinco archivos, con el archivo
original copiado a `mktemp`, la rama sustituida con `bin/replace_literal`, y
el archivo restaurado desde la copia. Ciega a: las pruebas de otros paquetes
que importen estos módulos (ninguna medida: `rg` de `commands/providers/`
fuera de `cli` → 0).
