```yml
Fecha: 2026-03-28
Proyecto: THYROX — Correcciones de Covariancia
Tipo: Phase 4 (STRUCTURE) — PRD
Autor: Claude Code + Human
Estado: Borrador
```

# PRD: Correcciones de Covariancia

## Overview

Hacer que las 5 leyes de THYROX sean invariantes en todos los marcos de referencia, siguiendo la estrategia de fuente canónica + referencia.

---

## Acceptance Criteria

### LAW 4 — Jerarquía (CRÍTICA)

- [ ] SKILL.md declara al inicio: "Level 1 — Motor del framework"
- [ ] CLAUDE.md declara: "Level 2 — Puente entre SKILL y proyecto"
- [ ] README.md mantiene tabla de jerarquía (ya existe)
- [ ] ARCHITECTURE.md, CONTRIBUTING.md referencian la jerarquía sin redefinirla

**Verificación:** Grep `Level [123]` en los 4 archivos → misma forma

### LAW 2 — Estructura de archivos

- [ ] SKILL.md File Structure incluye `scripts/` con sus 6 scripts
- [ ] CLAUDE.md no menciona `.claude/prds/` (eliminar referencia fantasma)
- [ ] conventions.md estructura actualizada con: analysis/, epics/, scripts/, assets/

**Verificación:** El diagrama de File Structure en SKILL.md es la fuente canónica. Otros archivos referencian, no copian.

### LAW 3 — Convenciones de nombrado

- [ ] SKILL.md tiene subsección "Naming Conventions" con resumen + link a conventions.md
- [ ] Convenciones explícitas: `kebab-case.md`, `lowercase/`, `YYYY-MM-DD-nombre/`, `adr-NNN.md`

**Verificación:** SKILL.md y conventions.md dicen lo mismo. Otros archivos no redefinen.

### LAW 5 — Dónde van los outputs

- [ ] SKILL.md "Where Outputs Live" clarifica: analysis/ = Phase 1 + Phase 7
- [ ] SKILL.md clarifica: work-logs/ = Phase 6 solamente
- [ ] No hay contradicciones en project-state.md ni conventions.md

**Verificación:** Tabla "Where Outputs Live" es la fuente canónica. Sin duplicados.

---

## Out of Scope

- Crear nuevos archivos de referencia
- Cambiar la estructura de carpetas
- Modificar el contenido de los análisis ya hechos

---

## Siguiente Paso

→ Phase 5: DECOMPOSE
