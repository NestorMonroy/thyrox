```yml
Fecha: 2026-04-04-08-46-36
WP: doc-structure
Fase: 3 - PLAN
Estado: Aprobado — 2026-04-04
```

# Plan — Separación .claude/ vs docs/ y adr_path configurable

## Scope Statement

**Problema:** Los ADRs del proyecto viven en `.claude/context/decisions/` (directorio
oculto, Claude-only), quedando invisibles para el equipo, para herramientas como
Sphinx, y para un PM que entrega documentación. SKILL.md hardcodea esa ruta y
CLAUDE.md referencia IDs de ADRs de THYROX, rompiendo portabilidad del framework.

**Usuarios:**
- Desarrolladores que usan el proyecto sin Claude Code — necesitan encontrar ADRs en `docs/`
- Claude (Sonnet/Haiku) — necesita saber dónde escribir ADRs según convención del proyecto
- Nuevos proyectos que adoptan pm-thyrox — arrancan con un CLAUDE.md portátil

**Criterios de éxito:**
- `grep "adr_path" .claude/CLAUDE.md` → al menos 1 resultado
- `grep -n "adr_path\|docs/" .claude/skills/pm-thyrox/SKILL.md` → resultado en Phase 1 Step 8
- `grep "ADR-0[0-9][0-9]" .claude/CLAUDE.md` → 0 resultados (Locked Decisions auto-contenidas)
- `ls docs/architecture/decisions/` → directorio existe con README.md
- [SKILL](.claude/skills/sphinx/SKILL.md) existe como stub

---

## In-Scope

- Sección `## Configuración del Proyecto` con campo `adr_path` en [CLAUDE](.claude/CLAUDE.md)
- Limpieza de referencias a IDs de ADRs en sección "Locked Decisions" de `CLAUDE.md`
- Update de Phase 1 Step 8 en `SKILL.md` con regla SI/NO para `adr_path`
- Creación de [README](docs/architecture/decisions/README.md) (estructura mínima)
- Creación de [SKILL](.claude/skills/sphinx/SKILL.md) como stub (secciones `[PENDIENTE]`)
- ADR-013: docs/ como documentación canónica del proyecto

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Migrar ADRs existentes de `.claude/context/decisions/` a `docs/` | THYROX declara su propio `adr_path`; migración es WP separado |
| Implementar contenido completo del skill sphinx | Complejidad alta; este WP solo crea el stub |
| Configurar Sphinx (conf.py, RST templates, build pipeline) | Responsabilidad del skill sphinx completo |
| Mover `context/work/`, `focus.md`, `now.md` | Son contexto de sesión — SIEMPRE en `.claude/` |
| Soporte multi-`adr_path` en un mismo proyecto | Complejidad innecesaria |
| Crear `docs/guides/` u otras subsecciones | Fuera de MVP de este WP |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| CLAUDE.md — sección `adr_path` + limpiar Locked Decisions | 2 |
| SKILL.md — Phase 1 Step 8 con regla SI/NO | 1 |
| [README](docs/architecture/decisions/README.md) | 1 |
| [SKILL](.claude/skills/sphinx/SKILL.md) (stub) | 1 |
| ADR-013 | 1 |
| **Total** | **6 tareas** |

Clasificación: pequeño (30 min – 2h)
Fases activas: 1 ✓, 2 ✓, 3 (este doc), 4, 5, 6, 7

---

## Trazabilidad RC → Tarea

| Tarea | Archivo | Resuelve |
|-------|---------|---------|
| Sección `adr_path` en CLAUDE.md | [CLAUDE](.claude/CLAUDE.md) | H-001, H-002, H-003 |
| Limpiar Locked Decisions | [CLAUDE](.claude/CLAUDE.md) | H-002 |
| SKILL.md Phase 1 Step 8 SI/NO | [SKILL](.claude/skills/pm-thyrox/SKILL.md) | H-003 |
| [README](docs/architecture/decisions/README.md) | `docs/architecture/decisions/README.md` | H-006 |
| Stub sphinx skill | [SKILL](.claude/skills/sphinx/SKILL.md) | H-007 |
| ADR-013 | [adr-013](.claude/context/decisions/adr-013.md) | H-001, H-004 |

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 10](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-04
