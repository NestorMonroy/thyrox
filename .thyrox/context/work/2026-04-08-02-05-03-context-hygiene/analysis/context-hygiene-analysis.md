```yml
type: Análisis
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: En progreso
phase: Phase 1 — ANALYZE
reversibility: documentation
```

# Análisis: context-hygiene

## Objetivo

Resolver los problemas de trazabilidad y actualización de los archivos de estado del proyecto (`focus.md`, `now.md`, `project-state.md`) y aclarar la colisión de nomenclatura entre FASE (WP del proyecto) y Phase (fase SDLC dentro de un WP).

---

## Hallazgos

### 1. Archivos de contexto congelados

Los tres archivos de estado del proyecto no se han actualizado desde FASE 15 (2026-04-07 07:00):

| Archivo | Dice | Debería decir |
|---------|------|---------------|
| `focus.md` | FASE 15 completada, sin pendientes activos | FASE 19 completada — async-gates |
| `now.md` | Sin WP activo, FASE 15 la más reciente | WP context-hygiene activo, Phase 1 |
| `project-state.md` | 6 agentes, FASEs 1-14 | 9 agentes, FASEs 1-19 completadas |

**Causa raíz:** Phase 7: TRACK no tiene instrucción explícita para actualizar estos tres archivos. Solo actualiza ROADMAP y CHANGELOG. Los archivos de contexto quedan congelados al cierre de la sesión donde se crearon.

---

### 2. Colisión de nomenclatura FASE vs Phase

El sistema usa dos jerarquías con nombres similares:

| Término | Nivel | Ejemplo |
|---------|-------|---------|
| **FASE N** (ROADMAP) | Work package del proyecto, número secuencial | FASE 19: Async Gates |
| **Phase N** (SKILL.md) | Fase SDLC dentro de cada WP, 1-7 | Phase 4: STRUCTURE |

**Problema:** Cuando el usuario lee "FASE 19" en ROADMAP y "Phase 4" en la conversación, la distinción no es obvia. La sesión anterior generó la pregunta: *"¿por qué existe la FASE 19 si estamos en la Phase 4?"*

**Impacto:** Confusión en comunicación, trazabilidad difícil al revisar ROADMAP.

---

### 3. Phase 7 no actualiza los archivos de estado

El script `validate-session-close.sh` detecta que `focus.md` no fue actualizado hoy — pero solo avisa, no bloquea. SKILL.md Phase 7 no lista explícitamente qué archivos de estado actualizar ni en qué orden.

**Gap:** SKILL.md Phase 7 dice "actualizar focus.md + now.md" en CLAUDE.md (flujo de sesión), pero no en el cuerpo de Phase 7 del SKILL. La instrucción vive en el nivel 2 (CLAUDE.md), no en el motor (SKILL.md).

---

### 4. project-state.md desactualizado

`project-state.md` lista 6 agentes y FASEs 1-14. La realidad actual:

**Agentes en `.claude/agents/`:**
- task-planner, task-executor, tech-detector, skill-generator (core)
- nodejs-expert, react-expert (FASE 13)
- postgresql-expert, webpack-expert, mysql-expert (FASEs 16-17)

**FASEs completadas:** 1-19

**Versión framework:** 1.6.0 (CHANGELOG actualizado pero project-state no)

---

### 5. ROADMAP como único archivo actualizado consistentemente

ROADMAP.md sí se actualiza en Phase 3 (se añade la FASE) y Phase 7 (checkboxes `[x]`). Es el único archivo de proyecto que refleja el estado real. Pero es un documento de tracking, no de estado — no responde "¿qué hay en el framework hoy?".

---

## Criterios de éxito

- [ ] `focus.md` refleja FASE 19 completada y WP context-hygiene activo
- [ ] `now.md` refleja estado actual de sesión con WP activo
- [ ] `project-state.md` muestra 9 agentes, FASEs 1-19, versión 1.6.0
- [ ] SKILL.md Phase 7 tiene instrucción explícita para actualizar los tres archivos
- [ ] Documentada la distinción FASE vs Phase en un lugar consultable
- [ ] `validate-session-close.sh` pasa sin warnings

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo | Presentar hallazgos, esperar SI |
| SP-02 | 2→3 | gate-fase | Strategy completa | Presentar decisiones, esperar SI |
| SP-03 | 3→4 | gate-fase | Plan aprobado | Presentar scope, esperar SI |
| SP-04 | 4→5 | gate-fase | Spec aprobada | Presentar user stories, esperar SI |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | Presentar tareas, esperar SI |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Presentar cambios, esperar SI |
