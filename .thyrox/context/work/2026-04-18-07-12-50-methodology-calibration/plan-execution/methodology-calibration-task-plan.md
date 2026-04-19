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
  - Si FALLA → ejecutar T-001b
  - **Bloqueador para T-002, T-003**

- [ ] T-001b *(rama FAIL de T-001)* Migrar guidelines a `.claude/rules/` — mecanismo verificado
  - Mover los 6 archivos `.thyrox/guidelines/*.instructions.md` a `.claude/rules/`
  - Actualizar `.claude/CLAUDE.md` sección `Tech-stack guidelines`: eliminar los 6 @imports, agregar nota de que las reglas ahora cargan desde `.claude/rules/` automáticamente
  - Verificar que `.claude/settings.json` no tenga exclusión de `.claude/rules/` para los nuevos archivos
  - Actualizar T-019 (`platform-evolution-tracking.md`) para documentar que el mecanismo canónico es `.claude/rules/` (no @imports)
  - **Solo ejecutar si T-001 FALLA. Bloquea T-003b.**

- [ ] T-003b *(rama FAIL de T-001)* Actualizar CLAUDE.md post-migración
  - Eliminar líneas @imports de la sección `Tech-stack guidelines — @imports`
  - Agregar sección `Tech-stack rules (cargadas automáticamente)` con listado de archivos en `.claude/rules/`
  - **Depende de T-001b**

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

## Bloque 7 — Consistencia de nomenclatura de stages (nuevo hallazgo)

- [ ] T-014 Corregir nombres de stages viejos en 12 archivos — 26 ocurrencias
  - **Contexto:** El rename Stage 2→BASELINE, Stage 3→DIAGNOSE, Stage 6→SCOPE, Stage 10→IMPLEMENT
    está documentado en CLAUDE.md glosario pero los skills **no fueron actualizados**.
    El resultado: README.md dice "Stage 6 — SCOPE" y SKILL.md dice "Phase 6: PLAN" — fuente única de
    verdad partida. Exactamente el anti-patrón AP-25 (Named Mechanism vs. Implementation) aplicado
    a la propia documentación del sistema.
  - **Archivos a actualizar (12):**
    1. `.claude/skills/thyrox/SKILL.md` — tabla catálogo, mermaid (P2→BASELINE, P3→DIAGNOSE), references section
    2. `.claude/skills/workflow-baseline/SKILL.md` — header: `# /workflow-measure — Phase 2: MEASURE` → nuevo
    3. `.claude/skills/workflow-diagnose/SKILL.md` — header: `# /workflow-analyze — Phase 3: ANALYZE` → nuevo
    4. `.claude/skills/workflow-scope/SKILL.md` — header: `# /workflow-plan — Phase 6: PLAN` → nuevo
    5. `.claude/skills/workflow-implement/SKILL.md` — header: `# /workflow-execute — Phase 10: EXECUTE` → nuevo
    6. `.claude/skills/workflow-track/scripts/validate-phase-readiness.sh` — mensajes de validación
    7. `.claude/skills/python-mcp/SKILL.md` — sección headers
    8. `.claude/skills/db-postgresql/SKILL.md` — sección headers
    9. `.claude/skills/db-mysql/SKILL.md` — sección headers
    10. `.claude/skills/frontend-react/SKILL.md` — sección headers
    11. `.claude/skills/frontend-webpack/SKILL.md` — sección headers
    12. `.claude/skills/backend-nodejs/SKILL.md` — sección headers
  - **Regla de sustitución:**
    - `Phase 2: MEASURE` → `Stage 2: BASELINE`
    - `Phase 3: ANALYZE` → `Stage 3: DIAGNOSE`
    - `Phase 6: PLAN` → `Stage 6: SCOPE`
    - `Phase 10: EXECUTE` → `Stage 10: IMPLEMENT`
    - Mermaid nodes: `P2([MEASURE])` → `P2([BASELINE])`, `P3([ANALYZE])` → `P3([DIAGNOSE])`
  - **Independiente, no bloqueador — pero alta prioridad** (confusión activa para cualquier usuario del sistema)

---

## Bloque 8 — THYROX como Sistema de Agentic AI (gap estratégico)

> **Contexto:** Las 95 referencias del sistema cubren Lean, DMAIC, BPA, PDCA, PMBOK, RUP, RM, BABOK,
> SP, CP, PPS. **Ninguna habla de diseño de sistemas Agentic AI.** El methodology-selection-guide no
> tiene árbol de decisión para "¿estás construyendo un sistema agentic?". Las exit criteria de los stages
> no tienen criterios específicos para WPs de arquitectura agentic. T-001..T-006 resuelven calidad de
> código agentic, pero no identidad del sistema.

- [ ] T-015 Agregar Árbol 5 "Sistemas Agentic AI" en `.claude/skills/thyrox/references/methodology-selection-guide.md`
  - Árbol de decisión: "¿El WP construye o diseña un sistema donde un agente toma decisiones autónomas?"
  - Ramas por tipo de problema: orchestración multi-agente, HITL design, tool use contracts, observabilidad
  - Regla de desempate: cuándo usar sp: vs rup: vs el ciclo THYROX nativo para WPs agentic
  - Conectar con los patrones consultables de T-006 (AP-01..AP-30) como referencia de implementación
  - **Independiente**

- [ ] T-016 Crear `.claude/skills/workflow-strategy/references/agentic-system-design.md`
  - Referencia de diseño para WPs cuyo output es un sistema agentic
  - Secciones: qué hace a un sistema "agentic" (autonomía, tool use, incertidumbre), diferencia entre
    agente-como-herramienta vs agente-como-arquitectura, preguntas de Stage 5 STRATEGY para sistemas agentic
  - Criterios de Stage 3 DIAGNOSE para gaps en sistemas agentic (observable vs inferido)
  - Exit criteria adicionales para Stage 5: "¿la estrategia resuelve el mecanismo de decisión del agente
    o solo el código que lo rodea?"
  - **Independiente**

- [ ] T-017 Agregar exit criteria agentic en templates Stage 3 y Stage 5
  - `workflow-diagnose/assets/` — agregar sección "Si el WP es un sistema agentic: verificar..."
    con checklist derivado de AP-01..AP-30: callbacks, tipo contracts, error handling, observabilidad
  - `workflow-strategy/assets/` — agregar pregunta obligatoria: "¿la estrategia especifica el mecanismo
    de razonamiento del agente (no solo la implementación)?"
  - **Depende de T-016** (la referencia define los criterios antes de que los templates los citen)

- [ ] T-018 Crear `ARCHITECTURE.md` sección / documento `.claude/references/agentic-mandate.md`
  — Definición operacional del mandato de THYROX como Sistema de Agentic AI
  - **Problema:** README.md y ARCHITECTURE.md declaran "Sistema de Agentic AI" pero ningún archivo
    define qué significa eso en términos verificables. El mandato es un label, no una propiedad del sistema.
    Sin definición operacional, no hay forma de evaluar si THYROX cumple su identidad declarada.
  - **Contenido del documento:**
    - Definición verificable: "THYROX es agentic cuando [criterio 1..N medibles]"
      - C1: el motor puede rechazar su propio output (bound-detector.py — CUMPLE)
      - C2: el motor razona sobre incertidumbre en cada artefacto (exit criteria con umbral de confianza — NO CUMPLE todavía)
      - C3: el motor persiste estado entre sesiones sin intervención humana (sync-wp-state.sh, git — CUMPLE)
      - C4: el motor puede orquestar agentes especializados con scope acotado (25 agentes, bound-detector — CUMPLE)
      - C5: las instrucciones del motor están verificadas en producción (TD-040 — NO VERIFICADO)
      - C6: la arquitectura del motor corresponde a la documentación del sistema (ARCHITECTURE.md vs disco — NO CUMPLE)
    - Estado actual por criterio: CUMPLE / NO CUMPLE / NO VERIFICADO
    - Brechas activas: qué ÉPICAs deben cerrarse para alcanzar cada criterio
    - PESTEL relevante: qué fuerzas externas afectan este mandato (Claude Code evolución, AI governance, ADK)
    - Amenaza principal: la brecha "declarado vs real" crece cada ÉPICA que no cierra un criterio
  - **Ubicación:** `.claude/references/agentic-mandate.md` — cargado on-demand, no automático
  - **Depende de:** T-016 (define qué es "agentic" en el contexto de diseño de sistemas)
  - **Alimenta:** T-008 (ARCHITECTURE.md), T-009 (README.md) — ambos deben citar este documento

---

## Bloque 9 — Deuda de plataforma (PESTEL-T y SWOT-Amenazas)

> **Contexto:** THYROX corre sobre Claude Code, que evoluciona por release. Las referencias son
> estáticas. AP-01..AP-30 pueden quedar obsoletos. No hay mecanismo de refresh.

- [ ] T-019 Crear `.claude/references/platform-evolution-tracking.md`
  — Mecanismo de tracking de cambios de Claude Code que afectan THYROX
  - Lista de componentes THYROX con dependencia directa de plataforma:
    `@imports` (CLAUDE.md), hooks API (settings.json), agent frontmatter, slash commands
  - Por componente: versión verificada, comportamiento esperado, cómo detectar cambio
  - Proceso: al inicio de cada ÉPICA, verificar si hay cambios de plataforma relevantes
  - **Independiente** — no bloquea ningún task anterior, pero es la red de seguridad contra TD-040 recurrentes

---

## Bloque 10 — Calibración de incertidumbre en artefactos (DIM-A — CRÍTICA)

> **Contexto:** Este es el objetivo central de ÉPICA 42 según Sec. 8 del DISCOVER:
> *"Los templates de las 3 stages de mayor riesgo tienen sección de evidencia estructurada"*
> y *"exit-conditions.md.template tiene umbral de confianza con protocolo de verificación"*.
> **Ninguno de T-001..T-019 toca un solo template**. Sin este bloque, ÉPICA 42 no cumple
> sus propios criterios de éxito.

- [ ] T-020 Agregar sección "Evidencia de respaldo" en 3 templates de stage de mayor riesgo
  - Archivos a modificar:
    1. `.claude/skills/workflow-diagnose/assets/` — template de Stage 3 DIAGNOSE
    2. `.claude/skills/workflow-strategy/assets/` — template de Stage 5 STRATEGY
    3. `.claude/skills/workflow-decompose/assets/` — template de Stage 8 PLAN EXECUTION
  - Sección a agregar en cada template:
    ```markdown
    ## Evidencia de respaldo
    | Claim | Tipo | Fuente | Confianza |
    |-------|------|--------|-----------|
    | [afirmación] | observación/inferencia/gate-humano | [tool output / documento / decisión] | alta/media/baja |
    ```
  - Regla derivada: claims sin fuente → status `Borrador` bloqueado (no puede avanzar al gate)
  - **Depende de T-017** (para no editar los mismos templates en conflicto)

- [ ] T-021 Actualizar `exit-conditions.md.template` con umbral de confianza derivado
  - Archivo: `.claude/skills/workflow-discover/assets/exit-conditions.md.template`
  - Cambio: cada gate binario (PASS/FAIL) debe incluir campo `confidence_threshold`
    con protocolo de verificación (herramienta ejecutada, triangulación, human gate)
  - Anti-patrón a eliminar: gates como "¿El análisis está completo?" → reemplazar con
    "¿El análisis tiene ≥N claims con fuente observable verificada?"
  - Ejemplo concreto del nuevo formato:
    ```
    Gate Stage 3→4: DIAGNOSE completo
    - [ ] Causa raíz principal con trazabilidad a ≥2 observaciones independientes
    - [ ] Sección "Evidencia de respaldo" con ≥3 claims clasificados
    - confidence_threshold: 0.80 (requiere tool_use confirmatorio, no solo LLM)
    ```
  - **Independiente de T-020** (editan archivos diferentes)

---

## Bloque 11 — Enforcement técnico de invariantes (DIM-B)

> **Contexto:** I-001..I-011 son instrucciones de texto. `validate-session-close.sh`
> no detecta violación de I-001 (task-plan sin discover/ en el mismo WP). SALTO-03
> del solidez deep-dive: el enforcement es 100% LLM-dependiente.

- [ ] T-022 Agregar warning de I-001 en `validate-session-close.sh`
  - Agregar Check 4: para cada WP con `plan-execution/` existente, verificar que
    `discover/` también existe en el mismo WP
  - Si falta discover/ → emitir warning (no bloquear, pero sí registrar en output)
  - Formato del warning: `⚠ WP {nombre}: task-plan sin DISCOVER — viola I-001`
  - **Independiente**

---

## Bloque 12 — Solidez del registro de agentes (DIM-C)

> **Contexto:** CONTRADICCIÓN-01 del solidez deep-dive: 16/25 agentes (64%) no tienen
> YML fuente en el registry. ARCHITECTURE.md declara "el registry es fuente de verdad"
> — eso es FALSO para 64% de los agentes. T-008 actualiza ARCHITECTURE.md pero no
> puede corregir el claim si los YMLs no existen.

- [ ] T-023 Crear YMLs de documentación para los 16 agentes sin origen en registry
  - Los 16 agentes: todos los coordinators (dmaic, pdca, lean, rup, rm, pm, ba, pps,
    sp, cp, bpa + thyrox-coordinator) y agentes de análisis (deep-dive, deep-review,
    diagrama-ishikawa, agentic-reasoning)
  - Formato: YML mínimo con `name`, `description`, `tools`, `installation: manual`
    (campo nuevo para distinguir de los generados por bootstrap.py)
  - No incluir `model:` (TD-037)
  - **Depende de T-008** (T-008 debe actualizar ARCHITECTURE.md antes de que T-023
    corrija el claim de fuente de verdad)

---

## Bloque 13 — Cobertura de bound-detector en inglés (DIM-D)

> **Contexto:** SALTO-06 del solidez deep-dive: UNBOUNDED_SIGNALS tiene cobertura
> completa en español pero solo 2 patrones en inglés. "process all", "analyze every",
> "check each", "read all files" no son interceptados.

- [ ] T-024 Ampliar UNBOUNDED_SIGNALS en `bound-detector.py` — cobertura inglés
  - Agregar a `UNBOUNDED_SIGNALS` en `.claude/scripts/bound-detector.py`:
    ```python
    r"\bprocess all\b", r"\banalyze every\b", r"\bcheck each\b",
    r"\bread all\b", r"\blist all\b", r"\bfind all\b",
    r"\bfor each\b", r"\bevery file\b", r"\ball files\b",
    r"\bwithout limit\b", r"\bexhaustively\b",
    ```
  - Agregar comment en el código: `# English unbounded patterns — updated ÉPICA 42`
  - Actualizar docstring del archivo para declarar cobertura: `# Cobertura: español (completo) + inglés (extenso)`
  - **Independiente**

---

## DAG de dependencias completo

```
T-001 (verificar @imports)
  ├── PASS → T-002 (agentic-python.instructions.md)
  │             └── T-003 (CLAUDE.md @import)
  └── FAIL → T-001b (migrar guidelines a .claude/rules/)
               └── T-003b (actualizar CLAUDE.md eliminar @imports)

T-004 (agentic-validator.yml)
  └── T-005 (agentic-validator.md directo)

T-006 (6 patrones) — independiente
  └── T-015 depende de T-006 (árbol usa patrones como referencia)

T-007 (TD-042 validate-session-close.sh) — independiente
T-022 (Check I-001 en validate-session-close.sh) — independiente
  └── T-007 y T-022 editan el mismo script — T-022 ejecutar después de T-007

T-008 (ARCHITECTURE.md) — depende de T-005 + T-018
  └── T-023 (YMLs 16 agentes) — depende de T-008

T-009 (README.md) — depende de T-005 + T-018
T-010 (focus.md) — independiente
T-011 (project-state.md) — depende de T-005 (para conteo final)
T-012 (ROADMAP.md) — independiente
T-013 (workflow-standardize) — independiente
T-014 (consistencia stage names) — independiente, alta prioridad
T-015 (árbol Agentic AI en methodology-selection-guide) — depende de T-006
T-016 (referencia agentic-system-design.md) — independiente
T-017 (exit criteria agentic en Stage 3 + Stage 5 templates) — depende de T-016
  └── T-020 (sección Evidencia en templates) — depende de T-017
        └── editan mismos templates: T-020 ejecutar después de T-017
T-018 (agentic-mandate.md — definición operacional) — depende de T-016
T-019 (platform-evolution-tracking.md) — independiente
T-020 (sección Evidencia en 3 templates) — depende de T-017
T-021 (exit-conditions.md.template con umbral confianza) — independiente
T-022 (I-001 warning en validate-session-close.sh) — después de T-007
T-023 (YMLs 16 agentes sin registry) — depende de T-008
T-024 (bound-detector.py cobertura inglés) — independiente
```

## Orden de ejecución sugerido

1. T-001 → (decisión bifurca) → PASS: T-002 → T-003 | FAIL: T-001b → T-003b
2. T-004 → T-005
3. T-006 (paralelo con 1-2)
4. T-007 → T-022 (secuencial, mismo script) | T-013 | T-014 | T-024 (paralelo)
5. T-016 → T-017 → T-020 (secuencial, mismos templates)
6. T-016 → T-018 (paralelo con paso 5)
7. T-015 (después de T-006) | T-019 | T-021 (paralelo)
8. T-005 + T-016 → T-018 → T-008 → T-023 (secuencial)
9. T-018 → T-009 → T-010 → T-011 → T-012

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
