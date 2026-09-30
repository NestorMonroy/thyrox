# Diffs parciales de ítems cortados por el reinicio del contenedor (2026-09-30)

Un reinicio del contenedor mató los pools en curso sin verificar nada. Cada
`<ítem>.patch` es el diff que su worktree tenía en ese momento; su
`<ítem>.manifest` registra la procedencia medida: run e ítem predecesores,
worktree, **commit base** (el `HEAD` del árbol principal cuando ese ítem
preparó su worktree, no el del lanzamiento del pool), **SHA-256 del patch** y
las cuatro vistas de sus archivos (`git status --short`,
`git diff --name-only HEAD`, `git ls-files --others --exclude-standard` y los
archivos del patch; las dos primeras difieren del último cuando un directorio
sin versionar aparece como una sola entrada).

Invariantes:

1. `diff parcial ≠ resultado verificado ≠ resultado integrado`. El patch es
   material de partida del ítem relanzado; no hereda veredicto, pruebas,
   medidas ni conclusiones. Las cifras del `measure` previo son diagnóstico.
2. El ítem relanzado parte de otro `HEAD`: el patch se reconcilia, no se
   aplica a ciegas. Puede aceptar, modificar, descartar o reimplementar cada
   parte, y vuelve a demostrarlo todo (diff resultante, pruebas propias,
   controles).
3. Los runs muertos son sólo evidencia: sus directorios `outputs/pool*` no
   tienen ningún archivo ni veredicto, y `pool_integrate` sólo aplica ítems
   `verificado`. Lo único integrable sale de los relanzamientos
   (`outputs/pool-resume`, `outputs/pool-measure-resume`).
4. Patch preservado (evidencia inmutable, verificable por su SHA-256) ≠
   worktree viejo (estado operativo abandonado, sólo para investigar). Los
   relanzamientos son reproducibles con el commit base y el patch, aunque el
   worktree viejo se borre con autorización del ejecutor.
5. `measure` relanzado → verificado → integrado → TASK-THYROX-0691: 0691 no
   se lanza hasta que `measure` esté integrado, porque comparten archivos.

## Corrección de la evidencia de `primitive` (2026-09-30)

La prueba de reconstrucción (`probes/reconstruct_partial.sh`: `read-tree`
del commit base en un índice temporal, `apply --cached --binary` del patch y
comparación de modo y blob por ruta contra el worktree muerto) reprodujo 4 de
5 patches. El de `primitive` no aplicaba: se había extraído con el índice del
propio worktree tras `git add -N` y con detección de renombres, y declaraba
como archivo nuevo dos rutas que existen en su commit base. Se re-extrajo sin
tocar el índice del worktree (índice temporal, `read-tree HEAD`, `add -A`,
`diff --cached --binary --no-renames HEAD`) y ahora reproduce las 27 rutas.
El SHA-256 anterior queda en el manifest como `patch_superseded_sha256`; el
contenido anterior, en el historial de git.

El contenido final de cada archivo ya estaba en el patch anterior (sólo las
cabeceras eran incorrectas), así que el relanzamiento que partió de él no
perdió material; su resultado se verifica por sus propias pruebas.
