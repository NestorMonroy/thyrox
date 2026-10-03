# TASK-THYROX-0631 — checkout disperso en el worktree de un ítem del Pool

## Por qué

El grupo 3 del Pool salió entero con exit 4 por disco:

    item_worktree: no hay disco para el worktree: libres 1332 MiB, hacen falta
    3197 MiB (checkout 2173 MiB con margen, reserva 1024 MiB)

Reparto del checkout por prefijo (`git ls-tree -r -l HEAD`, 2026-09-30):

| Prefijo | MiB |
|---|---|
| `.claude/workbench` | 724 |
| `_references/claude-code-bin` | 692 |
| `.claude/jobs` | 167 |
| `_references/cliproxyapi` | 26 |
| `src` | 83 |

Esos tres primeros prefijos suman el 91 % y son evidencia y corpus ya
versionados, que un ítem de implementación no edita. Liberar espacio borrando
worktrees muertos (`.thyrox/pool-worktrees/818692b26e6e`, 3.8 GB, limpio) se
denegó y queda como decisión del ejecutor.

## Qué hace

`THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE` (prefijos separados por espacios):

- `prepare` hace `worktree add --no-checkout`, fija `sparse-checkout --no-cone`
  con `/*` menos cada hijo que el prefijo tiene en HEAD, y luego `checkout`;
- `checkout_bytes` (y el nuevo subcomando `checkout-bytes`) descuenta los
  bytes excluidos, así que la admisión por disco mide el checkout real;
- un prefijo absoluto o con `..` se rechaza con exit 2.

Se excluyen los hijos existentes y no el prefijo, porque un ítem crea bancos
nuevos en `.claude/workbench/<nuevo>/` y esos tienen que llegar al parche.

**Efecto colateral declarado:** `git sparse-checkout` activa
`extensions.worktreeConfig` en la configuración del repositorio. El árbol
principal no queda disperso (caso 5).

*Métrica:* bytes de blobs en HEAD bajo cada prefijo.
*Ciega a:* lo que el ítem escriba (el margen del 125 % lo cubre) y a un
ítem que necesite EDITAR un archivo excluido: no está en su worktree. Lo que
necesite leer de lo excluido lo lee del árbol principal.

## Sonda previa (git 2.43, repo de scratch)

Subárbol excluido ausente; un directorio nuevo bajo el mismo padre entra en
`git diff --cached --name-only`; `git -C <principal> sparse-checkout list`
rehúsa ("this worktree is not sparse").

## Pruebas

`tests/session/test-item-worktree-sparse.sh`: 11/11. Vecinas: disk 8/8,
location 10/10, lock 7/7, orphans 9/9, stash 19/19,
headless-pool-worktree 37/37 (`.claude/jobs/iw-suites-20260930T023836/`).
`bin/check_lint_zero`: 0 hallazgos en los dos `.sh`.

## Control de anulación

- `sparse_patterns` sin exclusiones → 10/11, cae sólo «el subárbol excluido
  no está».
- `checkout_bytes` sin descontar → 10/11, cae sólo «con exclusión descuenta el
  prefijo».

Un primer intento de la anulación de patrones no se aplicó (el patrón de gawk
no casó y el archivo quedó igual: 11/11). Se repitió editando la línea por
número.
