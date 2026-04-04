```yml
Tipo: Plan
Fase: 3 - PLAN
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
Estado: Pendiente aprobacion
```

# Plan — skill-adr-boundary

## Problema

Modelos no-Sonnet (Haiku) se confunden entre el contenido del SKILL (`skills/pm-thyrox/SKILL.md`)
y los ADRs (`context/decisions/adr-NNN.md`) al trabajar en proyectos con PM-THYROX. No existe
un boundary statement explícito ni reglas atomicas de decision.

## Solucion elegida

Opcion D — 3 capas independientes:
- Capa 1: CLAUDE.md — boundary statement (tabla SKILL vs ADR)
- Capa 2: SKILL.md Phase 1 Step 8 — trigger atomico con lista SI/NO
- Capa 3: adr.md.template — campo `Uso:` en frontmatter

## Scope

### Dentro

- [ ] CLAUDE.md — nueva seccion `## SKILL vs ADR — Regla de uso` (tabla 4 filas)
- [ ] SKILL.md — reemplazar Step 8 Phase 1 con lista SI/NO (7 items)
- [ ] adr.md.template — agregar campo `Uso:` en frontmatter YAML
- [ ] ROADMAP.md — nueva FASE 9 con items de este WP
- [ ] CHANGELOG.md — entrada v0.7.0

### Fuera

- Migrar ADRs existentes a formato corto (legacy, sin ROI)
- Crear `adr-guide.md` separado (rechazado en Phase 2 por dependencia fragil)
- Cambiar ubicacion de `context/decisions/`
- Resolver T-DT-006 (solution-strategy.md.template sin mermaid) — es WP separado

## Clasificacion

Pequeno — 5 tareas, 3 archivos modificados, 0 archivos nuevos, sin dependencias externas.

## Scope aprobado

- [x] Aprobado por usuario (2026-04-04)
