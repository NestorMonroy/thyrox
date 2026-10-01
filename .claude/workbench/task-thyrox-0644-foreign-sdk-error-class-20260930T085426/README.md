# TASK-THYROX-0644 — la clase de error ajena del SDK, sin depender del layout de `node_modules`

Sujeto: `src/packages/provider/__tests__/proxySdkForward.test.ts`, los dos casos
que lanzan un `APIError` de «la copia del SDK que trae un cliente de nube».
Lo que protegen —el reconocimiento por forma de `isApiError` en
`src/packages/provider/src/proxy/sdk/sdkForward.ts` (H-THYROX-222)— no cambia.

## Estado de partida, medido en el worktree (HEAD 77e369e178)

`bun test __tests__/proxySdkForward.test.ts` → 20 pass, 1 fail, 32 expect().
El rojo es la precondición `expect(NestedApiError).not.toBe(APIError)`:

```
Bun.resolveSync('@anthropic-ai/vertex-sdk', dir) → /home/user/thyrox/node_modules/@anthropic-ai/vertex-sdk/index.mjs
Bun.resolveSync('@anthropic-ai/sdk', <vertex>)  → /home/user/thyrox/node_modules/@anthropic-ai/sdk/index.mjs
Bun.resolveSync('@anthropic-ai/sdk', dir)       → /home/user/thyrox/node_modules/@anthropic-ai/sdk/index.mjs
```

bun deduplicó: `vertex-sdk` declara `"@anthropic-ai/sdk": ">=0.50.3 <1"` y la
raíz trae 0.124.0, que lo satisface; no hay `vertex-sdk/node_modules/`.

*Métrica:* rutas devueltas por `Bun.resolveSync` desde el directorio de la
prueba y desde el `index.mjs` del SDK de Vertex.
*Ciega a:* otra instalación en la que bun no deduplique (rango incompatible):
allí la prueba original pasaba, y por eso llegó verde al commit `bca6d680b`.

## Cómo lo resuelve la referencia (2.1.283, sólo lectura)

| Símbolo / literal | Dónde | Qué hace | Decisión |
|---|---|---|---|
| `Ot` | `bunfs-root/chunk-wg7ts4cy.js:11` — `import{Ot,I,l,U}from"/$bunfs/root/chunk-ern0s5ks.js"` | el `APIError` del SDK, importado del chunk que lo define | ya portado como `APIError` de `@anthropic-ai/sdk` |
| `class Ot extends Wn{constructor(n,e,t,r,o){…this.status=n,this.headers=r,this.requestID=…` | `chunk-ern0s5ks.js:11` | la clase del error: `status`, `headers`, `error`, `requestID` sobre `Error` | la forma que `isApiError` reconoce (`status`, `headers`, `error`) |
| `static generate(n,e,t,r){…}` | `chunk-ern0s5ks.js:11` — **1** aparición en todo `bunfs-root/*.js` | el constructor por estado; una sola clase en el bundle | — |
| `h instanceof Ot` (stream, `Oj`) y `y instanceof Ot` (`jv`) | `chunk-wg7ts4cy.js:237` y `:240` — **2** apariciones | reconocen el error por identidad de clase | **divergencia declarada, ya en `sdkForward.ts`**: se reconoce por forma, porque aquí cada SDK de nube puede traer su propia copia |
| `@anthropic-ai/vertex-sdk`, `@anthropic-ai/bedrock-sdk` | `rg -l` sobre `bunfs-root/` → **0** archivos | el bundle no lleva esos literales: empaqueta UNA copia del SDK, y sus clientes de nube la comparten | la referencia no tiene este problema y no tiene prueba que portar |

*Métrica:* conteos de `rg` sobre `bunfs-root/*.js` con los patrones literales
`static generate(`, `instanceof Ot` y los nombres de paquete.
*Ciega a:* un nombre minificado distinto de `Ot` en otro chunk (el conteo de
`static generate(` cubre esa ceguera para la clase: es 1).

## Las formas medidas para obtener una clase ajena

| Forma | Distinta de `APIError`? | `instanceof Error` | `status`/`headers`/`error` | Notas |
|---|---|---|---|---|
| `import(\`${index.mjs}?instance=cloud\`)` (la sugerida en el prompt) | **no** — bun devuelve la misma instancia del módulo, y la segunda consulta también | — | — | descartada: no fuerza otra evaluación |
| `import(<sdk>/core/error.js)` — el build CommonJS del mismo paquete | **sí** | sí | sí, sí, sí; `message` = `401 x`, `status` = 401 | **elegida** |
| copia de `core/error.mjs` + `internal/errors.mjs` a `mktemp -d` e `import` | sí | sí | sí | funciona; descartada por depender del grafo de imports interno del SDK (dos archivos hoy) y por exigir copia y limpieza |
| clase escrita a mano con la misma forma | sí | — | por construcción | descartada: mediría la forma que la prueba asume, no la del SDK |

*Métrica:* `===` entre clases, `instanceof` y `in` sobre un error generado
con `generate(...)` de cada forma, en un guion suelto de bun 1.3.11.
*Ciega a:* un SDK futuro sin build CommonJS —entonces `import` falla con un
error de resolución, no con un verde falso—.

## Lo que cambió en la prueba

- Una constante de módulo, `ForeignApiError`: el `APIError` de
  `<sdk>/core/error.js`, resuelto desde el `index.mjs` que bun ya resuelve.
- Los dos casos de «copia de un SDK de nube» (stream y sin stream) la usan, y
  los dos exigen `expect(ForeignApiError).not.toBe(APIError)`; antes el del
  stream no lo exigía y pasaba sin probar nada ajeno.
- El caso sin stream añade `expect(error).not.toBeInstanceOf(APIError)`: el
  fenómeno exacto que el reconocimiento por forma resuelve.

## Resultado y control de anulación

| Ejecución | pass | fail | expect() |
|---|---|---|---|
| HEAD | 20 | 1 | 32 |
| con el cambio | 21 | 0 | 36 |
| anulación: copia `sdkForward.annul.ts` con `return error instanceof APIError` (import de valor), vía `SDK_FORWARD_MODULE` | 19 | 2 | 34 |

Caen exactamente los dos casos de clase ajena: «el error a mitad del stream
de la copia de un SDK de nube conserva su estado» y «el error de la copia del
SDK que trae un cliente de nube se reconoce igual». Los 19 restantes
sobreviven porque lanzan el `APIError` propio o ningún error del SDK.

Restauración: la copia se borró (`rm`); `git status --short src/proxy/sdk/`
vacío; `git diff --stat -- src/proxy/sdk/sdkForward.ts` → 0 líneas.

*Métrica:* salida de `bun test` con y sin `SDK_FORWARD_MODULE`.
*Ciega a:* un `APIError` de una tercera copia con otra forma (sin `headers`,
por ejemplo): la prueba mide identidad distinta con forma igual, que es el
fenómeno de la deduplicación, no una versión distinta del SDK.
