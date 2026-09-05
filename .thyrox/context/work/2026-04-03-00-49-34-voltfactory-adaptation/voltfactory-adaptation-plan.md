```yml
Fecha: 2026-04-03-00-49-34
WP: voltfactory-adaptation
Fase: 3 - PLAN
Estado: Aprobado — 2026-04-03
```

# Plan — Meta-Framework Generativo (FASE 7)

## Scope Statement

**Problema:** PM-THYROX gestiona el SDLC pero no tiene conocimiento de las tecnologías
del proyecto. Cada sesión Claude empieza sin contexto tecnológico, obligando al usuario
a re-explicar el stack repetidamente.

**Usuarios:** Equipos usando PM-THYROX en proyectos con stacks tecnológicos definidos
(React, Node.js, PostgreSQL, o cualquier combinación).

**Criterios de éxito:**
- Un comando bootstrap (`/workflow_init`) detecta el stack y genera skills persistentes
- Las sesiones subsecuentes tienen contexto tecnológico sin re-configuración
- Los tech skills generados viven en git como artefactos permanentes del proyecto
- PM-THYROX sigue siendo el orquestador de gestión; los tech skills son expertos en tecnología

---

## In-Scope — MVP

### Registry base
- Estructura `.claude/registry/` con `_generator.sh`
- Template `frontend/react.template.md` (SKILL.md + instructions.md)
- Template `backend/nodejs.template.md` (SKILL.md + instructions.md)
- Template `db/postgresql.template.md` (SKILL.md + instructions.md)

### Bootstrap
- Comando `/workflow_init` — detecta stack desde archivos de configuración del proyecto
  (package.json, requirements.txt, go.mod, etc.)
- Tech detection integrado en `/workflow_init`
- Modo manual override para proyectos polyglot o sin config estándar
- Al finalizar: instancia skills desde registry, commit a git

### Workflow commands (Phase entry points)
- `/workflow_analyze` — Phase 1 con context tech pre-cargado
- `/workflow_strategy` — Phase 2: SOLUTION_STRATEGY
- `/workflow_plan` — Phase 3: PLAN con ROADMAP check
- `/workflow_structure` — Phase 4: STRUCTURE con spec template
- `/workflow_decompose` — Phase 5: DECOMPOSE con task template
- `/workflow_execute` — Phase 6: EXECUTE con next task automático
- `/workflow_track` — Phase 7: TRACK con validate-phase-readiness

### session-start.sh actualizado
- Detectar tech skills activos en `.claude/skills/`
- Mostrar lista de tech skills en startup display

### ADR-012
- Documentar refinamiento de ADR-004: management skill vs tech skills

---

## Out-of-Scope — Explícitamente excluido del MVP

| Excluido | Razón |
|---|---|
| Templates adicionales (vue, django, mongodb, docker) | El registry crece gradualmente; 3 templates validan el patrón |
| Soporte monorepo multi-framework por capa | Complejidad alta; el caso simple valida primero |
| UI interactivo para bootstrap | Un comando simple es suficiente para el MVP |
| Migración de WPs anteriores a nuevo sistema | Git as persistence — los WPs viejos son inmutables |
| Tests unitarios para los workflow commands | Fase posterior una vez estabilizado el patrón |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| Registry base + `_generator.sh` | 4 |
| 3 templates (react, nodejs, postgresql) | 6 (2 por template) |
| `/workflow_init` con tech detection | 3 |
| 7 workflow commands | 7 |
| session-start.sh update | 2 |
| ADR-012 | 1 |
| **Total** | **23 tareas** |

Clasificación: proyecto mediano (>10 tareas). Requiere Phase 4 completa con
[voltfactory-adaptation-requirements-spec](voltfactory-adaptation-requirements-spec.md) y [voltfactory-adaptation-design](voltfactory-adaptation-design.md).

---

## Link ROADMAP

Ver tracking de progreso: [ROADMAP.md — FASE 7](../../../../../ROADMAP.md#fase-7-meta-framework-generativo-tech-skills-auto-generados)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-03
