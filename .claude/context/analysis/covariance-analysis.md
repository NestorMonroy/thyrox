```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Principio aplicado: Covariancia (las leyes toman la misma forma en todos los marcos de referencia)
Archivos analizados: 9
Leyes verificadas: 5
```

# Análisis de Covariancia — THYROX

## Principio

El principio de covariancia establece que las leyes de la Física deben tomar la misma forma en todos los marcos de referencia. Aplicado a THYROX: las reglas del framework deben ser idénticas sin importar desde qué archivo las leas.

---

## Marcos de referencia analizados (9)

1. SKILL.md
2. CLAUDE.md
3. README.md
4. ARCHITECTURE.md
5. CONTRIBUTING.md
6. project-state.md
7. conventions.md
8. introduction.md
9. ROADMAP.md

---

## Leyes verificadas (5)

### LAW 1 — Las 7 fases y su orden

**Estado: ✅ INVARIANTE**

Los 9 archivos que mencionan las fases usan el mismo orden:
```
ANALYZE → SOLUTION_STRATEGY → PLAN → STRUCTURE → DECOMPOSE → EXECUTE → TRACK
```

Fue corregido en esta sesión (antes había 3 órdenes distintos).

---

### LAW 2 — Estructura de archivos

**Estado: ⚠️ PARCIALMENTE ROTA**

| Violación | Archivos | Detalle |
|-----------|----------|---------|
| `scripts/` omitido | SKILL.md File Structure | CLAUDE.md y ARCHITECTURE.md lo mencionan, SKILL.md no |
| `.claude/prds/` fantasma | CLAUDE.md línea 60 | Se menciona pero no existe ni se usa |
| conventions.md desactualizado | conventions.md | Describe estructura sin `analysis/`, `epics/`, `scripts/` |

---

### LAW 3 — Convenciones de nombrado

**Estado: ⚠️ PARCIALMENTE ROTA**

| Convención | Dónde está explícita | Dónde falta |
|-----------|---------------------|-------------|
| `kebab-case.md` para archivos | ARCHITECTURE.md, CONTRIBUTING.md | SKILL.md, CLAUDE.md, README.md |
| `lowercase/` para carpetas | ARCHITECTURE.md, CONTRIBUTING.md | SKILL.md, CLAUDE.md, README.md |
| Conventional Commits | Todos (consistente) | — |
| Epics `YYYY-MM-DD-nombre/` | SKILL.md, ARCHITECTURE.md | Solo 2 de 9 archivos |
| Work-logs `YYYY-MM-DD-HH-MM-desc.md` | SKILL.md, ARCHITECTURE.md | Solo 2 de 9 archivos |

---

### LAW 4 — Jerarquía (SKILL > CLAUDE.md > README)

**Estado: ❌ COMPLETAMENTE ROTA**

| Archivo | Cómo describe la jerarquía |
|---------|---------------------------|
| README.md | Tabla explícita: SKILL (L1), CLAUDE.md (L2), README (L3) |
| CLAUDE.md | "El motor es el SKILL" (pero no se posiciona como L2) |
| SKILL.md | **No menciona la jerarquía en absoluto** |
| ARCHITECTURE.md | No la menciona |
| CONTRIBUTING.md | Referencia al SKILL como fuente, sin jerarquía explícita |
| project-state.md | "Lee SKILL" pero sin contexto de jerarquía |
| conventions.md | No la menciona |

**Violación grave:** La ley solo existe en un marco de referencia (README.md). Si lees cualquier otro archivo, no sabes que hay una jerarquía de 3 niveles.

---

### LAW 5 — Dónde van los outputs

**Estado: ⚠️ PARCIALMENTE ROTA**

| Violación | Detalle |
|-----------|---------|
| `context/analysis/` doble uso | Phase 1 (diagnósticos) Y Phase 7 (auditorías) sin distinción |
| `context/work-logs/` doble semántica | Phase 1 (snapshots de análisis) Y Phase 6 (journals de ejecución) |
| `specs/` sin definir | SKILL.md dice `context/epics/.../specs/` pero nunca define qué contiene |

---

## Resumen

| Ley | Estado | Severidad |
|-----|--------|-----------|
| 1. Fases y orden | ✅ Invariante | — |
| 2. Estructura de archivos | ⚠️ Parcial | Media |
| 3. Convenciones de nombrado | ⚠️ Parcial | Media |
| 4. Jerarquía | ❌ Rota | Alta |
| 5. Output locations | ⚠️ Parcial | Media |

**Total:** 1 ley invariante, 3 parcialmente rotas, 1 completamente rota.

---

## Acciones requeridas

1. SKILL.md: Agregar jerarquía explícita al inicio
2. SKILL.md: Agregar `scripts/` al diagrama de File Structure
3. CLAUDE.md: Eliminar referencia a `.claude/prds/`
4. conventions.md: Actualizar estructura (agregar analysis/, epics/, scripts/)
5. SKILL.md: Hacer explícitas las convenciones de nombrado (kebab-case, lowercase)
6. Todos los archivos que mencionan jerarquía: usar la misma forma

---

**Última actualización:** 2026-03-28
