```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción de conceptos spec-kit
Tipo: Phase 2 (SOLUTION_STRATEGY)
Autor: Claude Code + Human
Estado: Borrador
```

# Solution Strategy: Adopción de conceptos spec-kit

## Propósito

Definir CÓMO integrar los 6 conceptos que THYROX necesita adoptar de spec-kit, sin perder las fortalezas propias.

---

## Key Idea: Adoptar conceptos, no copiar implementación

spec-kit es un producto diferente (CLI + 24 agentes + extensiones + presets). THYROX es un skill de Claude Code. No podemos copiar la implementación, pero sí los conceptos.

**Principio:** Por cada concepto adoptado, crear el artefacto mínimo que lo resuelve dentro de la anatomía existente de THYROX (SKILL.md + references/ + scripts/ + assets/).

---

## Decisiones por Error

### ERR-003: Sin validación de specs → Crear checklist template

**Concepto:** Checklists como "unit tests para specs"

**Decisión:** Crear `assets/spec-quality-checklist.md.template` que se usa obligatoriamente en Phase 4 (STRUCTURE) antes de pasar a Phase 5.

**Ubicación:** assets/ (es un template de output, no documentación)

**Enforcement:** Agregar a EXIT_CONDITIONS.md.template como gate de Phase 4.

---

### ERR-004: Sin constitution → Crear constitution template + gates

**Concepto:** Principios inmutables con enforcement

**Decisión:** Crear `assets/constitution.md.template`. El output va a `context/constitution.md` (no en memory/ como spec-kit — THYROX usa context/ para todo el trabajo producido).

**Gates:** Agregar Phase -1 check a EXIT_CONDITIONS.md.template que verifica constitution antes de SOLUTION_STRATEGY.

**Ubicación:** assets/ para el template, context/ para la instancia

---

### ERR-005: Fases no ejecutables → Crear command references

**Concepto:** Instrucciones paso a paso por fase

**Decisión:** NO crear 7 archivos de comando separados (sería duplicar SKILL.md). En su lugar, enriquecer las references existentes con secciones "How to Execute" que tengan pasos numerados.

**Razonamiento:** spec-kit tiene 8 command files porque es un CLI con slash commands reales. THYROX es un SKILL — las instrucciones viven en references/ y se cargan bajo demanda.

**Ubicación:** Agregar sección ejecutable a cada reference relevante (introduction.md ya tiene flujo, solution-strategy.md ya tiene proceso). Los que faltan son Phase 3 (PLAN), Phase 5 (DECOMPOSE), Phase 6 (EXECUTE).

---

### ERR-006: Research phase → Integrar en SOLUTION_STRATEGY

**Concepto:** Investigar antes de decidir

**Decisión:** NO crear Phase 0 separada (rompería la numeración de 7 fases). En su lugar, hacer que Phase 2 (SOLUTION_STRATEGY) tenga un paso explícito de research ANTES de las decisiones.

**Razonamiento:** spec-kit tiene Phase 0 porque su Phase 1 es "specify" (crear spec). En THYROX, Phase 1 es ANALYZE (ya investiga). Lo que falta es que Phase 2 documente las alternativas investigadas, no que exista una fase nueva.

**Ubicación:** Agregar "Research Step" a references/solution-strategy.md

---

### ERR-007: ROADMAP sin links → Agregar links a epics

**Concepto:** Vincular ROADMAP items a sus epics

**Decisión:** Convención: cada sección del ROADMAP que tenga epic debe incluir línea `**Epic:** context/epics/YYYY-MM-DD-nombre/`

**Ubicación:** Documentar en conventions.md + SKILL.md naming conventions

---

### ERR-008: Exit conditions informativas → Hacerlas mandatorias

**Concepto:** Gates que bloquean, no checklists informativos

**Decisión:** Actualizar EXIT_CONDITIONS.md.template para que cada phase tenga:
- Checklist de items mandatorios
- Instrucción explícita: "Si NO se cumplen → PARAR, no avanzar"
- Constitution check en Phase 2

**Ubicación:** assets/EXIT_CONDITIONS.md.template (ya existe, mejorar)

---

## Resumen de artefactos a crear/modificar

| Artefacto | Acción | Tipo |
|-----------|--------|------|
| `assets/spec-quality-checklist.md.template` | Crear | Nuevo template |
| `assets/constitution.md.template` | Crear | Nuevo template |
| `assets/EXIT_CONDITIONS.md.template` | Mejorar | Agregar gates + constitution check |
| `references/solution-strategy.md` | Mejorar | Agregar Research Step |
| `references/conventions.md` | Mejorar | Agregar ROADMAP → epic link convention |
| `SKILL.md` | Mejorar | Agregar constitution y checklist al flujo de fases |

**No se crean nuevas fases, carpetas, ni scripts.** Todo se integra en la estructura existente.

---

## Siguiente Paso

→ Phase 3: PLAN — Actualizar ROADMAP.md con estas tareas
