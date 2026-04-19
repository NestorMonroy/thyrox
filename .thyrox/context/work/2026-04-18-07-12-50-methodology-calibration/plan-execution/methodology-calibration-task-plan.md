```yml
created_at: 2026-04-19 17:23:19
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Task Plan — Implementación de hallazgos Stage 1 DISCOVER

**Fuente:** `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/`
**Mapa validado por:** `analyze/change-map-deep-dive.md` + `analyze/stage3-to-stage5-coverage.md`
**Scope:** Implementar en el proyecto THYROX los 30 anti-patrones descubiertos en Cap.9–20
como guidelines accionables, agente validador, y patrones consultables.

**Correcciones post-análisis:**
- ELIMINADOS como falsos positivos: bound-detector.py docstring (cosmético), sync-wp-state.sh (funciona correctamente)
- AGREGADOS: ARCHITECTURE.md (nueva familia de agentes), README.md (conteo), decisión bootstrap.py
- bootstrap.py NO puede generar agentic-validator sin modificación — instalación directa en `.claude/agents/`

---

## Bloque 0 — Prerequisito: verificar mecanismo de carga

- [ ] T-001 Verificar TD-040: probar que @imports en CLAUDE.md carga `.instructions.md` en sesión real
  - Acción: crear archivo temporal `.thyrox/guidelines/test-import-verification.md` con una regla única, verificar que Claude la aplica sin instrucción explícita en la siguiente sesión
  - Si PASA → continuar con T-002 (crear nuevo guideline)
  - Si FALLA → ejecutar T-001b: mover `.thyrox/guidelines/*.instructions.md` a `.claude/rules/` y actualizar CLAUDE.md eliminando @imports
  - **Bloqueador para T-002, T-003**

---

## Bloque 1 — Guideline de agentic AI (Eje 1)

- [ ] T-002 Crear `.thyrox/guidelines/agentic-python.instructions.md`
  - 30 reglas derivadas de AP-01..AP-30, agrupadas en 8 secciones
  - Cada regla: anti-patrón (INCORRECTO) + patrón correcto (CORRECTO) + AP-ID de origen
  - Sección 1: ADK Callbacks (AP-01, AP-02)
  - Sección 2: Type Contracts (AP-03, AP-04, AP-05, AP-06)
  - Sección 3: Classifier Temperature (AP-07, AP-08)
  - Sección 4: Error Handling (AP-09, AP-10, AP-11, AP-12)
  - Sección 5: Observability (AP-13, AP-14, AP-15)
  - Sección 6: HITL Patterns (AP-16, AP-17)
  - Sección 7: Imports (AP-18, AP-19, AP-20, AP-21, AP-22)
  - Sección 8: Agentic Design (AP-23, AP-24, AP-25, AP-26, AP-27, AP-28, AP-29, AP-30)
  - **Depende de T-001 PASS**

- [ ] T-003 Actualizar `.claude/CLAUDE.md` — agregar @import
  - Agregar línea en sección `Tech-stack guidelines — @imports`:
    `@.thyrox/guidelines/agentic-python.instructions.md`
  - **Depende de T-001 PASS y T-002**

---

## Bloque 2 — Agente validador (Eje 2)

- [ ] T-004 Crear `.thyrox/registry/agents/agentic-validator.yml`
  - Sin campo `model:` (constraint TD-037 — README del registry lo prohíbe)
  - `name`: agentic-validator
  - `description`: 20+ chars con patrón "Use when..." — valida código Python agentic contra catálogo AP-01..AP-30
  - `tools`: Read, Glob, Grep, Bash, Write
  - `system_prompt`: catálogo AP condensado (anti-patrón + correcto por AP) + protocolo de reporte

- [ ] T-005 Crear `.claude/agents/agentic-validator.md` directamente
  - bootstrap.py no soporta este tipo de agente sin modificación — instalación manual
  - Formato idéntico a `.claude/agents/deep-dive.md` (leer como referencia)
  - Frontmatter: name, description, tools, model: sonnet, async_suitable: true, updated_at
  - Cuerpo: protocolo de validación, catálogo AP-01..AP-30 con ejemplos mínimos por AP
  - **Depende de T-004**

---

## Bloque 3 — Patrones consultables (Eje 3)

- [ ] T-006 Crear directorio `discover/patterns/` con 6 documentos de patrones
  - AP-01: `discover/patterns/adk-model-callback-contract.md`
  - AP-02: `discover/patterns/adk-tool-callback-contract.md`
  - AP-16: `discover/patterns/hitl-blocking-loop.md`
  - AP-17: `discover/patterns/hitl-interrupt-resume.md`
  - AP-18: `discover/patterns/langchain-imports-correct.md`
  - AP-25: `discover/patterns/named-mechanism-vs-implementation.md` ← SISTÉMICO agregado por deep-dive
  - Formato por doc: Anti-patrón | Patrón correcto | Ejemplo mínimo ejecutable | Por qué falla

---

## Bloque 4 — Deuda técnica operacional

- [ ] T-007 Resolver TD-042: agregar verificación PAT-004 en `validate-session-close.sh`
  - Verificar que checkboxes T-NNN en task-plan están sincronizados con commits del WP
  - Leer `technical-debt.md` para criterio exacto de cierre
  - **Independiente, no bloqueador**

---

## Bloque 5 — Documentación del proyecto

- [ ] T-008 Actualizar `ARCHITECTURE.md` — nueva familia de agentes
  - El deep-dive identificó que `agentic-validator` introduce una tercera familia: "domain pattern validators"
  - ARCHITECTURE.md actualmente describe: methodology coordinators + tech experts
  - Agregar sección que documente la nueva familia y su propósito

- [ ] T-009 Actualizar `README.md` — conteo de agentes
  - De 23 a 24 agentes (o 26 si el conteo real es 25 + el nuevo)
  - Verificar conteo real antes de editar

- [ ] T-010 Actualizar `.thyrox/context/focus.md`
  - Reflejar ÉPICA 42 activa (actualmente dice "Sin WP activo")
  - Actualizar sección "Próximos candidatos"

- [ ] T-011 Actualizar `.thyrox/context/project-state.md`
  - Bump versión: 2.6.0 → 2.9.0 (MINOR: nueva guideline + nuevo agente)
  - Actualizar conteo de agentes
  - Agregar agentic-validator en tabla de agentes

- [ ] T-012 Actualizar `ROADMAP.md`
  - Marcar Stage 1 DISCOVER, Stage 2 BASELINE, Stage 3 DIAGNOSE como `[x]`
  - Marcar Stage 8 PLAN EXECUTION como `[-]` (en curso)

---

## Bloque 6 — Proceso de propagación sistémica

- [ ] T-013 Actualizar `.claude/skills/workflow-standardize/SKILL.md`
  - Agregar paso explícito en sección "Qué standardizar":
    "Si el WP descubrió anti-patrones de código agentic → actualizar `agentic-python.instructions.md`
    con las nuevas reglas y `agentic-validator.md` con los nuevos APs"
  - **Independiente, no bloqueador**

---

## DAG de dependencias

```
T-001 (verificar @imports)
  ├── PASS → T-002 (agentic-python.instructions.md)
  │             └── T-003 (CLAUDE.md @import)
  └── FAIL → T-001b (migrar guidelines a rules/)
               └── T-003b (actualizar CLAUDE.md eliminar @imports)

T-004 (agentic-validator.yml)
  └── T-005 (agentic-validator.md directo)

T-006 (6 patrones) — independiente
T-007 (TD-042 validate-session-close.sh) — independiente
T-008 (ARCHITECTURE.md) — depende de T-005 (necesita saber qué crear)
T-009 (README.md) — depende de T-005
T-010 (focus.md) — independiente
T-011 (project-state.md) — depende de T-005 (para conteo final)
T-012 (ROADMAP.md) — independiente
T-013 (workflow-standardize) — independiente
```

## Orden de ejecución sugerido

1. T-001 → (decisión) → T-002 → T-003
2. T-004 → T-005
3. T-006 (paralelo con 1-2)
4. T-007, T-013 (paralelo, independientes)
5. T-008 → T-009 → T-010 → T-011 → T-012

## Trazabilidad

| Tarea | AP cubiertos | Fuente en discover/ |
|-------|-------------|---------------------|
| T-002 | AP-01..AP-30 | baseline.md catálogo completo |
| T-005 | AP-01..AP-30 | deep-dives Cap.9-20 |
| T-006 AP-01 | AP-01 | agentic-callback-contract-misunderstanding.md |
| T-006 AP-02 | AP-02 | guardrails-safety-deep-dive.md |
| T-006 AP-16,17 | AP-16, AP-17 | a2a-pattern-deep-dive.md |
| T-006 AP-18 | AP-18 | prioritization-deep-dive.md |
| T-006 AP-25 | AP-25 | resource-aware-optimization-deep-dive.md..reasoning-techniques-deep-dive.md |
