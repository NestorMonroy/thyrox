# Los worktrees de los ítems salen de `.git/` a `.thyrox/pool-worktrees/`

En el pool `fast-mode-pool-unbounded-20260929T000919`, `claude -p` rechazó cada
Write y Edit en los worktrees: el ítem 1 tuvo 8 rechazos y el ítem 2 tuvo 2,
todos con «requested permissions to edit … which is a sensitive file». La
causa: los worktrees vivían en `.git/pool-worktrees/`, y el runner trata como
sensible toda ruta con segmento `.git`, `.claude`, `.vscode` o `.idea`
(`DANGEROUS_DIRECTORIES`, `permission/src/filesystem.ts:136`). En modo -p no
puede pedir permiso.

Ahora viven en `.thyrox/pool-worktrees/` de la raíz del repositorio, excluida
por `info/exclude` y no por un `.gitignore` versionado, para que valga en
cualquier consumidor. `THYROX_POOL_WORKTREES_DIR` cambia la raíz, y una raíz
con segmento sensible se rechaza con exit 2.

Las suites que preparan worktrees con su repo en `.claude/cache` reciben una
raíz propia en `~/.cache`: con la regla nueva, la ruta por defecto colgaría de
`.claude`.

Si el alta falla, el `.err` del ítem trae ahora el motivo de `item_worktree`.
Antes decía sólo «no se pudo preparar».

## Medición

| Salida | Resultado |
|---|---|
| `location.txt` | 10/10 |
| `lock.txt` | 7/7 |
| `pool-worktree.txt` (antes del caso 7) | 20/20; con el caso 7, 22/22 |
| `modelScope.txt` (ítem 2 integrado) | 19 pass |
| `tsc-agent-build.txt` | sin errores |

## Anulaciones

| Anulación | Resultado |
|---|---|
| `item_worktree.pre-location.sh` (el de HEAD) contra la suite de ubicación | 4/10: caen exactamente las 6 aserciones de ruta, exclusión y rechazo |
| `headless-pool.pre-prepare-err.sh` sustituido en su sitio contra la suite del pool | 21/22: cae sólo «el .err nombra el motivo de git» |

Una primera anulación del pool con la copia fuera de `src/session` no era
válida: el script no encontraba a sus hermanos (exit 127) y tumbaba 16
aserciones que no dependen del cambio. Se repitió en su sitio con respaldo
propio y se restauró; `cmp` lo confirma.

*Métrica:* aserciones de las suites de `tests/session` sobre `item_worktree` y
`headless-pool --isolation worktree`.
*Ciega a:* el rechazo real de `claude -p` sobre la ruta nueva. Eso lo mide la
siguiente ejecución del pool con un ítem que escriba.
