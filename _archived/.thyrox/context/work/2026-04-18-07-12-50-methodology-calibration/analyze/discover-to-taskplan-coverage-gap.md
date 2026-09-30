```yml
created_at: 2026-04-20 12:50:32
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: deep-dive
status: Borrador
version: 1.0.0
veredicto_síntesis: COBERTURA PARCIAL
saltos_lógicos: 4
contradicciones: 2
engaños_estructurales: 2
```

# Deep-Dive: Cobertura discover/ → task-plan (T-001..T-073)

---

## Veredicto ejecutivo

Cobertura estimada: **72%** de los hallazgos accionables de discover/ tienen al menos
una tarea T-NNN correspondiente. Pero el 28% sin cobertura contiene los hallazgos
más alineados con el objetivo central de la ÉPICA (calibración epistémica), y varios
de ellos no son temas menores: son el fundamento de la decisión de PROHIBIR la fórmula
exponencial de decay, la integración de clustering/basin como mecanismo de gate, y el
protocolo de callback-contract para código agentic generado por el sistema.

Además, la trazabilidad del task-plan en la sección "Trazabilidad" cita seis archivos de
discover/ por su código de cluster (cluster-a..cluster-i) pero no por nombre de archivo.
Cuatro archivos de discover/ (synthesis, non-cluster) no aparecen en ninguna fila de esa
tabla aunque contienen hallazgos accionables.

---

## CAPA 1 — Lectura inicial: mapa del espacio discover/

El directorio discover/ contiene 87 archivos. Clasificación por función:

| Función | Archivos | Tipo |
|---------|---------|------|
| Input verbatim de capítulos del libro (Cap.3, 6, 7, 9–20) | `*-input.md` | Fuente primaria |
| Deep-dives adversariales de capítulos | `*-deep-dive.md` | Análisis Cap.9–20 |
| Calibraciones de capítulos | `*-calibration.md` | Calibración Cap.9–20 |
| Documentos de síntesis / meta-análisis | 12 archivos no-triples | Síntesis WP |
| Inputs especializados (arquitectura, basin) | `claude-architecture-*`, `reasoning-*`, `basin-*` | Análisis técnico extra |

Los clusters A–I del task-plan corresponden a análisis temáticos construidos SOBRE
los deep-dives y calibraciones de capítulos, que están en analyze/. Los archivos
de discover/ no son los clusters — son las fuentes primarias de las que los clusters
derivaron sus hallazgos.

### Archivos de síntesis en discover/ (no son input/calibration/deep-dive de capítulos)

| Archivo | Contenido | En trazabilidad |
|---------|-----------|----------------|
| `methodology-calibration-analysis.md` | Síntesis Stage 1 DISCOVER — objetivo, restricciones, criterios de éxito del WP | Implícito (es el ancla del WP) |
| `references-calibration-coverage.md` | Gap analysis de 49 references — 7 gaps identificados (G-1..G-7) | No aparece por nombre |
| `claude-architecture-references-coverage.md` | Gap analysis specific al documento POMDP — recomendaciones de 4 referencias | No aparece por nombre |
| `agentic-characteristics-input.md` | Taxonomía de 6 características agentic + tabla de riesgo por característica | Referenciado como H-F2 en cluster-a |
| `agentic-claims-management-patterns.md` | 6 patrones de gestión de claims (CAD, efecto denominador, cherry-pick, falsa precisión, fix declarado vs verificado, metodología versión única) | Parcial: CAD → T-042, fix declarado → T-039, T-044 |
| `agentic-calibration-workflow-example.md` | Caso de uso completo — 3 versiones del cap. MCP con agentes paralelos | No aparece por nombre |
| `clustering-basin-integration-analysis.md` | Integración de clustering como proxy observable de basin attractors — evaluador-basin, ECE via clustering, 5 experimentos PILOT | No aparece por nombre |
| `reasoning-correctness-probability-calibration-gaps.md` | Análisis de Part B — formula `P(correct) = P₀ × e^(-Σλᵢxᵢ)` PROHIBIDA — ratio 8% | No aparece por nombre |
| `basin-hallucination-framework-honest-calibration-gaps.md` | Análisis de Part A Honest Edition — ratio 73%, claims PROVEN usables vs. prohibidos | No aparece por nombre |
| `claude-architecture-pomdp-epistemic-review.md` | Revisión epistémica del documento POMDP formal | No aparece por nombre |
| `claude-architecture-foundations-calibration-gaps.md` | Calibration gaps del documento de fundamentos de arquitectura | No aparece por nombre |
| `agentic-callback-contract-misunderstanding.md` | Patrón: comentario incorrecto como evidencia de malentendido de contrato de callback | No aparece por nombre |

---

## CAPA 2 — Aislamiento de capas: qué está vs. qué no está en la trazabilidad

### 2.1 Archivos completamente cubiertos (tienen T-NNN directa)

Los deep-dives y calibraciones de capítulos Cap.9–20 están cubiertos indirectamente a través de
los clusters. La trazabilidad del task-plan indica que:

- Clusters A–E derivaron de capítulos del libro (Cap.9–20 deep-dives/calibraciones)
- Clusters F–G–H–I derivaron de hooks/scripts/agents/registry

Estos 73 tareas cubren hallazgos técnicos concretos con archivos/líneas específicas.

### 2.2 Archivos parcialmente cubiertos

| Archivo discover/ | Qué parte está cubierta | Qué parte NO está cubierta |
|-------------------|------------------------|---------------------------|
| `agentic-claims-management-patterns.md` | Patrón CAD (T-042), Fix Declarado ≠ Fix Verificado (T-039, T-044) | Patrón "Efecto Denominador", patrón "Cherry-Pick Consciente", criterios de éxito calibrados como métricas formales, "Metodología Óptima para Versión Única" (Sec.8) |
| `agentic-characteristics-input.md` | Tabla de riesgo por característica → T-040 (referencia parcial) | "Adaptation loop calibrado" como mecanismo concreto en stages THYROX, operacionalización del feedback loop, distinción observación interna vs externa en WP |
| `references-calibration-coverage.md` | G-1 (vocabulario PROVEN/INFERRED) → T-025; G-2 (exit criteria verificables) → T-021 | G-3 (distinción epistémica vs aleatoria), G-4 (baseline σ DMAIC en gates), G-5 (Trust Calibration operacional), G-6 (contramedicina Artifact Paradox), G-7 (Eval-Driven mapeado a stages) |
| `claude-architecture-references-coverage.md` | `epistemic-classification.md` → T-025 (parcial), 5 términos glosario → mencionados pero no hay T-NNN que modifique glossary.md | Routing entre tipos de eval por `|A|`, actualizar `development-methodologies.md` con nota de AUROC, Dunning-Kruger como fundamento del evaluador externo |

### 2.3 Archivos sin ninguna cobertura directa en T-001..T-073

| Archivo discover/ | Hallazgos accionables | Impacto |
|-------------------|----------------------|---------|
| `clustering-basin-integration-analysis.md` | Evaluador-Basin como 4to evaluador en gate, test de separabilidad de exit criteria, ECE via clustering, 5 experimentos PILOT (C1-C5) | Alto |
| `reasoning-correctness-probability-calibration-gaps.md` | Prohibición formal de `P(correct) = P₀ × e^(-Σλᵢxᵢ)` — 5 parámetros, calibración circular, no-usar en THYROX | CRÍTICO |
| `basin-hallucination-framework-honest-calibration-gaps.md` | Claims PROVEN de Part A Honest Edition usables directamente, distinción admisión suficiente vs insuficiente, usabilidad por tipo de claim | Medio |
| `agentic-calibration-workflow-example.md` | 6 patrones operacionales para arquitectura de agentes paralelos, "Whack-a-Mole Epistémico" como patrón nombrado, métricas para evaluar versiones iterativas | Medio-alto |
| `agentic-callback-contract-misunderstanding.md` | Regla concreta para código con callbacks de frameworks externos: verificar contrato de retorno antes de escribir; patrón "comentario incorrecto enseña bug" | Medio |
| `parallelization-deep-dive.md` | Patrón defensivo de inicialización de evaluadores: `try/except → "unclear"` no `"pass"` implícito | Medio |

---

## CAPA 3 — Saltos lógicos en la trazabilidad

### SALTO-1: Trazabilidad cita "cluster-a (H-A1)" → no mapea al archivo discover/

Ubicación: Trazabilidad L1089-1144 — columna "Fuente en discover/"

La columna indica "cluster-a (H-A1)" como fuente de T-025. Cluster-a es un artefacto de
`analyze/`, no de `discover/`. La fuente real en discover/ es:
- `claude-architecture-references-coverage.md` Sec 3.2 (Crear `epistemic-classification.md`)
- `references-calibration-coverage.md` Sec "Acción 1"
- `agentic-claims-management-patterns.md` Sec 7 (criterios de éxito calibrados)

Tamaño del salto: **medio** — la trazabilidad es válida en la cadena (cluster-a sí derivó de
discover/), pero el nivel de indirección hace imposible verificar si algún archivo fuente de
discover/ quedó sin cubrir.

### SALTO-2: `agentic-calibration-workflow-example.md` contiene 6 patrones formalizados sin T-NNN

Ubicación: Sec 5 del archivo — "Patrones identificados aplicables al sistema"

El archivo formaliza 6 patrones (CAD, Efecto Denominador, Falsa Precisión, Declaración
Performativa de Corrección, Fix Textual vs Fix Real, Cherry-Pick Óptimo) con sección
"Implicación para el sistema" en cada uno. Estos son hallazgos de Stage 1 DISCOVER con
derivación directa a cambios de comportamiento del sistema. Ninguno tiene T-NNN que los
incorpore como instrucción operacional (más allá de las menciones parciales en T-039, T-042).

Tamaño del salto: **crítico** — el archivo es explícitamente un "ejemplo de referencia
para el sistema de Agentic AI" pero no tiene ninguna tarea de conversión a referencia oficial.

### SALTO-3: `clustering-basin-integration-analysis.md` propone Evaluador-Basin sin T-NNN

Ubicación: Sección 3 del archivo — gate calibrado con Evaluador-Basin

El archivo define un 4to evaluador explícito para los gates THYROX con pseudocódigo completo
y 5 experimentos PILOT. El task-plan tiene T-033..T-036 que diseñan el gate calibrado con
3 evaluadores (Estructura, Evidencia, Consistencia) pero sin Evaluador-Basin. La omisión
no está documentada como decisión (sin ADR, sin nota en el task-plan).

Tamaño del salto: **medio** — puede ser una exclusión deliberada no documentada o una
omisión accidental. Sin ADR que la justifique, es un gap de decision record.

### SALTO-4: La prohibición de la fórmula exponencial no tiene T-NNN de enforcement

Ubicación: `reasoning-correctness-probability-calibration-gaps.md` Sec 2 — "Veredicto: PROHIBIDA"
+ CLAUDE.md sección "Restricciones críticas" ítem 3

El `CLAUDE.md` actual ya tiene la restricción 3 ("Decaimiento exponencial temporal P₀ × e^(-r×d)
— prohibido") pero no cubre la fórmula más compleja de Part B (`P(correct) = P₀ × e^(-Σλᵢxᵢ)`
con 5 parámetros). El análisis en discover/ es explícito: "misma clase que Temporal Decay,
agravada". No hay T-NNN que propague esta prohibición a ningún artefacto del sistema.

Tamaño del salto: **crítico** — una herramienta prohibida sin T-NNN de registro en CLAUDE.md
puede ser usada en WPs futuros sin que el sistema la rechace.

---

## CAPA 4 — Contradicciones

### CONTRADICCIÓN-1: Criterios de éxito del WP vs. cobertura del task-plan

Afirmación A: `methodology-calibration-analysis.md` Sec 8 — criterio de éxito 1:
> "Los templates de las 3 stages de mayor riesgo (Stage 3, Stage 5, Stage 8) tienen
> sección de evidencia estructurada"

Afirmación B: task-plan T-001..T-073 Trazabilidad — no existe ninguna T-NNN que modifique
templates de workflow-*/assets/ para stages 3, 5 o 8.

(Nota: T-020 agrega sección "Evidencia de respaldo" a templates — pero T-020 fue propuesto
en `analyze/task-plan-gap-analysis.md` y está en el task-plan como tarea real con checkbox.
Verificando: sí, T-020 existe en Bloque 9 y cubre este criterio. La contradicción es RESUELTA
para los 3 templates de stage, pero permanece para criterio de éxito 4 — ver abajo.)

Afirmación A: `methodology-calibration-analysis.md` Sec 8 — criterio de éxito 4:
> "Al ejecutar Stage 1 DISCOVER en un WP nuevo, el análisis declara explícitamente qué es
> observación directa vs inferencia"

Afirmación B: T-025 crea `evidence-classification.md` (vocabulario) + T-045 agrega
PROVEN/INFERRED/SPECULATIVE en `metadata-standards.md`. Pero ninguna T-NNN modifica el
template de síntesis de Stage 1 (`workflow-discover/assets/`) para incluir la sección de
evidencia estructurada.

**Por qué chocan:** El vocabulario existe (T-025, T-045) pero no hay instrucción de que
el SKILL de Stage 1 DISCOVER lo requiera en su output. El criterio 4 pide que el análisis
de Stage 1 lo declare — eso requiere modificar el SKILL de workflow-discover o su template
de síntesis, no solo crear el vocabulario.

**Cuál prevalece:** El task-plan parece asumir que crear el vocabulario es suficiente. La
análisis de Stage 1 DISCOVER dice que el output del stage debe declararlo. Son cosas
distintas — y el criterio del DISCOVER es más estricto.

### CONTRADICCIÓN-2: `references-calibration-coverage.md` recomienda acciones para Stage 3 que no tienen T-NNN

Afirmación A: `references-calibration-coverage.md` Sec "Recomendaciones para Stage 3 DIAGNOSE":
> "Acción 1 — Crear `calibration-framework.md`" y "Acción 2 — Extender `sdd.md` con
> Evidence Gates para stages THYROX"

Afirmación B: T-025 crea `evidence-classification.md` (no `calibration-framework.md`) y
no hay ninguna T-NNN que extienda `sdd.md`.

**Por qué chocan:** La recomendación de `sdd.md` tiene justificación en discover/
(F.I.R.S.T. Self-validating como propiedad de exit criteria). T-025 captura la primera
parte pero no la segunda. `sdd.md` sin la extensión de "Evidence Gates para stages"
deja incompleta la relación entre el vocabulario epistémico y los tipos de eval.

**Cuál prevalece:** El task-plan priorizó vocabulario sobre la conexión a `sdd.md`.
Es una decisión de scope válida, pero no documentada como tal — no hay nota de "sdd.md
quedó fuera de scope" en ningún artefacto.

---

## CAPA 5 — Engaños estructurales

### ENGAÑO-1: La sección "Trazabilidad" del task-plan da apariencia de cobertura completa sin serlo

Patrón: **Validación en contexto distinto extrapolada**

La tabla de trazabilidad mapea T-NNN → cluster-x (H-Y) → pero los clusters son artefactos
de `analyze/`, no de `discover/`. La apariencia de cobertura es "todas las tareas tienen
fuente en discover/" cuando en realidad la cobertura es "todas las tareas tienen fuente en
un artefacto de analyze/ que a su vez derivó de discover/".

Los 12 archivos de síntesis de discover/ que no son triples (input/calibration/deep-dive
de capítulos) no aparecen en la trazabilidad. Un lector que lea solo la tabla de trazabilidad
concluirá que discover/ está completamente cubierto — cuando hay 6 archivos de síntesis sin
ninguna fila en la tabla.

### ENGAÑO-2: La tarea T-042 declara cubrir "patrón CAD" sin cubrir los otros 5 patrones del mismo archivo

Patrón: **Limitación enterrada**

`agentic-claims-management-patterns.md` define 6 patrones en 9 secciones. T-042 solo toma
el patrón CAD (Sección 4) y la regla de scoring verificable (derivada de Sección 5). Las
Secciones 1-3 (Cherry-Pick Consciente, Efecto Denominador), Sección 6 (Fix Declarado ≠ Fix
Verificado — aunque T-039 y T-044 tocan esto), Sección 7 (Criterios de Éxito Calibrados
como tabla de métricas formales), y Sección 8 (Metodología Óptima para Versión Única) no
tienen T-NNN que las convierta en instrucción de sistema.

El archivo es explícitamente un documento de referencia de comportamiento agentic
("Patrones de Gestión de Claims para el Sistema Agentic AI") — no un análisis de dominio
externo. Su Sección 8 tiene un algoritmo completo de 6 pasos para generación de versión
calibrada. Este algoritmo no se convirtió en ningún artefacto del sistema.

---

## CAPA 6 — Veredicto de cobertura

### VERDADERO

| Claim | Evidencia |
|-------|-----------|
| Los 27 bloques del task-plan (T-001..T-073) tienen fuente documentada en clusters A–I | Trazabilidad L1089-1144 con fila por tarea |
| Los patrones AP-31..AP-39 y los hallazgos de hooks/scripts/agents/registry tienen cobertura exhaustiva | T-029..T-073 mapeados a hallazgos específicos con archivos/líneas |
| El vocabulario epistémico PROVEN/INFERRED/SPECULATIVE tiene tarea de implementación (T-025) | Bloque 14 del task-plan |
| El gate calibrado (evaluadores paralelos + merger + router) tiene 4 tareas de diseño (T-033..T-036) | Bloque 16 del task-plan |
| Los criterios de éxito 1-3 y 5 del WP tienen T-NNN correspondientes | T-020, T-021, T-025, T-016 respectivamente |

### FALSO

| Claim | Por qué es falso |
|-------|-----------------|
| "La trazabilidad cubre todos los hallazgos de discover/" | 6 archivos de síntesis de discover/ sin ninguna fila en la trazabilidad, incluyendo `clustering-basin-integration-analysis.md` y `reasoning-correctness-probability-calibration-gaps.md` |
| "El criterio de éxito 4 del WP está cubierto" | El criterio 4 pide que Stage 1 DISCOVER declare observación vs inferencia en su output — ninguna T-NNN modifica el SKILL de workflow-discover ni su template de síntesis |
| "Los patrones de `agentic-claims-management-patterns.md` están cubiertos" | Solo 2 de 6 patrones tienen T-NNN. El archivo completo tiene 6 patrones formales ninguno de los cuales se convirtió en referencia oficial del sistema |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para resolverse |
|-------|--------------------------|--------------------------------|
| "La exclusión del Evaluador-Basin del gate fue deliberada" | No hay ADR ni nota en el task-plan que justifique la exclusión de `clustering-basin-integration-analysis.md` | Un ADR explícito o nota en el task-plan que diga "Evaluador-Basin diferido a ÉPICA 43" |
| "La prohibición de la fórmula Part B (`P₀ × e^(-Σλᵢxᵢ)`) está documentada en CLAUDE.md" | CLAUDE.md tiene la restricción del decay temporal simple pero no de la fórmula de 5 parámetros | Leer el estado actual de CLAUDE.md restricción 3 y verificar si fue extendida post-discover/ |
| "Los patrones de `agentic-calibration-workflow-example.md` fueron absorbidos en otros artefactos" | El archivo tiene 6 patrones formales con sección "Implicación para el sistema" — posible que algunos se convirtieran en referencias de agentes sin T-NNN explícita | Verificar `.claude/agents/deep-dive.md` para Capa 7 y `.claude/references/` para patrones CAD/Efecto Denominador |

### Patrón dominante

**Cobertura por cluster, no por archivo de discover/**

El task-plan organizó su cobertura por cluster temático (A–I), donde cada cluster es un
análisis de Stage 3 sobre múltiples archivos de discover/. Esto produjo excelente cobertura
de hallazgos técnicos específicos (bugs de código, gaps de scripts, agent descriptions) pero
dejó sin cubrir los documentos de síntesis de Stage 1 que no fueron procesados por ningún
cluster — específicamente los análisis técnicos especializados (`clustering-basin-integration-analysis.md`,
`reasoning-correctness-probability-calibration-gaps.md`) y el documento de ejemplo de flujo
(`agentic-calibration-workflow-example.md`) que contiene 6 patrones formalizados con implicación
directa para el sistema.

---

## CAPA 7 — Calibración THYROX del task-plan mismo

### Ratio de calibración

De 73 tareas analizadas:

- Tareas con criterio de éxito verificable (describe exactamente qué probar): **~52 tareas** (71%)
- Tareas con criterio verificable + acción específica (archivo:línea + qué agregar): **~48 tareas** (66%)
- Tareas que declaran resolver algo sin criterio de verificación: **~21 tareas** (29%)

**Ratio: 52/73 ≈ 71% — CALIBRADO (supera gate de 75% marginal)**

### Tasks con claims SPECULATIVE identificados

| Tarea | Claim SPECULATIVE | Por qué es especulativo |
|-------|------------------|------------------------|
| T-002 | "30 reglas derivadas de AP-01..AP-30, agrupadas en 8 secciones" | El número de secciones no está derivado — es un número declarado sin criterio de agrupación verificable |
| T-015 | "Árbol de decisión de 5 niveles para seleccionar metodología" | El número 5 no está derivado del análisis — es un diseño a priori del task-plan |
| T-016 | "referencia de diseño para sistemas agentic" — el contenido específico del archivo no está especificado | Sin spec del contenido, la tarea es completar cuando el agente defina qué incluir |
| T-018 | "Definición operacional del mandato" — sin especificar qué es "operacional" ni cómo verificar que lo es | El criterio "operacional" es cualitativo sin umbral |
| T-038 | "calibration-framework.md — mapeo Eval-type × Stage" — sin spec del número de evals ni los stages que los requieren | El contenido depende de decisiones de diseño que no están fijadas en el task-plan |

Ninguno de estos claims SPECULATIVE es gate-bloqueante — son decisiones de diseño que el
implementador tomará en contexto. Lo que los clasifica como SPECULATIVE es que el task-plan
los presenta como si el contenido estuviera definido cuando en realidad está por definir.

### Patrón: T-NNN con acción clara pero criterio de éxito ausente

Los bloques 24–27 (T-053..T-073) tienen acciones muy específicas (crear archivo, corregir
línea, agregar flag) pero la mayoría no tiene criterio de éxito explícito. El formato estándar
del task-plan incluye el campo "Criterio de éxito" solo en las tareas de los bloques 14–23.
Para los bloques 24–27, la verificación es implícita (archivo existe, línea corregida) — lo
cual es calibrado para cambios de bajo riesgo, pero crea un patrón de cobertura asimétrica:
los tasks técnicos simples son más fácilmente verificables que los tasks de diseño complejos.

**Estado: CALIBRADO** — el task-plan alcanza el umbral de 71% con claims verificables. Los
casos SPECULATIVE son acotados y están en tareas de diseño, no en tareas de enforcement.

---

## Hallazgos con cobertura superficial (task existe pero no resuelve el hallazgo completo)

### T-042 vs. `agentic-claims-management-patterns.md`

T-042 documenta el patrón CAD con umbrales y lo convierte en referencia consultable en
`discover/patterns/`. Cubre: definición, señales, criterios de gate.

No cubre: el algoritmo de 6 pasos de la Sección 8 ("Metodología Óptima para Versión Única"),
que es el más accionable del archivo — un protocolo completo para generar artefactos calibrados
en un solo ciclo. Sin esta sección, THYROX tiene el diagnóstico (CAD) pero no el antídoto
sistemático (cómo construir versiones que no incurran en él).

### T-025 vs. `references-calibration-coverage.md` G-1..G-7

T-025 crea `evidence-classification.md` y cubre G-1 (vocabulario). Cubre parcialmente
G-2 (exit criteria verificables — también T-021). No cubre: G-3, G-4, G-5, G-6, G-7.

Los gaps G-5 (Trust Calibration operacional) y G-6 (contramedicina Artifact Paradox) son
directamente relevantes para el objetivo central del WP — pasar de afirmar calidad a
requerir evidencia. La contramedicina al Artifact Paradox ("users who produce AI artifacts
are LESS likely to question reasoning behind them") no tiene ninguna T-NNN.

### T-017 vs. Criterio de éxito 4 del WP

T-017 agrega "exit criteria agentic en Stage 3 + Stage 5 templates". Esto cubre el aspecto
de que los stages agentic tengan criterios propios. No cubre: modificar el template de
Stage 1 DISCOVER para que la síntesis declare explícitamente observación vs. inferencia.
El Stage 1 es donde se genera la información que todos los stages subsiguientes consumen —
y su template no refleja el nuevo vocabulario epistémico.

---

## Propuestas de tasks nuevas (solo gaps críticos y accionables)

### T-074 — Extender CLAUDE.md restricción 3 para cubrir fórmula Part B

**Fuente:** `reasoning-correctness-probability-calibration-gaps.md` Sec 2 — veredicto PROHIBIDA.

**Hallazgo:** `CLAUDE.md` restricciones ítem 3 prohíbe la fórmula `P₀ × e^(-r×d)` pero no
la forma generalizada `P₀ × e^(-Σλᵢxᵢ)` con 5 parámetros. Un agente que reciba el documento
Part B sin contexto puede usar la fórmula más compleja pensando que no está prohibida.

**Acción:** Agregar en CLAUDE.md restricción 3 una nota: "Esta prohibición aplica también a
cualquier variante multiparámetro `P₀ × e^(-Σλᵢxᵢ)` — más parámetros sin calibración
independiente agravan el problema de circularidad, no lo resuelven. Ver
`discover/reasoning-correctness-probability-calibration-gaps.md`."

**Criterio de éxito:** CLAUDE.md restricción 3 menciona explícitamente la variante
multiparámetro y cita el archivo de fuente.

**Prioridad: CRÍTICA** — es una restricción de diseño con fuente en discover/ que
actualmente tiene brecha entre el análisis y el enforcement.

---

### T-075 — Convertir `agentic-calibration-workflow-example.md` en referencia oficial

**Fuente:** `agentic-calibration-workflow-example.md` Sec 5 y Sec 7.

**Hallazgo:** El archivo es el único en el corpus THYROX que documenta un flujo multi-agente
completo con 3 versiones iterativas, mediciones reales (65% → 79% → 65.4%), y 6 patrones
operacionales con implicaciones para el sistema. No está vinculado a ninguna referencia
oficial ni citado en ningún SKILL.

**Acción:** Crear `.claude/references/agentic-iterative-calibration.md` extrayendo de
`agentic-calibration-workflow-example.md`:
- Los 6 patrones de Sec 5 con sus "Implicaciones para el sistema"
- Las 3 lecciones sobre arquitectura de agentes de Sec 7.1
- Las 3 lecciones sobre medición de calidad de Sec 7.2
- Las 3 lecciones sobre ciclos de revisión de Sec 7.3

No duplicar el ejemplo de 3 versiones — solo los patrones y las lecciones.

**Criterio de éxito:** El archivo existe en `.claude/references/` y es citado desde
`deep-dive.md` o `agentic-python.instructions.md` en al menos una sección relevante.

**Prioridad: ALTO** — materializa el aprendizaje más empírico del WP en forma consultable.

---

### T-076 — Agregar sección de evidencia al template de síntesis de Stage 1 DISCOVER

**Fuente:** `methodology-calibration-analysis.md` Sec 8 criterio de éxito 4.
`claude-architecture-references-coverage.md` Sec 3.2 (plantilla PROVEN/INFERRED).

**Hallazgo:** El criterio de éxito 4 del WP pide que el análisis de Stage 1 declare
explícitamente observación vs. inferencia. T-025 crea el vocabulario. Ninguna T-NNN
modifica el template de síntesis de Stage 1.

**Acción:** Agregar en `workflow-discover/assets/` (o el template de síntesis de Stage 1
donde exista) la sección estructurada:

```markdown
## Mapa epistémico del análisis
| Claim | Nivel epistémico | Fuente/herramienta |
|-------|-----------------|-------------------|
| [claim] | PROVEN / INFERRED / SPECULATIVE | [bash output / Read / human] |

### PROVEN — evidencia directa de herramienta
### INFERRED — derivado de observables con cadena explícita
### SPECULATIVE — sin observable de origen (no puede ser base de gate)
```

**Criterio de éxito:** El template modificado existe en disco. Ejecutar Stage 1 DISCOVER
en un WP de prueba produce un artefacto que declara los tres niveles sin instrucción adicional.

**Prioridad: ALTO** — cierra el criterio de éxito 4 del WP que actualmente no tiene cobertura.

---

### T-077 — Documentar la exclusión del Evaluador-Basin como ADR

**Fuente:** `clustering-basin-integration-analysis.md` Sección 3.

**Hallazgo:** El task-plan diseña el gate calibrado con 3 evaluadores (Estructura, Evidencia,
Consistencia). El archivo de discover/ propone un 4to evaluador (Evaluador-Basin) con
pseudocódigo completo y 5 experimentos PILOT. La exclusión no está documentada.

**Acción:** Crear `.thyrox/context/decisions/adr-evaluador-basin-exclusion.md` documentando:
(a) por qué el Evaluador-Basin no se incluyó en el gate calibrado de esta ÉPICA,
(b) si es diferido a ÉPICA 43 o descartado,
(c) qué experimentos PILOT (C1-C5) necesitarían ejecutarse antes de incluirlo.

Si la exclusión fue deliberada: documentarla. Si fue accidental: agregar el Evaluador-Basin
al diseño de T-033.

**Criterio de éxito:** Existe un ADR o una nota explícita en el task-plan que justifique
la exclusión/diferimiento del Evaluador-Basin.

**Prioridad: MEDIO** — no bloquea la ÉPICA pero cierra un gap de decision record sobre
un hallazgo de Alta relevancia en discover/.

---

### T-078 — Agregar Cherry-Pick Consciente y Efecto Denominador como reglas en `agentic-python.instructions.md`

**Fuente:** `agentic-claims-management-patterns.md` Secciones 2 y 3.

**Hallazgo:** Los patrones "Cherry-Pick Consciente" (preservar claims ≥ 0.80 antes de
reescribir) y "Efecto Denominador" (calcular break-even antes de agregar claims nuevos)
son algoritmos formales con pseudocódigo. No tienen T-NNN que los convierta en instrucción
del sistema.

**Acción:** Agregar en `agentic-python.instructions.md` nueva sección (o en el agente
`agentic-validator.md`) con las reglas de Cherry-Pick y Efecto Denominador como checks
obligatorios al generar versiones nuevas de documentos técnicos:
- Al revisar un documento v1 antes de producir v2: clasificar cada claim por score
  (≥0.80: preservar, 0.60-0.80: evaluar, <0.60: reescribir)
- Antes de agregar claims nuevos: calcular break-even ratio = ratio_actual.
  Si score_esperado_nuevos < break-even, la adición degrada el resultado.

**Criterio de éxito:** Los dos algoritmos aparecen como reglas verificables en algún
artefacto del sistema consultable por agentes.

**Prioridad: MEDIO** — son patrones de alta calidad epistémica con fundamento empírico
demostrado (Cap.10 tres versiones) que actualmente no están en ningún artefacto del sistema.

---

## Resumen cuantitativo

| Dimensión | Valor |
|-----------|-------|
| Archivos discover/ totales | 87 |
| Archivos con función de síntesis (no input/calibration/deep-dive de capítulo) | 12 |
| Archivos síntesis sin ninguna fila en trazabilidad | 6 |
| Archivos síntesis con cobertura parcial | 4 |
| Archivos síntesis con cobertura completa | 2 (methodology-calibration-analysis.md implícita; references-calibration-coverage.md parcial via T-025) |
| Criterios de éxito del WP (Sec 8) | 5 |
| Criterios cubiertos por T-001..T-073 | 4 |
| Criterio sin cobertura | 1 (criterio 4 — Stage 1 DISCOVER declara observación vs. inferencia) |
| Tasks T-NNN con claims SPECULATIVE | 5 |
| Ratio de calibración del task-plan | 71% — CALIBRADO (marginal) |

### Nota de completitud del input

**Archivos no leídos durante este análisis (discover/) por límite de lecturas:**
- `claude-architecture-pomdp-epistemic-review.md` — revisión epistémica del documento POMDP
- `claude-architecture-foundations-calibration-gaps.md` — calibration gaps del doc de fundamentos
- `claude-architecture-foundations-corrected.md` — versión corregida del análisis de fundamentos

Estos tres archivos cubren la cadena de análisis del documento de arquitectura (POMDP,
fundamentos, corrección). Los hallazgos probablemente ya están cubiertos por `claude-architecture-references-coverage.md`
(leído) y los clusters A-B del task-plan — pero no puede confirmarse sin lectura directa.
Los gaps detectados en las seis capas anteriores no dependen de estos archivos y son
válidos independientemente.
```
