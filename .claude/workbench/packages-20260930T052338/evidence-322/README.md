# Evidencia para [322] TASK-THYROX-0601: un ítem vivo escribió en el árbol principal

Mientras corrían los pools `packages-pool` y `packages-pool-b` (2026-09-30,
05:26–05:38 UTC), aparecieron cuatro archivos cambiados en el árbol
PRINCIPAL de thyrox, no en el worktree de ningún ítem. `mtimes.txt` da la
hora de cada uno: todas entre 05:37:23 y 05:37:50, antes del TERM de las
05:38:02.

Los escribe `src/typescript/emit_declarations.py` (`CHECK_FILE`, líneas 276,
343 y 348): el typecheck de un paquete regenera el `exclude` de sus
`tsconfig` y deja `tsconfig.check.json`. `headless-pool.sh:123` exporta al
ítem el `THYROX_ROOT` del árbol principal, así que un ítem que corre
`bin/check_package_typecheck` desde su worktree escribe con esa raíz.

- `main-tree-tsconfig.diff`: el cambio en los tres `tsconfig.build.json`.
- `app-host-tsconfig.check.json`: el archivo nuevo, copiado antes de retirarlo.

Los cuatro se restauraron con `git restore` y `rm` tras copiarlos aquí.

*Métrica:* `mtime` de los archivos y su diff contra `HEAD`.
*Ciega a:* qué ítem concreto los escribió: los tres de `packages-pool` y el
de `packages-pool-b` corrían a la vez, y ninguno deja rastro por archivo.
