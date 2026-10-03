# Recuperación de Podman tras un reinicio sin intervención humana

Tarea: TASK-THYROX-0737 (#99, «Measure Podman lock recovery before deciding
whether to automate it»). Hallazgos: H-THYROX-302, H-THYROX-308, H-THYROX-442,
H-THYROX-444.

## Por qué se abre ahora

El objetivo es la autoimplementación local: sin Claude, sin proveedor remoto y
sin intervención humana en la operación normal. Hoy un reinicio de la VM rompe
esa cadena:

```
reboot → locks 0/N → Ollama, PostgreSQL y workers no arrancan
       → podman_lock_recovery exige operador → HUMANO REQUERIDO
```

Arreglarlo a mano otra vez (P0) desbloquea el trabajo de hoy, pero no cierra
el problema: el siguiente reinicio vuelve a necesitar a una persona.

## Evidencia acumulada (medida, no supuesta)

| Fecha | Antes | Acción | Después | Datos |
|---|---|---|---|---|
| 2026-10-01 07:44 | asignados 3, referenciados 4 | `podman system renumber` desde el ensure | sin corregir, exit 3 (`.claude/jobs/infra-ensure-ollama-redis-20261001T074403`) | — |
| 2026-10-02 01:51 | locks 0 de 7 | `podman_lock_recovery --confirm` + ensure | 7 de 7; PostgreSQL `stale-runtime-state` → recreado, `healthy` | `thyrox-postgres-data: preserved` (`postgres-durability-through-primitive-20261002T014441`) |
| 2026-10-02 01:57 | asignados 0, referenciados 21 | `podman_lock_recovery --confirm` | 21 de 21 | (`thyrox-p-local-required-a6-20261002T203222/outputs/a6-lock-recovery.log`) |
| 2026-10-02 22:11 | asignados 0, referenciados 21 | `podman_lock_recovery --confirm` | 21 de 21 | (`…/a6-r7-lock-recovery.log`) |
| 2026-10-03 | asignados 0, referenciados 21 | — (clasificador: denegado tres veces) | pendiente | — |

Tras las recuperaciones, el ensure dejó los servicios `healthy` y los
volúmenes `preserved`:

- `thyrox-ollama`: `recreated`, `volumes=thyrox-ollama-bench-models:preserved`
  (`.claude/jobs/infra-ollama-r6-20261002T225356`);
- `thyrox-postgres`: `recreated`, `drift=stale-runtime-state`,
  `volumes=thyrox-postgres-data:preserved`
  (`.claude/jobs/reclaim-v2-r0-pg-ensure-20261003T023349`).

Causa medida en el binario (H-THYROX-444):

- los locks viven en `/dev/shm`, que es tmpfs y se borra en cada reinicio;
- el marcador `alive` vive en `/run`, que es ext4 y sobrevive;
- `renumber` falla con sqlite por un defecto de Podman 4.9.3 (`WHERE ID=?`
  sobre una tabla sin columna `ID`).

*Métrica:* el balance de locks (asignados contra referenciados) antes y
después, y el veredicto del ensure por contenedor.
*Ciega a:* la integridad *interna* de los datos de PostgreSQL más allá de
`preserved` y `healthy`, y a otras versiones de Podman o a otro backend.

## Decisión propuesta (PROPOSED, pendiente del ejecutor)

1. **`infrastructure_ensure` no repara.** Mantiene su único contrato,
   converger la infraestructura (decisión del ejecutor 2026-10-02). Automatizar
   no significa fusionar las dos autoridades.
2. **`podman_lock_recovery` sigue siendo la autoridad de la reparación**, con
   las mismas guardas: Podman 4.9.x, sqlite, root, ningún contenedor vivo y el
   marcador presente.
3. **Un controlador de arranque superior** (`InfrastructureBootstrap` o el
   controlador de recuperación) decide cuándo invocarla, de forma declarada:

```
measure Podman
 ├─ equilibrado ─────────────────────────────→ infrastructure_ensure
 └─ precondiciones exactas de H-THYROX-308
    + marcador anterior al arranque del kernel (mtime < btime)
        → podman_lock_recovery (autoridad)
        → volver a medir
        → infrastructure_ensure
 └─ cualquier otra cosa → rehúsa y nombra al operador
```

`marcador anterior al arranque` es la prueba objetiva que hoy suple el juicio
del operador. Medido el 2026-10-03: el marcador es de las 02:15:34 y `btime`
de las 07:43:31. Un marcador de **este** arranque nunca se retira sin
operador.

## Lo que esta tarea NO hace todavía

- **No implementa el modo automático.** Un primer intento del controlador
  (`--after-reboot`, rojo con 4 fallos) fue bloqueado por el clasificador de
  permisos de la sesión como «Auto-Mode Bypass» y se revirtió. Implementarlo
  exige:
  - la aprobación explícita del ejecutor a la decisión de arriba;
  - una regla de permiso que cubra la reparación;
  - y, por la política, que lo haga el worker local por el batch, que a su vez
    necesita P0.
- **No ejecuta la reparación.** P0 es del operador.

## Aceptación (cuando se implemente)

Un reinicio real, sin intervención:

```
reboot → detectar desfase → recuperación con guardas → ensure
       → Ollama y PostgreSQL healthy, volúmenes preserved
       → el worker local retoma
```

Además, controles de anulación:

- retirar la condición `mtime < btime` hace caer el caso «marcador de este
  arranque»;
- retirar la guarda de contenedor vivo hace caer el suyo.

## Orden de trabajo acordado

1. **P0:** el operador ejecuta la reparación →
   `locks referenced == locks allocated` → `infrastructure_ensure` →
   PostgreSQL, Ollama y Redis `healthy`, volúmenes `preserved`.
2. **P1:** modelos locales: lote 1 y lote 2 del batch de identidad con
   qwen3-4b, después la cualificación de `nomic-embed-text` y después el
   especialista matemático. El rename general queda aparcado.
3. **P2:** esta tarea. Decisión, implementación por el batch y prueba de
   reinicio real.

## P0 replanteado: «Local Control Plane Ready» es un estado, no una acción

Decisión del ejecutor del 2026-10-03:

- P0 es la dependencia de mayor prioridad; **no** es un actor ni un permiso;
- P0 incluye la automatización, así que no se declara cerrado mientras el
  siguiente reinicio vuelva a exigir una persona;
- se autoriza una **excepción de bootstrap acotada a cerrar P0**, que
  desaparece al demostrarlo. Cada cambio hecho bajo ella lleva TASK, Search
  Existing, RED, GREEN, verificación, commit, evidencia y ciclo de vida
  explícito.

**Postcondiciones de P0:**

- locks de Podman consistentes;
- PostgreSQL `healthy`, Ollama gestionado `healthy`, Redis en el estado
  declarado;
- volúmenes durables `preserved`;
- primitiva de Podman operativa;
- coordinador de modelos sano;
- workers locales programables.

### P0a: Search Existing (`outputs/p0a-search-existing.tsv`)

Superficies recorridas: `control_plane_entries.tsv`, `execution_policy.json`,
`infrastructure_ensure.sh`, `podman_lock_recovery.sh`, `podman_locks.sh`,
`infrastructureBootstrap.ts`, `infrastructureReadiness.ts`,
`podmanLockCollision.ts`, `headless-pool.sh`, `model_coordinator.sh`, el
cableado `SessionStart` de `user_wiring.py`, `check_execution_authorization`,
el store (H-THYROX-296/302/307/308/442/444) y las tareas #57, #89, #92 y #99.

**Quién puede satisfacer P0 hoy: nadie de forma autónoma.** Las dos autoridades
existen y se conservan:

- reparación: `podman_lock_recovery`;
- convergencia: `infrastructure_ensure`.

Ninguna pieza las **compone**:

- `infrastructureReadiness` es la puerta del **consumidor**: llama al ensure
  y rehúsa, y no debe reparar el motor;
- `headless-pool` también es consumidor;
- `model_coordinator` es un servicio que P0 debe dejar sano, no quien lo
  satisface;
- el hook `startup` sólo barre worktrees.

### Decisión de autoridad (PROPOSED)

| Pieza | Decisión |
|---|---|
| `podman_lock_recovery` | **EXTEND**: una segunda forma de autorizar además del `--confirm` del operador, la prueba objetiva de obsolescencia (marcador `mtime < btime`), con las mismas guardas de versión, backend, uid, sin contenedores vivos y marcador presente |
| `infrastructure_ensure` | **REUSE** sin cambios: detecta y rehúsa, nunca repara |
| entrada de plano de control nueva, «local control plane ready» | **MISSING** justificado: sólo **compone** medir → recuperación con guardas → volver a medir → ensure → postcondiciones, y publica cuál falló. No repara nada por sí misma |
| `control_plane_entries.tsv` + `execution_policy.json` | **EXTEND**: declarar esa entrada y el actor de plano de control que puede invocar la recuperación con prueba. La autorización final vive en la política versionada de thyrox, no en los settings de Claude Code |
| disparo tras reinicio | **EXTEND** del hook `startup`, **pendiente de medir** si dispara tras un reinicio de la VM dentro de la misma sesión; si no, `infrastructureReady` invoca la entrada nueva en lugar del ensure directo |

**Actor canónico propuesto:** la entrada de plano de control «local control
plane ready», lanzada por el orquestador en el anfitrión (como
`infrastructure_ensure` hoy) o por el disparo de arranque. El controlador
no ejecuta payload: invoca una entrada declarada, igual que hoy.

### Deriva documental encontrada (H-THYROX-445)

`infrastructureReadiness.ts:7` y `podmanLockCollision.ts:12` dicen que el
ensure «renumera los locks». Es falso desde la decisión del 2026-10-02: el
ensure sólo detecta y rehúsa. Se corrige en P0c junto con el código.

### Plan P0b a P0f

| Paso | Qué | Bloqueo actual |
|---|---|---|
| P0b | recuperar la instalación actual: `podman_lock_recovery --confirm` → ensure | clasificador de la sesión: denegado tres veces. Necesita una regla `permissions.allow` (andamio del bootstrap, no arquitectura) |
| P0c | EXTEND de la recuperación + entrada nueva + política, en TDD | clasificador: el primer intento fue bloqueado como «Auto-Mode Bypass». Necesita una regla que cubra editar esos archivos bajo la excepción de bootstrap |
| P0d | recuperación con guardas invocada por la entrada | depende de P0c |
| P0e | `infrastructure_ensure` → postcondiciones | depende de P0d |
| P0f | reinicio real sin intervención | depende de P0e; el reinicio lo dispara el entorno |
