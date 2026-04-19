```yml
created_at: 2026-04-19 18:09:52
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: deep-dive
status: Borrador
```

# Gap Analysis — Task Plan ÉPICA 42 vs Mandato "Sistema de Agentic AI"

**Artefactos de entrada:**
- `plan-execution/methodology-calibration-task-plan.md` — T-001..T-019
- `analyze/thyrox-engine-solidez-deep-dive.md` — 6 contradicciones, 7 saltos, 4 engaños
- `analyze/change-map-deep-dive.md` — verificación del mapa de 20 cambios
- `discover/methodology-calibration-analysis.md` — análisis DISCOVER Stage 1

---

## Parte 1 — Mapa de cobertura T-001..T-019

Antes de identificar gaps, se establece qué dimensión del mandato cubre cada bloque del task-plan.

| Bloque / Task | Qué resuelve | Dimensión del mandato |
|---------------|-------------|----------------------|
| T-001 (verificar @imports) | Cierre TD-040 — verifica si guidelines cargan | Infraestructura de directivas activas |
| T-002 (agentic-python.instructions.md) | Crea 30 reglas anti-patrón para código agentic | Calidad de código agentic generado por Claude |
| T-003 (CLAUDE.md @import) | Activa el guideline T-002 en sesiones | Activación automática de directivas |
| T-004 (agentic-validator.yml) | Define el agente validador en el registry | Registro del agente |
| T-005 (agentic-validator.md) | Crea agente validador de código agentic AP-01..AP-30 | Capacidad de validación explícita |
| T-006 (6 patrones consultables) | Documentación de referencia de 6 APs | Documentación técnica |
| T-007 (TD-042 validate-session-close) | Verifica sync checkboxes vs commits | Consistencia de estado interno |
| T-008 (ARCHITECTURE.md) | Documenta tercera familia de agentes | Documentación de arquitectura |
| T-009 (README.md conteo) | Actualiza número de agentes | Documentación pública |
| T-010 (focus.md) | Estado de sesión | Operacional |
| T-011 (project-state.md) | Bump versión, conteo de agentes | Estado del sistema |
| T-012 (ROADMAP.md) | Marca stages completados | Tracking de progreso |
| T-013 (workflow-standardize propagación) | Agrega instrucción de propagar APs en estandarización | Propagación de patrones en futuros WPs |
| T-014 (consistencia stage names — 26 ocurrencias) | Corrige nomenclatura en 12 archivos | Deuda de nomenclatura |
| T-015 (Árbol 5 Agentic AI en methodology-selection-guide) | Árbol de decisión para WPs agentic | Metodología para proyectos agentic |
| T-016 (agentic-system-design.md) | Referencia de diseño para sistemas agentic | Marco teórico de diseño |
| T-017 (exit criteria agentic en Stage 3 + Stage 5) | Criterios de salida para WPs agentic | Metodología operacional |
| T-018 (agentic-mandate.md) | Definición operacional del mandato | Identidad verificable del sistema |
| T-019 (platform-evolution-tracking.md) | Tracking de cambios de plataforma | Resiliencia ante cambios de Claude Code |

**Dimensiones cubiertas por T-001..T-019:**

1. Calidad de código agentic (T-002, T-005, T-006) — CUBIERTA
2. Activación de directivas (T-001, T-003) — CUBIERTA (con dependencia de resultado)
3. Definición operacional del mandato (T-018) — CUBIERTA
4. Metodología para WPs agentic (T-015, T-016, T-017) — CUBIERTA
5. Infraestructura interna (T-007, T-014) — CUBIERTA
6. Documentación y estado (T-008..T-013) — CUBIERTA
7. Plataforma (T-019) — CUBIERTA

**Dimensiones NO cubiertas por T-001..T-019:**

Cinco dimensiones con peso material para un "Sistema de Agentic AI":

- **DIM-A:** Calibración de incertidumbre en artefactos (el objetivo original del DISCOVER)
- **DIM-B:** Enforcement técnico de Locked Decisions e invariantes (vs. enforcement de texto)
- **DIM-C:** Solidez del registro de agentes — 16/25 sin YML fuente (registry no es fuente de verdad)
- **DIM-D:** Cobertura de bound-detector en inglés (agente agentic con instrucciones en inglés no está protegido)
- **DIM-E:** Criterio de WP activo en validate-session-close.sh (WPs en stages 1-7 sin task-plan pasan como "cerrados")

---

## Parte 2 — Las 5 dimensiones críticas no cubiertas

### DIM-A: Calibración de incertidumbre en artefactos (ALTA PRIORIDAD)

**Por qué es crítica:** Esta es la razón de existir de ÉPICA 42. El DISCOVER (sec. 1) dice explícitamente: "THYROX opera como si P(correcto) ≈ 1.0 en cada artefacto". Los criterios de éxito (sec. 8) listan 5 outcomes verificables, de los cuales 3 son directamente sobre templates con umbral de confianza.

**Qué hay en T-001..T-019:** Nada. No existe ninguna tarea que modifique templates de stages, exit-conditions.md.template, ni risk-register.md.template. El task-plan resolvió los gaps de código agentic identificados en Stage 3, pero omitió completamente el problema de calibración que fue el detonador de la ÉPICA.

**Evidencia de la omisión:** Sección 8 del DISCOVER lista como criterio de éxito: "Los templates de las 3 stages de mayor riesgo (Stage 3, Stage 5, Stage 8) tienen sección de evidencia estructurada". Ningún task en T-001..T-019 crea, modifica o referencia un template de stage.

**Gravedad:** CRÍTICA — sin esta dimensión, ÉPICA 42 no cumple sus propios criterios de éxito.

**Tasks propuestos:**

```
T-020 Agregar sección "Evidencia de respaldo" a los 3 templates de mayor riesgo
  - Archivos: workflow-diagnose/assets/, workflow-strategy/assets/, workflow-decompose/assets/
    (o los templates equivalentes según estructura real en disco)
  - Sección a agregar en cada template:
    ## Evidencia de respaldo
    | Claim | Tipo de evidencia | Fuente (herramienta/bash/human) | Confianza |
    |-------|------------------|--------------------------------|-----------|
    | ...   | observación directa / inferencia / human gate | ...        | Alta / Media / Baja |
  - Instrucción inline en el template: "Alta = herramienta ejecutada o verificación en disco.
    Media = triangulación de 2+ fuentes. Baja = inferencia sin verificación directa."
  - Depende de: ninguno — independiente
  - Criterio de éxito: un WP nuevo ejecutado en Stage 3 produce un artefacto con esta sección completa

T-021 Actualizar exit-conditions.md.template — umbral de confianza explícito
  - Reemplazar gate binario (presente/ausente) por gate con nivel de confianza:
    "Criterio cumplido CON CONFIANZA ALTA si: [herramienta ejecutada que lo confirma]"
    "Criterio cumplido CON CONFIANZA MEDIA si: [triangulación de fuentes]"
    "Criterio BLOQUEADO si: [solo inferencia sin evidencia observable]"
  - Agregar campo en el template: `confidence_threshold: Alta | Media | Baja (default: Alta para gates de Stage 5+)`
  - Depende de: T-020 (los templates de stage deben alimentar el exit-conditions)
  - Criterio de éxito: el template actualizado hace imposible declarar gate pasado sin declarar la fuente de evidencia
```

### DIM-B: Enforcement técnico de Locked Decisions (MEDIA-ALTA PRIORIDAD)

**Por qué es crítica:** El deep-dive solidez (SALTO-03, CONTRADICCIÓN-06) identificó que las 7 Locked Decisions y las invariantes I-001..I-011 son instrucciones de texto sin enforcement técnico. En un sistema que declara ser "Agentic AI", la diferencia entre instrucción de texto y enforcement técnico es la diferencia entre aspiración y propiedad verificable.

**Qué hay en T-001..T-019:** T-007 resuelve TD-042 (checkboxes vs commits). T-018 define el mandato. Pero ningún task crea mecanismos que detecten violaciones de las invariantes más críticas en tiempo de ejecución.

**Las 2 invariantes con mayor riesgo de violación silenciosa:**
- I-001 (ANALYZE first): un plan puede crearse sin discover/ existente — ningún hook lo detecta
- I-011 (no cerrar WP sin instrucción explícita): validate-session-close.sh no verifica este criterio

**Tasks propuestos:**

```
T-022 Agregar verificación de I-001 en validate-session-close.sh
  - Check nuevo: si existe plan-execution/*-task-plan.md en un WP, verificar que también
    existe discover/*-analysis.md (o equivalente síntesis de Stage 1) en el mismo WP
  - Si no existe → warning en output del hook (no bloqueante — exit 0 siempre)
  - Output: "WARN: WP {nombre} tiene task-plan sin artefacto DISCOVER correspondiente —
    posible violación de I-001"
  - Esto convierte I-001 de instrucción de texto a warning automatizado
  - Depende de: ninguno — independiente
  - Criterio de éxito: ejecutar el hook en un WP que tiene task-plan pero no discover/ → produce el warning
```

### DIM-C: Solidez del registro de agentes (MEDIA PRIORIDAD)

**Por qué es crítica:** CONTRADICCIÓN-01 (solidez deep-dive) documenta que 16 de 25 agentes no tienen YML fuente en el registry. ARCHITECTURE.md declara el registry como "fuente de verdad" — eso es FALSO para 64% de los agentes. Para un sistema que gestiona proyectos con agentes, no tener una fuente canónica del catálogo de agentes es un gap de arquitectura activo.

**Qué hay en T-001..T-019:** T-004 y T-005 agregan UN agente nuevo (agentic-validator), pero no resuelven el estado del 64% sin YML. T-008 actualiza ARCHITECTURE.md para agregar la tercera familia, pero no menciona corregir el claim de "fuente de verdad" que es FALSO.

**Task propuesto:**

```
T-023 Crear YMLs fuente en registry para los 16 agentes sin origen formal
  - Estrategia: no reemplazar los .md existentes — crear YMLs de documentación que reflejen
    el estado real de cada agente (descripción, tools, system_prompt resumido)
  - Los 16 agentes: agentic-reasoning, ba-coordinator, bpa-coordinator, cp-coordinator,
    deep-dive, deep-review, diagrama-ishikawa, dmaic-coordinator, lean-coordinator,
    pdca-coordinator, pm-coordinator, pps-coordinator, rm-coordinator, rup-coordinator,
    sp-coordinator, thyrox-coordinator
  - Formato: YML de solo-documentación (sin bootstrap.py processing) — agregar un campo
    `install_method: manual` para distinguirlos de los tech-experts generados
  - Actualizar ARCHITECTURE.md para distinguir entre "generados por bootstrap.py" (9 YMLs)
    y "instalados manualmente con YML de documentación" (16 YMLs) — eliminar el claim
    "todo se genera desde el registry" que es FALSO
  - Alcance parcial aceptable: priorizar coordinators (11) + deep-dive + deep-review +
    agentic-reasoning como agentes core. Los 3 restantes en TD separado.
  - Depende de: T-008 (ARCHITECTURE.md ya modificado por ese task — este task lo extiende)
  - Criterio de éxito: ls registry/agents/*.yml | wc -l ≥ 20 (vs 9 actuales) y ARCHITECTURE.md
    no contiene el claim "todo se genera desde el registry"
```

### DIM-D: Cobertura de bound-detector en inglés (MEDIA PRIORIDAD)

**Por qué es crítica:** SALTO-06 del deep-dive solidez documenta que bound-detector.py detecta patrones en español + solo 2 en inglés ("read ALL", "leer todos"). Patrones como "process all agents", "analyze every file", "check each record" no son interceptados. Para un sistema agentic que puede recibir instrucciones en inglés (incluyendo sus propios agentes), esto es un gap de seguridad verificado.

**Qué hay en T-001..T-019:** Nada. El task-plan no incluye ninguna mejora a bound-detector.py.

**Task propuesto:**

```
T-024 Ampliar cobertura en inglés de bound-detector.py
  - Agregar a UNBOUNDED_SIGNALS (bound-detector.py:16-23) patrones en inglés:
    "process all", "analyze every", "check each", "iterate over all",
    "for all", "scan all", "review every", "update all", "delete all",
    "apply to all", "validate each", "run on all"
  - Agregar regex case-insensitive para capturar variantes
  - Agregar sección en docstring de bound-detector.py: "Coverage: español (completo) +
    inglés (UNBOUNDED_SIGNALS lista). Expandir UNBOUNDED_SIGNALS para cobertura adicional."
  - Actualizar ARCHITECTURE.md sección de bound-detector para documentar la cobertura real
    (no implícita — actualmente ARCHITECTURE.md no menciona el scope de detección)
  - Depende de: ninguno — independiente
  - Criterio de éxito: instrucción "process all files in the project" dispara
    permissionDecision deny en bound-detector.py
```

### DIM-E: Criterio de WP activo en validate-session-close.sh (BAJA-MEDIA PRIORIDAD)

**Por qué es relevante:** SALTO-07 del deep-dive solidez documenta que validate-session-close.sh usa como criterio de "WP activo" la presencia de task-plan con tareas pendientes. WPs en stages 1-7 sin task-plan (que es la norma — el task-plan aparece en Stage 8) pasarían como "cerrados" cuando están activos. Esto produce falsos negativos en la validación de cierre.

**Qué hay en T-001..T-019:** T-007 resuelve TD-042 (agregar verificación de checkboxes vs commits), pero no corrige el criterio de WP activo.

**Task propuesto:**

```
T-025 Corregir criterio de WP activo en validate-session-close.sh
  - Check 3 actual: WP activo = directorio en work/ + task-plan con "- [ ]"
  - Criterio correcto: WP activo = directorio en work/ + sin lessons-learned.md en track/
    (independiente de si tiene task-plan)
  - Cambio en validate-session-close.sh:
    Líneas 79-85: reemplazar la búsqueda de *-task-plan.md con búsqueda de
    lessons-learned.md en subdirectorios del WP
    Si existe lessons-learned.md → WP cerrado
    Si no existe → WP activo (independientemente de task-plan)
  - Mantener exit 0 siempre (no bloquear el Stop hook)
  - Depende de: ninguno — independiente (puede hacerse en paralelo con T-007)
  - Criterio de éxito: un WP en Stage 3 ANALYZE (sin task-plan) es detectado como activo
    por el hook al cerrar sesión
```

---

## Parte 3 — Verificación de contradicciones internas en el task-plan actual

### Contradicción interna 1: T-008 y T-023 (gap potencial)

**T-008** actualiza ARCHITECTURE.md para agregar la tercera familia de agentes (domain pattern validators). Si T-023 se agrega al task-plan y también modifica ARCHITECTURE.md (para corregir el claim de "fuente de verdad"), hay riesgo de conflicto de edición si se ejecutan en órdenes distintos.

**Resolución:** T-023 debe marcarse como **depende de T-008** en el DAG. T-008 hace el primer edit de ARCHITECTURE.md; T-023 hace el segundo edit con la corrección del claim de fuente de verdad.

### Contradicción interna 2: T-016 y T-017 vs. T-020 y T-021

**T-017** agrega exit criteria agentic en templates de Stage 3 y Stage 5 (workflow-diagnose/assets/ y workflow-strategy/assets/). **T-020** agrega sección de evidencia en templates de Stage 3, Stage 5 y Stage 8.

Ambos tasks modifican los mismos archivos de assets. Si se ejecutan sin coordinación, uno puede sobreescribir el trabajo del otro.

**Resolución:** T-020 y T-021 deben marcarse como **dependen de T-017** — primero se agregan los criterios agentic (T-017), luego la sección de evidencia genérica (T-020) en el mismo template.

### Contradicción interna 3: T-001 crea un bloqueador no resuelto en el DAG

El DAG declara: "T-001 FAIL → T-001b (migrar guidelines a rules/) → T-003b". Pero T-001b no es una tarea numerada — es una bifurcación del DAG. Si T-001 falla, el task-plan no tiene un task ejecutable definido: T-001b es un label sin contenido.

**Impacto:** Si @imports falla, el ejecutor no tiene un task con pasos claros para T-001b. Las acciones necesarias (qué archivos mover, cómo actualizar CLAUDE.md, qué hacer con los 6 archivos existentes) no están especificadas.

**Resolución sugerida:** Definir T-001b explícitamente como tarea con los mismos campos que los demás tasks:
```
T-001b (condicional — solo si T-001 FALLA): Migrar 6 archivos de .thyrox/guidelines/*.instructions.md
  a .claude/rules/; actualizar CLAUDE.md eliminando los 6 @imports de la sección Tech-stack guidelines;
  verificar que las reglas cargan vía .claude/rules/ probando en sesión.
```

### Contradicción interna 4: T-011 depende de T-005 pero T-009 también depende de T-005

El DAG declara T-008 y T-009 como "depende de T-005 + T-018". T-011 "depende de T-005 (para conteo final)". En la práctica, T-009 (README.md) y T-011 (project-state.md) editan archivos diferentes — no hay conflicto real de edición. La dependencia de T-005 es de información (necesitan el conteo correcto), no de orden de escritura.

**No es contradicción bloqueante.** Es una dependencia de información correctamente declarada.

### Contradicción interna 5: T-015 referencia patrones de T-006 antes de que existan

T-015 dice: "Conectar con los patrones consultables de T-006 (AP-01..AP-30) como referencia de implementación". El DAG marca T-015 e independiente. Pero si T-006 aún no existe cuando se ejecuta T-015, las referencias serán links rotos o referencias a rutas inexistentes.

**Resolución:** T-015 debe marcarse como **depende de T-006** en el DAG.

---

## Parte 4 — Veredicto: ¿T-001..T-019, si se ejecutan completos, acercan materialmente a THYROX al mandato de Sistema de Agentic AI?

### Respuesta directa: PARCIALMENTE — con un gap crítico que invalida el veredicto positivo

**Lo que T-001..T-019 logran si se ejecutan:**

1. THYROX tendrá un guideline activo (apendicialmente verificado) con 30 reglas contra anti-patrones de código agentic — esto mejora la calidad del código que el sistema genera para sistemas agentic.
2. THYROX tendrá un agente validador que puede detectar AP-01..AP-30 en código Python agentic — esto agrega capacidad de auto-revisión.
3. THYROX tendrá un documento con una definición operacional del mandato (T-018, agentic-mandate.md) — esto hace el mandato verificable en lugar de un label.
4. THYROX tendrá un árbol de decisión y criterios de stage para WPs de diseño agentic (T-015, T-016, T-017) — esto integra Agentic AI como metodología reconocida dentro del framework.

**Lo que T-001..T-019 NO logran:**

El gap crítico: **T-001..T-019 resuelven la calidad del código agentic que THYROX ayuda a construir, pero no resuelven si THYROX mismo opera como un Agentic AI**.

El DISCOVER identificó el problema real en Sec. 1: "THYROX opera como si P(correcto) ≈ 1.0 en cada artefacto". Los criterios de éxito de Sec. 8 son explícitos: templates con sección de evidencia, exit-conditions con umbral de confianza. Ninguno de T-001..T-019 toca esos criterios.

El resultado práctico: si se ejecuta T-001..T-019 completo, THYROX será mejor en ayudar a otros a construir sistemas agentic (calidad de código, validación, árbol de decisión metodológico). Pero el propio THYROX seguirá generando artefactos sin declarar su confianza, con exit criteria binarios, con gates que se pasan por declaración y no por evidencia. La identidad declarada ("Sistema de Agentic AI") seguirá siendo un label sin propiedad verificable en el comportamiento del propio sistema.

**El veredicto con escala:**

| Dimensión del mandato | Cubierta por T-001..T-019 | Efecto neto |
|----------------------|--------------------------|-------------|
| THYROX puede construir código agentic de calidad | SÍ (T-002, T-005) | Material |
| THYROX tiene metodología para diseñar sistemas agentic | SÍ (T-015, T-016, T-017) | Material |
| THYROX tiene una definición de su propia identidad agentic | SÍ (T-018) | Material |
| THYROX opera con razonamiento sobre su propia incertidumbre | NO (DIM-A no cubierta) | Gap crítico |
| THYROX tiene enforcement técnico de sus invariantes | NO (DIM-B parcialmente) | Gap moderado |
| La arquitectura de agentes de THYROX corresponde a su documentación | NO (DIM-C no cubierta) | Gap moderado |
| El agente guardián de THYROX cubre instrucciones en inglés | NO (DIM-D no cubierta) | Gap funcional |

**Conclusión:** T-001..T-019 acercan a THYROX al mandato en 3 de 7 dimensiones relevantes. La dimensión más crítica (el propio razonamiento sobre incertidumbre del sistema) no está cubierta. Ejecutar T-001..T-019 sin agregar T-020 y T-021 produciría un sistema que sabe cómo construir Agentic AI mejor de lo que opera como Agentic AI — una brecha de coherencia entre capacidad y comportamiento.

---

## Resumen de tasks propuestos para agregar al task-plan

| Task | Dimensión | Prioridad | DAG |
|------|-----------|-----------|-----|
| T-020 Sección "Evidencia de respaldo" en 3 templates de mayor riesgo | DIM-A | CRÍTICA | Independiente |
| T-021 Actualizar exit-conditions.md.template con umbral de confianza | DIM-A | CRÍTICA | Depende de T-020 |
| T-022 Check I-001 en validate-session-close.sh | DIM-B | MEDIA-ALTA | Independiente |
| T-023 YMLs fuente para 16 agentes sin origen formal | DIM-C | MEDIA | Depende de T-008 |
| T-024 Ampliar cobertura inglés en bound-detector.py | DIM-D | MEDIA | Independiente |
| T-025 Corregir criterio WP activo en validate-session-close.sh | DIM-E | BAJA-MEDIA | Independiente, paralelo con T-007 |

**Correcciones al DAG actual:**
- T-015 debe marcarse como **depende de T-006** (evitar links rotos a patrones inexistentes)
- T-020 y T-021 deben ejecutarse **después de T-017** (mismo archivo, no sobreescribir)
- T-023 debe ejecutarse **después de T-008** (mismo archivo ARCHITECTURE.md)
- T-001b debe definirse como task explícito con pasos concretos (el DAG actual la trata como bifurcación sin contenido)
