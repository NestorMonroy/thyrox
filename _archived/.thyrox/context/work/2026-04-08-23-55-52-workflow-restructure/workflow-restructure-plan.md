```yml
type: Plan
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-09 00:45:00
updated_at: 2026-04-09 00:45:00
phase: Phase 3 — PLAN
scope_approved: false
```

# Plan: workflow-restructure (FASE 23)

## Scope Statement

Convertir 7 `workflow_*.md` flat files en `.claude/skills/` a subdirectorios `workflow-*/SKILL.md` con frontmatter oficial (TD-019). Actualizar todas las referencias externas al cambio de nombre `_` → `-`. Añadir contenido faltante (TD-020: escalabilidad en workflow-analyze). Asignar propietario a references/ (TD-023). Reducir pm-thyrox SKILL.md a ~130 líneas (T-027). Actualizar docs desactualizados (TD-024, TD-025 parcial).

## In-Scope

- Crear 7 subdirectorios `workflow-{phase}/SKILL.md` con frontmatter actualizado (name, description limpia, hooks preservados)
- Eliminar 7 flat files `workflow_*.md`
- Actualizar referencias en: `session-start.sh`, `CLAUDE.md`, `commands/workflow_init.md`, `adr-016.md`
- Añadir tabla de escalabilidad a `workflow-analyze/SKILL.md` (TD-020)
- Añadir `owner:` a frontmatter de cada archivo en `references/` (TD-023)
- Reducir `pm-thyrox/SKILL.md` de ~471 a ~130 líneas: eliminar lógica detallada de 7 fases, reemplazar con catálogo + referencias a `/workflow-*`
- Actualizar `agent-spec.md` con campos correctos per docs oficiales (TD-024)
- Actualizar ROADMAP.md y CHANGELOG.md

## Out-of-Scope

- Cambios al **contenido** de las fases (solo estructura y frontmatter)
- Migrar `references/` a subdirectorios dentro de cada `workflow-*/` (TD-023 resuelto con frontmatter, sin mover archivos)
- Actualizar `skill-authoring.md` completamente (TD-025 — diferir, ya existe `claude-code-components.md`)
- Nuevas fases o skills adicionales
- Agentes en `.claude/agents/` más allá de TD-024 (agent-spec.md)

## Inventario de cobertura: SKILL.md → workflow-*

Secciones de SKILL.md y su destino post-reducción:

| Sección SKILL.md | Líneas aprox. | Destino | Acción |
|-----------------|--------------|---------|--------|
| Header + descripción + escalabilidad table | 1-35 | workflow-analyze/SKILL.md | Mover escalabilidad; conservar header reducido |
| Mermaid flowchart | 36-50 | SKILL.md | Conservar (visión global) |
| Limitaciones conocidas | 51-57 | — | **Eliminar** — strategy D-04: "no relevante para ejecución directa vía SKILL"; pm-thyrox ya no es el entry point principal post-reducción |
| Las 7 Fases (Phase 1..7 detallado) | 60-345 | workflow-*/SKILL.md (ya está) | **Eliminar** → reemplazar con catálogo ~3 líneas/fase |
| Dónde viven los artefactos (tabla) | 348-375 | SKILL.md | Conservar (referencia cross-phase) |
| Estructura de un WP (árbol) | 377-407 | SKILL.md | Conservar |
| Naming | 409-445 | SKILL.md | Conservar |
| References por dominio | 446-471 | SKILL.md | Conservar + actualizar nombres a `workflow-*` |

**Resultado esperado:** ~471 → ~130 líneas (eliminando ~285 líneas de lógica de fases).

## Dependencias críticas (D-01 + revisión Phase 2)

```
M-01..M-07 ──┐
             ├── TD-01 (escalabilidad en workflow-analyze)
             │   └── S-01 (eliminar escalabilidad de SKILL.md + reducir)
R-01..R-05 ──┘
TD-02 (owner en references/) ← independiente, paralelo a M+R
TD-03 (agent-spec.md) ← independiente, paralelo a M+R
```

**Regla:** S-01 NO puede iniciar hasta que TD-01 completa. TD-01 NO puede iniciar hasta que M-01 completa.

## Bloque R — corregido (5 tareas reales per strategy)

- R-01: `session-start.sh` — 7 referencias `/workflow_*` → `/workflow-*`
- R-02: `CLAUDE.md` — Addendum Locked Decision #5
- R-03: `commands/workflow_init.md` — 1 referencia a `/workflow_analyze`
- R-04: `adr-016.md` — paths de skills
- R-05: `technical-debt.md` — 22 referencias workflow_* en descripciones TD-019..TD-023

**Bloque TD — ampliado a 3 tareas:**
- TD-01: Añadir tabla escalabilidad a `workflow-analyze/SKILL.md` (TD-020) ← requiere M-01
- TD-02: Añadir `owner:` a frontmatter de 24 archivos en `references/` (TD-023) — incluye `claude-code-components.md` → owner: `pm-thyrox (cross-phase)`
- TD-03: Actualizar `agent-spec.md` — `model` válido, `tools` opcional (TD-024)

## Estimación de esfuerzo

- Bloque M: 7 tareas × ~15 min = ~105 min (paralelas: ~15 min efectivos)
- Bloque R: 5 tareas × ~10 min = ~50 min (paralelas: ~10 min efectivos)
- Bloque TD: 3 tareas × ~20 min = ~60 min (TD-01 secuencial post-M-01; TD-02/TD-03 paralelas)
- Bloque S: 1 tarea × ~30 min = ~30 min (post TD-01)
- Overhead (commits, validaciones): ~20 min
- **Total estimado:** ~2.5h (real, con context switches entre sesiones)

Tamaño: **Mediano** — todas las 7 fases aplican.

## ROADMAP.md — link al WP

WP: `context/work/2026-04-08-23-55-52-workflow-restructure/`

---

## Trazabilidad: Requisitos → Tareas

| Requisito | Descripción | Tareas |
|-----------|-------------|--------|
| TD-019 | Flat files → subdirectorios | M-01..M-07 |
| TD-020 | Escalabilidad en workflow-analyze | TD-01 |
| TD-023 | Owner en references/ frontmatter | TD-02 |
| T-027 | Reducir SKILL.md pm-thyrox | S-01 |
| TD-024 | agent-spec.md desactualizado | R-05 |
| Implícito | Referencias externas al cambio de nombre | R-01..R-05 |
| TD-024 | agent-spec.md desactualizado | TD-03 |

- [x] Scope aprobado por usuario
