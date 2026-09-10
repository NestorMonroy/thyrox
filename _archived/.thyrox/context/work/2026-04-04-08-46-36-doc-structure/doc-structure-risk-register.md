```yml
Proyecto: THYROX — PM-THYROX Framework
Work package: 2026-04-04-08-46-36-doc-structure
Fecha creación: 2026-04-04
Última actualización: 2026-04-04
Fase actual: Phase 7 — TRACK (CERRADO)
Riesgos abiertos: 0
Riesgos mitigados: 5
Riesgos cerrados: 0
```

# Risk Register — doc-structure

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-001 | El campo `adr_path` no se lee correctamente por Haiku — escribe en lugar equivocado | Media | Alto | Alta | Mitigado — SKILL.md usa SI/NO |
| R-002 | Proyectos existentes que no declaran `adr_path` quedan con ADRs en `.claude/` sin saberlo | Alta | Medio | Alta | Mitigado — THYROX se autodeclara en CLAUDE.md |
| R-003 | `docs/` se convierte en basura si el SKILL escribe artefactos efímeros ahí por error | Baja | Alto | Media | Mitigado — tabla explícita en SKILL.md |
| R-004 | CLAUDE.md sin referencias a ADR IDs pierde trazabilidad histórica de las reglas | Media | Bajo | Baja | Mitigado — no se materializó; Locked Decisions portables |
| R-005 | Dos convenciones coexistiendo (`.claude/context/decisions/` vs `docs/`) crean confusión | Alta | Medio | Alta | Mitigado — `adr_path` es única fuente de verdad |

## Detalle de riesgos

### R-001: Haiku no lee `adr_path` y escribe en lugar incorrecto

**Descripción**
Si la instrucción en SKILL.md para leer `adr_path` de CLAUDE.md usa narrativa,
Haiku puede ignorarla y hardcodear la ruta antigua.

**Probabilidad**: Media
**Impacto**: Alto
**Severidad**: Alta
**Estado**: Abierto

**Mitigación**
La instrucción en SKILL.md debe ser: "SI CLAUDE.md tiene `adr_path:` → usar esa ruta.
SI no existe → usar `docs/architecture/decisions/`". Formato SI/NO, no narrativa.

---

### R-002: Proyectos sin `adr_path` declarado usan default inadecuado

**Descripción**
Si el default es `docs/architecture/decisions/` y el proyecto no tiene esa estructura,
el SKILL crea `docs/` sin que el desarrollador lo haya pedido.

**Probabilidad**: Alta
**Impacto**: Medio
**Severidad**: Alta
**Estado**: Abierto

**Mitigación**
El default debe ser conservador. Opción: no crear ADRs sin `adr_path` explícito,
o pedir confirmación la primera vez. Evaluar en Phase 2.

---

### R-003: Artefactos efímeros llegan a `docs/` por error

**Descripción**
Si el modelo confunde "artefacto permanente" con "artefacto de WP", puede escribir
task-plans, execution-logs, etc. en `docs/`.

**Probabilidad**: Baja
**Impacto**: Alto
**Severidad**: Media
**Estado**: Abierto

**Mitigación**
SKILL.md debe tener tabla explícita: qué va a `.claude/` (siempre) y qué va a `docs/`.
Solo ADRs van a `docs/`. Todo lo demás permanece en `.claude/`.

---

### R-005: Coexistencia de dos convenciones crea confusión

**Descripción**
Si THYROX mantiene `.claude/context/decisions/` y nuevos proyectos usan `docs/`,
los modelos pueden no saber cuál aplicar en cada contexto.

**Probabilidad**: Alta
**Impacto**: Medio
**Severidad**: Alta
**Estado**: Abierto

**Mitigación**
THYROX declara explícitamente `adr_path: .claude/context/decisions/` en su CLAUDE.md.
Así el campo `adr_path` es la única fuente de verdad — no hay ambigüedad.
