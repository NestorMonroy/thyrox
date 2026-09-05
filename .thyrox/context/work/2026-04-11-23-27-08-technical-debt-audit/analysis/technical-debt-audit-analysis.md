```yml
created_at: 2026-04-11 23:27:08
project: thyrox-framework
analysis_version: 1.0
status: En revisión
fase: FASE 32
wp: 2026-04-11-23-27-08-technical-debt-audit
```

# Análisis: technical-debt-audit (FASE 32)

## Contexto del usuario final (Step 0 — TD-007)

**Quién usa el framework:** Nestor Monroy como desarrollador que usa THYROX para gestionar WPs de software con Claude Code.

**Qué quiere lograr:** Tener claridad total sobre el estado de la deuda técnica acumulada (24 TDs) y resolver los items de mayor impacto de forma ordenada y trazable.

**Contexto no obvio:** El archivo `technical-debt.md` tiene 70,360 bytes — REGLA-LONGEV-001 ya activa. El split del archivo es parte del trabajo de este WP.

---

## 1. Objetivo / Por qué

**Objetivo central:** Auditar el estado real de los 24 TDs del framework THYROX, determinar cuáles están genuinamente pendientes vs ya implementados (con status desactualizado), y crear un plan de resolución ordenado por impacto para ejecutar en este mismo WP.

**Por qué importa ahora:**
- 7 TDs de severidad **alta** están pendientes y afectan la confiabilidad de cada nuevo WP
- 3 TDs tienen status `[ ] Pendiente` pero el código ya los implementa — confusión de trazabilidad
- REGLA-LONGEV-001 ya superada: `technical-debt.md` a 70,360 bytes (límite: 25,000 bytes)
- Sin auditoría, futuros WPs acumularán más deuda sobre una base no consolidada

---

## 2. Stakeholders

| Stakeholder | Rol | Necesita |
|-------------|-----|----------|
| Nestor Monroy | Usuario del framework | Claridad sobre qué deuda es real vs cerrada, plan de acción por prioridad |
| Claude Code (agente) | Ejecutor del framework en cada sesión | Instrucciones claras en workflow-*/SKILL.md; settings.json limpio |
| Futuros WPs | Beneficiarios indirectos | Framework robusto: gates que funcionan, artefactos con status correcto |

---

## 3. Uso operacional

Este WP producirá:
1. **Veredicto explícito** para cada uno de los 24 TDs (pendiente / implementado / diferido)
2. **task-plan** con tareas atómicas agrupadas por prioridad, ejecutables en este WP
3. **Split de `technical-debt.md`** para cumplir REGLA-LONGEV-001
4. **Correcciones** a los archivos del framework con mayor impacto (workflow-*/SKILL.md, settings.json, references/)

Los cambios se ejecutarán en Phase 6 EXECUTE modificando archivos de configuración del framework. Afectan el comportamiento de todas las sesiones futuras con THYROX.

---

## 4. Atributos de calidad

| Atributo | Criterio de medición |
|----------|---------------------|
| Completitud | Todos los 24 TDs tienen veredicto documentado |
| Trazabilidad | Cada fix tiene T-NNN que apunta al TD que resuelve |
| Atomicidad | Cada tarea toca exactamente 1 archivo o 1 sección |
| Verificabilidad | Cada TD cerrado tiene criterio de cierre explícito cumplido |

---

## 5. Restricciones

| Restricción | Impacto |
|-------------|---------|
| `technical-debt.md` = 70,360 bytes (REGLA-LONGEV-001 activa) | El split del archivo es parte obligatoria de este WP |
| TD-005, TD-010 requieren WP propio por su naturaleza estratégica | Quedan fuera de scope de este WP |
| TD-006 evaluable: TD-008 resuelto, thyrox/SKILL.md es catálogo (209 líneas) | Verificar si criterio se considera cumplido en este WP |
| workflow-*/SKILL.md son archivos de configuración del framework | Requieren prompt (ask) según settings.json — no auto-allow |
| Sesión única — contexto finito | Priorizar TDs por impacto, no intentar los 24 en una sola sesión |

---

## 6. Contexto / Sistemas vecinos

```
technical-debt-audit WP
       ↓ modifica
├── workflow-analyze/SKILL.md    ← TD-029, TD-031, TD-033
├── workflow-strategy/SKILL.md   ← TD-028, TD-029, TD-031, TD-033, TD-040
├── workflow-plan/SKILL.md       ← TD-029, TD-031, TD-033, TD-040 (Gate humano ausente)
├── workflow-structure/SKILL.md  ← TD-029, TD-031, TD-033, TD-040
├── workflow-decompose/SKILL.md  ← TD-029, TD-031, TD-033
├── workflow-execute/SKILL.md    ← TD-029, TD-031, TD-032, TD-033
├── workflow-track/SKILL.md      ← TD-029, TD-031, TD-033
├── .claude/settings.json        ← TD-038
├── .claude/context/technical-debt.md ← REGLA-LONGEV-001 split
├── .claude/references/conventions.md ← TD-035 (REGLA-LONGEV-001), TD-001, TD-018
├── CHANGELOG.md                 ← TD-034 (split)
├── ROADMAP.md                   ← TD-026 (split)
└── agents/*.md                  ← TD-039 (async_suitable annotations)
```

---

## 7. Fuera de alcance

| Excluido | Razón |
|----------|-------|
| TD-005: Arquitectura orquestador+agentes | Requiere WP propio de investigación estratégica |
| TD-010: Benchmark empírico SKILL vs CLAUDE.md | Trigger: caso de uso real que justifique el tiempo |
| TD-030: Renombrar "Phase N" a nomenclatura semántica | Baja relevancia post-FASE 31 (/thyrox:* es interfaz pública); requiere análisis de impacto separado |
| TD-022: Limitaciones triggering en workflow-* | Baja severidad; posponer |
| TD-006: thyrox thin orchestrator | TD-008 resuelto — evaluar si TD-006 también se cierra en Grupo A |

---

## 8. Criterios de éxito

- [ ] Los 24 TDs tienen veredicto explícito (pendiente / implementado / diferido / archivado)
- [ ] `technical-debt.md` < 25,000 bytes (REGLA-LONGEV-001 cumplida)
- [ ] TDs de alta prioridad (TD-029, TD-031, TD-032, TD-033, TD-038, TD-040) implementados
- [ ] TDs con status `[ ] Pendiente` pero ya implementados marcados `[x]` (TD-007, TD-008, TD-006*)
- [ ] `settings.json` sin reglas `Edit(...)` redundantes
- [ ] `workflow-plan/SKILL.md` tiene sección `## Gate humano`

---

## Inventario de TDs — Veredictos de Phase 1

### Grupo A: Status desactualizado — marcar `[x]` inmediatamente

| TD | Estado en archivo | Estado real | Evidencia |
|----|-------------------|-------------|-----------|
| TD-007 | `[ ] Pendiente` | **Implementado** | `workflow-analyze/SKILL.md` líneas 46-53: "Step 0 — Contexto del usuario final (TD-007)" ya existe |
| TD-008 | `[ ] Pendiente` | **Implementado** | `workflow-*/SKILL.md` tienen lógica completa por fase. `thyrox/SKILL.md` es catálogo (209 líneas, sin lógica de fase). `COMMANDS_SYNCED=true` en `session-start.sh`. Criterio "≤80 líneas" era para arquitectura anterior — arquitectura actual es correcta |
| TD-006 | `[ ] Pendiente` | **Implementado** | Trigger era TD-008. Objetivo: `thyrox` sea thin orchestrator con lógica en `workflow-*/SKILL.md`. Arquitectura lograda en FASE 23+29+31. `thyrox/SKILL.md` = catálogo; `workflow-*/SKILL.md` = implementación |
| TD-039 | `[ ] Pendiente` | **Parcialmente implementado** | `subagent-patterns.md` Patrón 4+5 actualizados en FASE 31. Pendiente: anotaciones `async_suitable` en 2 agentes |

### Grupo B: Alta prioridad — implementar en este WP

| TD | Severidad | Archivos afectados | Esfuerzo estimado |
|----|-----------|-------------------|-------------------|
| TD-038 | alta | `settings.json` (3 líneas a eliminar) + `tool-execution-model.md` | 30 min |
| TD-040 | media | 5 `workflow-*/SKILL.md` gates + `workflow-plan/SKILL.md` (Gate humano) | 2h |
| TD-029 | alta | 7 `workflow-*/SKILL.md` (sección validación pre-gate) | 2h |
| TD-031 | alta | 7 `workflow-*/SKILL.md` (deep review pre-gate) | 2h |
| TD-033 | alta | 7 `workflow-*/SKILL.md` (commit pattern + now.md) | 1h |
| TD-032 | alta | `workflow-execute/SKILL.md` (pre-flight checklist Phase 6→7) | 1h |

### Grupo C: Media prioridad — implementar si el contexto lo permite

| TD | Severidad | Archivos afectados | Esfuerzo estimado |
|----|-----------|-------------------|-------------------|
| TD-028 | media | `workflow-strategy/SKILL.md` (re-evaluación tamaño) | 30 min |
| TD-034 | alta | `CHANGELOG.md` (split en `CHANGELOG-archive.md`) | 1h |
| TD-035 | media | `references/conventions.md` (REGLA-LONGEV-001) + `project-status.sh` | 1h |
| TD-026 | media | `ROADMAP.md` (split) | 1h |
| TD-001 | media | `references/conventions.md` + `validate-session-close.sh` | 30 min |
| TD-018 | baja | `workflow-execute/assets/execution-log.md.template` | 15 min |
| TD-025 | baja | `references/skill-authoring.md` | 30 min |

### Grupo D: Diferido — fuera de scope de este WP

| TD | Razón de diferimiento |
|----|----------------------|
| TD-005 | Requiere WP de investigación estratégica propio |
| TD-006 | Movido a Grupo A — evaluado como implementado (ver arriba) |
| TD-009 | Trigger = WP formal de agentes |
| TD-010 | Trigger = caso de uso real |
| TD-022 | Baja prioridad; diferir |
| TD-030 | Baja relevancia post-FASE 31; requiere análisis de impacto |

### Grupo E: REGLA-LONGEV-001 (aplica en Phase 7 TRACK de este WP)

- `technical-debt.md`: 70,360 bytes → split obligatorio (mover `[x]` a `technical-debt-archive.md`)
- `CHANGELOG.md`: parte de TD-034 — se evalúa en Phase 6
- `ROADMAP.md`: parte de TD-026 — se evalúa en Phase 6

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | Phase 1→2 | gate-fase | Análisis de los 24 TDs completado | Usuario aprueba veredictos + lista de TDs a abordar |
| SP-02 | Phase 2→3 | gate-fase | Estrategia de resolución definida (prioridades, qué entra/sale) | Usuario aprueba estrategia |
| SP-03 | Phase 3→4 | gate-fase | Scope exacto de archivos a modificar definido | Usuario aprueba scope |
| SP-04 | Phase 4→5 | gate-fase | Spec por cada TD implementado definida | Usuario aprueba specs |
| SP-05 | Phase 5→6 | gate-operacion | Task-plan aprobado — iniciar modificación de archivos del framework | Usuario autoriza ejecución |
| SP-06 | Phase 6→7 | gate-fase | Ejecución completada | Usuario aprueba resultado antes de TRACK |
