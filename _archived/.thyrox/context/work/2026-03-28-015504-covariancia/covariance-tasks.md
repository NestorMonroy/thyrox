```yml
Fecha: 2026-03-28
Proyecto: THYROX — Correcciones de Covariancia
Tipo: Phase 5 (DECOMPOSE)
Tasks totales: 7
```

# Tasks: Correcciones de Covariancia

## Task Order

```
TASK-C01 → TASK-C02 → TASK-C03 (LAW 4: Jerarquía — secuencial)
TASK-C04 (LAW 2: SKILL.md estructura — independiente)
TASK-C05 (LAW 2: CLAUDE.md prds/ — independiente)
TASK-C06 (LAW 3: Naming — independiente)
TASK-C07 (LAW 2+5: conventions.md — depende de C04)
```

C04, C05, C06 pueden ejecutarse en paralelo.
C07 depende de que C04 esté completo.

---

## TASK-C01: SKILL.md — declarar jerarquía Level 1

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Agregar después del YAML frontmatter y antes de "## Propósito":
  una línea que declare "Level 1 — Motor del framework"
- Mencionar los 3 niveles: SKILL (L1), CLAUDE.md (L2), README (L3)

**Done cuando:** SKILL.md se auto-identifica como Level 1

---

## TASK-C02: CLAUDE.md — declarar jerarquía Level 2

**Archivo:** CLAUDE.md<br>
**Estimación:** 5 min<br>
**Depende de:** C01

**Qué hacer:**
- En la sección METODOLOGÍA o al inicio, declarar: "Level 2 — Puente entre SKILL y proyecto"
- Referenciar SKILL.md como Level 1

**Done cuando:** CLAUDE.md se auto-identifica como Level 2

---

## TASK-C03: Verificar README.md jerarquía Level 3

**Archivo:** README.md<br>
**Estimación:** 3 min<br>
**Depende de:** C01, C02

**Qué hacer:**
- Verificar que la tabla de jerarquía existente usa "Level 1/2/3" consistente con C01 y C02
- Ajustar si hay diferencias de wording

**Done cuando:** Los 3 archivos dicen lo mismo sobre la jerarquía

---

## TASK-C04: SKILL.md — agregar scripts/ al File Structure

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- En la sección "File Structure", agregar `scripts/` bajo `pm-thyrox/`
- Listar los 6 scripts (detect/convert/validate x2)

**Done cuando:** El diagrama de SKILL.md incluye scripts/

---

## TASK-C05: CLAUDE.md — eliminar referencia a prds/

**Archivo:** CLAUDE.md<br>
**Estimación:** 3 min

**Qué hacer:**
- Buscar `.claude/prds/` o `prds/` en CLAUDE.md
- Eliminar la referencia (el directorio no existe)

**Done cuando:** Zero menciones de `prds/` en CLAUDE.md

---

## TASK-C06: SKILL.md — hacer explícitas las naming conventions

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Agregar subsección "Naming Conventions" después de File Structure
- Incluir: `kebab-case.md`, `lowercase/`, `YYYY-MM-DD-nombre/`, `YYYY-MM-DD-HH-MM-desc.md`, `adr-NNN.md`
- Link a conventions.md para detalles completos

**Done cuando:** SKILL.md declara explícitamente las convenciones de nombrado

---

## TASK-C07: conventions.md — actualizar estructura completa

**Archivo:** conventions.md<br>
**Estimación:** 10 min<br>
**Depende de:** C04

**Qué hacer:**
- Actualizar el diagrama de estructura para incluir: analysis/, epics/, scripts/, assets/
- Eliminar referencias a carpetas que ya no existen (templates/, tracking/, prds/)
- Verificar que la estructura coincide con SKILL.md (fuente canónica)

**Done cuando:** conventions.md y SKILL.md muestran la misma estructura

---

## Resumen

| Task | Ley | Archivo | Estimación | Dependencia |
|------|-----|---------|-----------|-------------|
| C01 | LAW 4 | SKILL.md | 5 min | - |
| C02 | LAW 4 | CLAUDE.md | 5 min | C01 |
| C03 | LAW 4 | README.md | 3 min | C01, C02 |
| C04 | LAW 2 | SKILL.md | 5 min | - |
| C05 | LAW 2 | CLAUDE.md | 3 min | - |
| C06 | LAW 3 | SKILL.md | 5 min | - |
| C07 | LAW 2+5 | conventions.md | 10 min | C04 |

**Total estimado:** ~36 min

---

## Siguiente Paso

→ Phase 6: EXECUTE
