# `SDKMessage` inferido de su esquema

`headless-sdk/src/coreTypes.generated.ts` declaraba
`SDKMessage = { type: string; [key: string]: unknown }`, un placeholder que su
propia cabecera describe como sustituto de lo que «el build completo genera a
partir de los schemas Zod de `coreSchemas.ts`». `SDKMessageSchema` existe, así
que el tipo pasa a `z.infer<ReturnType<typeof SDKMessageSchema>>`. Verificado
antes: `coreSchemas.ts` no importa este archivo (no hay ciclo), y `zod/v4`
resuelve desde `headless-sdk`.

Una pasada de tsc: 4 169 → 4 042. Salen 170 diagnósticos y entran 43
(`revealed-contracts.txt`, sin números de línea). Veredicto: **parcial**.

Los 43 no son regresiones: son lo que el placeholder tapaba. El principal
(12 TS2367 en `cli/.../run-streaming.ts`): el código compara
`request.subtype` con `side_question`, `end_session`, `mcp_authenticate`,
`remote_control`, `generate_session_title`… y `SDKControlRequestInnerSchema`
del puerto no los declara. En el binario 2.1.275 esos subtipos NO aparecen
como literal de esquema (`subtype:R("…")`, la forma de los que sí están): se
despachan por `switch` y validan su propio esquema (`xe().safeParse(e.request)`
para `side_question`). Cómo los tipaba la fuente es DESCONOCIDO; condición de
cierre: leer en el binario el esquema que valida cada uno.

Métrica: diagnósticos de tsc por (archivo, código, mensaje), antes y después.
Ciega a: un error que cambie de mensaje en la misma línea — cuenta como uno
que sale y otro que entra.
