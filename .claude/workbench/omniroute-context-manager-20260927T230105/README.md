# Banco — gestor de contexto de OmniRoute en el proxy local

Porte de `open-sse/services/contextManager.ts` de OmniRoute (a58000c7, MIT)
a `src/packages/provider/src/proxy/context/`, más el disparo proactivo de
`handleChatCore` (`open-sse/handlers/chatCore.ts`) aplicado a un cuerpo de
Messages de Claude.

## Qué se portó

- `contextManager.ts`: la estimación de tokens (cuatro caracteres por token;
  una imagen o un documento en línea a presupuesto fijo), la ventana de un
  modelo, `compressContext` con sus cuatro capas (recorte de resultados de
  herramienta, poda de imágenes antiguas, razonamiento de los asistentes que
  no son el último, recorte de historia) y la integridad de los pares de
  herramienta (`fixToolPairs`, `fixToolAdjacency` y los dos recortes del
  asistente final).
- `compactRequest.ts`: el umbral proactivo (0,7 de la ventana menos lo que
  ocupan las herramientas), y el ida y vuelta del `system` de Messages, que
  el gestor necesita dentro de `messages`.
- Cableado: `server.ts` comprime por upstream con la ventana de SU modelo, y
  nunca en `count_tokens`; `startServer.ts` toma `contextCompaction.windows`,
  la ventana por modelo de upstream. Apagada si no se declara.

Divergencias, en la cabecera de cada módulo: la ventana la inyecta quien
construye el proxy (no hay registro de proveedores ni catálogo sincronizado),
las variables llevan el prefijo `THYROX_CONTEXT_*`, sin valores propios de un
proveedor ni límite de combo, fracción fija y sin la pasada de último recurso.

## Pruebas

`probes/port-tests.sh` genera nueve suites desde las de la referencia, con
cabecera propia y el cuerpo copiado por tramos:
`context-manager.test.ts` (sin los casos que leen el registro o el catálogo),
`service-context-manager.test.ts`, `context-manager-purify-system-first.test.ts`,
`10840-file-token-context.test.ts`, `8368-image-token-context.test.ts`,
`8560-responses-image-compaction.test.ts` (sin los dos del adaptador de
Responses), `8594-compress-image-token-stringify.test.ts`,
`fix-tool-adjacency.test.ts` y `mistral-trailing-assistant.test.ts`: 64 casos.

Propias: `proxyContextLimits.test.ts` (las cuatro variables de entorno y la
ventana inyectada) y `proxyContextRepair.test.ts` (las ramas que la
referencia no alcanza).

## Anulaciones

`probes/annul-all-suites.sh` corre las 29 variantes de
`probes/annul-context-manager.tsv` sobre cada suite y suma, por variante, los
fallos de todas: una variante discrimina si alguna cae
(`outputs/annul-context-manager/`).

En la primera pasada siete no discriminaban, porque ningún caso de la
referencia parte un par de herramienta al recortar, deja una llamada en el
último mensaje, mira el razonamiento del último asistente, corta la poda de
imágenes al caber o compara el texto exacto del aviso. El caso de la
referencia que dice probar el resultado huérfano no llega a partir el par: el
recorte cae antes. `proxyContextRepair.test.ts` fuerza las siete, y con él son
29 de 29.

Del adaptador y su cableado (`probes/annul-wiring.sh`, `outputs/annul-wiring.out`):
- `compactRequest`, 5 de 5;
- el servidor, 3 de 3: sin compresión, compresión también en `count_tokens`
  y la misma ventana para todos los upstreams;
- `startServer`, 2 de 2 (`outputs/annul-start-compaction.out`). `always-on`
  no discriminaba al principio: sin ventana declarada, la ventana genérica de
  128 000 tokens deja pasar la conversación de prueba entera. El caso «sin
  declarar» fija ahora `THYROX_CONTEXT_LENGTH_DEFAULT` pequeña, y ahí sí se
  distingue apagada de encendida.
