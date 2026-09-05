```yml
type: Plan
work_package: metadata-keys-standardization
phase: 3 - PLAN
created_at: 2026-04-07 01:50:00
status: Aprobado — 2026-04-07
```

# Plan — Estandarización de Keys de Metadata YAML

## Scope Statement

**Problema:** Todos los keys de metadata YAML en el framework THYROX usan español
con espacios, tildes y caracteres especiales (`Tipo:`, `Fecha creación:`, `Versión:`),
lo que impide el acceso programático por atributo y reduce la compatibilidad con
parsers YAML estándar.

**Usuarios:** Claude (lee los templates y artefactos cada sesión) + cualquier
herramienta futura que parsee los frontmatter de estos archivos markdown.

**Criterios de éxito:**
- `grep -r "^Tipo:\|^Versión:\|^Fecha \|^Categoría:" assets/` → cero resultados
- `grep -r "^Tipo:\|^Versión:\|^Fecha \|^Categoría:" references/ SKILL.md` → cero resultados
- `grep -r "^Tipo:\|^Versión:\|^Fecha \|^Categoría:" context/` → solo en `work/` legacy
- `project-status.sh` muestra output correcto sin metadata en pantalla
- conventions.md documenta el mapa completo español→inglés y la nota de legacy

---

## In-Scope

- **35 templates** en `assets/*.template` y `assets/*.md.template`
- **~20 references** en `skills/pm-thyrox/references/*.md`
- **SKILL.md** y **conventions.md** (motor + contrato del framework)
- **Framework context activo**: `focus.md`, `now.md`, `project-state.md`,
  `technical-debt.md`, `decisions.md`
- **13 ADRs** en `context/decisions/adr-*.md`
- **28 error reports** en `context/errors/ERR-*.md`
- **WP activo** `thyrox-capabilities-integration` (~10 artefactos) — al final
- **`project-status.sh`** — fix patrones sed que buscan keys en español
- **Script de migración** `scripts/migrate-metadata-keys.py` con dry-run + verificación
- **conventions.md** — sección nueva con mapa completo + nota legacy
- **SKILL.md Phase 1 step 2** — actualizar comandos `date` (dos formatos)
- **`CLAUDE.md`** — frontmatter propio

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| Artefactos en `context/work/` anteriores a 2026-04-07 (~100 archivos) | Registros históricos inmutables; riesgo alto, beneficio bajo; declarados legacy en conventions.md |
| Keys en **cuerpo** de documentos markdown (bold fields: `**Fecha Creación:**`) | Son presentación renderizada, no metadata parseada |
| `registry/agents/*.yml` | Ya están en inglés |
| `.claude/agents/*.md` | Ya usan formato Claude Code nativo (name, description, tools) |
| Conversión de valores en español a inglés | Decisión explícita: values permanecen en español |

---

## Estimación de esfuerzo

| Capa | Archivos | Tareas |
|------|----------|--------|
| Script de migración Python | 1 | 1 |
| Capa 1: assets/ templates | 35 | 1 (batch via script) |
| Capa 2: references/*.md | ~20 | 1 (batch via script) |
| Capa 3: SKILL.md + conventions.md | 2 | 2 (manual — cambios estructurales) |
| Capa 4: context/ activo (focus, now, project-state, technical-debt, decisions) | 5 | 1 (batch) |
| Capa 5: ADRs | 13 | 1 (batch) |
| Capa 6: error reports | 28 | 1 (batch) |
| Capa 7: WP activo thyrox-capabilities-integration | ~10 | 1 (batch) |
| Capa 8: project-status.sh | 1 | 1 |
| CLAUDE.md | 1 | 1 |
| Verificación final | — | 1 |
| **Total** | **~115** | **~11 tareas** |

Clasificación: **mediano** (2h–8h) — 7 fases activas.

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 12](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-07
