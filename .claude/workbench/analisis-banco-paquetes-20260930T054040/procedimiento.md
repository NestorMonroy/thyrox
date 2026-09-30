# Procedimiento de despacho de paquetes con el pool (corregido)

Primera versión dada en el chat; esta es la corregida tras la revisión de la
otra sesión. Cada corrección se verificó contra el código:

- `headless-pool.sh:123` exporta `THYROX_ROOT` del árbol principal a los ítems;
- `wait-jobs.sh:370` llama a `cmd_dispatch` en cada vuelta de `wait`;
- `recovery_controller.py:26-28,130` dice que `recover` sólo lee la foto y que
  la propiedad la toma `pool_lifecycle claim`;
- `bin/task_ids lookup`: [322] es TASK-THYROX-0601, [362] es TASK-THYROX-0639 y
  [363] es TASK-THYROX-0640.

## 0. Condiciones previas (si alguna falla, no se lanza)

| Condición | Cómo se comprueba |
|---|---|
| El pool no deja huérfanos los ítems vivos al salir | [362] TASK-THYROX-0639 cerrada |
| Un ítem no escribe fuera de su worktree | [322] TASK-THYROX-0601 cerrada. Medido: un ítem escribió 4 `tsconfig` en el árbol principal, porque el pool le pasa el `THYROX_ROOT` del árbol principal y `emit_declarations.py` escribe con esa raíz (`evidence-322/`) |
| Disco | `df -h /` en **el contenedor donde se lanza**, ≥ ancho × (worktree disperso + reserva). El valor depende de dónde se mida: 967M en uno, 24G en otro |
| Credencial | `--credential-proxy`: sin `ANTHROPIC_AUTH_TOKEN`, `THYROX_CODE_OAUTH_TOKEN` (ni su descriptor) ni `ANTHROPIC_API_KEY`, el proxy sale con 2 y el pool no lanza. Sin el flag, los ítems usan el token de sesión del anfitrión |
| Cita durable de cada tarea | `bin/task_ids ingest-board` / `lookup` |

## 1. Banco

Todo va en `.claude/workbench/<tema>-<ISO>/`:

- `template.md`
- `pN-<paquete>.md`, la fuente de verdad de cada paquete
- `items.txt`, con los ítems disjuntos por archivo
- `probes/verify-item.sh`
- `launch.sh`

El verify rechaza un ítem que no tocó ninguna prueba **salvo** que deje una
tabla de veredictos sin filas `portada`. Por eso las tareas de revisión o de
registro ([72], [95], el paquete 10) tienen que exigir en su ítem una prueba o
esa tabla. Las plantillas viven en el banco, nunca en `.claude/jobs/`.

El banco se commitea completo antes de lanzar.

## 2. Lanzar, de uno en uno

```bash
bash bin/thyrox-bg start pool-X --grace 0 -- bash "$B/launch.sh"
bash bin/thyrox-bg register pool-X
```

Entre pools dependientes **no** se usa `--after-ok`. Esa arista lanza al
sucesor cuando el predecesor termina, no cuando sus parches ya están en `HEAD`,
y los worktrees del sucesor nacen de `HEAD`. La cadena es manual:

pool → `pool_integrate` → pruebas → commit → siguiente pool.

(`--after-ok` sirve para trabajos que no dependen de lo integrado. Su
`dispatch` lo mueve `wait-jobs wait` en cada vuelta, pero sólo mientras haya una
espera corriendo.)

Dependencias reales:

- `launch-c.sh` va detrás de `launch.sh`, porque [129] y [187] están en p9 y
  [203] y [319] en su paquete de datos, y detrás de su integración;
- p1 (`launch-b.sh`) va primero y solo.

## 3. Mientras corre

- Cada ítem trabaja en su propio worktree. **Mientras 0601 siga abierta**, un
  ítem puede escribir en el árbol principal: vigilar `git status` del árbol
  principal.
- Hay fotos periódicas en `refs/thyrox/snapshots/<run>/<item>/<gen>`.
- La espera va en segundo plano:
  `wait-jobs wait --only pool-X` con `run_in_background`.

## 4. Recoger

En `outputs/` quedan `<n>.json`, `<n>.patch`, `<n>.files`, `<n>.verdict` y
`<n>.closed`.

Códigos de salida de un ítem:

| Código | Significado |
|---|---|
| 3 | admisión |
| 4 | `prepare` |
| 6 | drenaje o escritores vivos |
| 7 | publicación |

## 5. Integrar

```bash
bash bin/pool_integrate "$B/outputs"   # --unverified añade los sin-verificar
```

- Sale 0, 1 o 2.
- Nunca aplica ítems `con-stash`, `sin-cerrar`, `incoherente`, en conflicto o
  `no-aplica`.
- No commitea.

## 6. Validar y commitear

- Correr las pruebas derivadas de lo que se tocó.
- Commitear por pathspec con `commit_identity`, citando `TASK-THYROX-NNNN`.
- Commitear las `outputs/` del banco y publicar.
- Sólo después se lanza el pool siguiente.

## 7. Recuperar un ítem abandonado: DOS pasos en la CLI

```bash
bash bin/pool_lifecycle reconcile
bash bin/recovery_controller classify <live_dir> <out_dir> <item>
bash bin/pool_lifecycle claim --owner <pid> <live_dir> <out_dir> <item>   # toma la generación N+1
bash bin/recovery_controller recover <repo> <run> <item> <gen> [--into DIR]  # sólo lee la foto
```

`recover` no toma la propiedad. `claim_and_recover` une los dos pasos pero no
tiene subcomando de CLI. Los worktrees no se borran sin decisión del ejecutor.

## 8. Registro

- Hallazgos: `bin/agent_store agregar-hallazgo`.
- Progreso de la iniciativa y estado de las tarjetas.
