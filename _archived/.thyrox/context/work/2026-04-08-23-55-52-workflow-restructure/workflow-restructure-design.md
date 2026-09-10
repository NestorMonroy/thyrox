```yml
type: Design
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-09 01:00:00
updated_at: 2026-04-09 01:00:00
phase: Phase 4 — STRUCTURE
```

# Design: workflow-restructure (FASE 23)

## Visión arquitectónica

Este WP transforma la Capa 2 (skills hidden) del framework pm-thyrox de flat files a subdirectorios.
La arquitectura final mantiene la misma semántica funcional pero corrige la estructura de archivos
para cumplir con la convención oficial de Claude Code Skills y con las reglas de naming del campo
`name:` (kebab-case, solo hyphens).

```
Antes (FASE 22):                    Después (FASE 23):
.claude/skills/                     .claude/skills/
├── pm-thyrox/                      ├── pm-thyrox/
│   └── SKILL.md (~471 líneas)      │   └── SKILL.md (~130 líneas)
├── workflow_analyze.md    ──►      ├── workflow-analyze/
├── workflow_strategy.md   ──►      │   └── SKILL.md
├── workflow_plan.md        ──►     ├── workflow-strategy/
├── workflow_structure.md  ──►      │   └── SKILL.md
├── workflow_decompose.md  ──►      ├── workflow-plan/
├── workflow_execute.md    ──►      │   └── SKILL.md
└── workflow_track.md      ──►      ├── workflow-structure/
                                    │   └── SKILL.md
                                    ├── workflow-decompose/
                                    │   └── SKILL.md
                                    ├── workflow-execute/
                                    │   └── SKILL.md
                                    └── workflow-track/
                                        └── SKILL.md
```

**Sin cambios estructurales a:**
- `.claude/agents/` — sin modificaciones
- `.claude/commands/` — solo actualización puntual en `workflow_init.md`
- `.claude/skills/pm-thyrox/references/` — solo adición de campo `owner:` en frontmatter
- `.claude/skills/pm-thyrox/assets/` — sin modificaciones

---

## Componentes afectados

### Bloque M — 7 nuevos subdirectorios

Cada subdirectorio `workflow-{phase}/` contiene exactamente un archivo `SKILL.md`. No se añaden
subdirectorios (`references/`, `assets/`) dentro de los workflow skills — eso queda en scope futuro.

**Transformación de frontmatter (patrón uniforme):**
```
Antes: description: /workflow_{phase} — Phase N: NOMBRE. Inicia o retoma...
Antes: (sin campo name:)

Después: name: workflow-{phase}
Después: description: Phase N NOMBRE — inicia o retoma...
```

Cambio clave: la descripción pierde el prefijo `/<command>` y se convierte en texto natural.
El campo `name:` explícito garantiza que Claude Code use hyphens para la invocación `/<name>`.

**`disable-model-invocation: true` — invariante:** Este campo NO se elimina en ninguna tarea.
Su doble propósito (control de invocación + context budget) está documentado en D-05 de la
solution strategy. Si se eliminara, 7 × descripción saturarían el context budget en cada sesión.

### Bloque R — 5 archivos externos

| Archivo | Tipo de cambio | Riesgo |
|---------|---------------|--------|
| `session-start.sh` | Sustitución en función + fallback | Bajo — cambio puntual en string literals |
| `CLAUDE.md` | Addendum a Locked Decision #5 | Bajo — addenda no modifican reglas existentes |
| `commands/workflow_init.md` | 1 línea actualizada | Mínimo |
| `context/decisions/adr-016.md` | Addendum al final (histórico inmutable) | Mínimo |
| `context/technical-debt.md` | Actualizar refs target en TD-019..TD-023 | Bajo |

**Patrón: Addendum vs Edición directa**
- ADRs: immutable → addendum al final
- CLAUDE.md Locked Decisions: se permite addenda por fase (patrón establecido en FASE 22)
- Scripts y commands: edición directa (son código operativo, no registros históricos)

### Bloque TD — 3 actualizaciones de deuda técnica

**TD-01 (escalabilidad):** La tabla escalabilidad se mueve de SKILL.md a `workflow-analyze/SKILL.md`
como sección `## Escalabilidad` antes del `## Contexto de sesión` existente. La ruta relativa hacia
`scalability.md` cambia porque el nuevo SKILL.md está en una subcarpeta diferente:
```
Desde pm-thyrox/SKILL.md:    references/scalability.md
Desde workflow-analyze/SKILL.md: ../../pm-thyrox/references/scalability.md
```

**TD-02 (owner):** Adición puramente aditiva en frontmatter YAML. Sin riesgo de pérdida de contenido.
Los 24 archivos tienen frontmatter existente — se añade `owner:` como nuevo campo.

**TD-03 (agent-spec.md):** Corrección de dos filas en tabla de campos. Se añade nota de corrección
referenciando `claude-code-components.md` como fuente oficial.

### Bloque S — Reducción SKILL.md

La reducción de ~471 a ~130 líneas es la operación de mayor riesgo de este WP porque:
1. Elimina ~285 líneas de lógica de fase (operación destructiva pero reversible vía git)
2. Requiere que las 7 fases existan en `workflow-*/SKILL.md` antes de ejecutar

**Mitigación:** S-01 tiene dependencia explícita en M-01..M-07 + R-01..R-05 + TD-01.
Si se ejecuta S-01 antes de completar M-01, el sistema queda sin lógica de fase accesible.

---

## Decisiones de diseño

### DD-01: Un SKILL.md por subdirectorio (sin archivos adicionales)

Cada `workflow-{phase}/` contiene solo `SKILL.md`. No se añaden `references/` ni `assets/`.
Razón: el contenido de los skills no cambia — solo cambia la estructura de archivos. Añadir
subdirectorios dentro de los workflow skills está fuera del scope de FASE 23.

### DD-02: Contenido del cuerpo — cambio mínimo

Solo cambian:
1. El encabezado H1 de cada skill (`/workflow_X` → `/workflow-X`)
2. Las referencias cruzadas entre skills (`/workflow_X` → `/workflow-X`)

Todo el resto del cuerpo (lógica de fase, gates humanos, exit criteria) se copia sin modificar.

### DD-03: Orden de ejecución por bloques

```
M-01..M-07 (paralelo) ──┐
                         ├──► TD-01 ──► S-01
R-01..R-05 (paralelo) ──┘
TD-02 (independiente) ──────────────────────► (cualquier momento)
TD-03 (independiente) ──────────────────────► (cualquier momento)
```

La restricción crítica: `S-01` depende de `TD-01` (que a su vez depende de `M-01`).
`TD-02` y `TD-03` no bloquean ni son bloqueados por ningún otro task.

### DD-04: ADR-016 — addendum, no edición

Los ADRs son registros históricos inmutables en THYROX. La referencia a `workflow_*.md` en
adr-016.md es parte del registro histórico de la decisión FASE 22. Se añade addendum al final
del archivo para documentar el cambio de naming FASE 23 sin alterar el registro histórico.

---

## Spec-quality check rápido

| Criterio | Estado |
|----------|--------|
| Sin `[NEEDS CLARIFICATION]` | ✓ |
| Todos los acceptance criteria son verificables | ✓ |
| Dependencias entre bloques documentadas | ✓ |
| Archivos target verificados (existen) | ✓ |
| Ninguna tarea toca archivos fuera del scope | ✓ |
| Reversibilidad: todos los cambios son reversibles con `git revert` | ✓ |
