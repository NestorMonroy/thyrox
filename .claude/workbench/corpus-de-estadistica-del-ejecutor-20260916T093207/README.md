# Los dos corpus de estadística que el ejecutor aportó

Vivían en el scratchpad y morían con el contenedor. Directiva del ejecutor
2026-09-16: *«para eso están los THYROX_WORKBENCH … muévelos a la ruta
correcta»*. Aquí están, versionados.

## Qué es cada uno — medido, no por su nombre de carpeta

| Corpus | Archivos | De qué trata realmente |
|---|---|---|
| `analisis-de-texto-y-probabilidad-en-shell/` | 32 `.md` | **No es un corpus de estadística.** Es búsqueda y proceso de texto en shell —`awk`, `sed`, BRE contra ERE, `find`/`xargs`, TF-IDF— más probabilidad aplicada a ese análisis: Pearson y KL en awk, distribuciones exponencial, geométrica e hipergeométrica |
| `correlacion-serial-en-r/` | 9 R Markdown | Correlación serial: `w1`–`w5`, `AR_example`, `timeSeries1`, `FF_factors`, `_chunk-opt`. Siete `.Rmd` y dos `.rmd` — la caja del sufijo difiere |

Los dos artefactos de la iniciativa los describían como «32 documentos de
estadística y 9 de correlación serial». La primera mitad es falsa y se corrigió
al medirla; la segunda se contó primero como 7, porque el patrón era sensible a
la caja del sufijo.

## Lo que el censo midió

| Patrón | 32 `.md` | 9 `.Rmd` |
|---|---|---|
| `cusum`, `change point`, `structural break`, `breakpoint`, `chow` | **0** | **0** |
| control positivo: `regresión` / `correlación` | 2 | 8 |

El control positivo es lo que hace que el cero signifique algo: sin él, un cero
no distingue «el corpus no lo trae» de «el instrumento no lo lee». Y ese
control ya atrapó una ceguera real en este mismo pase — la primera corrida dio
0 hasta para «regression» sobre el primer corpus, lo que delató que el patrón
no estaba alcanzando esos archivos.

## Por qué existe este banco

La afirmación «el punto de cambio está ausente en los dos corpus» se venía
citando **desde un docstring**, que es una afirmación y no una `Observation`.
El ejecutor lo señaló. El corpus versionado aquí es lo que permite que esa
afirmación se pueda volver a medir en otra sesión en vez de re-heredarse.

## Si su clase resultara otra

Lo que se construye **contra** un corpus vive en `_references/` (los cinco
vendorizados, más `clean-code-solid/` de esta misma sesión). Este banco lo
trata como **entrada de un episodio de medición**, que es lo que fue. Si el
veredicto del ejecutor es que es material de referencia y no evidencia de
episodio, el cambio es un `git mv` a `_references/`.
