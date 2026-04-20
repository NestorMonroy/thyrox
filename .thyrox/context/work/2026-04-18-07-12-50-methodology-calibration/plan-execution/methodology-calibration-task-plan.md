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

- [x] T-001 Verificar TD-040: probar que @imports en CLAUDE.md carga `.instructions.md` en sesión real → RESULTADO: PASS
  - Acción: crear archivo temporal `.thyrox/guidelines/test-import-verification.md` con una regla única, verificar que Claude la aplica sin instrucción explícita en la siguiente sesión
  - Si PASA → continuar con T-002 (crear nuevo guideline)
  - Si FALLA → ejecutar T-001b
  - **Bloqueador para T-002, T-003**
  - Evidencia: `memory-hierarchy.md:47-63` documenta `@path/to/file` como rutas relativas al repo sin restricción de directorio. 6 archivos existen en `.thyrox/guidelines/`. settings.json sin ignorePatterns. @task-executor (done: 2026-04-20 13:02:11)

- [-] T-001b *(rama FAIL de T-001)* Migrar guidelines a `.claude/rules/` — mecanismo verificado — CANCELADO — T-001 pasó (rama PASS), esta rama FAIL no se ejecuta
  - Mover los 6 archivos `.thyrox/guidelines/*.instructions.md` a `.claude/rules/`
  - Actualizar `.claude/CLAUDE.md` sección `Tech-stack guidelines`: eliminar los 6 @imports, agregar nota de que las reglas ahora cargan desde `.claude/rules/` automáticamente
  - Verificar que `.claude/settings.json` no tenga exclusión de `.claude/rules/` para los nuevos archivos
  - Actualizar T-019 (`platform-evolution-tracking.md`) para documentar que el mecanismo canónico es `.claude/rules/` (no @imports)
  - **Solo ejecutar si T-001 FALLA. Bloquea T-003b.**

- [-] T-003b *(rama FAIL de T-001)* Actualizar CLAUDE.md post-migración — CANCELADO — T-001 pasó (rama PASS), esta rama FAIL no se ejecuta
  - Eliminar líneas @imports de la sección `Tech-stack guidelines — @imports`
  - Agregar sección `Tech-stack rules (cargadas automáticamente)` con listado de archivos en `.claude/rules/`
  - **Depende de T-001b**

---

## Bloque 1 — Guideline de agentic AI (Eje 1)

- [x] T-002 Crear `.thyrox/guidelines/agentic-python.instructions.md` @task-executor (done: 2026-04-20 13:14:38)
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

- [x] T-003 Actualizar `.claude/CLAUDE.md` — agregar @import @task-executor (done: 2026-04-20 13:22:17)
  - Agregar línea en sección `Tech-stack guidelines — @imports`:
    `@.thyrox/guidelines/agentic-python.instructions.md`
  - **Depende de T-001 PASS y T-002**

---

## Bloque 2 — Agente validador (Eje 2)

- [x] T-004 Crear `.thyrox/registry/agents/agentic-validator.yml` @task-executor (done: 2026-04-20 13:11:08)
  - Sin campo `model:` (constraint TD-037 — README del registry lo prohíbe)
  - `name`: agentic-validator
  - `description`: 20+ chars con patrón "Use when..." — valida código Python agentic contra catálogo AP-01..AP-30
  - `tools`: Read, Glob, Grep, Bash, Write
  - `system_prompt`: catálogo AP condensado (anti-patrón + correcto por AP) + protocolo de reporte

- [x] T-005 Crear `.claude/agents/agentic-validator.md` directamente @task-executor (done: 2026-04-20 13:11:08)
  - bootstrap.py no soporta este tipo de agente sin modificación — instalación manual
  - Formato idéntico a `.claude/agents/deep-dive.md` (leer como referencia)
  - Frontmatter: name, description, tools, model: sonnet, async_suitable: true, updated_at
  - Cuerpo: protocolo de validación, catálogo AP-01..AP-30 con ejemplos mínimos por AP
  - **Depende de T-004**

---

## Bloque 3 — Patrones consultables (Eje 3)

- [x] T-006 Crear directorio `discover/patterns/` con 6 documentos de patrones @task-executor (done: 2026-04-20 13:11:44)
  - AP-01: `discover/patterns/adk-model-callback-contract.md`
  - AP-02: `discover/patterns/adk-tool-callback-contract.md`
  - AP-16: `discover/patterns/hitl-blocking-loop.md`
  - AP-17: `discover/patterns/hitl-interrupt-resume.md`
  - AP-18: `discover/patterns/langchain-imports-correct.md`
  - AP-25: `discover/patterns/named-mechanism-vs-implementation.md` ← SISTÉMICO agregado por deep-dive
  - Formato por doc: Anti-patrón | Patrón correcto | Ejemplo mínimo ejecutable | Por qué falla

---

## Bloque 4 — Deuda técnica operacional

- [x] T-007 Resolver TD-042: agregar verificación PAT-004 en `validate-session-close.sh` @task-executor (done: 2026-04-20 13:16:31)
  - Verificar que checkboxes T-NNN en task-plan están sincronizados con commits del WP
  - Leer `technical-debt.md` para criterio exacto de cierre
  - **Independiente, no bloqueador**

---

## Bloque 5 — Documentación del proyecto

- [x] T-008 Actualizar `ARCHITECTURE.md` — nueva familia de agentes
  - El deep-dive identificó que `agentic-validator` introduce una tercera familia: "domain pattern validators"
  - ARCHITECTURE.md actualmente describe: methodology coordinators + tech experts
  - Agregar sección que documente la nueva familia y su propósito

- [x] T-009 Actualizar `README.md` — conteo de agentes
  - De 23 a 24 agentes (o 26 si el conteo real es 25 + el nuevo)
  - Verificar conteo real antes de editar

- [x] T-010 Actualizar `.thyrox/context/focus.md` @task-executor (done: 2026-04-20 13:24:47)
  - Reflejar ÉPICA 42 activa (actualmente dice "Sin WP activo")
  - Actualizar sección "Próximos candidatos"

- [x] T-011 Actualizar `.thyrox/context/project-state.md` @task-executor (done: 2026-04-20 13:24:47)
  - Bump versión: 2.6.0 → 2.9.0 (MINOR: nueva guideline + nuevo agente)
  - Actualizar conteo de agentes
  - Agregar agentic-validator en tabla de agentes

- [x] T-012 Actualizar `ROADMAP.md`
  - Marcar Stage 1 DISCOVER, Stage 2 BASELINE, Stage 3 DIAGNOSE como `[x]`
  - Marcar Stage 8 PLAN EXECUTION como `[-]` (en curso)

---

## Bloque 6 — Proceso de propagación sistémica

- [x] T-013 Actualizar `.claude/skills/workflow-standardize/SKILL.md` @task-executor (done: 2026-04-20 13:16:57)
  - Agregar paso explícito en sección "Qué standardizar":
    "Si el WP descubrió anti-patrones de código agentic → actualizar `agentic-python.instructions.md`
    con las nuevas reglas y `agentic-validator.md` con los nuevos APs"
  - **Independiente, no bloqueador**

---

## Bloque 7 — Consistencia de nomenclatura de stages (nuevo hallazgo)

- [x] T-014 Corregir nombres de stages viejos en 12 archivos — 26 ocurrencias @task-executor (done: 2026-04-20 13:08:54)
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

- [x] T-015 Agregar Árbol 5 "Sistemas Agentic AI" en `.claude/skills/thyrox/references/methodology-selection-guide.md` @task-executor (done: 2026-04-20 13:41:02)
  - Árbol de decisión: "¿El WP construye o diseña un sistema donde un agente toma decisiones autónomas?"
  - Ramas por tipo de problema: orchestración multi-agente, HITL design, tool use contracts, observabilidad
  - Regla de desempate: cuándo usar sp: vs rup: vs el ciclo THYROX nativo para WPs agentic
  - Conectar con los patrones consultables de T-006 (AP-01..AP-30) como referencia de implementación
  - **Independiente**

- [x] T-016 Crear `.claude/skills/workflow-strategy/references/agentic-system-design.md` @task-executor (done: 2026-04-20 13:25:41)
  - Referencia de diseño para WPs cuyo output es un sistema agentic
  - Secciones: qué hace a un sistema "agentic" (autonomía, tool use, incertidumbre), diferencia entre
    agente-como-herramienta vs agente-como-arquitectura, preguntas de Stage 5 STRATEGY para sistemas agentic
  - Criterios de Stage 3 DIAGNOSE para gaps en sistemas agentic (observable vs inferido)
  - Exit criteria adicionales para Stage 5: "¿la estrategia resuelve el mecanismo de decisión del agente
    o solo el código que lo rodea?"
  - **Independiente**

- [x] T-017 Agregar exit criteria agentic en templates Stage 3 y Stage 5 @task-executor (done: 2026-04-20 13:41:02)
  - `workflow-diagnose/assets/` — agregar sección "Si el WP es un sistema agentic: verificar..."
    con checklist derivado de AP-01..AP-30: callbacks, tipo contracts, error handling, observabilidad
  - `workflow-strategy/assets/` — agregar pregunta obligatoria: "¿la estrategia especifica el mecanismo
    de razonamiento del agente (no solo la implementación)?"
  - **Depende de T-016** (la referencia define los criterios antes de que los templates los citen)

- [x] T-018 Crear `ARCHITECTURE.md` sección / documento `.claude/references/agentic-mandate.md` @task-executor (done: 2026-04-20 13:41:02)
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

- [x] T-019 Crear `.claude/references/platform-evolution-tracking.md` @task-executor (done: 2026-04-20 13:16:57)
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

- [x] T-020 Agregar sección "Evidencia de respaldo" en 3 templates de stage de mayor riesgo @task-executor (done: 2026-04-20 13:50:45)
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

- [x] T-021 Actualizar `exit-conditions.md.template` con umbral de confianza derivado @task-executor (done: 2026-04-20 13:16:57)
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

- [x] T-022 Agregar warning de I-001 en `validate-session-close.sh` @task-executor (done: 2026-04-20 13:16:31)
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

- [x] T-023 Crear YMLs de documentación para los 16 agentes sin origen en registry @task-executor (done: 2026-04-20 13:43:52)
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

- [x] T-024 Ampliar UNBOUNDED_SIGNALS en `bound-detector.py` — cobertura inglés @task-executor (done: 2026-04-20 13:54:12)
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

## Bloque 14 — Vocabulario epistémico e infraestructura de evidencia (CRÍTICO)

> **Contexto:** Clusters A y B identifican que el sistema carece de vocabulario operacional
> para clasificar el origen de los claims. Sin él, la columna "Tipo" de T-020 no tiene
> criterio — reproduce exactamente el problema que ÉPICA 42 pretende resolver.

- [x] T-025 Crear `.claude/references/evidence-classification.md` — vocabulario epistémico @task-executor (done: 2026-04-20 13:26:09)
  - **Fuentes:** cluster-a (H-A1 CRÍTICO — esquema OBSERVABLE/INFERRED/SPECULATIVE), cluster-b (B-A2A-1 ALTO — abstraction collapse, necesita taxonomía)
  - Crear `.claude/references/evidence-classification.md`:
    - Definición de OBSERVABLE: hay una herramienta ejecutada, output citado textualmente, acción registrada en git. Reproducible por cualquier agente con los mismos permisos.
    - Definición de INFERRED: derivado de OBSERVABLEs mediante razonamiento explícito. El claim es más fuerte que sus fuentes — si el razonamiento falla, el claim falla.
    - Definición de SPECULATIVE: sin observable de origen documentado. No puede ser fundamento de una decisión de arquitectura. Puede aparecer en un análisis como hipótesis, pero debe marcarse explícitamente.
    - Regla de propagación: un claim SPECULATIVE no puede avanzar gate Stage→Stage. Si el gate requiere claims de tipo OBSERVABLE o INFERRED, los claims SPECULATIVE quedan retenidos en el stage actual.
    - Tabla de señales de identificación por tipo: ¿qué palabras/estructuras suelen indicar cada tipo? (ej. "el sistema hace X" sin citar tool output → SPECULATIVE)
    - Relación con PROVEN/INFERRED de la literatura (cluster-a H-A1): OBSERVABLE ≈ PROVEN, INFERRED ≈ INFERRED, SPECULATIVE ≈ sin soporte
  - **Archivo a crear:** `.claude/references/evidence-classification.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente — prerequisito de T-020 y T-026

- [x] T-026 Extender tabla "Evidencia de respaldo" de T-020 — columna Origen + criterios de Confianza @task-executor (done: 2026-04-20 14:01:00)
  - **Fuentes:** cluster-b (B-MA-1 CRÍTICO — contratos de output_key undefined; H-B5 ALTO — abstraction collapse en outputs)
  - Extender la tabla definida en T-020 con columna adicional:
    ```markdown
    ## Evidencia de respaldo
    | Claim | Tipo | Fuente | Confianza | Origen |
    |-------|------|--------|-----------|--------|
    | [afirmación] | OBSERVABLE/INFERRED/SPECULATIVE | [tool output/doc/gate] | alta/media/baja | heredado/nuevo |
    ```
  - Criterios de Confianza operacionales:
    - alta: claim OBSERVABLE con herramienta ejecutada y output citado textualmente
    - media: claim INFERRED con cadena de razonamiento explícita de ≥2 observables
    - baja: claim INFERRED con un solo observable o razonamiento parcial
    - Columna "Origen": `heredado` = tomado de stage anterior, `nuevo` = generado en este stage
    - Regla: si Origen=heredado y Confianza=baja → el claim debe re-verificarse en este stage, no heredarse
  - **Archivos a modificar:** los 3 templates de T-020 (workflow-diagnose, workflow-strategy, workflow-decompose)
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-020, T-025

- [x] T-027 Agregar I-012 e I-013 en `.claude/rules/thyrox-invariants.md` @task-executor (done: 2026-04-20 13:40:10)
  - **Fuentes:** cluster-a (H-A2 CRÍTICO — brecha entre claim y observable como invariante sistémica), cluster-b (B-MA-2 ALTO — context pruning sin mecanismo formal)
  - Agregar en `.claude/rules/thyrox-invariants.md`:
    ```
    ## I-012: Claims SPECULATIVE no avanzan gates
    Un claim clasificado como SPECULATIVE (sin observable de origen en evidence-classification.md)
    no puede ser fundamento de una decisión de Stage gate. Si el gate requiere claim OBSERVABLE
    o INFERRED, el WP permanece en el stage actual hasta que el claim se respalde o se descarte.

    ## I-013: Context pruning en gates Stage→Stage
    Al avanzar de Stage N a Stage N+1, los claims con Confianza=baja y Origen=heredado
    deben ser explícitamente descartados o re-verificados. No heredar silenciosamente
    claims de baja confianza — propagan error sin trazabilidad.
    ```
  - **Archivo a modificar:** `.claude/rules/thyrox-invariants.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-025 (evidence-classification.md debe existir como referencia)

- [x] T-028 Crear `.claude/references/prohibited-claims-registry.md` @task-executor (done: 2026-04-20 13:26:09)
  - **Fuentes:** cluster-a (H-A3 ALTO — patrones de razonamiento prohibidos), cluster-b (B-MA-2 ALTO — abstraction collapse produce claims no trazables)
  - Crear `.claude/references/prohibited-claims-registry.md`:
    - Sección "Claims prohibidos como fundamentos de arquitectura": frases y estructuras que son invariablemente SPECULATIVE en artefactos THYROX (ej: "el sistema debería X", "es probable que X", "típicamente X")
    - Sección "Patrones de razonamiento prohibidos": escalada terminológica (hipótesis → hecho), overgeneralization (N casos → regla universal), cherry-picking (caso positivo → validación)
    - Sección "Señales de advertencia en templates": indicadores textuales en artefactos WP que sugieren claim SPECULATIVE no marcado
    - Proceso de uso: cómo un agente usa este registro durante análisis (checklist de 3 preguntas antes de avanzar gate)
  - **Archivo a crear:** `.claude/references/prohibited-claims-registry.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-025 (evidence-classification.md como referencia base)

---

## Bloque 15 — Anti-patrones AP-31..AP-39 (CRÍTICO)

> **Contexto:** Los clusters A, B, C, D y E identificaron 8 anti-patrones nuevos (AP-31..AP-38)
> no cubiertos por el catálogo AP-01..AP-30 de ÉPICA 42. T-002 y T-005 deben extenderse.
> AP-39 (Advertencia Desconectada) se identifica en Cluster C y se agrega al catálogo.

- [x] T-029 Agregar AP-31 "Tool Description Mismatch" y AP-32 "Architectural Shell Without Behavioral Core" @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** cluster-d (P2-A CRÍTICO — AP-31; H2-A CRÍTICO — AP-32), cluster-c (H-C06 ALTO — confirma AP-32)
  - Agregar en `.thyrox/guidelines/agentic-python.instructions.md` sección "Sección 9: Anti-patrones sistémicos agentic":
    - AP-31 Tool Description Mismatch: el agente recibe una descripción falsa de sus propias herramientas. Las decisiones de uso de herramientas se basan en un modelo mental incorrecto. No corregible en runtime sin redeploy. Detección: verificar que la descripción de cada tool en el agent_spec coincide con el comportamiento real del tool_handler.
    - AP-32 Architectural Shell Without Behavioral Core: la arquitectura existe (clases, métodos, flujos) pero los conectores de estado están ausentes. El fallback nunca activa porque el mecanismo de detección de fallo no está conectado a la decisión de activar el fallback. Detección: trazar el path de código desde "condición de fallo detectada" hasta "fallback ejecutado" — si hay un salto sin código real, es AP-32.
  - Agregar ambos APs al catálogo de `.claude/agents/agentic-validator.md`
  - **Archivos a modificar:** `.thyrox/guidelines/agentic-python.instructions.md`, `.claude/agents/agentic-validator.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-002 (PASS — guideline debe existir), T-005 (agente debe existir), T-006 (directorio patterns/ para referencia)

- [x] T-030 Agregar AP-33 "LLM-as-guardrail Prompt Injection" y AP-34 "Regulated Domain Caveat" @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** cluster-c (H-C01 CRÍTICO — AP-33 LLM-as-guardrail; H-C02 ALTO — AP-34 caveat regulado), cluster-d (H2-B ALTO — confirma AP-33)
  - Agregar en `.thyrox/guidelines/agentic-python.instructions.md` continuando Sección 9:
    - AP-33 LLM-as-guardrail Prompt Injection: usar un LLM como único mecanismo de guardrail es vulnerable a prompt injection — el adversario puede instruir al LLM de guardrail a ignorar la violación. Correcto: guardrails deterministas (regex, schema validation, allowlist) para decisiones binarias críticas; LLM solo para clasificación semántica de alta tolerancia a error.
    - AP-34 Regulated Domain Caveat: el documento incluye un aviso de dominio regulado (médico, legal, financiero) en la intro, pero las secciones posteriores no operacionalizan ese caveat — las recomendaciones no llevan el mismo caveat. Correcto: cada sección que produce output de dominio regulado debe reiterar el caveat o citar explícitamente las condiciones de validez.
  - Agregar ambos APs al catálogo de `.claude/agents/agentic-validator.md`
  - **Archivos a modificar:** `.thyrox/guidelines/agentic-python.instructions.md`, `.claude/agents/agentic-validator.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-002 (PASS), T-005

- [x] T-031 Agregar AP-35 "Silent Loop Termination" y AP-36 "Borrowed Nomenclature" @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** cluster-e (E2-A CRÍTICO — AP-35 terminación silenciosa; E2-B ALTO — AP-36 nomenclatura prestada), cluster-c (H-C04 ALTO — confirma AP-35)
  - Agregar en `.thyrox/guidelines/agentic-python.instructions.md` continuando Sección 9:
    - AP-35 Silent Loop Termination: el loop de agente termina sin emitir output observable ni log de terminación. El agente que llamó al loop no puede distinguir "terminó correctamente" de "terminó silenciosamente por error". Correcto: todo loop de agente debe emitir al menos un evento de terminación con estado final (SUCCESS/FAIL/TIMEOUT) y razón.
    - AP-36 Borrowed Nomenclature: el sistema usa el nombre de un mecanismo reconocido (ej. "consensus", "voting", "HITL") pero implementa algo estructuralmente diferente. El nombre opera como prestamo de credibilidad del mecanismo original. Correcto: cuando se usa un nombre de patrón establecido, verificar que al menos la propiedad definitoria del patrón está implementada (ej. "consensus" requiere rondas de acuerdo — no solo promediado de scores).
  - Agregar ambos APs al catálogo de `.claude/agents/agentic-validator.md`
  - **Archivos a modificar:** `.thyrox/guidelines/agentic-python.instructions.md`, `.claude/agents/agentic-validator.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-002 (PASS), T-005

- [x] T-032 Agregar AP-37 "MCP JSON-RPC Payload Mismatch" y AP-38 "Hardcoded Identifier" @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** cluster-c (H-C05 ALTO — AP-37 JSON-RPC), cluster-d (H2-C ALTO — AP-38 hardcoded identifier), cluster-b (B-MCP-1 ALTO — confirma AP-37)
  - Agregar en `.thyrox/guidelines/agentic-python.instructions.md` continuando Sección 9:
    - AP-37 MCP JSON-RPC Payload Mismatch: el cliente MCP envía `method: "tool_name"` pero el protocolo espera `method: "tools/call"` con el nombre en el payload. Error silencioso — el servidor rechaza sin mensaje de error útil. Correcto: usar siempre el campo `method` del protocolo MCP actual; verificar con la versión específica del servidor MCP.
    - AP-38 Hardcoded Identifier: el agente tiene IDs hardcoded (model names, endpoint URLs, tool names) que cambian por release de plataforma. Cuando el ID cambia, el agente falla silenciosamente o produce comportamiento inesperado. Correcto: IDs de plataforma en configuración externa verificable (settings.json, .env); no en el cuerpo del agente.
  - Agregar ambos APs al catálogo de `.claude/agents/agentic-validator.md`
  - Agregar en `discover/patterns/` un documento: `mcp-jsonrpc-contract.md` con el patrón correcto de llamada MCP
  - **Archivos a modificar:** `.thyrox/guidelines/agentic-python.instructions.md`, `.claude/agents/agentic-validator.md`
  - **Archivo a crear:** `discover/patterns/mcp-jsonrpc-contract.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-002 (PASS), T-005, T-006

---

## Bloque 16 — Gate calibrado: contratos, state files y evaluador de consistencia (CRÍTICO)

> **Contexto:** Cluster B identifica que el gate paralelo de THYROX (múltiples evaluadores
> → Merger) tiene 4 brechas críticas: sin output_key contracts, sin state files definidos,
> sin evaluador de consistencia, y Merger como SPOF sin instrucción anti-confabulación.

- [x] T-033 Definir contratos de output_key para evaluadores y agregar instrucción anti-confabulación al Merger @task-executor (done: 2026-04-20 13:52:46)
  - **Fuentes:** cluster-b (B-MA-1 CRÍTICO — output_key undefined; B-MA-4 CRÍTICO — Merger SPOF)
  - En `.claude/skills/workflow-diagnose/references/` o documento de referencia del gate paralelo:
    - Definir output_key contracts: cada evaluador paralelo debe producir exactamente los campos `{evaluator_id, score, claims[], confidence, gaps[]}` — sin campos adicionales no contratados
    - El Merger debe verificar que recibió exactamente N outputs con los campos del contrato antes de consolidar
    - Instrucción anti-confabulación para el Merger: "No inferir un claim que ningún evaluador produjo. Si los evaluadores difieren en un claim, reportar la diferencia — no sintetizar una posición que ninguno sostuvo."
    - Protocolo de failure: si un evaluador no produce output en el tiempo límite → Merger procede con N-1 evaluadores y registra el timeout como gap en el reporte
  - **Archivo a crear/modificar:** referencia del gate paralelo en workflow-diagnose o workflow-strategy
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-017, T-020, T-021

- [x] T-034 Definir estructura de state files para ejecución paralela de agentes @task-executor (done: 2026-04-20 13:53:00)
  - **Fuentes:** cluster-b (B-MA-2 CRÍTICO — state files sin estructura definida), cluster-b (B-MA-3 ALTO — protocolo de failure no especificado)
  - En `.thyrox/context/` documentar estructura canónica:
    - `now-{agent-name}.md` ya existe como convención — agregar campos requeridos: `agent_id`, `status` (running/completed/failed), `output_key`, `started_at`, `timeout_at`
    - Protocolo de lectura por el Merger: leer todos los `now-{evaluator-N}.md`, verificar `status=completed` antes de consolidar
    - Protocolo de cleanup: borrar `now-{agent-name}.md` después de que el Merger confirma recepción del output
  - Actualizar `.claude/CLAUDE.md` sección "Multi-skill orchestration" → "Naming de state files" con la nueva estructura
  - **Archivos a modificar:** `.claude/CLAUDE.md`, documentación de THYROX multi-agent
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-033
  - **Nota:** T-034 también edita `validate-session-close.sh` para verificar cleanup — ejecutar después de T-022

- [x] T-035 Crear evaluador de consistencia inter-agente y unclear-handler @task-executor (done: 2026-04-20 13:54:00)
  - **Fuentes:** cluster-b (B-MA-3 CRÍTICO — evaluador de consistencia ausente; B-MA-4 ALTO — unclear routing sin handler)
  - Definir el rol del evaluador de consistencia en el gate paralelo:
    - Propósito: detectar contradicciones entre outputs de evaluadores paralelos — no sintetizar, sino identificar
    - Input: los N outputs de evaluadores paralelos
    - Output: `{contradictions: [{claim_a, evaluator_a, claim_b, evaluator_b}], consistency_score, recommendation}`
    - Umbral de consistencia: si consistency_score < 0.70 → el gate no avanza, se reporta la contradicción al humano
  - Definir unclear-handler: cuando un agente de routing recibe un input que no cae en ninguna categoría conocida → no rechazar silenciosamente, emitir evento `unclear_routing` con el input original para supervisión humana
  - **Archivos a crear/modificar:** referencia del gate paralelo, workflow-diagnose SKILL.md
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-033, T-034

- [x] T-036 Documentar loops de rework y context pruning en `exit-conditions.md.template` y `workflow-track` @task-executor (done: 2026-04-20 13:40:10)
  - **Fuentes:** cluster-b (B-MA-5 ALTO — loops de rework sin límite; B-MA-6 ALTO — context pruning ausente)
  - En `exit-conditions.md.template` (mismo archivo que T-021):
    - Agregar campo `max_rework_iterations: N` en cada gate — si el WP llega al gate N veces sin aprobación, escalar a decisión humana con resumen de los N intentos
    - Agregar campo `context_pruning_rule`: qué claims con Confianza=baja y Origen=heredado se descartan al avanzar gate
  - En `.claude/skills/workflow-track/SKILL.md`:
    - Agregar paso en sección de evaluación: identificar claims heredados de stages anteriores que nunca se re-verificaron — listarlos como "deuda epistémica" en el lessons-learned
  - **Archivos a modificar:** `exit-conditions.md.template`, `workflow-track/SKILL.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-021 (exit-conditions.md.template debe existir con la estructura base)

---

## Bloque 17 — Framework de calibración y separabilidad de exit criteria (ALTO)

> **Contexto:** Cluster E identifica que `calibration-framework.md` referenciado en el
> discover/ no existe, y que los exit criteria actuales mezclan condición de entrada con
> umbral de salida — no son separables.

- [x] T-037 Agregar separabilidad de exit criteria en `exit-conditions.md.template` @task-executor (done: 2026-04-20 13:40:10)
  - **Fuentes:** cluster-e (E1-B ALTO — separabilidad: condición entrada ≠ umbral salida)
  - En `exit-conditions.md.template` (mismo archivo que T-021 y T-036):
    - Para cada gate, distinguir explícitamente:
      - `entry_condition`: qué debe ser verdad para que el stage empiece (prerequisitos)
      - `exit_threshold`: qué debe ser verdad para que el stage termine (criterio medible)
      - Anti-patrón a eliminar: "¿El análisis está completo?" mezcla entrada y salida — reemplazar con condiciones separadas
    - Ejemplo del nuevo formato:
      ```
      Gate Stage 3→4:
        entry_condition: "discover/ con análisis aprobado existe en el WP"
        exit_threshold: "≥3 claims OBSERVABLE en evidencia de respaldo, causa raíz trazable"
      ```
  - **Archivo a modificar:** `exit-conditions.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** T-021 (estructura base del template)

- [x] T-038 Crear `.claude/references/calibration-framework.md` — mapeo Eval-type × Stage @task-executor (done: 2026-04-20 13:53:30)
  - **Fuentes:** cluster-e (E1-A CRÍTICO — calibration-framework.md referenciado pero no existe; E1-C ALTO — mapeo eval-type × stage incompleto)
  - Crear `.claude/references/calibration-framework.md`:
    - Tabla: Stage THYROX | Tipo de evaluación apropiada | Criterio de confianza mínimo | Método de verificación
    - Filas: Stage 1-12 con su tipo de eval (G-1 Peer review, G-2 Tool-executed, G-3 Human gate, G-4 Automated)
    - Columna G-2 (tool-executed): instrucción concreta de qué herramienta ejecutar y cómo citar su output
    - Nota sobre validate-session-close.sh: actualmente opera como G-4 (automated) pero tiene efectividad del 30% — convertir en PreToolUse hook elevaría a 100% (deuda técnica documentada)
    - Regla de uso: cuando un gate tiene confidence_threshold < 0.80, el Eval-type debe ser G-2 o G-3, no solo G-1 (peer review)
  - **Archivo a crear:** `.claude/references/calibration-framework.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-020, T-021

---

## Bloque 18 — Agente deep-dive: protocolos de admisiones y versiones (ALTO)

> **Contexto:** Cluster A identifica que el agente `deep-dive` carece de protocolos para
> evaluar admisiones (test de suficiencia), detectar realismo performativo, y comparar
> versiones de documentos analizados.

- [x] T-039 Agregar protocolo de evaluación de admisiones y realismo performativo en `deep-dive.md` @task-executor (done: 2026-04-20 13:25:41)
  - **Fuentes:** cluster-a (H-C2 ALTO — principios 5-6 evaluación de admisiones; H-C1 ALTO — 5 componentes del realismo performativo)
  - Agregar en `.claude/agents/deep-dive.md` sección después de Capa 5 (Engaños Estructurales):
    - Test de suficiencia de admisiones: (A) ¿la admisión modifica el argumento o lo deja operacionalmente intacto? Si X es admitido como incierto pero luego usado como cierto → admisión insuficiente. (B) ¿Los experimentos de falsificación propuestos son ejecutables con los recursos declarados? Un experimento que requiere exactamente lo que el documento dice no tener = falsificabilidad decorativa.
  - Agregar en Capa 5 el patrón "Realismo performativo" con 5 componentes operacionales:
    - Admisión general que no propaga a instancia concreta
    - Clasificación de rigor con errores en las clasificaciones mismas
    - Auto-evaluación que lista sesgos genéricos pero omite instancias técnicas concretas
    - Experimentos de falsificación inejecutables con recursos declarados
    - Nombre o etiqueta que opera como licencia de confianza previa (ej. "Honest Edition")
  - Agregar protocolo "Fix Declarado ≠ Fix Verificado": las declaraciones de "Bugs corregidos" son hipótesis a verificar, no hechos a aceptar. Taxonomía: fix-real (comportamiento cambió), fix-textual (solo descripción cambió), fix-performativo (anotación mejoró, runtime idéntico). El bug no declarado es el más riesgoso.
  - **Archivo a modificar:** `.claude/agents/deep-dive.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-040 Agregar protocolo de tracking de versiones y tabla de riesgo por característica agentic @task-executor (done: 2026-04-20 13:55:45)
  - **Fuentes:** cluster-a (H-C3 MEDIO — tracking de versiones; H-F2 MEDIO — tabla de riesgo por característica), cluster-d (L1-C — autonomía condicional vs. plena)
  - Agregar en `.claude/agents/deep-dive.md` sección "Comparativa de versiones (cuando aplica)":
    - Tabla: Dimensión | V(N-1) | V(N) | Estado (MEJORA/REGRESIÓN/SIN CAMBIO)
    - Dimensiones: saltos lógicos, contradicciones, problemas resueltos, problemas nuevos, ratio neto
    - Metadata adicional para artefactos de análisis (extensión opcional): `version_analizada`, `versiones_previas_analizadas`, `ratio_mejora_neta`
  - Agregar en `.claude/references/agentic-mandate.md` (T-018) sección "Tabla de riesgo por característica":
    - Por característica agentic: cómo contribuye al realismo performativo + criterio del mandato que lo mitiga
    - Distinción "autonomía condicional" vs. "autonomía plena": THYROX actual está en autonomía condicional (bound-detector.py puede rechazar outputs). Declarar autonomía condicional como "autónomo" sin la distinción reproduce CONTRADICCIÓN-2 del análisis del libro.
  - **Archivos a modificar:** `.claude/agents/deep-dive.md`, `.claude/references/agentic-mandate.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-018 (agentic-mandate.md debe existir)

---

## Bloque 19 — Diseño agentic: selección de patrones y heurísticos de arquitectura (ALTO)

> **Contexto:** Cluster D identifica que el sistema no tiene criterios para seleccionar patrones
> agentic dentro de un WP (Planning vs. Routing vs. Planning+RAG), ni documentación de que
> gate calibrado ≠ Consenso.

- [x] T-041 Crear `agentic-pattern-selection.md` — heurístico Planning/Routing/RAG y HITL/HOTL/HIC @task-executor (done: 2026-04-20 13:43:15)
  - **Fuentes:** cluster-d (P1-A ALTO y P1-B ALTO — Planning vs. RAG, heurístico de selección; H1-B ALTO — taxonomía HITL/HOTL/HIC), cluster-b (B-MA-3 MEDIO — gate != Consenso)
  - Crear `.claude/skills/workflow-discover/references/agentic-pattern-selection.md`:
    - Árbol de decisión de patrones agentic para Stage 1 DISCOVER:
      - "¿El workflow de resolución se conoce de antemano?" → CONOCIDO: Chaining/Routing/Parallelization | A DESCUBRIR: Planning
      - Sub-pregunta Planning: "¿necesita integrar fuentes internas + búsqueda externa?" → SÍ: Planning + RAG (dos capas distintas) | NO: Planning puro
      - Señal de advertencia: si se usa Planning pero el workflow resultante siempre tiene la misma estructura → probablemente es Chaining o Routing disfrazado de Planning
    - Taxonomía HITL/HOTL/HIC para Stage 5 STRATEGY:
      - HITL: workflow se bloquea hasta que el humano revisa — requiere interrupt/resume pattern real (no solo flag)
      - HOTL: workflow ejecuta; humano monitorea y puede intervenir — no requiere blocking
      - HIC: humano define reglas; agente las ejecuta autónomamente — sin supervisión en tiempo real
      - Señal de advertencia: si el diseño usa HITL conceptualmente pero no implementa interrupt/resume, el sistema es realmente HOTL
    - Distinción gate calibrado THYROX ≠ Consenso:
      - Gate THYROX implementa: Parallelization (evaluadores concurrentes) + Merger con grounding
      - Consenso requeriría: rondas de discusión entre evaluadores con protocolo de terminación — THYROX NO implementa esto
      - Regla de diseño: un agente es "distinto" de otro cuando tiene al menos un tool que el otro no tiene — distinción solo de system prompt NO es especialización real
  - **Archivo a crear:** `.claude/skills/workflow-discover/references/agentic-pattern-selection.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-016 (agentic-system-design.md debe existir como base)

---

## Bloque 20 — Calibración epistémica: patrones diagnósticos y análisis cuantitativo (MEDIO)

> **Contexto:** Clusters C y E confirman independientemente el patrón CAD (Calibración
> Asimétrica por Dominio). El scoring cuantitativo en artefactos THYROX carece de criterios
> de verificabilidad aritmética.

- [x] T-042 Documentar patrón CAD y criterio de scoring verificable @task-executor (done: 2026-04-20 13:43:15)
  - **Fuentes:** cluster-c (H-C06 ALTO — CAD confirmado por dos análisis independientes; H-C04 ALTO — scoring no reproducible), cluster-e (E3-D BAJO — CAD como patrón diagnóstico)
  - Crear `discover/patterns/calibracion-asincronica-por-dominio.md`:
    - Definición operacional: CAD = patrón donde distintos dominios internos de un artefacto tienen calibración significativamente diferente (ej. especificación técnica 0.91, casos de uso proyectados 0.43)
    - Señales de detección: cuando el score global oculta la distribución real de riesgo por dominio
    - Criterios de uso en Stage 3 DIAGNOSE: claims del dominio bien calibrado (>0.85) pueden usarse como fundamento; claims del dominio pobremente calibrado (<0.50) requieren validación adicional
    - Umbrales CAD: score global ≥0.75, mínimo por dominio ≥0.60, rango (Máx − Mín) ≤0.35
  - Agregar regla en `.thyrox/guidelines/agentic-python.instructions.md` nueva sección: cuando se produzcan scores cuantitativos propios, los cálculos deben ser verificables aritméticamente y el criterio de scoring no puede cambiar silenciosamente entre dominios del mismo análisis
  - **Archivos:** crear `discover/patterns/calibracion-asincronica-por-dominio.md`, modificar guideline
  - **Prioridad:** MEDIO
  - **Depende de:** T-006 (directorio patterns/), T-002 (PASS)

- [x] T-043 Agregar criterio de validación de referencias en `platform-evolution-tracking.md` @task-executor (done: 2026-04-20 13:25:41)
  - **Fuentes:** cluster-b (B-A2A-3 MEDIO — Named Mechanism vs. Implementation como criterio de validación de referencias bibliográficas)
  - Agregar en `.claude/references/platform-evolution-tracking.md` (T-019) sección "Validación de referencias del libro de patrones":
    - Criterio: verificar que el mecanismo del código implementa el mecanismo del título (no solo que el concepto del título es correcto)
    - Checklist: (1) ¿el código ejecutable hace lo que el título promete? (2) ¿imports completos? (3) ¿URLs raw content? (4) ¿métodos de protocolo de versión actual?
    - Lista de patrones sistémicos detectados: Named Mechanism vs. Implementation (Cap.10-15), Implementation Facade (Cap.8), Credibilidad Prestada (Cap.7)
    - Regla: cuando THYROX adopta un patrón de esta fuente, citar el hallazgo específico del deep-dive, no solo el capítulo
  - **Archivo a modificar:** `.claude/references/platform-evolution-tracking.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-019 (documento debe existir)

- [x] T-044 Agregar protocolo Fix Declarado ≠ Fix Verificado en agentes y workflow-standardize @task-executor (done: 2026-04-20 13:43:15)
  - **Fuentes:** cluster-a (H-G3 MEDIO — protocolo de revisión adversarial), cluster-e (E3-C MEDIO — fix textual vs. fix real), cluster-c (H-C16 ALTO — corrección performativa)
  - Actualizar `.thyrox/registry/agents/agentic-validator.yml` — agregar en `system_prompt`:
    - Cuando el código o documento incluye "Bugs corregidos" / "Fixed" / "Updated": verificar CADA fix declarado independientemente (¿corrige el problema en el código o solo en el texto?); buscar bugs NO declarados con la misma intensidad (los más riesgosos son los no nombrados)
    - Taxonomía: fix-real (comportamiento cambió), fix-textual (descripción cambió, código no), fix-performativo (anotación mejoró, runtime idéntico)
  - Actualizar `.claude/agents/agentic-validator.md` para reflejar este protocolo
  - Agregar en `.claude/skills/workflow-standardize/SKILL.md` distinción de tipos de fix: usar `fix-completo` / `fix-parcial(documentación)` / `fix-pendiente` al registrar correcciones
  - **Archivos a modificar:** `.thyrox/registry/agents/agentic-validator.yml`, `.claude/agents/agentic-validator.md`, `.claude/skills/workflow-standardize/SKILL.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-004, T-005, T-013

- [x] T-045 Agregar PROVEN/INFERRED/SPECULATIVE como vocabulario en `metadata-standards.md` @task-executor (done: 2026-04-20 13:25:41)
  - **Fuentes:** cluster-a (H-A1 ALTO — esquema PROVEN/INFERRED; T-027 propuesta de cambio de terminología)
  - Agregar en `.claude/rules/metadata-standards.md` nota bajo template "Documentos en stage directories":
    ```
    ### Claims y afirmaciones
    Todo claim en un artefacto debe poder clasificarse como:
    - PROVEN: hay observable verificado (herramienta ejecutada, output citado textualmente)
    - INFERRED: derivado de observables documentados mediante razonamiento
    - SPECULATIVE: sin observable de origen — no puede ser fundamento de decisiones de arquitectura
    Claims SPECULATIVE no pueden avanzar gate Stage→Stage.
    Ver evidence-classification.md para definición operacional.
    ```
  - **Archivo a modificar:** `.claude/rules/metadata-standards.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-025 (evidence-classification.md debe existir como referencia)

- [x] T-046 Documentar AP-39 "Advertencia Desconectada" en catálogo AP @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** cluster-c (H-C03 MEDIO — advertencia desconectada como patrón nombrado)
  - Agregar AP-39 en `.thyrox/guidelines/agentic-python.instructions.md`:
    - AP-39 "Advertencia Desconectada": un documento incluye un caveat honesto en una sección pero ese caveat nunca se conecta a las secciones que lo requieren. El efecto: el caveat existe para que el documento no parezca ingenuo, pero está contenido y nunca opera como condición en el material posterior.
    - Anti-patrón: "Sec.2 — Advertencia: los resultados dependen de X. Sec.5 — Casos de uso: [9 casos sin mencionar la condición de Sec.2]"
    - Correcto: cada sección posterior que depende del caveat debe citarlo o reiterarlo
    - Para artefactos THYROX: cuando se declara "status: Borrador" o se admite incertidumbre, verificar que esa admisión esté operacionalizada en la sección de evidencia, no solo en el frontmatter
  - Agregar AP-39 al catálogo de `.claude/agents/agentic-validator.md`
  - **Archivos a modificar:** `.thyrox/guidelines/agentic-python.instructions.md`, `.claude/agents/agentic-validator.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-002 (PASS), T-005

---

## Bloque 21 — Stop Hook: enforcement real (CRÍTICO)

> **Contexto:** Cluster F identifica que los dos scripts del Stop hook retornan
> `exit 0` incondicionalmente — el hook detecta problemas pero nunca bloquea nada.
> El nombre "validate" crea expectativa de enforcement que no existe.

- [x] T-047 Diseñar política de severidad en `validate-session-close.sh` @task-executor (done: 2026-04-20 13:53:15)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F01, H-F02)
  - **Hallazgo:** `validate-session-close.sh` L116 y `stop-hook-git-check.sh` L39 retornan `exit 0` incondicionalmente. El hook detecta hasta 4 categorías de problemas reales pero no actúa sobre ninguno.
  - Introducir dos clases de severidad: WARN (exit 0) para timestamps incompletos y agentes huérfanos con resultado recolectado; BLOCK (exit 2) para `current_work` apuntando a directorio inexistente e inconsistencia crítica de estado.
  - **Archivo a modificar:** `.claude/scripts/validate-session-close.sh`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-049 (normalizar formato `current_work` primero)

- [x] T-048 Crear hook PreToolUse Bash para validar Conventional Commits @task-executor (done: 2026-04-20 13:41:30)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F05, Gap-2)
  - **Hallazgo:** No existe hook PreToolUse para `Bash(git commit *)`. La invariante I-005 (Conventional Commits) es puramente declarativa — ningún script la verifica en el flujo automatizado.
  - Crear `.claude/scripts/validate-commit-message.sh` que extraiga el mensaje del commit del comando, valide contra regex `^(feat|fix|refactor|docs|chore|test|perf)(\(.+\))?: .{1,72}$`, y retorne deny si no cumple.
  - Agregar entrada PreToolUse en `.claude/settings.json` con matcher `Bash(git commit*)`.
  - **Archivos:** `.claude/scripts/validate-commit-message.sh` (crear), `.claude/settings.json` (modificar)
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

---

## Bloque 22 — Sincronización de estado: stage y current_work (CRÍTICO)

> **Contexto:** `sync-wp-state.sh` nunca actualiza `stage:` en `now.md` y el
> campo `current_work` tiene formato incompatible entre 3 scripts distintos.

- [x] T-049 Normalizar formato del valor `current_work` en `now.md` @task-executor (done: 2026-04-20 13:41:30)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F07)
  - **Hallazgo:** `sync-wp-state.sh:25` produce path relativo al repo root; `project-status.sh:44` espera path relativo a CONTEXT_DIR; `validate-session-close.sh:99` verifica con `[ -d "$CURRENT_WORK" ]`. Los tres scripts consumen `current_work` con convenciones distintas — inconsistencia estructural.
  - Decidir formato canónico (Opción A: path relativo al repo root `.thyrox/context/work/NOMBRE`). Actualizar los tres scripts para usar el mismo formato. Actualizar también `close-wp.sh`.
  - **Archivos:** `.claude/scripts/sync-wp-state.sh` (L25), `.claude/scripts/project-status.sh` (L44), `.claude/scripts/validate-session-close.sh` (L98-104), `.claude/scripts/close-wp.sh`
  - **Resultado:** sync-wp-state.sh ya correcto. project-status.sh L44 corregido: `${CONTEXT_DIR}/` → `${PROJECT_ROOT}/`. validate-session-close.sh L99 correcto (path relativo funciona desde repo root). close-wp.sh no requiere cambio (solo escribe null).
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [x] T-050 Agregar `stage_sync_required` en `sync-wp-state.sh` al cambiar WP @task-executor (done: 2026-04-20 13:53:15)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F03)
  - **Hallazgo:** `sync-wp-state.sh` actualiza `current_work` en `now.md` (L44-47) pero nunca actualiza `stage:` ni `phase:`. El estado de fase se desincroniza silenciosamente cuando el agente escribe en un WP sin actualizar el stage manualmente.
  - Cuando `sync-wp-state.sh` detecta cambio de `current_work`, agregar `stage_sync_required: true` en `now.md` para que `session-start.sh` lo detecte y alerte al agente.
  - **Archivo a modificar:** `.claude/scripts/sync-wp-state.sh`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-049

- [x] T-051 Agregar `lint-agents.py` al hook SessionStart @task-executor (done: 2026-04-20 13:41:30)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F13)
  - **Hallazgo:** `lint-agents.py` no está en ningún hook. Los invariantes I-007 (allowed-tools) e I-008 (description pattern) solo se verifican si el desarrollador lo corre manualmente. El script corre en <1s.
  - Agregar segunda entrada en el hook SessionStart en `.claude/settings.json` que ejecute `python3 .claude/scripts/lint-agents.py || true`.
  - **Archivo a modificar:** `.claude/settings.json`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

## Bloque 23 — bound-detector: cobertura inglés (ALTO)

- [x] T-052 Extender `bound-detector.py` con patrones en inglés @task-executor (done: 2026-04-20 13:41:30)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F04)
  - **Hallazgo:** `UNBOUNDED_SIGNALS` y `BOUND_SIGNALS` solo detectan patrones en español (L16-38). Instrucciones como "analyze every file", "process each item", "review all agents" pasan sin detección.
  - Agregar a `UNBOUNDED_SIGNALS`: `r"\bevery\b"`, `r"\beach\b"`, `r"\ball\b"`, `r"\bprocess all\b"`, `r"\bread all\b"`, `r"\banalyze all\b"`, `r"\bfor each\b"`, `r"\bfor every\b"`.
  - Agregar a `BOUND_SIGNALS`: `r"\bmaximum\b"`, `r"\bmax\b"`, `r"\bonly these\b"`, `r"\bno more than\b"`, `r"\bfirst \d+\b"`, `r"\btop \d+\b"`, `r"\bat most\b"`.
  - **Archivo a modificar:** `.claude/scripts/bound-detector.py`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

## Bloque 24 — Workflow skill anatomy: assets faltantes y rutas (ALTO)

- [x] T-053 Crear `workflow-structure/assets/document.md.template` @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-002)
  - **Hallazgo:** `workflow-structure/SKILL.md` L51 declara `assets/document.md.template` como instrucción directa. El archivo no existe — el agente no puede seguir la instrucción.
  - Crear template con metadata estándar WP + secciones genéricas (objetivo, contexto, decisión, impacto, referencias).
  - **Archivo a crear:** `.claude/skills/workflow-structure/assets/document.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-054 Crear `workflow-implement/assets/error-report.md.template` @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-005)
  - **Hallazgo:** `workflow-implement/SKILL.md` L82 instruye explícitamente crear `context/errors/ERR-NNN-descripcion.md` usando `assets/error-report.md.template`. El template no existe — sin él, los ERR-NNN no tienen estructura consistente.
  - Crear template con campos: descripción del error, contexto, tarea que falló, approach intentado, resultado, siguiente approach propuesto.
  - **Archivo a crear:** `.claude/skills/workflow-implement/assets/error-report.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-055 Resolver inconsistencia de ruta para `requirements-spec` en `workflow-structure` @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-003)
  - **Hallazgo:** Las instrucciones de creación (L40, L45) indican `work/../{nombre-wp}-requirements-spec.md` pero los exit criteria (L80, L84) verifican `work/.../design/*-requirements-spec.md`. Un agente que sigue las instrucciones falla el gate. Además, `workflow-decompose/SKILL.md` L24 consume el output de Phase 7 — la ruta ambigua rompe la cadena inter-stages.
  - Ubicación canónica: `design/` (consistente con el stage-directory estándar). Actualizar L40, L45, L80, L84 de `workflow-structure/SKILL.md`. Verificar y actualizar `workflow-decompose/SKILL.md` L24 si aplica.
  - **Archivos:** `.claude/skills/workflow-structure/SKILL.md` (L40, L45, L80, L84), `.claude/skills/workflow-decompose/SKILL.md` (L24 si aplica)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-056 Unificar `validate-session-close.sh` en `workflow-track` y `workflow-standardize` @task-executor (done: 2026-04-20 13:53:15)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-006)
  - **Hallazgo:** Phase 11 ejecuta `workflow-track/scripts/validate-session-close.sh` (versión antigua). Phase 12 ejecuta `.claude/scripts/validate-session-close.sh` (versión actual). Las validaciones son distintas e incompatibles — una puede pasar lo que la otra rechaza.
  - Eliminar `workflow-track/scripts/validate-session-close.sh` y actualizar `workflow-track/SKILL.md` L27 para invocar `.claude/scripts/validate-session-close.sh`.
  - **Archivos:** `.claude/skills/workflow-track/SKILL.md` (L27), `.claude/skills/workflow-track/scripts/validate-session-close.sh` (eliminar)
  - **Prioridad:** ALTO
  - **Depende de:** T-047 (modificar la versión global antes de unificar)

- [x] T-057 Agregar `Write Edit` a `allowed-tools` de workflow-structure, workflow-decompose, workflow-track @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-008)
  - **Hallazgo:** Los tres skills instruyen creación de archivos pero no declaran `Write` ni `Edit` en `allowed-tools`. workflow-pilot, workflow-implement y workflow-standardize sí los declaran.
  - Agregar `Write Edit` al campo `allowed-tools` en el frontmatter de los tres SKILL.md.
  - **Archivos:** `.claude/skills/workflow-structure/SKILL.md` (L4), `.claude/skills/workflow-decompose/SKILL.md` (L4), `.claude/skills/workflow-track/SKILL.md` (L4)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-058 Corregir label "Phase 2 SOLUTION_STRATEGY" en `workflow-strategy` @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-001)
  - **Hallazgo:** `workflow-strategy/SKILL.md` L32 tiene encabezado `## Fase a ejecutar: Phase 2 SOLUTION_STRATEGY`. El frontmatter y todas las demás referencias dicen correctamente "Phase 5".
  - Corregir L32 a `## Fase a ejecutar: Phase 5 STRATEGY`.
  - **Archivo a modificar:** `.claude/skills/workflow-strategy/SKILL.md` (L32)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-059 Crear `workflow-decompose/assets/categorization-plan.md.template` @task-executor (done: 2026-04-20 13:31:20)
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-004)
  - **Hallazgo:** `workflow-decompose/SKILL.md` L55 declara `assets/categorization-plan.md.template` para issues >50. El template no existe.
  - Crear template con estructura de categorización por tipo (feat/fix/refactor/docs/chore), prioridad (CRÍTICO/ALTO/MEDIO/BAJO) y dominio temático.
  - **Archivo a crear:** `.claude/skills/workflow-decompose/assets/categorization-plan.md.template`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

## Bloque 25 — Agent quality: ARCHITECTURE.md y desambiguación (CRÍTICO/ALTO)

- [x] T-060 Crear `.claude/ARCHITECTURE.md` con inventario canónico de agentes @task-executor (done: 2026-04-20 13:49:23)
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-01), cluster-i-registry-adr-gaps.md (H-01)
  - **Hallazgo:** `.claude/ARCHITECTURE.md` no existe. El sistema tiene 27 agentes instalados sin inventario canónico. No es posible detectar agentes zombies ni agentes fantasmas. 18/27 agentes no tienen YML en registry.
  - Crear `.claude/ARCHITECTURE.md` con tabla: nombre, función, tipo (coordinator/expert/analysis/infra), YML en registry (sí/no), origen (bootstrap/manual), solapamientos conocidos.
  - **Archivo a crear:** `.claude/ARCHITECTURE.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-061 ~~Desambiguar descripciones de `deep-dive` y `agentic-reasoning`~~ — **CANCELADO / RESUELTO**
  - **Resolución (2026-04-20):** `agentic-reasoning` fue deprecado completamente. Su protocolo de calibración (ratio OBSERVABLE+INFERRED, detección de realismo performativo) fue absorbido en `deep-dive` como Capa 7. La ambigüedad de trigger desapareció — solo existe `deep-dive`, que aplica calibración automáticamente cuando el artefacto es un documento WP de THYROX.
  - **Archivos modificados:** `.claude/agents/deep-dive.md` (nueva Capa 7), `.claude/agents/agentic-reasoning.md` (marcado DEPRECATED)

- [x] T-062 Corregir descripciones de `mysql-expert` y `postgresql-expert` @task-executor (done: 2026-04-20 13:29:09)
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-02)
  - **Hallazgo:** `mysql-expert` y `postgresql-expert` describen capacidades sin condición de invocación. Sin patrón "Use when...", tasa de auto-invocación cae al 56%.
  - Añadir como primer elemento: "Use when the user needs MySQL/PostgreSQL-specific help: schema design, query optimization, migrations, or debugging." Actualizar también los YML fuente en registry.
  - **Archivos:** `.claude/agents/mysql-expert.md`, `.claude/agents/postgresql-expert.md`, `.thyrox/registry/agents/mysql-expert.yml`, `.thyrox/registry/agents/postgresql-expert.yml`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-063 Desambiguar `task-planner` vs `task-synthesizer` @task-executor (done: 2026-04-20 13:29:09)
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-05)
  - **Hallazgo:** "Crear un task-plan a partir de estos análisis" encaja en ambas descripciones — el runtime puede invocar el incorrecto.
  - Añadir a `task-planner`: "Use when starting fresh planning — no prior analysis outputs exist. If consolidating outputs from deep-dive or pattern-harvester agents, use task-synthesizer instead." Añadir a `task-synthesizer`: "Use only when consolidating existing agent analysis outputs (not for fresh planning — use task-planner for that)."
  - **Archivos:** `.claude/agents/task-planner.md`, `.claude/agents/task-synthesizer.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-064 Desambiguar `deep-review` vs `pattern-harvester` @task-executor (done: 2026-04-20 13:29:09)
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-06)
  - **Hallazgo:** Ambos leen múltiples archivos de un WP. "Analiza este corpus de analysis/" encaja en ambos — el usuario puede recibir análisis de cobertura cuando necesita síntesis de patrones.
  - Clarificar en `deep-review`: "Use when checking coverage gaps between consecutive THYROX phases. For extracting actionable patterns from deep-dive or calibration files, use pattern-harvester." Clarificar en `pattern-harvester`: "Use only when processing already-analyzed files. For phase-to-phase coverage analysis, use deep-review."
  - **Archivos:** `.claude/agents/deep-review.md`, `.claude/agents/pattern-harvester.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-065 Estandarizar descripciones multilinea de 12 coordinadores a una sola línea @task-executor (done: 2026-04-20 13:29:09)
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-03)
  - **Hallazgo:** Los 12 coordinadores de metodología usan descripción multilinea con "Usar cuando...". El runtime puede truncar descripciones multilinea — la condición de invocación quedaría fuera del campo analizado.
  - Convertir el bloque multilinea a una sola línea comenzando con "Use when [usuario quiere X metodología]. Coordinator para [nombre metodología]." Alcance: ba-, bpa-, cp-, dmaic-, lean-, pdca-, pm-, pps-, rm-, rup-, sp-, thyrox-coordinator.
  - **Archivos (12):** `.claude/agents/ba-coordinator.md`, `.claude/agents/bpa-coordinator.md`, `.claude/agents/cp-coordinator.md`, `.claude/agents/dmaic-coordinator.md`, `.claude/agents/lean-coordinator.md`, `.claude/agents/pdca-coordinator.md`, `.claude/agents/pm-coordinator.md`, `.claude/agents/pps-coordinator.md`, `.claude/agents/rm-coordinator.md`, `.claude/agents/rup-coordinator.md`, `.claude/agents/sp-coordinator.md`, `.claude/agents/thyrox-coordinator.md`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

## Bloque 26 — Registry pipeline: integridad y ADRs (CRÍTICO/ALTO)

- [x] T-066 Agregar verificación de dependencias MCP en `bootstrap.py` @task-executor (done: 2026-04-20 13:42:28)
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-03)
  - **Hallazgo:** `faiss-cpu` y `sentence-transformers` no están instalados. `thyrox-memory` MCP server falla al iniciar con `ModuleNotFoundError`. `bootstrap.py` no verifica ni advierte — el MCP server queda inoperativo en entorno limpio sin error claro.
  - Agregar función `check_python_deps()` en `bootstrap.py` que verifique con `importlib.util.find_spec()` si `faiss` y `sentence_transformers` están disponibles. Si no: imprimir warning y omitir registro del server en `.mcp.json`.
  - **Archivo a modificar:** `.thyrox/registry/bootstrap.py`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [x] T-067 Crear ADR para política de coordinators como artefactos estáticos @task-executor (done: 2026-04-20 13:49:23)
  - **Fuentes:** cluster-i-registry-adr-gaps.md (GAP-1, H-09)
  - **Hallazgo:** La decisión de que los coordinators NO se generan desde bootstrap.py está documentada solo en un comentario de código (`bootstrap.py` L46-67). Sin ADR, un mantenedor puede intentar generarlos rompiendo el sistema, o no saber cómo crear un coordinator nuevo.
  - Crear `.thyrox/context/decisions/adr-coordinators-static-artifacts.md` documentando: (a) por qué coordinators no se generan desde bootstrap.py, (b) cómo crear un nuevo coordinator usando dmaic-coordinator.md como template, (c) convención de naming y casos que la violan (pm→pmbok, ba→babok).
  - **Archivo a crear:** `.thyrox/context/decisions/adr-coordinators-static-artifacts.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [x] T-068 Corregir exit code de `bootstrap.py` en instalaciones con fallos @task-executor (done: 2026-04-20 13:42:28)
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-02, RP-3, RP-4)
  - **Hallazgo:** `main()` retorna exit code 0 incluso cuando hay `[FAIL]`. "Bootstrap completado" usa el conteo de todos los `.md` existentes, no solo los generados en esta ejecución — si 0 agentes fueron instalados exitosamente, el resumen es idéntico a una instalación completa.
  - Trackear fallos en `install_core_agents()` (L241-263) e `install_tech_agent()` (L266-312). Retornar exit code 1 si algún agente requerido falló. Ajustar conteo final para mostrar agentes generados en esta ejecución vs. total en disco.
  - **Archivo a modificar:** `.thyrox/registry/bootstrap.py` (L241-263, L396-413, L425-429)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-069 Crear ADR para `python-mcp` como skill manual fuera del pipeline @task-executor (done: 2026-04-20 13:49:23)
  - **Fuentes:** cluster-i-registry-adr-gaps.md (GAP-2, H-04)
  - **Hallazgo:** `python-mcp.instructions.md` está listada en `CLAUDE.md` como "generada por `registry/_generator.sh`" pero fue creada manualmente y no tiene template. La narrativa de "generado por registry" es performativa para este caso.
  - Crear `.thyrox/context/decisions/adr-python-mcp-manual-skill.md`. Agregar nota aclaratoria en `CLAUDE.md` que distinga guidelines generadas (5) vs. manuales (python-mcp).
  - **Archivos:** `.thyrox/context/decisions/adr-python-mcp-manual-skill.md` (crear), `.claude/CLAUDE.md` (nota en sección @imports)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-070 Agregar verificación de output no-vacío en `_generator.sh` @task-executor (done: 2026-04-20 13:42:28)
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-08)
  - **Hallazgo:** Si el contenido entre marcadores `SKILL_START/SKILL_END` está vacío, `awk` produce archivo vacío sin error y `_generator.sh` reporta `[GREEN] Generated`.
  - Agregar verificación post-awk: `[ -s "$SKILL_FILE" ] || { echo "ERROR: $SKILL_FILE generado vacío" >&2; exit 1; }`.
  - **Archivo a modificar:** `.thyrox/registry/_generator.sh` (L138, inserción)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

## Bloque 27 — Correcciones de scripts: fallos silenciosos y consistencia (MEDIO)

- [x] T-071 Agregar `exit 0` explícito al final de `sync-wp-state.sh` @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F11)
  - **Hallazgo:** `sync-wp-state.sh` no tiene `exit 0` explícito (L57 es el último comando — append a `phase-history.jsonl`). Si el append falla, el PostToolUse hook retorna exit 1. Comportamiento de Claude Code ante PostToolUse con exit 1 no está documentado.
  - Agregar `exit 0` explícito como última línea del script.
  - **Archivo a modificar:** `.claude/scripts/sync-wp-state.sh`
  - **Prioridad:** MEDIO
  - **Depende de:** T-049 (el script se modifica en T-049 — consolidar edición)

- [x] T-072 Corregir branch hardcodeado en `update-state.sh` @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F09)
  - **Hallazgo:** `update-state.sh` L81 tiene hardcodeado el branch `claude/check-merge-status-Dcyvj`. El script declara "regenera project-state.md desde el estado real del repo" pero el branch es incorrecto en cualquier otra sesión.
  - Reemplazar el valor hardcodeado con `$(git branch --show-current 2>/dev/null || echo "unknown")`.
  - **Archivo a modificar:** `.claude/scripts/update-state.sh` (L81)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-073 Corregir inconsistencia de `maxdepth` en `session-resume.sh` @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F06)
  - **Hallazgo:** `session-start.sh:61` usa `find "$WP_DIR" -maxdepth 2 -name "*-task-plan.md"` (encuentra task-plan en `plan-execution/`). `session-resume.sh:65` usa `maxdepth 1` — no encuentra el task-plan en subdirectorio. La "próxima tarea" difiere entre inicio de sesión y post-compactación.
  - Cambiar `maxdepth 1` a `maxdepth 2` en `session-resume.sh:65`.
  - **Archivo a modificar:** `.claude/scripts/session-resume.sh` (L65)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

## Bloque 28 — Gaps discover/ no cubiertos por T-001..T-073 (CRÍTICO-MEDIO)

> Hallazgos del deep-dive de cobertura discover/ → task-plan. Cobertura estimada previa: 72%.
> Fuente: `analyze/discover-to-taskplan-coverage-gap.md` (2026-04-20)

- [x] T-074 Extender restricción de fórmulas exponenciales en `CLAUDE.md` para cubrir variante multiparámetro Part B @task-executor (done: 2026-04-20 13:22:17)
  - **Fuentes:** `discover/reasoning-correctness-probability-calibration-gaps.md` (GAP-1 CRÍTICO)
  - **Hallazgo:** `CLAUDE.md` prohíbe solo `P₀ × e^(-r×d)` (variante simple). La variante `P(correct) = P₀ × e^(-Σλᵢxᵢ)` con 5 parámetros tiene ratio de calibración del 8% y calibración circular (misma observación para ajuste y validación). Sin esta extensión, la variante agravada puede usarse en WPs futuros sin rechazo del sistema.
  - Agregar sección en `CLAUDE.md` "Fórmulas probabilísticas prohibidas" cubriendo ambas variantes con criterio de rechazo explícito.
  - **Archivo a modificar:** `.claude/CLAUDE.md`
  - **Prioridad:** CRÍTICA
  - **Depende de:** independiente

- [x] T-075 Convertir `agentic-calibration-workflow-example.md` en referencia oficial consultable @task-executor (done: 2026-04-20 13:40:40)
  - **Fuentes:** `discover/agentic-calibration-workflow-example.md` (GAP-3 ALTO)
  - **Hallazgo:** Único artefacto empírico del WP con métricas reales (65%→79%→65.4%) y 6 patrones operacionales con sección "Implicación para el sistema". No está vinculado a ningún SKILL ni referencia consultable — sus hallazgos no se propagan al sistema.
  - Mover/copiar a `.claude/references/agentic-calibration-workflow-example.md` y agregar referencia en `deep-dive.md` como lectura recomendada para análisis de flujos multi-agente.
  - **Archivo a modificar:** `.claude/references/` (crear) + `.claude/agents/deep-dive.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [x] T-076 Agregar sección de mapa epistémico al template de síntesis de Stage 1 DISCOVER @task-executor (done: 2026-04-20 13:40:40)
  - **Fuentes:** `discover/methodology-calibration-analysis.md` Sec 8 criterio 4 (GAP-2 ALTO)
  - **Hallazgo:** Criterio de éxito del WP pide que Stage 1 DISCOVER declare explícitamente observación vs. inferencia en su output. El vocabulario existe (T-025) pero ninguna T-NNN modifica el template de síntesis del stage — el criterio de éxito del WP mismo no está cubierto.
  - Agregar sección `## Mapa epistémico` al template `workflow-discover/assets/introduction.md.template` con campos: `observaciones_directas`, `inferencias_calibradas`, `especulaciones_marcadas`.
  - **Archivo a modificar:** `.claude/skills/workflow-discover/assets/introduction.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** T-025 (vocabulario epistémico definido)

- [x] T-077 Documentar exclusión del Evaluador-Basin del gate calibrado como ADR @task-executor (done: 2026-04-20 14:01:00)
  - **Fuentes:** `discover/clustering-basin-integration-analysis.md` (GAP-4 MEDIO)
  - **Hallazgo:** El archivo propone un 4to evaluador para los gates con pseudocódigo completo y 5 experimentos PILOT. El gate de T-033..T-036 tiene 3 evaluadores. La exclusión no está documentada — no hay ADR que registre la decisión de diferirlo ni por qué.
  - Crear `.thyrox/context/decisions/adr-gate-basin-evaluator-deferral.md` documentando la decisión de usar 3 evaluadores y diferir el Basin al próximo WP con criterio explícito de cuándo incorporarlo.
  - **Archivo a crear:** `.thyrox/context/decisions/adr-gate-basin-evaluator-deferral.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-033, T-034, T-035 (gate calibrado completado)

- [x] T-078 Agregar Cherry-Pick Consciente y Efecto Denominador a `agentic-python.instructions.md` @task-executor (done: 2026-04-20 13:27:44)
  - **Fuentes:** `discover/` análisis de patrones (GAP parcial en T-042, T-044)
  - **Hallazgo:** T-042 cubre Fix Declarado ≠ Fix Verificado y T-044 cubre patrones CAD. Cherry-Pick Consciente (seleccionar solo casos que confirman hipótesis) y Efecto Denominador (reportar fracción sin declarar denominador) están documentados en discover/ pero sin regla prohibitoria explícita en las guidelines.
  - Agregar secciones en `.thyrox/guidelines/agentic-python.instructions.md` con ejemplos concretos de ambos patrones y criterio de detección.
  - **Archivo a modificar:** `.thyrox/guidelines/agentic-python.instructions.md` (si existe) o `.claude/CLAUDE.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-005 (guidelines consolidadas)

---

## Bloque 29 — Cherry-Pick en plan-execution.md.template (ALTO)

- [x] T-079 Incorporar algoritmo Cherry-Pick Consciente en `plan-execution.md.template` @task-executor (done: 2026-04-20 13:53:34)
  - **Fuentes:** cluster-a (H-G1 ALTO)
  - **Hallazgo:** Algoritmo con umbrales (≥0.80 preservar; 0.60–0.80 evaluar; <0.60 reescribir) y break-even ratio existen en `discover/agentic-claims-management-patterns.md` pero ningún template los referencia. T-078 solo cubre la guideline de código, no el template de task-plans.
  - Agregar sección "Protocolo de iteración calibrada" en `.claude/skills/workflow-decompose/assets/plan-execution.md.template`
  - **Archivo a modificar:** `.claude/skills/workflow-decompose/assets/plan-execution.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** T-025 (vocabulario base), T-026 (tabla evidencia con columna Origen)

---

## Bloque 30 — I-014 framework mismatch en insumos externos (ALTO)

- [x] T-080 Agregar I-014 "Framework mismatch en insumos externos" en `thyrox-invariants.md` @task-executor (done: 2026-04-20 13:40:10)
  - **Fuentes:** harvest-cluster-e (H-E1 ALTO)
  - **Hallazgo:** I-001 prohíbe saltar stages por decisión interna; no cubre el vector donde un insumo externo analizado contiene "FASE N" de otro framework, induciendo salto sin violar I-001 explícitamente.
  - Agregar I-014: "Cuando un documento analizado contiene fases numeradas (FASE N, Phase N), NO interpretar como stages del WP activo. Registrar como hallazgo de Stage 1 DISCOVER."
  - **Archivo a modificar:** `.claude/rules/thyrox-invariants.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

## Bloque 31 — Referencias de calibración en skills de stages de riesgo (ALTO)

- [x] T-081 Referenciar `agentic-calibration-workflow-example.md` desde skills de stages de mayor riesgo @task-executor (done: 2026-04-20 13:54:12)
  - **Fuentes:** harvest-cluster-e (E3-A/B/C ALTO)
  - **Hallazgo:** T-075 crea el vínculo en `deep-dive.md`, pero los 6 patrones operacionales son relevantes para agentes que generan artefactos iterativos. Sin referencia en SKILL.md de stages de producción, el documento queda solo como referencia de análisis.
  - Agregar nota en sección "Artefactos de salida" de workflow-diagnose, workflow-strategy, workflow-decompose SKILL.md.
  - **Archivos a modificar:** `.claude/skills/workflow-diagnose/SKILL.md`, `.claude/skills/workflow-strategy/SKILL.md`, `.claude/skills/workflow-decompose/SKILL.md`
  - **Prioridad:** ALTO
  - **Depende de:** T-075 (documento debe existir en `.claude/references/`)

---

## Bloque 32 — Hooks: gaps residuales (ALTO/MEDIO)

- [x] T-082 Corregir `session-start.sh`: `COMMANDS_SYNCED` hardcodeado a `true` @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-f (H-F06)
  - **Hallazgo:** `session-start.sh` L10 `COMMANDS_SYNCED=true` hardcodeado — rama `else` es código muerto.
  - Colapsar a mensaje estático o implementar detección real basada en git log de `.claude/commands/`.
  - **Archivo a modificar:** `.claude/scripts/session-start.sh`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-083 `session-resume.sh` maxdepth — **RESUELTO con T-073** (mismo cambio, misma línea) @task-executor (done: 2026-04-20 13:35:06)
  - **Prioridad:** MEDIO — **marcar como [x] al completar T-073**

- [x] T-084 Corregir bug de lógica en `bootstrap.py` (action siempre "sobreescrito") @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-i (H-05)
  - **Hallazgo:** `bootstrap.py` calcula `action` después de escribir el archivo — siempre vale "sobreescrito".
  - Calcular `action` ANTES de `dest.write_text(content)`.
  - **Archivo a modificar:** `.thyrox/registry/bootstrap.py` (L309-310)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-085 Agregar `lint-agents.py` al hook SessionStart — verificar solapamiento con T-051 @task-executor (done: 2026-04-20 13:41:30)
  - **Fuentes:** cluster-f (H-F13 ALTO)
  - **Nota:** T-051 cubre exactamente esta tarea — solapamiento 100%. Marcado como completado por T-051.
  - **Prioridad:** ALTO
  - **Depende de:** T-051 (verificar solapamiento)

---

## Bloque 33 — Registry: gaps residuales (MEDIO)

- [x] T-086 Corregir docstring incorrecto en `bootstrap.py` @task-executor (done: 2026-04-20 13:35:06)
  - **Fuentes:** cluster-i (H-06)
  - **Hallazgo:** Docstring L9-11 dice `.claude/registry/bootstrap.py` — path incorrecto; real es `.thyrox/registry/bootstrap.py`.
  - **Archivo a modificar:** `.thyrox/registry/bootstrap.py` (L9-11)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [x] T-087 Documentar 6 techs sin template como deuda técnica @task-executor (done: 2026-04-20 13:49:23)
  - **Fuentes:** cluster-i (H-07)
  - **Hallazgo:** bootstrap.py declara techs en TECH_CATEGORIES sin template — usa body genérico sin advertencia.
  - Crear entrada TD-NNN en `.thyrox/context/technical-debt.md`.
  - **Archivo a modificar:** `.thyrox/context/technical-debt.md`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

## Bloque 34 — Agent quality: gaps residuales (MEDIO)

- [x] T-088 YMLs de agentes de análisis sin registry — verificar solapamiento con T-023 @task-executor (done: 2026-04-20 13:54:12)
  - **Fuentes:** cluster-h (18/27 agentes sin YML)
  - **Nota:** CANCELADO — T-023 ya creó YMLs para estos agentes. Los 5 YMLs existen en `.thyrox/registry/agents/`: deep-dive.yml, deep-review.yml, diagrama-ishikawa.yml, pattern-harvester.yml, task-synthesizer.yml.
  - **Prioridad:** MEDIO
  - **Depende de:** T-023 (verificar solapamiento)

- [x] T-089 Agregar `tech-detector` y `skill-generator` al inventario de ARCHITECTURE.md @task-executor (done: 2026-04-20 13:54:12)
  - **Fuentes:** cluster-h (H-04)
  - **Hallazgo:** CANCELADO — ARCHITECTURE.md ya contiene tech-detector y skill-generator como tipo `infra`, con YML y origen `bootstrap` documentados. T-060 los incluyó correctamente.
  - **Archivo a modificar:** `.claude/ARCHITECTURE.md` (verificado — ya existe)
  - **Prioridad:** MEDIO
  - **Depende de:** T-060

---

## Bloque 35 — Evaluador-Basin: criterio de activación (MEDIO)

- [x] T-090 Agregar criterio de activación del Evaluador-Basin en ADR de deferral @task-executor (done: 2026-04-20 14:01:00) — criterio de activación incluido en T-077 (mismo archivo)
  - **Fuentes:** harvest-cluster-e (H-E8 ALTO)
  - **Hallazgo:** T-077 crea el ADR pero sin criterio de activación → deferral indefinido.
  - Agregar sección "Criterio de activación": embeddings operativos + ≥40 WPs completados + gate de 3 evaluadores estable por ≥3 ÉPICAs.
  - **Archivo a modificar:** `.thyrox/context/decisions/adr-gate-basin-evaluator-deferral.md`
  - **Prioridad:** MEDIO
  - **Depende de:** T-077

---

## Bloque 36 — PreToolUse hook I-001: efectividad 100% vs 30% (ALTO)

- [x] T-091 Agregar PreToolUse hook para verificar I-001 antes de crear task-plan @task-executor (done: 2026-04-20 13:56:26)
  - **Fuentes:** harvest-cluster-e (H-E10 ALTO)
  - **Hallazgo:** T-022 implementa I-001 como Stop hook (~30% efectividad). PreToolUse en Write tendría 100%.
  - Crear `.claude/scripts/check-i001-prewrite.sh` + entrada PreToolUse en `.claude/settings.json`.
  - **Archivos:** `.claude/scripts/check-i001-prewrite.sh` (crear), `.claude/settings.json` (modificar)
  - **Prioridad:** ALTO
  - **Depende de:** T-047 (política de severidad), T-049 (formato paths)

---

## DAG de dependencias completo

```
── BLOQUE 0-13 (T-001..T-024) ──────────────────────────────────────────────────
T-001 (verificar @imports)
  ├── PASS → T-002 (agentic-python.instructions.md)
  │             └── T-003 (CLAUDE.md @import)
  └── FAIL → T-001b (migrar guidelines a .claude/rules/)
               └── T-003b (actualizar CLAUDE.md eliminar @imports)

T-004 (agentic-validator.yml)
  └── T-005 (agentic-validator.md directo)

T-006 (6 patrones) — independiente
  └── T-015 depende de T-006 (árbol usa patrones como referencia)
  └── T-029 depende de T-006 (Sección 9 de la guideline)
  └── T-032 depende de T-006 (mcp-jsonrpc-contract.md en patterns/)
  └── T-042 depende de T-006 (patrón CAD en patterns/)

T-007 (TD-042 validate-session-close.sh) — independiente
T-022 (Check I-001 en validate-session-close.sh) — independiente
  └── T-007 y T-022 editan el mismo script — T-022 ejecutar después de T-007
  └── T-034 también edita validate-session-close.sh — ejecutar T-034 después de T-022

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
  └── T-017 (exit criteria agentic en Stage 3 + Stage 5 templates) — depende de T-016
        └── T-020 (sección Evidencia en templates) — depende de T-017
              └── editan mismos templates: T-020 ejecutar después de T-017
  └── T-041 (agentic-pattern-selection.md) — depende de T-016
T-018 (agentic-mandate.md — definición operacional) — depende de T-016
  └── T-040 (tabla riesgo + autonomía condicional) — depende de T-018
T-019 (platform-evolution-tracking.md) — independiente
  └── T-043 (criterio validación referencias) — depende de T-019
T-020 (sección Evidencia en 3 templates) — depende de T-017
  └── T-026 (columna Origen + criterios Confianza) — depende de T-020 + T-025
  └── T-038 (calibration-framework.md) — depende de T-020 + T-021
T-021 (exit-conditions.md.template con umbral confianza) — independiente
  └── T-036 (loops rework + context pruning) — depende de T-021
  └── T-037 (separabilidad exit criteria) — depende de T-021
  └── T-038 (calibration-framework.md) — depende de T-020 + T-021
T-022 (I-001 warning en validate-session-close.sh) — después de T-007
T-023 (YMLs 16 agentes sin registry) — depende de T-008
T-024 (bound-detector.py cobertura inglés) — independiente

── BLOQUE 14 (Vocabulario epistémico) ──────────────────────────────────────────
T-025 (evidence-classification.md) — INDEPENDIENTE — prerequisito de T-020 y T-026
  └── T-020 (sección Evidencia) — ejecutar T-025 antes o en mismo batch que T-020 ⚠
  └── T-026 (columna Origen + criterios Confianza) — depende de T-020, T-025
  └── T-027 (I-012 + I-013 en thyrox-invariants.md) — depende de T-025
  └── T-028 (prohibited-claims-registry.md) — depende de T-025
  └── T-045 (PROVEN/INFERRED en metadata-standards.md) — depende de T-025

── BLOQUE 15 (Anti-patrones AP-31..AP-39) ──────────────────────────────────────
T-029 (AP-31 Tool Description Mismatch + AP-32 Architectural Shell) — depende de T-002 PASS, T-005, T-006
T-030 (AP-33 Dominios Regulados + AP-34 LLM-as-guardrail injection) — depende de T-002 PASS, T-005
T-031 (AP-35 Terminación Silenciosa + AP-36 Nomenclatura Prestada) — depende de T-002 PASS, T-005
  └── T-029, T-030, T-031 pueden ejecutarse en paralelo (secciones distintas del mismo archivo)
T-032 (AP-37 MCP JSON-RPC + AP-38 Hardcoded Identifier) — depende de T-002 PASS, T-005, T-006
T-046 (AP-39 Advertencia Desconectada) — depende de T-002 PASS, T-005

── BLOQUE 16 (Gate calibrado) ───────────────────────────────────────────────────
T-017 (exit criteria agentic) ──┐
T-020 (Evidencia de respaldo) ──┼──► T-033 (contratos evaluadores + Merger anti-confabulación)
T-021 (exit-conditions.md) ─────┘        └──► T-034 (state files + protocolo failure)
                                                    └──► T-035 (evaluador consistencia + unclear-handler)
                                                    └──► T-036 (loops rework + context pruning)

── BLOQUE 17 (Calibración y framework de evaluación) ───────────────────────────
T-021 (exit-conditions.md.template) ──► T-037 (separabilidad de exit criteria — mismo archivo)
T-020 + T-021 ──► T-038 (calibration-framework.md — mapeo Eval-type × Stage)

── BLOQUE 18 (Agente deep-dive) ─────────────────────────────────────────────────
T-039 (protocolo admisiones + realismo performativo en deep-dive.md) — independiente
T-018 (agentic-mandate.md) ──► T-040 (tabla de riesgo + autonomía condicional)
  └── T-040 también modifica deep-dive.md — independiente de T-039 (secciones distintas)

── BLOQUE 19 (Diseño agentic) ───────────────────────────────────────────────────
T-016 (agentic-system-design.md) ──► T-041 (agentic-pattern-selection.md)

── BLOQUE 20 (Calibración epistémica y patrones diagnósticos) ───────────────────
T-006 (directorio patterns/) ──► T-042 (CAD + scoring verificable)
T-002 PASS ──► T-042 (modifica guideline)
T-019 (platform-evolution-tracking.md) ──► T-043 (criterio validación referencias)
T-004 + T-005 + T-013 ──► T-044 (Fix Declarado ≠ Fix Verificado)

── CORRECCIÓN DAG CRÍTICA ────────────────────────────────────────────────────────
⚠ T-025 debe ejecutarse ANTES de T-020 — T-025 provee vocabulario OBSERVABLE/INFERRED/SPECULATIVE
  que T-020 necesita para la columna "Tipo". Sin T-025, T-020 produce la misma
  ambigüedad que ÉPICA 42 pretende resolver.

── BLOQUES 21-27 (T-047..T-073) ─────────────────────────────────────────────────
T-049 (normalizar current_work) — independiente
  └── T-047 (política severidad validate-session-close.sh)
  └── T-050 (stage_sync_required en sync-wp-state.sh)
  └── T-071 (exit 0 en sync-wp-state.sh — consolidar con T-049)
        └── T-056 (unificar validate-session-close.sh) — depende de T-047

T-048 (hook PreToolUse Conventional Commits) — independiente
T-051 (lint-agents.py en SessionStart hook) — independiente
T-052 (bound-detector.py inglés) — independiente
T-053 (document.md.template) — independiente
T-054 (error-report.md.template) — independiente
T-055 (requirements-spec ruta consistente) — independiente
T-057 (Write/Edit en allowed-tools) — independiente
T-058 (Phase 2 → Phase 5 en workflow-strategy) — independiente
T-059 (categorization-plan.md.template) — independiente
T-060 (ARCHITECTURE.md inventario canónico) — independiente
T-061 (deep-dive vs agentic-reasoning desambiguación) — independiente
T-062 (mysql-expert/postgresql-expert trigger pattern) — independiente
T-063 (task-planner vs task-synthesizer desambiguación) — independiente
T-064 (deep-review vs pattern-harvester desambiguación) — independiente
T-065 (coordinadores multilinea → una línea) — independiente
T-066 (bootstrap.py check deps MCP) — independiente
T-067 (ADR coordinators estáticos) — independiente
T-068 (bootstrap.py exit code correcto) — independiente
T-069 (ADR python-mcp manual) — independiente
T-070 (_generator.sh output no-vacío) — independiente
T-072 (update-state.sh branch hardcodeado) — independiente
T-073 (session-resume.sh maxdepth) — independiente
```

## Orden de ejecución sugerido

1. T-001 → (decisión bifurca) → PASS: T-002 → T-003 | FAIL: T-001b → T-003b
2. T-004 → T-005
3. T-006 (paralelo con 1-2)
4. T-007 → T-022 (secuencial, mismo script) | T-013 | T-014 | T-024 (paralelo)
5. **T-025** (independiente — prerequisito de T-020) ← NUEVO BATCH INICIAL
6. T-016 → T-017 → T-020 (secuencial, mismos templates) — después de T-025
7. T-016 → T-018 (paralelo con paso 6)
8. T-015 (después de T-006) | T-019 | T-021 (paralelo)
9. T-005 + T-016 → T-018 → T-008 → T-023 (secuencial)
10. T-018 → T-009 → T-010 → T-011 → T-012
11. **Batch T-025..T-028** (vocabulario epistémico): T-025 → T-026, T-027, T-028, T-045 (paralelo)
12. **Batch T-029..T-032, T-046** (AP-31..AP-39): después de T-002 PASS + T-005 (paralelo entre sí)
13. **T-033 → T-034 → T-035, T-036** (gate calibrado, secuencial)
14. **T-037, T-038** (después de T-021): paralelo
15. **T-039** (independiente) | **T-041** (después de T-016): paralelo
16. **T-040** (después de T-018) | **T-042** (después de T-006 + T-002) | **T-043** (después de T-019): paralelo
17. **T-044** (después de T-004 + T-005 + T-013) | **T-046** (después de T-002 + T-005): paralelo
18. **T-049** → T-047, T-050, T-071 (paralelo) → T-056 (después de T-047)
19. **Independientes B21-27** (paralelo entre sí): T-048, T-051, T-052, T-053, T-054, T-055, T-057, T-058, T-059, T-060, T-061, T-062, T-063, T-064, T-065, T-066, T-067, T-068, T-069, T-070, T-072, T-073
20. **Bloque 28** (después de prerequisitos): T-074, T-075 (independientes) | T-076 (después de T-025) | T-077 (después de T-033..T-035) | T-078 (después de T-005)
21. **Bloques 29-36** (T-079..T-091): T-079 (después de T-025+T-026) | T-080 (independiente) | T-081 (después de T-075) | T-082, T-083, T-084, T-086 (independientes) | T-087 (independiente) | T-088 (después de T-023) | T-089 (después de T-060) | T-090 (después de T-077) | T-091 (después de T-047+T-049)

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
| T-025 | — | cluster-a (H-A1), cluster-b (B-A2A-1) |
| T-026 | — | cluster-b (B-MA-1, H-B5) |
| T-027 | — | cluster-a (H-A2), cluster-b (B-MA-2) |
| T-028 | — | cluster-a (H-A3), cluster-b (B-MA-2) |
| T-029 | AP-31, AP-32 | cluster-d (P2-A, H2-A), cluster-c (H-C06) |
| T-030 | AP-33, AP-34 | cluster-c (H-C01, H-C02), cluster-d (H2-B) |
| T-031 | AP-35, AP-36 | cluster-e (E2-A, E2-B), cluster-c (H-C04) |
| T-032 | AP-37, AP-38 | cluster-c (H-C05), cluster-d (H2-C), cluster-b (B-MCP-1) |
| T-033 | — | cluster-b (B-MA-1 CRÍTICO, B-MA-4 CRÍTICO) |
| T-034 | — | cluster-b (B-MA-2 CRÍTICO, B-MA-3 ALTO) |
| T-035 | — | cluster-b (B-MA-3 CRÍTICO, B-MA-4 ALTO) |
| T-036 | — | cluster-b (B-MA-5, B-MA-6) |
| T-037 | — | cluster-e (E1-B ALTO) |
| T-038 | — | cluster-e (E1-A CRÍTICO, E1-C ALTO) |
| T-039 | — | cluster-a (H-C1, H-C2) |
| T-040 | — | cluster-a (H-C3, H-F2), cluster-d (L1-C) |
| T-041 | — | cluster-d (P1-A, P1-B, H1-B), cluster-b (B-MA-3) |
| T-042 | — | cluster-c (H-C06, H-C04), cluster-e (E3-D) |
| T-043 | — | cluster-b (B-A2A-3) |
| T-044 | — | cluster-a (H-G3), cluster-e (E3-C), cluster-c (H-C16) |
| T-045 | — | cluster-a (H-A1) |
| T-046 | AP-39 | cluster-c (H-C03) |
| T-047 | — | cluster-f (H-F01, H-F02) |
| T-048 | — | cluster-f (H-F05) |
| T-049 | — | cluster-f (H-F07) |
| T-050 | — | cluster-f (H-F03) |
| T-051 | — | cluster-f (H-F13) |
| T-052 | — | cluster-f (H-F04) |
| T-053 | — | cluster-g (GAP-002) |
| T-054 | — | cluster-g (GAP-005) |
| T-055 | — | cluster-g (GAP-003) |
| T-056 | — | cluster-g (GAP-006) |
| T-057 | — | cluster-g (GAP-008) |
| T-058 | — | cluster-g (GAP-001) |
| T-059 | — | cluster-g (GAP-004) |
| T-060 | — | cluster-h (H-01), cluster-i (H-01) |
| T-061 | — | cluster-h (H-04) |
| T-062 | — | cluster-h (H-02) |
| T-063 | — | cluster-h (H-05) |
| T-064 | — | cluster-h (H-06) |
| T-065 | — | cluster-h (H-03) |
| T-066 | — | cluster-i (H-03) |
| T-067 | — | cluster-i (GAP-1, H-09) |
| T-068 | — | cluster-i (H-02, RP-3, RP-4) |
| T-069 | — | cluster-i (GAP-2, H-04) |
| T-070 | — | cluster-i (H-08) |
| T-071 | — | cluster-f (H-F11) |
| T-072 | — | cluster-f (H-F09) |
| T-073 | — | cluster-f (H-F06) |
| T-074 | — | reasoning-correctness-probability-calibration-gaps.md (GAP-1) |
| T-075 | — | agentic-calibration-workflow-example.md (GAP-3) |
| T-076 | — | methodology-calibration-analysis.md Sec 8 criterio 4 (GAP-2) |
| T-077 | — | clustering-basin-integration-analysis.md (GAP-4) |
| T-078 | — | discover/ patrones Cherry-Pick/Efecto Denominador |
| T-079 | — | cluster-a (H-G1) — Cherry-Pick algoritmo en plan-execution.md.template |
| T-080 | — | harvest-cluster-e (H-E1) — I-014 framework mismatch insumos externos |
| T-081 | — | harvest-cluster-e (E3-A/B/C) — referencia calibración en SKILL.md stages |
| T-082 | — | cluster-f (H-F06) — session-start.sh COMMANDS_SYNCED hardcodeado |
| T-083 | — | cluster-f (H-F06) — session-resume.sh maxdepth (resuelto con T-073) |
| T-084 | — | cluster-i (H-05) — bootstrap.py bug action siempre "sobreescrito" |
| T-085 | — | cluster-f (H-F13) — lint-agents.py SessionStart (verificar con T-051) |
| T-086 | — | cluster-i (H-06) — bootstrap.py docstring path incorrecto |
| T-087 | — | cluster-i (H-07) — 6 techs sin template en TECH_CATEGORIES |
| T-088 | — | cluster-h (H-04) — YMLs agentes de análisis (verificar con T-023) |
| T-089 | — | cluster-h (H-04) — tech-detector/skill-generator en ARCHITECTURE.md |
| T-090 | — | harvest-cluster-e (H-E8) — criterio activación Evaluador-Basin en ADR |
| T-091 | — | harvest-cluster-e (H-E10) — PreToolUse hook I-001 (100% vs 30%) |
