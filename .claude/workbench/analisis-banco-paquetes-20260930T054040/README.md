# Análisis del banco `packages-20260930T052338` (rama feature/complete-orm-root)

Leído con `git show origin/feature/complete-orm-root:<ruta>`, sin materializar nada.

## Dónde viven las plantillas del pool

- `.claude/jobs/` guarda sólo `README`, `manifest` y `log` de cada trabajo:
  `git ls-files .claude/jobs | grep -c prompt.md` → 0.
- La plantilla de un pool vive en su banco (`template.md` o `prompt.md`) y se
  pasa con `--prompt`. El ítem recibe esa plantilla más su línea `Item:`.

## Los tres despachos

| Lanzador | Ítems | Ancho | Salida |
|---|---|---|---|
| `launch.sh` | p2 p3 p4 p5 p6 p7 p9 p10 p11 | 3 | `outputs/` |
| `launch-b.sh` | p1 (ciclo de vida del pool) | 3 | `outputs-b/` |
| `launch-c.sh` | p8 (empaquetado P1–P7), p7b ([315]) | 3 | `outputs-c/` |

Los tres usan: `--isolation worktree`, `--timeout 7200`, `claude-sonnet-5`,
reserva de disco de 512 MB, exclusión dispersa de `.claude/workbench`,
`.claude/jobs` y `_references/claude-code-bin`, y el verify
`probes/verify-item.sh`.

## Lo que está bien

- La plantilla prohíbe `git stash`, `/tmp` fijo, escribir en `_references/`,
  escribir en el store y commitear. Exige TDD con anulación y los linters del
  pre-commit.
- El verify rechaza un ítem que no tocó ninguna prueba. Corre cada prueba según
  su forma y después `check_lint_zero` y `check_package_typecheck --strict`.
- Excluir `.claude/workbench` del worktree es seguro: el banco propio del pool
  nunca se excluye (#356).
- La agrupación coincide con los 11 paquetes del análisis de esta sesión.

## Riesgos medidos

1. **H-THYROX-283 / TASK-THYROX-0639 sigue abierta.** Al salir, el pool deja
   huérfanos los ítems vivos. Hay dos efectos:
   - con `--timeout 7200` y ancho 3, un corte deja worktrees y procesos sin dueño;
   - `launch-b.sh` pone a p1 a arreglar ese mismo defecto *dentro* de un pool que
     lo padece.

   p1 debe ir solo, y antes que `launch.sh`.
2. **Disco.** Contenedor de esta sesión: `df -h /` da 967M libres (98 % usado),
   y la reserva es de 512 MB. Tres worktrees no caben aquí. Esto aplica al
   contenedor de la otra sesión sólo si mide lo mismo; allí no se midió.
3. **Propiedad solapada en `launch.sh`.**
   - El ítem 1 (uds) reclama «piezas de swarm/tool-registry».
   - El ítem 3 reclama `src/packages/swarm/**`.

   `pool_integrate` declarará conflicto al segundo que toque el mismo archivo.
   No es destructivo, pero es trabajo perdido. Las cláusulas «y los archivos que
   cada tarea nombra» dejan el universo abierto. Además, de 9 ítems sólo 8 llevan
   la cláusula «Te pertenecen».
4. **Credencial.** Los ítems corren `thyrox -p`, que necesita credencial propia
   (no la del anfitrión). En este contenedor no se verificó, y no se investiga
   sin autorización.
5. **Orden declarado entre pools.** Ninguna barrera lo impone:
   - p8 dice arrancar «después del pool que hizo [129] y [187]»;
   - p7b depende de [203] y [319].

   Hay que encadenarlos con `wait-jobs register --after-ok`, o lanzarlos a mano
   en orden.

## Recomendación

1. `launch-b.sh` (p1) solo, hasta cerrar TASK-THYROX-0639 y TASK-THYROX-0640.
2. Después, `launch.sh` con swarm/tool-registry asignados a un solo ítem.
3. `launch-c.sh` al final, con la arista `--after-ok` declarada.

Antes de cada uno, medir el disco libre contra 3 × (tamaño del worktree
disperso + 512 MB).
