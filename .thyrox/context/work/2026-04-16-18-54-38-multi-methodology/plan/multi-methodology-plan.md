```yml
created_at: 2026-04-16 19:35:52
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 6 — SCOPE
author: NestorMonroy
status: Aprobado
```

# Plan — multi-methodology (ÉPICA 40)

## Scope statement

Extender THYROX para ejecutar 6 metodologías adicionales (PDCA, DMAIC, PMBOK, BABOK,
RUP, RM) mediante coordinators nativos de Claude Code, un registry YAML de transiciones,
y el contrato `now.md::methodology_step` como variable de estado persistente.
El resultado es un meta-framework donde el usuario elige la metodología y THYROX
garantiza la secuencia correcta de pasos.

---

## In-scope

### Infraestructura base
- [ ] `now.md` extendido con campos `stage`, `flow`, `methodology_step`
- [ ] `.thyrox/registry/methodologies/` creado con YAMLs iniciales
- [ ] `WorktreeCreate` y `WorktreeRemove` en `hooks/hooks.json`
- [ ] `session-start.sh` actualizado para leer `stage` y `methodology_step`

### Registry YAML (6 metodologías)
- [ ] `pdca.yml` — tipo cíclico, 4 pasos
- [ ] `dmaic.yml` — tipo secuencial, 5 pasos
- [ ] `rup.yml` — tipo iterativo, 4 fases × N iteraciones
- [ ] `rm.yml` — tipo secuencial con retorno, 5 pasos
- [ ] `pmbok.yml` — tipo secuencial, 5 grupos de proceso
- [ ] `babok.yml` — tipo no-secuencial, 6 knowledge areas

### Coordinators Patrón 3 (6 agentes)
- [ ] `pdca-coordinator.md` con `isolation: worktree`
- [ ] `dmaic-coordinator.md`
- [ ] `rup-coordinator.md`
- [ ] `rm-coordinator.md`
- [ ] `pmbok-coordinator.md`
- [ ] `babok-coordinator.md` (lógica de routing especial)

### Skills de metodología (implementación incremental)
- [ ] 4 skills PDCA: `pdca-plan`, `pdca-do`, `pdca-check`, `pdca-act`
- [ ] 5 skills DMAIC: `dmaic-define`, `dmaic-measure`, `dmaic-analyze`, `dmaic-improve`, `dmaic-control`
- [ ] Skills RUP, RM, PMBOK, BABOK — creados en orden de prioridad

### Coordinator genérico Patrón 5
- [ ] `thyrox-coordinator.md` — lee YAMLs del registry, sin hardcodeo de metodología
- [ ] Lógica de resolución de transiciones por tipo de flujo

### Renaming de stages conflictivos
- [ ] `workflow-measure` → `workflow-baseline`
- [ ] `workflow-analyze` → `workflow-diagnose`
- [ ] `workflow-plan` → `workflow-scope`
- [ ] `workflow-execute` → `workflow-implement`
- [ ] Referencias internas y SKILL.md actualizados

### Documentación
- [ ] `CLAUDE.md` glosario actualizado (ya hecho — ADR aprobado)
- [ ] `agent-authoring.md` actualizado con `isolation: worktree` + `background: true`
- [ ] `hook-authoring.md` actualizado con `WorktreeCreate`/`WorktreeRemove`

---

## Out-of-scope

| Item | Razón |
|------|-------|
| Skills Cat 2-6 completos (~67 skills) | Fuera del scope de esta ÉPICA — ÉPICAs posteriores por metodología |
| UI/interfaz gráfica de selección de metodología | No existe UI en Claude Code — selección via `@agente` o descripción |
| Integración con herramientas externas (Jira, Monday, etc.) | Fuera del scope THYROX core |
| `.gitignore` para `.claude/worktrees/` | Decisión explícita del usuario: trackear todo |
| Migración big-bang de FASE→ÉPICA en documentos históricos | Retrocompatibilidad — migración incremental al tocar cada archivo |
| Metodologías fuera del scope aprobado (Kanban, SAFe, etc.) | ÉPICAs posteriores |
| GAP-006: SDLC skills sin prefijo metodología (`analyze` vs `sdlc-analyze`) | Renaming masivo de skills existentes — ÉPICA futura |
| GAP-008: `transcript_path` en hooks no usado por THYROX | `/permisos-sugeridos` ya cubre el caso principal — ÉPICA futura |
| `monitors:` en plugin.json para coordinator Patrón 5 | Hallazgo M del repo oficial: formato desconocido, sin ejemplos — no implementar hasta documentación oficial |
| Tipo `adaptive` de flujo (Consulting, Strategic Mgmt, BPA) | Sin metodología del scope que lo requiera — ÉPICA futura Cat 4-5 |

---

## Entregables por Stage

| Stage | Entregable | Criterio de éxito |
|-------|-----------|------------------|
| 6 SCOPE | Este documento | Scope aprobado |
| 8 PLAN EXECUTION | `multi-methodology-task-plan.md` | DAG completo con T-NNN |
| 10 IMPLEMENT | 6 coordinators + 9 skills base (PDCA+DMAIC) | `@pdca-coordinator` funciona en worktree |
| 10 IMPLEMENT | Registry YAML + coordinator genérico | `thyrox-coordinator` lee YAML dinámicamente |
| 10 IMPLEMENT | 4 workflow-* renombrados | Sin referencias rotas |
| 11 TRACK | Lessons learned | Qué funcionó, qué no |
| 12 STANDARDIZE | PAT-NNN para coordinator pattern | Replicable en ÉPICAs futuras |

---

## Dependencias externas

| Dependencia | Estado | Impacto |
|------------|--------|---------|
| `isolation: worktree` confirmado en Claude Code runtime | ✅ Confirmado v2.1.49 | Sin bloqueo |
| `WorktreeCreate`/`WorktreeRemove` hooks disponibles | ✅ Confirmado v2.1.50 | Sin bloqueo |
| `monitors:` en plugin.json (enabler Patrón 5) | ✅ Confirmado v2.1.105 | Sin bloqueo |
| `skills:` en frontmatter de agente (comportamiento Level 1) | ⚠️ Confirmado en runtime, sin ejemplo canónico | Testear con PDCA primero |

---

## Impacto en ROADMAP

ÉPICA 40 se ejecuta en una sola iteración. Las metodologías adicionales (Cat 2-6 completas)
se proponen como ÉPICAs futuras separadas:

```
ÉPICA 40: multi-methodology (esta) — infraestructura + 6 metodologías prioritarias
ÉPICA 41+: pdca-skills-complete — 14 skills Cat 2 completos (fuera de scope actual)
ÉPICA 42+: consulting-skills — 12 skills Cat 5
...
```
