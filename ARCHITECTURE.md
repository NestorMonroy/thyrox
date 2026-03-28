```yml
Tipo: Documentación Principal
Categoría: Arquitectura
Versión: 2.0
Propósito: Decisiones arquitectónicas del proyecto THYROX
Fecha actualización: 2026-03-27
```

# ARCHITECTURE — THYROX

## Visión General

THYROX es un framework de gestión de proyectos para Claude Code. No es una aplicación — es una **metodología empaquetada como un Anthropic Skill** que se copia a cualquier proyecto.

---

## Estructura Arquitectónica

```
pm-thyrox/                   ← El skill (el motor)
├── SKILL.md                 Instrucciones (~250 líneas, progressive disclosure)
├── scripts/                 Código ejecutable (detect/convert/validate)
├── references/              Documentación cargada en contexto bajo demanda
└── assets/                  Templates copiados para generar output
```

Sigue la anatomía oficial de Anthropic para skills:
- **SKILL.md**: Solo lo esencial + navegación a references
- **scripts/**: Token efficient, deterministic, ejecutable sin cargar en contexto
- **references/**: Documentación que Claude lee cuando la necesita
- **assets/**: Archivos que se copian al output, no se cargan en contexto

---

## Decisiones Arquitectónicas

### ADR-001: Markdown como formato único

**Decisión:** Toda documentación en Markdown versionado en Git.<br>
**Razón:** Universal, git-friendly, legible por humanos y AI, sin dependencias.<br>
**Consecuencia:** No hay queries complejos. El filesystem es la base de datos.

### ADR-002: ROADMAP.md como fuente de verdad

**Decisión:** Un solo archivo para estado de progreso del proyecto.<br>
**Razón:** Simple, versionado, sin herramientas externas.<br>
**Consecuencia:** No GitHub Issues, no Jira, no Notion.

### ADR-003: Conventional Commits

**Decisión:** Formato estandarizado para todos los commits.<br>
**Razón:** Changelog automático e historial legible.<br>
**Consecuencia:** `type(scope): description`

### ADR-004: Single Skill con Progressive Disclosure

**Decisión:** Un solo skill (pm-thyrox) con 21 references, no 15 skills separados.<br>
**Razón:** Evita fragmentación, Claude solo carga lo que necesita.<br>
**Consecuencia:** SKILL.md ≤500 líneas.

### ADR-005: ANALYZE primero

**Decisión:** Phase 1 es ANALYZE, no PLAN.<br>
**Razón:** No se puede planificar lo que no se entiende.<br>
**Consecuencia:** Orden fijo: ANALYZE → SOLUTION_STRATEGY → PLAN → STRUCTURE → DECOMPOSE → EXECUTE → TRACK.

### ADR-006: Separación Motor / Trabajo

**Decisión:** skills/pm-thyrox/ (estático) separado de context/ (dinámico).<br>
**Razón:** El skill es reutilizable, el trabajo es específico por proyecto.<br>
**Consecuencia:** Copiar pm-thyrox/ no arrastra trabajo anterior.

### ADR-007: Detect/Convert/Validate Pattern

**Decisión:** Cada herramienta tiene 3 scripts con responsabilidad única.<br>
**Razón:** Composable para CI/CD, cada uno sirve a una fase distinta.<br>
**Consecuencia:** 6 scripts (3 Bash + 3 Python).

### ADR-008: Git como única persistencia

**Decisión:** Zero archivos backup en el repo.<br>
**Razón:** Git ya versiona todo.<br>
**Consecuencia:** No hay `_backup_*.md` ni `SKILL.md.backup`.

---

## Technology Stack

```
Documentation:     Markdown (.md)
Version Control:   Git
AI Runtime:        Claude Code (Anthropic)
Scripts:           Bash (portable) + Python 3 (parsing)
Templates:         .template files
```

**Zero dependencias externas** — Solo git + Claude Code.

---

## Convenciones

**Archivos:** `kebab-case.md`<br>
**Carpetas:** `lowercase/`<br>
**Commits:** `type(scope): description`<br>
**Epics:** `YYYY-MM-DD-nombre/`<br>
**Work-logs:** `YYYY-MM-DD-HH-MM-desc.md`<br>
**ADRs:** `adr-NNN.md`

---

**Última actualización:** 2026-03-27
