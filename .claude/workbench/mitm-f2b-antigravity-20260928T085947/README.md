# F2b-1 — handler `antigravity`

Porte de `omniroute: src/mitm/handlers/antigravity.ts` y de su prueba
`tests/unit/mitm-handler-antigravity.test.ts` (MIT) a
`src/packages/mitm/src/handlers/antigravity.ts`.

- `convertGeminiToOpenAI`: abre el sobre `cloudcode-pa` (`.request`) o toma la
  raíz, y traduce `systemInstruction`, `contents` y `generationConfig` a un
  cuerpo chat.completions; `:streamGenerateContent` decide `stream`.
- `mergeAntigravityCatalog`: suma los modelos dinámicos al catálogo de
  `fetchAvailableModels` —en arreglo o en objeto— sin pisar un nativo con el
  mismo id, y los pone al frente del primer grupo recomendado.
- `cliToolNames.ts`: la tabla de nombres de herramienta del CLI
  (`claudeCodeToolRemapper.ts` + `claudeCodeExtraRemap.ts`); sólo la copia
  que guarda el inspector la aplica, al agente le llega la respuesta tal cual.
- El destino `antigravity` resuelve ahora su handler; la prueba de
  adaptación de destinos dejó de excluirlo.

## Divergencias

| Referencia | Aquí | Por qué |
|---|---|---|
| El catálogo dinámico son los combos de la base (`getCombos`, sin ocultos ni inactivos) | Son los modelos que lista el proxy local (`GET /v1/models`, con la clave del cliente) | thyrox no tiene base de combos: los combos son entradas de `routing.models` del proxy, y el proxy es quien sabe qué sirve. Ocultos e inactivos no existen como estado: una entrada no declarada no se lista |
| `import()` dinámico de la base con dos rutas de respaldo | Una función, `proxyCatalogModels`, que devuelve `[]` si el proxy no responde | Sin proxy no hay modelos que sumar; el catálogo nativo sigue sirviendo |
| Las dos pruebas de la base de combos | Una prueba contra un proxy real en loopback (clave incluida) y otra con el proxy inalcanzable | Misma pregunta, otra fuente |

## Lo que no cierra

La conversación que llega en sobre `cloudcode-pa` por el servidor MITM va a
`/v1/antigravity` del proxy (`server/forwardTarget.ts`), y el proxy no sirve
esa ruta: es el traductor `antigravity-to-openai` y su vuelta
`openai-to-antigravity`. Sucesor: la tarea MITM F2b-2.

Rojo persistido en `red-f2b.txt`. Anulaciones: `annul-f2b.sh`,
`results-f2b.txt` — las diez discriminan.
