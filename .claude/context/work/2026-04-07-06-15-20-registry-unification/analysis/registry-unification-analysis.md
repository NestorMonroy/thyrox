```yml
type: Análisis Phase 1
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: Completado
phase: Phase 1 — ANALYZE
```

# Análisis: Registry Unification

## Objetivo

Resolver el solapamiento entre `registry/` (raíz) y `.claude/registry/` — dos sistemas de registro que evolucionaron en FASEs distintas y hoy coexisten sin documentación clara de cuál usar para qué. Además, agregar un índice de WPs por FASE para mejorar la navegabilidad del historial.

## Los dos registries

### `registry/` — FASE 11 (2026-04-05)

**Propósito original:** Registry operacional del proyecto THYROX. Genera agentes nativos y aloja MCP servers.

```
registry/
├── agents/*.yml         7 definiciones de agentes (fuente de bootstrap)
├── backend/             Templates de tech skills con placeholders reales
├── frontend/
├── database/
├── mcp/                 Código Python de MCP servers (operacional)
└── bootstrap.py         CLI Python — genera .claude/agents/ desde YMLs
```

**Quién lo consume:** `bootstrap.py` → `.claude/agents/*.md`. Los MCP servers corren en producción.

### `.claude/registry/` — FASE 7 (2026-04-03)

**Propósito original:** Registry del framework pm-thyrox como plantilla reutilizable. Para que un proyecto nuevo genere sus propios skills.

```
.claude/registry/
├── _generator.sh        Script Bash (precursor legacy de bootstrap.py)
├── backend/             Templates con {{PROJECT_NAME}} placeholder
├── frontend/
└── db/
```

**Quién lo consume:** `_generator.sh` → `.claude/skills/{tech}/SKILL.md`

## Gaps identificados

### G-001 — Templates de skills duplicados
`registry/backend/nodejs.skill.template.md` y `.claude/registry/backend/nodejs.template.md` son versiones distintas del mismo contenido. No está documentado cuál es canónico.

### G-002 — `_generator.sh` es legacy no documentado
`bootstrap.py` (FASE 11) superó a `_generator.sh` (FASE 7) en funcionalidad (CLI, idempotencia, `--stack --model --force`). Pero `_generator.sh` sigue en `.claude/registry/` sin marca de obsoleto.

### G-003 — Propósitos no documentados
No hay README.md en `registry/` que explique su propósito. El README de `.claude/registry/` existe pero no menciona su relación con `registry/`.

### G-004 — Sin índice de WPs por FASE
Para saber qué WP corresponde a FASE 11, hay que leer ROADMAP.md y buscar el path del WP. No hay un archivo de índice navegable directamente.

## Decisiones requeridas

| Decisión | Opciones |
|----------|---------|
| D-01: ¿Se unifican los registries? | A: Unificar en `registry/` raíz. B: Separar claramente con READMEs. C: Deprecar `.claude/registry/` |
| D-02: ¿Qué pasa con los templates duplicados? | A: `registry/` es canónico, `.claude/registry/` obsoleto. B: Mantener ambos con propósitos distintos |
| D-03: ¿Índice de WPs? | A: `context/work/INDEX.md`. B: En ROADMAP.md ya existe (links en cada FASE) |

## Criterios de éxito

| ID | Criterio |
|----|---------|
| SC-001 | Un desarrollador nuevo puede saber en <1 minuto cuál registry usar para qué |
| SC-002 | Los templates duplicados tienen una fuente canónica clara |
| SC-003 | `_generator.sh` está marcado como legacy o eliminado |
| SC-004 | La navegación de WPs históricos no requiere leer ROADMAP.md completo |
