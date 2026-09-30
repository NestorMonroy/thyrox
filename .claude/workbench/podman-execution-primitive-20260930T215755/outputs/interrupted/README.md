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
