# container-image-distribution

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## Corrección (2026-10-03): `probes/image_census.sh` no es autoridad

**Estado: SUPERSEDED EXPERIMENTAL EVIDENCE.** Se escribió antes de terminar
Search Existing. La búsqueda posterior encontró la autoridad que ya cubría el
mismo dominio:

- **Observación:** `@thyrox/podman-execution`. `observe snapshot` publica, por
  imagen, `uniqueBytes` y `usedBy`, y `podmanObservation.ts` contiene
  `inspectImage`, `imageHistory`, `imageUsage` y `snapshot`.
- **Clasificación:** T005 (`postgres-corpus-disk-reclaim-20261002T023317`):
  `inventory_observe.sh`, `t005_classify.py`, `t005_decisions.json`. La regla
  P4 de T005: el estado de Podman se pide al dueño desde el plano de control.
  Una unidad gestionada no ve el almacén. La ejecución gestionada de la primera
  versión lo confirmó: `Executable not found in $PATH: "podman"`, exit 2.

Lo que este banco **no** usa como base:

- el `podman image inspect` directo de `outputs/phase3/inspect.json`, que es
  una observación no canónica aunque sea de sólo lectura;
- su linaje por `children[0]`. Un padre con varias ramas lo resolvería de forma
  arbitraria. En estos datos ninguna intermedia tiene más de un hijo
  (`untagged-lineage.json`, `childCount`), pero eso no convierte el método en
  un modelo de DAG.

**Corrección del mensaje de `7d37dcef3`.** El mensaje afirmó «the
per-instruction intermediates of three builds» y «none holds layers of its
own». La afirmación sostenida por la evidencia canónica es más estrecha:

> T005 clasifica las intermedias sin etiqueta como `image:intermediate`
> (clase E, `safe=false`). La observación del dueño mide su `uniqueBytes`. El
> tamaño aparente no es almacenamiento único recuperable. Su valor principal
> es de identidad, procedencia e historial de build, no de bytes propios.

La agrupación en tres builds es una inferencia del `Parent`, no una procedencia
durable. Queda como hipótesis hasta enlazarla con su TASK y su commit.

**Segundo RepoDigest del task-runner.** `e6981bdf…` es el digest que el
almacén local asigna a su propio manifiesto. `resolve` lo devolvía en lugar del
digest del registro (H-THYROX-312, sucesor TASK-THYROX-0756). El registro sirve
`sha256:1cced65c…`, que también figura entre los RepoDigests locales. Este
punto es sólo de procedencia y no invalida la verificación.
