# adoptar-jsonl-en-manifiestos

## El encargo

> «en thyrox ya no vamos a usar json vamos a usar JSONL (JSON Lines)»

Bucket C del censo (`.claude/workbench/adoptar-jsonl-censo-20260917T051111/`):
`models.json` ya convertido (`thyrox@317509fa`); quedan los **88
`manifest.json`**.

## La premisa, corregida al medir

La lectura cómoda era «renombrar y ya». Es **un no-op para el lector**:
`JSON.parse` acepta un JSONL de UNA línea, así que una conversión
documento-a-línea pasa cualquier control sin que ningún lector cambie. Es el
sub-patrón D con la propia conversión como sujeto.

### Lo medido, que decide la forma

**Ninguna clave expande.** Sobre los 88, **todas** las listas son listas de
cadenas — `blind_to`, `outputs`, `findings`, `tasks`, `consumers`, `source`,
`instrument`, `destination`. Ninguna es una colección de registros con sentido
propio, así que el criterio de expansión por clave que fijó `models.jsonl`
**descarta** este eje.

**El eje que sí expande es el temporal, y sólo en `jobs`:**

| población | n | ¿≥2 registros? | por qué |
|---|---|---|---|
| `.claude/jobs/*/manifest.json` | 46 | **sí** | `job_runs.scaffold_run` escribe uno; `job_runs.settle` escribe otro |
| `.claude/workbench/*/manifest.json` | 42 | **no** | un documento que una persona edita en sitio |

`settle` hoy hace **lectura-modificación-reescritura** del documento entero
(`job_runs.py:243-255`). En JSONL es un **append**, que es la propiedad de
concurrencia que importa: `run-task-pool` corre N trabajadores.

**Medido: 14 de los 46 jobs ya tienen los dos momentos** (`started_at` y
`exit_code`), así que el control positivo es **real y del repo**, no fabricado.

### Lo que NO se hace, y por qué

- **No se fabrica un segundo evento para workbench.** `scaffold_workbench`
  escribe vacío **a propósito**: un run recién andamiado no es conforme, y
  rellenarlo pasaría el check de presencia con un dato que nadie declaró.
- **El lector no admite las dos formas.** Un lector dual es una segunda fuente
  de verdad sobre qué es un manifiesto. Por eso los 88 se convierten: dejar un
  `.json` con el lector ya en `.jsonl` daría `{}` — un vacío silencioso, que es
  peor que un error.

Lo que dissuelve la trampa de n=1 es que el **lector es compartido y se prueba
sobre `jobs` (n≥2)**: `read_manifest_lines` lo usan `job_runs.read_manifest`,
`check_manifest_language.scan` y `manifest.ts`. Un workbench de una línea lo lee
un lector ya probado en dos.

### Los 14 «lectores» del censo son TRES artefactos

`censo.py` lo declara en su propio docstring y aquí se confirma por lectura:

| archivo | qué manifiesto | veredicto |
|---|---|---|
| `src/packages/config/dxt/helpers.ts` | el **DXT/MCPB** de Anthropic (`McpbManifestSchema`) | contrato ajeno — **fuera** |
| `src/packages/updater/src/nativeInstaller/download.ts` | el de **release**, por HTTP (`${baseUrl}/${version}/manifest.json`) | ni siquiera está en el árbol — **fuera** |
| `src/packages/tools/src/definitions/workbenchInstrumenter.ts` | el nuestro, pero **sólo en prosa** de una descripción de herramienta | se actualiza el texto; no parsea |

## Las piezas

| archivo | qué hace |
|---|---|
| `src/workbench/manifest.py` | `MANIFEST_FILE_NAME`, el lector de líneas y el emisor |
| `src/workbench/manifest.ts` | el gemelo TS: `checkWorkbench` y `scaffoldWorkbench` |
| `src/session/job_runs.py` | `scaffold_run` (launch) y `settle` (append, ya no reescribe) |
| `src/verify/check_manifest_language.py` | tercer lector: deja de hacer `json.loads` del archivo entero |

## Los resultados

Conversion: **89** manifiestos versionados (no 88 — el extra es el manifiesto de
este mismo banco, commiteado despues de correr el censo). Formas medidas antes
de escribir el reparto: 47 `declaration`, 27 `launch`, 14 `launch+settle`, 1
`launch+settle+declaration`; los 41 con `started_at` son 27 + 14.
`--verify` contra los blobs de `git HEAD`: **89 de 89**, 0 divergencias.

## El control de `--verify` fallo primero, y publico VERDE

La anulacion que debia probar que `--verify` discrimina uso
`grep -v '"kind":"settle"'` **sin el espacio**. `json.dumps` emite
`{"kind": "settle", ...}` con espacio, asi que no retiro ninguna linea: el
archivo quedo intacto y `--verify` salio 0. El `| tail -5` ademas enmascaraba el
codigo de salida de python.

Es el sub-patron D cometido **sobre el propio control**: un verde que no
distingue «la verificacion detecta la divergencia» de «la mutacion no ocurrio».
Rehecho leyendo primero el contenido real del archivo y redirigiendo a un
archivo en vez de a un pipe: exit **1**, `DIVERGE
.claude/jobs/suite-full-t9-20260913T182631/manifest.jsonl`, y el conteo
`verificados 89 de 89 (divergen 1, ausentes 0)`. Restaurado con sha256
coincidente, exit 0.

**La leccion operativa, que es reusable:** una anulacion que se hace con un
patron literal tiene que verificar que el patron CASA —midiendo las lineas que
retira— antes de leer el veredicto. Y un `|` a `head`/`tail` descarta el exit
code del productor; cuando el veredicto ES el exit code, se redirige a archivo.

## El renombre de la constante ciega al PROVEEDOR sobre sus consumidores

Medido al cambiar `MANIFEST_FILE_NAME`: el gate de idioma de claves paso de
**42 manifiestos medidos** a **0**, y publico «0 claves en español» — verde,
sobre un corpus entero que ya no miraba. Dos vias independientes:

1. el **glob** recorria un solo nombre;
2. el **lector** paso a ser de lineas, y los 42 `.json` de docs son multilinea
   (de 4 a 68 lineas), asi que `read_manifest_lines` revienta con todos y el
   `except ... continue` los salta en silencio.

Por eso el lector acepta los **dos** nombres y despacha por **sufijo**, y el
escritor emite **uno**. Tras el arreglo el gate reproduce el veredicto exacto de
`HEAD`: **30 ofensores / 42 medidos** — los 30 son deuda preexistente del
consumidor, no regresion.

En TypeScript el mismo renombre habia dejado la suite **roja sin que nadie la
corriera**. Medido por anulacion sobre sus 37 casos: retirado el `.jsonl` del
resolutor, **37 pass / 0 fail** —cero cobertura de la forma que se adopta—;
retirado el heredado, 21 fail. Añadidos 6 casos, la misma anulacion da 3 fail,
22 fail y 18 fail para las tres ramas (nombre nuevo, heredado, despacho por
sufijo). Y cuatro fixtures de `cli/__tests__/workbench.test.ts` pasaban **por
coincidencia**: escribian `JSON.stringify(m)` sin sangrado, que es un JSONL de
una linea — la trampa n=1 dentro de la propia suite.

*Metrica:* manifiestos versionados por `git ls-files`; formas por
`split_into_records`; `--verify` contra el blob de `git HEAD`; denominador y
ofensores del gate de idioma sobre los dos hogares de `kaupamex-docs`; pass/fail
de `bun test` bajo cada anulacion.
*Ciega a:* los manifiestos de consumidor que **no** se migran en este pase (42
en docs, 54 en api) — se leen, no se convierten; a si algun consumidor tiene un
lector propio de `manifest.json` fuera de los dos arboles medidos; y a `.json`
que no sean manifiesto de banco (DXT y release, declarados fuera).
