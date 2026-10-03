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
