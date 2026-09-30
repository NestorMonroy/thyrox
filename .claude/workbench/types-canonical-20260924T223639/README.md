# Un solo modelo por tipo: el porte en la ruta de la fuente

Directiva del ejecutor: opcion 1 — el canonico vive en la ruta de la fuente
(`types/*.ts`) y los modulos de la raiz reexportan, como `compactionDeps.ts`.

## Medicion previa

- La fuente (`ccnmt: packages/agent/`) solo tiene `types/*.ts`; los modulos de
  la raiz (`agentDeps`, `agentEvents`, `agentState`, `coreTools`,
  `coreMessages`) eran portes en rutas que la fuente no tiene.
- `probes/compare_declarations.ts` compara cada declaracion exportada, sin
  comentarios, en tres archivos: porte, copia en `types/`, fuente
  (`outputs/declarations.tsv`). 55 nombres definidos dos veces; la copia es
  identica a la fuente en los 55; el porte difiere en 16, que son sus
  divergencias declaradas (`turnId`/`ts` opcionales en eventos; `uuid: string`
  y `stop_reason` abierto en mensajes).
- `outputs/baseline.tsv`: especificadores de import por modulo y diagnosticos
  de tsc en cada archivo (0 en todos).

## Resultado

- `outputs/declarations-after.tsv`: 0 nombres definidos dos veces; `types/*`
  igual a la fuente en 39 y distinto en las 16 divergencias declaradas.
- `outputs/verify-after.log`: tsc + message_shape_audit, 2404 antes y 2404
  despues, mismo conjunto (diff vacio contra step-070/final.log).
- `outputs/runtime-after.log`: 113 pass, 0 fail en 12 archivos.
