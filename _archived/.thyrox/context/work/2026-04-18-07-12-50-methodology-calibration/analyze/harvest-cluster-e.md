```yml
created_at: 2026-04-20 00:20:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: pattern-harvester
status: Borrador
```

# Harvest — Cluster E

**Archivos analizados:** 6
**Período:** 2026-04-18 / 2026-04-19
**Scope del task-plan:** T-001..T-024

---

## Cobertura previa (T-001..T-024) — verificación

Antes de proponer, se mapearon los 6 archivos contra el task-plan existente:

| Hallazgo del cluster | Task que lo cubre |
|----------------------|-------------------|
| Agente `deep-dive` detecta contradicciones de forma adversarial | T-004, T-005 (agentic-validator) — cubierto |
| Anti-patrón AP-25: Named Mechanism vs. Implementation | T-006 (`discover/patterns/named-mechanism-vs-implementation.md`) — cubierto |
| Consistencia de stage names (MEASURE→BASELINE, etc.) | T-014 — cubierto |
| Enforcement de I-001 en validate-session-close.sh | T-022 — cubierto |
| bound-detector.py cobertura inglés | T-024 — cubierto |
| Evidencia estructurada en templates de stage | T-020 — cubierto |
| exit-conditions.md.template con umbral de confianza | T-021 — cubierto |
| platform-evolution-tracking.md | T-019 — cubierto |
| agentic-mandate.md (definición operacional) | T-018 — cubierto |

---

## Hallazgos extraídos por archivo

### E-1: mcp-audit-deep-dive.md

**Fuente clave:** Capa 3, SALTO-4 / Capa 5 / "Punto 5 — ¿framework diferente?"

**Hallazgo E1-A — ADOPTAR (CRÍTICO):**
La auditoría externa terminó con "Recomendación: Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte)" — instrucciones de un framework diferente al THYROX. El deep-dive identifica que un documento externo puede contener recomendaciones de acción incompatibles con el ciclo THYROX, y que un ejecutor puede interpretar "FASE N" como "Stage N" del WP activo. Esto es exactamente el anti-patrón que I-001 prohíbe (saltar stages), pero activado desde un insumo externo, no desde una decisión interna.

- **Tipo:** ADOPTAR
- **Componente:** skill/workflow-discover, rules/thyrox-invariants.md
- **Prioridad:** ALTO
- **Línea de fuente:** `mcp-audit-deep-dive.md`, Capa 5 / Punto 5 — "La auditoría fue producida por un framework de revisión editorial de N fases donde FASE 4 = Auditoría Técnica y FASE 5 = Reporte Final" + "El ejecutor del WP debe tratar esta auditoría como insumo de Stage 1 (DISCOVER) y decidir independientemente el flujo dentro del ciclo THYROX."
- **Estado:** NO cubierto por T-001..T-024

**Hallazgo E1-B — ADOPTAR (MEDIO):**
El meta-análisis confirma que dos sistemas independientes (auditoría externa + agente THYROX) convergieron en los mismos 3 problemas centrales del capítulo. Esto es el patrón de triangulación independiente que aumenta la confiabilidad. El sistema THYROX no tiene un mecanismo documentado para declarar "triangulado" cuando múltiples análisis coinciden.

- **Tipo:** ADOPTAR
- **Componente:** template (discover), guideline
- **Prioridad:** BAJO (observación conceptual, no urgente)

---

### E-2: goal-monitoring-pattern-deep-dive.md

**Fuente clave:** CONTRADICCIÓN-2, SALTO-2, Capa 5 E-1, Sección "Resumen ejecutivo"

**Hallazgo E2-A — ADOPTAR (CRÍTICO):**
El capítulo implementa un bucle de "monitoreo" cuya característica más grave es la terminación silenciosa: cuando los objetivos NO se cumplen, el código guarda el archivo sin advertencia, comportándose como si el proceso hubiera tenido éxito. El deep-dive lo nombra: "El mecanismo de 'monitoreo' no tiene efecto en el comportamiento del sistema cuando falla." Este anti-patrón es directamente aplicable a los gates THYROX: un gate que no produce output diferenciado cuando falla (vs. cuando pasa) es equivalente a la terminación silenciosa.

- **Tipo:** ADOPTAR — patrón a documentar como anti-patrón AP-NNN en la guideline agentic-python y en el agente agentic-validator
- **Componente:** guideline (`agentic-python.instructions.md`), agente (`agentic-validator.md`)
- **Prioridad:** ALTO
- **Línea de fuente:** `goal-monitoring-pattern-deep-dive.md`, CONTRADICCIÓN-2: "cuando `objetivos_cumplidos` nunca retorna True y el bucle agota `max_iteraciones`, el código ejecuta `break` implícitamente y guarda el archivo sin ningún mensaje de advertencia sobre el fallo."
- **Estado:** T-002 y T-005 crean la guideline y el agente, pero el catálogo AP-01..AP-30 documentado en el task-plan viene de "baseline.md Cap.9-20" — este anti-patrón de terminación silenciosa de bucles iterativos NO está en AP-01..AP-30 (que cubren ADK Callbacks, Type Contracts, Classifier Temperature, Error Handling, Observability, HITL, Imports, Agentic Design). Es un AP nuevo derivado de Cap.11.

**Hallazgo E2-B — ADOPTAR (ALTO):**
La función `a_snake_case` definida en el código del capítulo es dead code — existe, nunca se llama, y tiene una implementación inconsistente con la función análoga en el mismo archivo. Evidencia de código evolucionado sin limpieza. El deep-dive nombra esto como anti-patrón con implicaciones de mantenimiento. Directamente mapeable a un AP nuevo: "Dead Code en ejemplos agentic — señal de evolución sin limpieza."

- **Tipo:** ADOPTAR — AP nuevo para guideline y agente
- **Componente:** guideline (`agentic-python.instructions.md`), agente (`agentic-validator.md`)
- **Prioridad:** MEDIO (derivado de ALTO E2-A)
- **Línea de fuente:** `goal-monitoring-pattern-deep-dive.md`, CONTRADICCIÓN-4: "`a_snake_case` está definida pero nunca llamada — es dead code" + CAPA 7 función `a_snake_case`.

**Hallazgo E2-C — ADOPTAR (ALTO):**
El capítulo usa "monitoring" (término de observabilidad de sistemas con connotaciones técnicas establecidas: métricas, alertas, observabilidad) para describir un proceso de LLM-as-judge evaluando otro LLM sin ejecución de código, sin métricas objetivas. El engaño estructural E-1 lo nombra: "Notación formal encubriendo especulación — variante semántica." Aplicación directa a THYROX: cuando los gates usan LLM para evaluar artefactos, deben declarar explícitamente que es LLM-as-judge, no "monitoreo" o "validación objetiva".

- **Tipo:** ADOPTAR — regla explícita para nomenclatura en templates de gate
- **Componente:** guideline (`agentic-python.instructions.md`), template workflow-discover
- **Prioridad:** MEDIO
- **Línea de fuente:** `goal-monitoring-pattern-deep-dive.md`, E-1: "El capítulo titula el patrón 'Goal Setting and MONITORING.' El término 'monitoreo' en sistemas de software tiene un significado técnico establecido [...] El capítulo aplica el término a un proceso donde un LLM le pregunta a otro LLM si los objetivos se cumplieron."

---

### E-3: agentic-calibration-workflow-example.md

**Fuente clave:** Sección 5 (Patrones 1-6), Sección 7 (Lecciones)

**Hallazgo E3-A — ADOPTAR (CRÍTICO):**
El "Efecto Denominador" (Patrón 2): agregar contenido nuevo puede degradar el ratio de calibración global aunque ningún claim previo empeore. V2 regresionó de 79% a 65.4% porque introdujo 19 claims nuevos con ratio promedio 48.4%. El documento propone que al evaluar versiones iterativas se reporte: ratio global, ratio claims heredados, ratio claims nuevos, delta denominador. Aplicación directa a THYROX: la sección "Evidencia de respaldo" de T-020 no distingue entre claims heredados de stages anteriores y claims nuevos del stage actual. Si se agrega nueva evidencia, el ratio global puede degradarse aunque la calidad no empeore.

- **Tipo:** ADOPTAR — refinamiento del diseño de la tabla de evidencia en T-020
- **Componente:** template (workflow-diagnose, workflow-strategy, workflow-decompose)
- **Prioridad:** ALTO — afecta directamente el diseño de T-020
- **Línea de fuente:** `agentic-calibration-workflow-example.md`, Sección 5, Patrón 2: "Agregar contenido nuevo puede degradar el ratio de calibración global aunque ningún claim previo empeore. La métrica de calibración es sensible al volumen de claims nuevos."
- **Estado:** T-020 crea la sección Evidencia de respaldo pero NO especifica distinción heredados/nuevos — este es un gap en el diseño del task T-020.

**Hallazgo E3-B — ADOPTAR (ALTO):**
"Falsa Precisión" (Patrón 3): reemplazar un intensificador cualitativo ("dramáticamente") con un número específico sin fuente ("200-500 líneas") es epistémicamente más problemático — implica medición donde no la hubo. El documento propone que números específicos sin cita deben clasificarse como claim performativo de mayor severidad que intensificadores cualitativos. Aplicación directa a la tabla de evidencia de T-020: la columna "Tipo" debería incluir "número-sin-fuente" como tipo de mayor severidad que "afirmación-cualitativa".

- **Tipo:** ADOPTAR — refinamiento de la taxonomía de tipos en la tabla de evidencia
- **Componente:** template (workflow-diagnose, workflow-strategy, workflow-decompose)
- **Prioridad:** ALTO — complementa T-020
- **Línea de fuente:** `agentic-calibration-workflow-example.md`, Sección 5, Patrón 3: "Números específicos sin cita deben clasificarse como claim performativo de mayor severidad que intensificadores cualitativos."
- **Estado:** T-020 especifica columnas [Claim | Tipo | Fuente | Confianza] — el tipo "número-sin-fuente" no está en la especificación.

**Hallazgo E3-C — ADOPTAR (MEDIO):**
"Fix Textual vs Fix Real" (Patrón 5): un fix puede corregir el texto descriptivo sin corregir el código o la lógica subyacente. Aplicación directa al agente `agentic-validator` de T-005: debe verificar coherencia entre texto, código y especificación cuando el artefacto declara "bug corregido" o "fix aplicado" — no reducir la búsqueda adversarial ante declaraciones de corrección.

- **Tipo:** ADOPTAR — regla en el system_prompt de agentic-validator
- **Componente:** agente (`agentic-validator.md`)
- **Prioridad:** MEDIO
- **Línea de fuente:** `agentic-calibration-workflow-example.md`, Sección 5, Patrón 5: "Un fix puede corregir el texto descriptivo sin corregir el código o la lógica subyacente."

**Hallazgo E3-D — ADOPTAR (MEDIO):**
"Calibración Asimétrica por Dominio" (Patrón 1, CAD): un documento puede tener dominios con calibración excelente (0.90) y dominios con calibración crítica (0.20) en el mismo capítulo. La calibración global promedio oculta la distribución real de riesgo. Implicación: el agente `agentic-reasoning` debe reportar distribución por dominio, no solo ratio global.

- **Tipo:** ADOPTAR — mejora al agente `agentic-reasoning` (ya existente)
- **Componente:** agente `agentic-reasoning` (su system_prompt o referencias)
- **Prioridad:** BAJO (el agente existe y opera — este es refinamiento de output format)

---

### E-4: framework-applications-meta-accounting-deep-dive.md

**Fuente clave:** SALTO-D1, SALTO-D3, ENGAÑO-D1, CAPA 8, Veredicto Final

**Hallazgo E4-A — ADOPTAR (CRÍTICO):**
"Meta-honestidad performativa de orden 2" (ENGAÑO-D1): el documento de Part D usa su propia transparencia como escudo contra análisis. El CRITICAL PREAMBLE ("2 examples, causality unproven") satisface la expectativa del lector de que los problemas fueron identificados, pero en Sec 11.2 el mismo documento eleva a "Observable Fact PROVEN" variables sin definición operacional (Π_inconsist) y métricas derivadas de fórmulas admitidamente spurious. La admisión no corrige los problemas — los cubre con autoridad prestada de la admisión misma. Aplicación a THYROX: declarar "este artefacto tiene incertidumbre" en el frontmatter no es suficiente — es equivalente a terminación silenciosa documentada. El sistema necesita que la declaración de incertidumbre esté operacionalizada en la sección de evidencia, no solo en el header.

- **Tipo:** ADOPTAR — regla operacional para la sección de evidencia
- **Componente:** template (workflow-diagnose, workflow-strategy, workflow-decompose), rules/thyrox-invariants.md
- **Prioridad:** CRÍTICO — afecta la efectividad de T-020
- **Línea de fuente:** `framework-applications-meta-accounting-deep-dive.md`, ENGAÑO-D1: "El CRITICAL PREAMBLE de Part D establece que 'todo el framework es hypothesis-generation.' Pero Sec 11.2 usa 'PROVED' para incluir en la cadena probatoria exactamente las métricas que Parts B y C establecieron como INFERRED o UNDEFINED."
- **Estado:** T-020 agrega la sección "Evidencia de respaldo" pero no tiene regla que prohíba la meta-honestidad performativa (declarar incertidumbre en el status del documento mientras se tratan claims no verificados como verificados en el cuerpo).

**Hallazgo E4-B — ADOPTAR (ALTO):**
"Confidence scores sin protocolo" (SALTO-D3): con n=2 observaciones, no hay base para distinguir 30% de 25% de confianza — cuatro valores presentados como distintos son estadísticamente indistinguibles. La apariencia de calibración (números distintos con un decimal implícito de precisión) es precisión fabricada. Aplicación a THYROX: la columna "Confianza" de la tabla de evidencia en T-020 (alta/media/baja) puede volverse precisión fabricada si no tiene criterio de admisión declarado. El template debe incluir criterios verificables para alta/media/baja.

- **Tipo:** ADOPTAR — criterios de admisión para la columna Confianza
- **Componente:** template (workflow-diagnose, workflow-strategy, workflow-decompose)
- **Prioridad:** ALTO — complementa T-020
- **Línea de fuente:** `framework-applications-meta-accounting-deep-dive.md`, SALTO-D3: "Con n=2 y sin protocolo, los cuatro porcentajes son indistinguibles entre sí estadísticamente. Expresarlos como valores distintos es precisión epistémica fabricada."
- **Estado:** T-020 especifica [alta/media/baja] sin definición de criterios — este gap no está cubierto.

**Hallazgo E4-C — VERIFICAR (MEDIO):**
"Checklist con items que requieren capacidades no disponibles" (SALTO-D6, CONTRADICCIÓN-D4): de 12 items del checklist, 4-5 requieren capacidades declaradas imposibles (acceso a hidden states). El documento no distingue items ejecutables de aspiracionales. Aplicación a THYROX: los task plans (T-NNN checkboxes) deben distinguir entre tareas ejecutables con herramientas actuales y tareas que dependen de capacidades no disponibles (TD pendientes, futuras épicas). Esta distinción existe implícitamente (T-001b es "rama FAIL") pero no se declara explícitamente en el template de task-plan.

- **Tipo:** VERIFICAR — si el template de plan-execution ya hace esta distinción
- **Componente:** template `plan-execution.md.template`
- **Prioridad:** MEDIO

---

### E-5: clustering-basin-integration-analysis.md

**Fuente clave:** Sección 3 (gate calibrado con clustering), Sección 4 (exit criteria como clustering), Sección 5 (ECE), Síntesis

**Hallazgo E5-A — ADOPTAR (CRÍTICO):**
"Test de separabilidad de exit criteria" (Sección 4.2): antes de adoptar un exit criterion para un gate, propone verificar que el criterio produce clusters bien separados (pass vs. fail). Si los clusters no son separables, el criterio es ambiguo y debe descomponerse. La regla de diseño derivada: "Todo exit criterion de THYROX debe producir ≤ 3 clusters bien separados. Si un criterio produce clusters no separables, es señal de que el criterio necesita descomposición en predicados más atómicos." Esta es la implementación técnica del principio de "predicados verificables" que T-021 busca introducir con `confidence_threshold`.

- **Tipo:** ADOPTAR — regla de diseño para exit criteria que complementa T-021
- **Componente:** template workflow-discover, referencias de skill thyrox
- **Prioridad:** CRÍTICO — formaliza empíricamente lo que T-021 hace solo declarativamente
- **Línea de fuente:** `clustering-basin-integration-analysis.md`, Sección 4.1: "Todo exit criterion de THYROX debe producir ≤ 3 clusters bien separados. Si un criterio produce clusters no separables, es señal de que el criterio necesita descomposición en predicados más atómicos."
- **Estado:** T-021 agrega `confidence_threshold` y reemplaza gates subjetivos con predicados con ≥N claims verificadas — pero NO incluye criterio de separabilidad empírica de predicados. Son complementarios: T-021 es el mecanismo de enforcement; la regla de separabilidad es el criterio de diseño.

**Hallazgo E5-B — ADOPTAR (ALTO):**
"Evaluador-Basin como cuarto evaluador en gates calibrados" (Sección 3): el documento propone un evaluador adicional que detecta artefactos en zona genérica (demasiado similares al baseline de outputs vacíos). Un artefacto en el basin genérico no es un buen artefacto — es una respuesta por defecto disfrazada de análisis. Este evaluador es un mecanismo de detección de realismo performativo a nivel de artefacto individual, independiente del evaluador-evidencia (que revisa claims) y del evaluador-estructura (que revisa campos).

- **Tipo:** ADOPTAR — nuevo evaluador en arquitectura de gates
- **Componente:** references de skill workflow-discover o workflow-strategy
- **Prioridad:** ALTO — nuevo mecanismo no cubierto por T-001..T-024
- **Línea de fuente:** `clustering-basin-integration-analysis.md`, Sección 3.1: "Evaluador-Basin: ¿output en cluster genérico? output_key='basin_result' [...] Si d_obs(A) ≤ r_obs → artefacto en basin genérico → flag"
- **Estado:** NO cubierto por ningún task T-001..T-024.

**Hallazgo E5-C — ADOPTAR (MEDIO):**
"ECE via clustering" (Sección 5): propone usar clustering para construir bins naturales en Expected Calibration Error — en lugar de bins manuales por percentil, usa clusters de artefactos históricos. Con >40 WPs históricos de THYROX, este corpus existe. Esta técnica convertiría el historial de gates THYROX en un dataset de calibración empírica.

- **Tipo:** ADOPTAR — técnica de calibración a largo plazo usando corpus THYROX
- **Componente:** references, script de calibración
- **Prioridad:** BAJO (requiere corpus suficientemente grande — depende de Phase 9 PILOT)

---

### E-6: references-calibration-coverage.md

**Fuente clave:** Categorías 1-4, Gaps G-1..G-7, Recomendaciones

**Hallazgo E6-A — ADOPTAR (CRÍTICO):**
"G-2: Exit criteria como predicados verificables" — la semilla existe en `sdd.md` (F.I.R.S.T. Self-validating), pero sin mapeo a stages THYROX. La propiedad exacta que falta: "Resultado booleano claro: pasa o falla, sin interpretación manual." El corpus tiene el patrón (SDD) y tiene los stages (THYROX) pero no hay documento que mapee cuál tipo de eval (Code-based, LLM-based, Human grading) corresponde a cuál stage. T-021 agrega `confidence_threshold` al template de exit-conditions, pero no crea el mapeo.

- **Tipo:** ADOPTAR — crear mapeo Eval-type → Stage
- **Componente:** reference nuevo en `.claude/references/` o en workflow-discover/references/
- **Prioridad:** CRÍTICO — sin este mapeo, T-021 introduce el mecanismo pero sin guía de cuándo usar cada tipo de verificación
- **Línea de fuente:** `references-calibration-coverage.md`, G-2: "Exit criteria como predicados verificables (no afirmaciones). Semilla en `sdd.md` (F.I.R.S.T.), sin mapeo a stages. Impacto: Alto."
- **Estado:** T-021 toca exit-conditions.md.template pero NO crea el mapeo tipo-eval → stage.

**Hallazgo E6-B — ADOPTAR (ALTO):**
"P-2.1: Tabla de efectividad diferencial de enforcement" en `production-safety.md`: `permissions.deny` = 100%, `PreToolUse hook` = 100%, `CLAUDE.md rules` = ~70%, `PostToolUse warnings` = ~30%, `Git hooks` = 100%. Esta tabla existe en las referencias pero no está citada en ningún skill de THYROX. Si I-001..I-011 son instrucciones de texto (CLAUDE.md rules = ~70%), la efectividad real de los invariantes es 70%, no 100%. T-022 agrega un script de enforcement pero la tabla de P-2.1 indica que scripts PostToolUse son solo ~30% efectivos — el mecanismo correcto es PreToolUse hook.

- **Tipo:** ADOPTAR — revisar T-022 (validate-session-close.sh es PostToolUse = ~30%) vs. proponer PreToolUse hook alternativo
- **Componente:** `.claude/scripts/` (hooks), `.claude/settings.json`
- **Prioridad:** ALTO — afecta efectividad de T-022
- **Línea de fuente:** `references-calibration-coverage.md`, P-2.1: "`production-safety.md` — `PostToolUse warnings` = ~30%, `PreToolUse hook` = 100%, `Git hooks` = 100%"
- **Estado:** T-022 usa validate-session-close.sh (PostToolUse/Stop hook) — la tabla P-2.1 indica que la efectividad es ~30% vs. PreToolUse hook al 100%.

**Hallazgo E6-C — ADOPTAR (MEDIO):**
"G-6: Contramedicina sistémica para Artifact Paradox" — el corpus nombra el problema ("users who produce AI artifacts are LESS likely to question reasoning behind them") pero sin solución. La sección Evidencia de respaldo de T-020 es exactamente la contramedicina: fuerza la explicitación de la base epistémica de cada claim. Esto significa que T-020 debe citarse en la referencia `glossary.md` como la solución operacional al Artifact Paradox.

- **Tipo:** ADOPTAR — actualizar `production-safety.md` o `glossary.md` para referenciar la solución
- **Componente:** `.claude/references/glossary.md` o similar
- **Prioridad:** BAJO

---

## Deduplicación final

Hallazgos que NO están en T-001..T-024 y son CRÍTICOS o ALTOS:

| ID | Archivo fuente | Descripción resumida | Prioridad |
|----|---------------|----------------------|-----------|
| H-E1 | mcp-audit-deep-dive.md | Insumos externos con frameworks diferentes pueden provocar salto de stages (violación I-001 inducida) — no hay regla que advierta al ejecutor | ALTO |
| H-E2 | goal-monitoring-pattern-deep-dive.md | Terminación silenciosa en bucles iterativos: anti-patrón AP nuevo para guideline + agente | ALTO |
| H-E3 | agentic-calibration-workflow-example.md | Efecto denominador: tabla de evidencia de T-020 debe distinguir claims heredados vs nuevos | ALTO |
| H-E4 | agentic-calibration-workflow-example.md | Falsa precisión: columna Tipo en T-020 debe incluir "número-sin-fuente" como severidad mayor | ALTO |
| H-E5 | framework-applications-meta-accounting-deep-dive.md | Meta-honestidad performativa: declarar incertidumbre en status sin operacionalizarla en el cuerpo — regla faltante en T-020 | CRÍTICO |
| H-E6 | framework-applications-meta-accounting-deep-dive.md | Confidence scores sin protocolo: columna Confianza de T-020 necesita criterios de admisión | ALTO |
| H-E7 | clustering-basin-integration-analysis.md | Test de separabilidad de exit criteria: regla de diseño complementaria a T-021 | CRÍTICO |
| H-E8 | clustering-basin-integration-analysis.md | Evaluador-Basin: cuarto evaluador en gates calibrados — detecta artefactos genéricos | ALTO |
| H-E9 | references-calibration-coverage.md | Mapeo Eval-type → Stage ausente: T-021 agrega mecanismo sin guía de uso por stage | CRÍTICO |
| H-E10 | references-calibration-coverage.md | validate-session-close.sh (T-022) es PostToolUse = ~30% efectividad; PreToolUse sería 100% | ALTO |

**Límite de 5 CRÍTICOS + 5 ALTOS aplicado — selección por impacto:**

CRÍTICOS seleccionados: H-E5, H-E7, H-E9 (3 — todos genuinamente críticos, bajo límite)
ALTOS seleccionados: H-E1, H-E2, H-E3, H-E4, H-E6 (5 — completan el límite)

H-E8 (Evaluador-Basin) y H-E10 (efectividad de T-022) son ALTOS reales pero superan el límite.
Se documentan en la sección "Hallazgos ALTOS adicionales" para referencia.

---

## Tasks propuestos (CRÍTICOS)

- [ ] T-025 Agregar regla anti-meta-honestidad-performativa en template de Evidencia de respaldo
  - Fuente: framework-applications-meta-accounting-deep-dive.md
  - Hallazgo: ENGAÑO-D1 (Capa 5) — declarar incertidumbre en el `status: Borrador` del frontmatter es insuficiente si los claims en el cuerpo no tienen fuente observable verificada. Meta-honestidad performativa: la admisión cubre sin corregir. "El CRITICAL PREAMBLE establece que 'todo el framework es hypothesis-generation' pero Sec 11.2 usa PROVED para variables sin definición operacional."
  - Acción: en los 3 templates de T-020 (workflow-diagnose, workflow-strategy, workflow-decompose), agregar nota operacional debajo de la tabla de Evidencia de respaldo: "REGLA: Un claim clasificado como `confianza: alta` en esta tabla sin fuente observable verificada constituye meta-honestidad performativa — el documento sigue en Borrador aunque su status declare otra cosa. La sección de Evidencia opera sobre el cuerpo del artefacto, no sobre su frontmatter."
  - Archivo a crear/modificar: `.claude/skills/workflow-diagnose/assets/` + `.claude/skills/workflow-strategy/assets/` + `.claude/skills/workflow-decompose/assets/` (mismos archivos que T-020)
  - Prioridad: CRÍTICO
  - Depende de: T-020 (mismos archivos — ejecutar después de T-020)

- [ ] T-026 Agregar regla de separabilidad de exit criteria en exit-conditions.md.template
  - Fuente: clustering-basin-integration-analysis.md
  - Hallazgo: Sección 4.1 — "Todo exit criterion debe producir ≤ 3 clusters bien separados. Si un criterio produce clusters no separables, es señal de que necesita descomposición en predicados más atómicos." La regla de diseño empírica que falta en T-021: T-021 introduce `confidence_threshold` y reemplaza gates subjetivos con predicados verificables, pero no da criterio para evaluar si un predicado propuesto es suficientemente atómico.
  - Acción: en `exit-conditions.md.template` (mismo archivo de T-021), agregar sección "Criterio de atomicidad de exit criteria": un exit criterion es atómico si su resultado es binario y reproducible por dos evaluadores independientes sin ambigüedad. Ejemplo anti-patrón: "¿el análisis está completo?" → no atómico. Ejemplo correcto: "¿el artefacto tiene ≥3 claims con fuente observable verificada en la sección Evidencia de respaldo?" → atómico.
  - Archivo a crear/modificar: `.claude/skills/workflow-discover/assets/exit-conditions.md.template`
  - Prioridad: CRÍTICO
  - Depende de: T-021 (mismo archivo — ejecutar después de T-021)

- [ ] T-027 Crear `.claude/references/calibration-framework.md` — mapeo Eval-type → Stage
  - Fuente: references-calibration-coverage.md
  - Hallazgo: G-2 — "Exit criteria como predicados verificables. Semilla en `sdd.md` (F.I.R.S.T.), sin mapeo a stages. Impacto: Alto." El corpus tiene SDD con Self-validating y Eval-Driven Development (4x mejora en detección de regresiones, 70% reducción carga de revisión humana) — pero sin mapeo a cuál tipo de eval corresponde a cuál stage THYROX.
  - Acción: crear `.claude/references/calibration-framework.md` con: (a) tabla Eval-type × Stage: para cada Stage 1-12, cuál tipo de verificación es apropiado (Code-execution, LLM-as-judge, Human gate, Triangulación) con criterio de cuándo usar cada uno; (b) criterios operacionales alta/media/baja confianza para la columna Confianza de T-020; (c) referencia a P-2.1 de production-safety.md para efectividad diferencial de enforcement; (d) conexión con Artifact Paradox como problema que este framework contrarresta.
  - Archivo a crear/modificar: `.claude/references/calibration-framework.md` (nuevo)
  - Prioridad: CRÍTICO
  - Depende de: T-020, T-021 (define los mecanismos que el framework documenta)

---

## Tasks propuestos (ALTOS)

- [ ] T-028 Agregar I-012 en thyrox-invariants.md — framework mismatch en insumos externos
  - Fuente: mcp-audit-deep-dive.md
  - Hallazgo: Punto 5 (Capa 5) — "Si el ejecutor del WP lee la recomendación final sin notar la incompatibilidad de frameworks, podría interpretar 'FASE 4' como Stage 4 CONSTRAINTS — y saltar Stage 2, Stage 3 y el resto del flujo DISCOVER. Esto es exactamente el anti-patrón que I-001 prohíbe." La auditoría externa terminó con "Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte)" — instrucciones de un framework diferente. I-001 prohíbe saltar stages por decisión interna; no existe invariante que advierta cuando la instrucción de salto viene de un insumo externo analizado.
  - Acción: agregar I-012 en `.claude/rules/thyrox-invariants.md`: "I-012: Framework mismatch en insumos externos — Cuando un documento analizado contiene recomendaciones de acción con fases numeradas (FASE N, Phase N, Stage N), NO interpretar esas fases como stages del WP activo. Los frameworks externos tienen ciclos propios. Tratar esas recomendaciones como hallazgos del stage DISCOVER actual, no como instrucciones de control de flujo del WP THYROX."
  - Archivo a crear/modificar: `.claude/rules/thyrox-invariants.md`
  - Prioridad: ALTO
  - Depende de: independiente

- [ ] T-029 Agregar AP-31 "Terminación silenciosa en bucles de evaluación" en guideline y agente
  - Fuente: goal-monitoring-pattern-deep-dive.md
  - Hallazgo: CONTRADICCIÓN-2 — "cuando `objetivos_cumplidos` falla en todas las iteraciones, el código termina silenciosamente y guarda el archivo sin advertencia. El mecanismo de 'monitoreo' no tiene efecto en el comportamiento del sistema cuando falla." El capítulo viola el principio básico de que el estado de fallo debe ser observable. El for...else de Python está diseñado exactamente para esto — su ausencia es un bug de diseño documentado.
  - Acción: agregar AP-31 en `.thyrox/guidelines/agentic-python.instructions.md` (Sección 4: Error Handling o nueva Sección 9: Bucles Iterativos): INCORRECTO: bucle que agota iteraciones sin rama else, guarda output sin advertencia. CORRECTO: usar for...else de Python; si `else` alcanzado (no break), emitir warning explícito con estado final. Agregar AP-31 al catálogo del agente `agentic-validator.md`.
  - Archivo a crear/modificar: `.thyrox/guidelines/agentic-python.instructions.md` + `.claude/agents/agentic-validator.md`
  - Prioridad: ALTO
  - Depende de: T-002 (misma guideline — ejecutar después de T-002), T-005 (mismo agente — ejecutar después de T-005)

- [ ] T-030 Refinar tabla de Evidencia de respaldo en T-020 — distinguir claims heredados vs nuevos
  - Fuente: agentic-calibration-workflow-example.md
  - Hallazgo: Patrón 2 (Efecto Denominador) y Patrón 3 (Falsa Precisión): "Agregar contenido nuevo puede degradar el ratio de calibración global aunque ningún claim previo empeore." + "Números específicos sin cita deben clasificarse como claim performativo de mayor severidad que intensificadores cualitativos."
  - Acción: en los 3 templates de T-020, extender la tabla de Evidencia de respaldo: (a) agregar columna `Origen` con valores `heredado` (de stage anterior) / `nuevo` (introducido en este stage); (b) extender columna `Tipo` con valor adicional `número-sin-fuente` con nota "⚠ mayor severidad que afirmación cualitativa — requiere fuente empírica o reclasificar como inferencia".
  - Archivo a crear/modificar: mismos archivos que T-020 (workflow-diagnose, workflow-strategy, workflow-decompose assets)
  - Prioridad: ALTO
  - Depende de: T-020 + T-025 (mismos archivos — ejecutar en batch)

- [ ] T-031 Agregar criterios de admisión para columna Confianza en template de Evidencia
  - Fuente: framework-applications-meta-accounting-deep-dive.md
  - Hallazgo: SALTO-D3 — "Con n=2 y sin protocolo, los cuatro porcentajes son indistinguibles entre sí estadísticamente. Expresarlos como valores distintos es precisión epistémica fabricada." Aplicación: la columna Confianza del template de T-020 especifica [alta/media/baja] sin criterio de asignación — cualquier asignación sin criterio es precisión fabricada.
  - Acción: en los 3 templates de T-020, agregar nota operacional después de la tabla de Evidencia: "Criterios de columna Confianza: `alta` = verificable ejecutando una herramienta (Bash, Read, Grep) y reproducible por otro agente; `media` = inferido de múltiples observaciones (≥2 fuentes independientes) sin ejecución directa; `baja` = LLM-as-judge o inferencia de primera instancia — requiere gate humano antes de avanzar stage."
  - Archivo a crear/modificar: mismos archivos que T-020 (workflow-diagnose, workflow-strategy, workflow-decompose assets)
  - Prioridad: ALTO
  - Depende de: T-020 + T-025 + T-030 (mismos archivos — ejecutar en batch)

- [ ] T-032 Agregar AP-32 "Nomenclatura prestada que encubre mecanismo distinto" en guideline y agente
  - Fuente: goal-monitoring-pattern-deep-dive.md
  - Hallazgo: E-1 (Capa 5) — "El capítulo titula el patrón 'Goal Setting and MONITORING.' El término 'monitoreo' en sistemas de software tiene un significado técnico establecido: observación objetiva del estado del sistema con métricas verificables. El capítulo aplica el término a un proceso donde un LLM le pregunta a otro LLM si los objetivos se cumplieron, sin ejecución del código, sin tests, sin métricas objetivas." El uso de "monitoreo" confiere apariencia de rigor a lo que es LLM-over-LLM heurístico.
  - Acción: agregar AP-32 en `.thyrox/guidelines/agentic-python.instructions.md`: INCORRECTO: llamar "monitoreo" o "validación objetiva" a un proceso donde LLM evalúa output de otro LLM sin ejecución de código ni métricas observables. CORRECTO: nombrar explícitamente "LLM-as-judge" o "evaluación heurística LLM" y declarar sus limitaciones conocidas (sesgo de posición, autopreferencia, incapacidad de ejecutar código). Agregar AP-32 al catálogo del agente `agentic-validator.md`.
  - Archivo a crear/modificar: `.thyrox/guidelines/agentic-python.instructions.md` + `.claude/agents/agentic-validator.md`
  - Prioridad: ALTO
  - Depende de: T-002 + T-029 (misma guideline — ejecutar en batch), T-005 (mismo agente)

---

## Hallazgos ALTOS adicionales (fuera del límite 5+5)

Documentados para referencia — no propuestos como tasks en este harvest:

**H-E8 — Evaluador-Basin como cuarto evaluador en gates:**
`clustering-basin-integration-analysis.md`, Sección 3.1. Detecta artefactos en zona genérica (respuestas por defecto disfrazadas de análisis). Requiere modelo de embeddings externo y corpus de baseline por stage. Es un mecanismo de mediano plazo — candidato a ÉPICA futura o Stage 9 PILOT.

**H-E10 — Efectividad de validate-session-close.sh (T-022) es ~30%:**
`references-calibration-coverage.md`, P-2.1. PostToolUse warnings = ~30% efectividad vs. PreToolUse hook = 100%. T-022 opera como Stop hook (PostToolUse). Si se convierte en PreToolUse hook o se complementa con un PreToolUse hook de I-001, la efectividad sube a 100%. Candidato a refinamiento de T-022.

---

## DAG de dependencias (nuevos tasks)

```
T-020 (sección Evidencia en templates) — de task-plan original
  └── T-025 (regla anti-meta-honestidad-performativa) — después de T-020
  └── T-030 (columna Origen + tipo número-sin-fuente) — después de T-020
      └── T-031 (criterios columna Confianza) — después de T-020 + T-025 + T-030

T-021 (exit-conditions.md.template con umbral confianza) — de task-plan original
  └── T-026 (regla de separabilidad de exit criteria) — después de T-021

T-020 + T-021 (ambos)
  └── T-027 (calibration-framework.md — mapeo Eval-type → Stage) — después de T-020 y T-021

T-028 (I-012 en thyrox-invariants.md) — independiente

T-002 (agentic-python.instructions.md) — de task-plan original
  └── T-029 (AP-31 terminación silenciosa) — después de T-002
  └── T-032 (AP-32 nomenclatura prestada) — después de T-002 + T-029

T-005 (agentic-validator.md) — de task-plan original
  └── T-029 también modifica agentic-validator.md — después de T-005
  └── T-032 también modifica agentic-validator.md — después de T-005
```

## Trazabilidad

| Task | Archivo fuente | Línea de evidencia clave |
|------|---------------|--------------------------|
| T-025 | mcp-audit-deep-dive.md | ENGAÑO-D1 + SALTO-4 (Capa 5) |
| T-026 | clustering-basin-integration-analysis.md | Sección 4.1: "≤ 3 clusters bien separados" |
| T-027 | references-calibration-coverage.md | G-2: "Semilla en sdd.md, sin mapeo a stages" |
| T-028 | mcp-audit-deep-dive.md | Punto 5 / "Riesgo de confusión" |
| T-029 | goal-monitoring-pattern-deep-dive.md | CONTRADICCIÓN-2 + Capa 7 función ejecutar_agente_codigo |
| T-030 | agentic-calibration-workflow-example.md | Patrón 2 (Efecto Denominador) + Patrón 3 (Falsa Precisión) |
| T-031 | framework-applications-meta-accounting-deep-dive.md | SALTO-D3: "precisión epistémica fabricada" |
| T-032 | goal-monitoring-pattern-deep-dive.md | E-1: "Notación formal encubriendo especulación" |
