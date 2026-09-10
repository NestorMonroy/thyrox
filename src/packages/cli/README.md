# @thyrox/cli

Porte parcial del paquete `cli` de `claude-code-nestor-monroy-tools`
(TASK-DOCS-0205). Dos módulos de los 111 de la fuente; el resto no aplica —
ver el análisis de la iniciativa.

## Qué hay aquí y por qué

| Módulo | Qué es | Fuente del patrón |
|---|---|---|
| `exitCodes.ts` | Los cuatro códigos de salida que ya usan los `bin/*.ts` de thyrox (OK · FAIL · USAGE · CONFLICT), nombrados en vez de en números sueltos. | `packages/cli/src/exit.ts` — mismo significado, forma distinta (ver el docstring del módulo: la referencia llama `process.exit()` dentro del manejador; aquí se devuelve el código, que es el patrón que `harness/bin/harness.ts` ya usa). |
| `argv.ts` | Reexporta el análisis de argv temprano (`eagerParseCliFlag`, `extractArgsAfterDoubleDash`), no lo reimplementa. | La referencia MISMA lo consume así: `packages/cli/src/entry/mode-dispatch.ts` importa de `@claude-code-how-works/app-host/cliArgs.js`. Thyrox ya tiene ese porte verbatim en `@thyrox/app-host: src/cliArgs.ts` (capa 0, fechado antes de esta tarea). |

## Por qué no se porta el resto

`claude-code-nestor-monroy-tools: packages/cli/` tiene 111 archivos: árbol de
comandos Commander.js, TUI Ink/React, sesiones SSH remotas, transportes MCP
(WebSocket/SSE), una flota de PTYs en background, el runner headless del SDK.
Ninguno de esos mecanismos existe en thyrox ni debería — el harness propio
(`@thyrox/harness`) es un bucle nativo sin Commander, sin TUI, sin PTYs. Un
puerto 1:1 habría vendorizado complejidad de producto que el harness no
necesita, violando la premisa "reimplementar el patrón, no vendorizar el
código".

Lo que SÍ se reconoció y se dejó fuera de este paquete porque **ya vive en
otro lado**: el renderizado de eventos (`harness/src/cli/render.ts`) y el
punto de entrada (`harness/bin/harness.ts`). Ver la sección siguiente.

## El hogar futuro de `harness.ts` y `render.ts`

Esta tarea NO mueve `harness/bin/harness.ts` ni `harness/src/cli/render.ts` —
está fuera de las rutas asignadas al agente que escribió este paquete. Este
`README` deja constancia de que, cuando se muevan, este es el paquete que los
recibe: el nombre `cli` ya está reservado para "argumentos, códigos de salida
y punto de entrada", que es exactamente lo que esos dos archivos son.

## Puente temporal: import relativo en `argv.ts`

`argv.ts` reexporta desde `../../app-host/src/cliArgs.ts` (ruta relativa),
no desde `@thyrox/app-host/cliArgs.js` (nombre de paquete) — aunque
`package.json` SÍ declara la dependencia real
(`@thyrox/app-host: workspace:*`). La razón: `@thyrox/cli` no resuelve por
nombre desde ningún sitio hasta que `src/packages/bun.lock` registre este
workspace, y ese archivo no estaba entre las rutas de la tarea que creó este
paquete. `bun install --dry-run` en `src/packages/` confirma que el registro
es aditivo (sin red, sin alterar ninguna entrada existente). El cambio, una
vez que alguien corra ese `bun install`, es de una línea — marcado con
`// TODO(bun.lock)` en `argv.ts`.

## Verificación

```bash
bun test tests/cli/exitCodes.test.ts tests/cli/argv.test.ts
```

Los tests importan por ruta relativa desde `tests/cli/`, por la misma razón
de arriba — no por preferencia de estilo.
