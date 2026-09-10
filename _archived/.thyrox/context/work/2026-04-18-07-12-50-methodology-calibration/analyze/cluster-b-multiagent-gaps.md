```yml
created_at: 2026-04-20 00:16:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: deep-dive
status: Borrador
```

# Cluster B — Gaps de Multi-Agent, Memory, RAG, Parallelization, Routing, Prompt Chaining, A2A

**Fuente:** Archivos en `discover/` del WP methodology-calibration (Cluster B)
**Contraste con:** `plan-execution/methodology-calibration-task-plan.md` (T-001..T-024)
**Metodología:** Para cada archivo: 2-3 hallazgos más relevantes para THYROX → contraste con tareas existentes → propuesta de tarea nueva donde hay gap.

---

## Parte 1 — Hallazgos por archivo

### Archivo 1: `multiagent-collaboration-deep-dive.md`

**Hallazgo B-MA-1 — El Merger del gate calibrado es SPOF sin mitigaciones definidas**

El deep-dive documenta en Q6 (Capa 7) que la arquitectura del gate calibrado THYROX (evaluadores paralelos → Merger de síntesis) es isomórfica al Modelo Supervisor de Cap.7, y el capítulo identifica explícitamente que este modelo "introduce un punto único de falla (el supervisor)". El documento lista cuatro mitigaciones ausentes:
1. Auditoría del Merger — registro verificable del razonamiento de síntesis
2. Validación de cobertura — verificar que el Merger consideró todos los evaluadores
3. Meta-evaluador — agente adicional que verifica que el Merger siguió el protocolo
4. Circuit breaker — si el Merger produce `pass` pero N evaluadores retornaron `unclear`, escalar a humano

Ninguno de T-001..T-024 define estas mitigaciones. T-021 toca el umbral de confianza pero no el comportamiento del Merger cuando evaluadores fallan. El gap es exacto: el task-plan diseña evaluadores paralelos (Bloque 10 mencionado como contexto) pero no diseña el comportamiento del Merger ante fallos.

**Hallazgo B-MA-2 — La distinción Chaining vs Multi-Agent requiere herramientas distintas (no solo prompts) para ser arquitectónicamente real en THYROX**

El deep-dive establece (Implicación 3) que la única diferencia verificable entre Chaining y Multi-Agent en THYROX es que los agentes tengan tool-sets realmente distintos. Los agentes THYROX actuales (`deep-dive`, `agentic-reasoning`, `task-executor`) tienen tool-sets distintos — eso está bien — pero ningún documento THYROX formaliza este criterio como regla de diseño para agentes nuevos. El riesgo: cuando se crea un agente nuevo (ej. `agentic-validator` en T-004/T-005), si no hay regla que exija tool-set diferencial, el agente puede ser solo un "agente de prompt distinto" sin especialización real.

**Hallazgo B-MA-3 — El Modelo Consenso no tiene implementación y no debe confundirse con el gate calibrado**

El deep-dive establece (Implicación 1) que el gate calibrado THYROX NO es Consenso — es Parallelization + Merger. El Consenso requeriría rondas de discusión entre evaluadores. Esta distinción no está documentada en ningún artefacto de diseño del gate. El riesgo: si un agente futuro intenta implementar el gate como "evaluadores que discuten entre sí", introducirá complejidad sin protocolo de terminación definido.

---

### Archivo 2: `memory-pattern-deep-dive.md`

**Hallazgo B-MEM-1 — THYROX no tiene mapa de composición de patrones de memoria entre capítulos**

El deep-dive (Sec. 7.5) documenta que después de 6 capítulos el libro no provee ningún mapa de cuándo un sistema necesita más de un patrón simultáneamente. Para THYROX esto tiene impacto directo: el sistema usa memoria persistente (`.thyrox/context/`, git), pero no hay definición de cuáles claims de un stage se propagan al siguiente con qué condiciones. El prompt-chaining-input.md (archivos del mismo cluster) lo llama "context pruning" — solo las afirmaciones con evidencia observable deberían propagarse. Este mecanismo no existe ni está planificado en T-001..T-024.

**Hallazgo B-MEM-2 — El patrón "Implementation Facade" es replicable en evaluadores THYROX (función con firma correcta pero cuerpo incorrecto)**

La CONTRADICCIÓN-1 del deep-dive (función `retrieve_relevant_memory(query, top_k)` que ignora `query` y devuelve últimos N) es el mismo anti-patrón que podría ocurrir en los evaluadores del gate THYROX: una función con firma `evaluar_evidencia(artefacto, criterios)` que internamente ignora `criterios` y evalúa heurísticamente. T-004/T-005 crean el agente `agentic-validator` pero no definen el contrato de sus funciones internas. La guideline `agentic-python.instructions.md` (T-002) puede incluir este patrón en su Sección 2 (Type Contracts — AP-03..AP-06) si se explicita.

**Hallazgo B-MEM-3 — No hay gestión de crecimiento del contexto de WP entre stages**

El deep-dive (CONTRADICCIÓN-3) muestra que el Código 1 del capítulo identifica el problema del historial ilimitado pero no lo resuelve. THYROX tiene el mismo patrón: `now.md` y los artefactos de WP acumulan claims sin filtrado por evidencia. Cuando un stage avanzado (Stage 8 PLAN EXECUTION) hereda afirmaciones de Stage 1, no hay criterio que filtre cuáles claims tienen respaldo observable. Esto es el "context pruning" del prompt-chaining-input.md. No está cubierto en T-001..T-024.

---

### Archivo 3: `rag-pattern-deep-dive.md`

**Hallazgo B-RAG-1 — El patrón de "citación de fuentes como garantía" está ausente en templates THYROX**

La CONTRADICCIÓN-1 del deep-dive establece que RAG promete "citations, which pinpoint the exact source" pero el código no implementa citación. Para THYROX, el análogo es: los artefactos de stage declaran claims (ej. "el análisis es completo") sin citar qué evidencia los respalda. T-020 agrega la sección "Evidencia de respaldo" en templates, pero la regla de que un claim sin fuente bloquea el gate no está definida como invariante del sistema. T-020 propone el campo pero no define la consecuencia operacional de omitirlo.

**Hallazgo B-RAG-2 — Agentic RAG y su ausencia en el sistema de evaluación de THYROX**

El deep-dive identifica que el código del capítulo implementa RAG estándar (retrieve → generate) pero no los 4 escenarios de Agentic RAG: validación de fuentes, reconciliación de conflictos, multi-step reasoning, gap detection. El gate calibrado THYROX es conceptualmente un Agentic RAG: recupera artefactos anteriores, evalúa si hay conflictos con constraints previos, y detecta gaps. Sin embargo, el diseño actual (T-020, T-021) no especifica qué artefactos previos debe recuperar el evaluador de consistencia ni con qué criterio detecta conflictos. El gap: el "evaluador de consistencia" mencionado en el parallelization-deep-dive no tiene especificación de qué hace.

**Hallazgo B-RAG-3 — Los valores hardcodeados sin calibración empírica son anti-patrón para gates THYROX**

El deep-dive documenta que `SIMILARITY_TOP_K=5`, `VECTOR_DISTANCE_THRESHOLD=0.7`, `chunk_size=500` son valores inventados sin derivación. Para THYROX, el análogo exacto es `confidence_threshold: 0.80` en el gate de T-021 — un número que el task-plan presenta sin derivación empírica. El deep-dive de solidez (CONTRADICCIÓN en thyrox-engine-solidez-deep-dive.md) ya identificó que los valores numéricos de calibración en THYROX son INCIERTOS. T-021 no puede resolver este problema proponiendo `0.80` sin especificar cómo se valida ese umbral.

---

### Archivo 4: `parallelization-deep-dive.md`

**Hallazgo B-PAR-1 — Los contratos output_key de cada evaluador no están diseñados**

El deep-dive establece (Sec. 3.1) que `output_key` es un contrato: si el agente cambia su clave sin actualizar el template del merger, el merger falla silenciosamente. Define el contrato formal:
```
output_key: evidence_result
campos_obligatorios:
  claims_sin_ancla: int
  ratio_calibracion: float
  claims_performativos: list[str]
status: pass | rework | unclear
```
Ningún task en T-001..T-024 diseña estos contratos. T-020 agrega la sección "Evidencia de respaldo" en templates, pero eso es el artefacto que el evaluador analiza — no el schema del output del evaluador. Los contratos de los evaluadores son un artefacto de diseño explícitamente ausente.

**Hallazgo B-PAR-2 — El protocolo de failure de evaluador (qué pasa cuando un evaluador falla) no está definido**

El deep-dive (Sec. 6.1) documenta que `ParallelAgent` no especifica su comportamiento cuando un sub-agente lanza excepción. Propone que ausencia de state file = `unclear` automático. Este protocolo no aparece en ningún task. T-021 agrega `confidence_threshold` en el gate pero no define qué hace el gate cuando un evaluador no produce output. Es el riesgo operacional más inmediato del gate calibrado.

**Hallazgo B-PAR-3 — La barrera de sincronización en Claude Code requiere state files explícitos — no documentado como patrón de diseño**

El deep-dive (Sec. 6.4 y 9.8) especifica el patrón completo:
```
.thyrox/context/work/{wp}/track/gate-{N}-{timestamp}/
  ├── structural_result.md
  ├── evidence_result.md
  ├── consistency_result.md
  └── verdict.md
```
El task-plan no incluye creación de este directorio como parte de ningún task. La barrera de sincronización (esperar que los tres archivos existan antes de invocar el merger) tampoco está especificada. Los evaluadores de T-004/T-005 son el `agentic-validator` genérico — no los evaluadores del gate calibrado con este patrón de state files.

---

### Archivo 5: `routing-pattern-input.md`

**Hallazgo B-ROT-1 — El routing a 3 niveles (inter-stage / intra-stage / tool selection) no está documentado en ningún workflow-* skill**

El documento define explícitamente tres niveles de routing:
- Nivel 1: gate entre stages (pass/rework/escalate/unclear)
- Nivel 2: dentro de un stage, qué análisis ejecutar (coverage/naming/architecture)
- Nivel 3: dentro de un análisis, qué instrumento (ishikawa, 5-whys, deep-review)

Los workflow-* skills actuales implementan implícitamente el Nivel 2 (domain subdirectories en Stage 3) y el Nivel 3 (elección de herramienta de análisis), pero sin routing explícito ni criterios documentados. El riesgo: la elección de qué análisis hacer en Stage 3 es probabilística (el LLM decide) en lugar de determinística (criterio basado en el tipo de causa). T-015 toca el árbol de decisión para sistemas agentic pero no el routing intra-stage.

**Hallazgo B-ROT-2 — El unclear-handler (cuarta ruta del gate) no está diseñado**

El documento define que `unclear` es un meta-signal: "si el gate frecuentemente no puede clasificar, el problema no es el artefacto — es que los criterios de gate están mal definidos." El handler de `unclear` debe iniciar calibración de los propios criterios del gate. T-021 agrega `confidence_threshold` pero no define qué pasa cuando el gate emite `unclear` — no hay protocolo de revisión de criterios.

**Hallazgo B-ROT-3 — El estado acumulado del WP como input del gate no está especificado**

El documento establece (Sección 4) que el gate de Stage 6 no solo evalúa el output de Stage 5 — evalúa constraints de Stage 4, hipótesis de Stage 3, baseline de Stage 2. "Sin estado acumulado, el gate es miope." Ningún evaluador en el task-plan especifica qué artefactos de stages anteriores consulta. El evaluador de consistencia del parallelization-deep-dive necesita este input para funcionar.

---

### Archivo 6: `prompt-chaining-input.md`

**Hallazgo B-PC-1 — Context pruning: las afirmaciones sin evidencia observable no deben propagarse al siguiente stage**

El documento establece que THYROX tiene la cadena (12 stages) pero le falta validación en cada eslabón. Introduce el concepto de "context pruning": solo las afirmaciones con evidencia observable deben pasar al siguiente stage. Este mecanismo no existe en THYROX. T-020 agrega la sección "Evidencia de respaldo" en templates, pero no define el mecanismo de filtrado — qué claims NO pasan el gate y cómo se registra esa decisión. El gate pasa o no pasa el artefacto completo. No hay capacidad de "pasar el artefacto sin los claims sin evidencia".

**Hallazgo B-PC-2 — Los loops condicionales (regresar a stage anterior) no están definidos como invariante**

El documento pregunta explícitamente: "evaluar si los loops condicionales del capítulo aplican a THYROX (ej: stage regresa a DISCOVER si el gate falla)." El task-plan no responde esto. Cuando el gate emite `rework`, ¿el WP regresa exactamente al stage anterior? ¿O puede regresar varios stages? ¿Cuál es la regla? I-011 establece que el WP no se cierra sin instrucción explícita, pero no define el comportamiento del loop de rework dentro del WP.

---

### Archivo 7: `a2a-pattern-deep-dive.md`

**Hallazgo B-A2A-1 — El protocolo A2A tiene naming inconsistente entre versiones y THYROX usa JSON-RPC en sus MCPs**

La CONTRADICCIÓN-1 del deep-dive establece que `sendTask` (JSON-RPC payloads en el capítulo) y `tasks/send` (Key Takeaways) son nomenclaturas de versiones distintas del protocolo A2A. Un implementador que siga los payloads recibirá `Method not found`. Para THYROX, los servidores MCP en `.thyrox/registry/mcp/` usan JSON-RPC. Si THYROX en algún momento integra A2A para comunicación entre agentes de distintos frameworks, la version mismatch puede causar fallos silenciosos. No hay task de tracking del protocolo A2A ni de su versión.

**Hallazgo B-A2A-2 — Los servicios in-memory (InMemorySessionService, InMemoryArtifactService) son el anti-patrón de los state files de THYROX**

El deep-dive (BUG-2, Patrón 4) documenta que componentes in-memory pierden estado al reiniciar el proceso. Para THYROX, `now.md` y los WP son el equivalente a `DatabaseSessionService` — persistencia real. Sin embargo, los agentes nativos THYROX durante su ejecución (context window) tienen estado que NO persiste si el agente es interrumpido. El patrón de state files del parallelization-deep-dive (escribir `evidence_result.md` al filesystem antes de terminar) es la mitigación correcta y directamente análoga al fix de BUG-2. Esta conexión entre ambos documentos no está capturada en ningún task.

**Hallazgo B-A2A-3 — El patrón "Named Mechanism vs. Implementation" es sistémico en el libro y THYROX debe usarlo como criterio de validación de sus propias referencias**

El deep-dive establece que Cap.10-15 (6 capítulos consecutivos) muestran el patrón donde el mecanismo del título está subrepresentado en el código. Para THYROX, esto tiene una consecuencia para T-019 (platform-evolution-tracking.md): cuando THYROX incorpora una referencia del libro (ej. "usar RAG para evaluadores"), debe verificar que el mecanismo real del código, no solo el mecanismo del título, es lo que se implementa. Este criterio de validación no está en T-019 ni en ningún otro task.

---

## Parte 2 — Contraste con T-001..T-024

### Mapa de cobertura existente

| Hallazgo | ¿Cubierto en T-001..T-024? | Task más cercano | Gap real |
|----------|---------------------------|------------------|---------|
| B-MA-1 (SPOF del Merger, 4 mitigaciones) | PARCIAL | T-021 (confidence_threshold) | T-021 no define comportamiento del Merger ante fallos de evaluadores |
| B-MA-2 (tool-set distinto como criterio de agente real) | PARCIAL | T-002 (agentic-python.instructions.md) | AP-25 toca naming, no el criterio de tool-set como definición de agente distinto |
| B-MA-3 (gate != Consenso, documentar distinción) | NO | — | Gap total — no existe task que documente esta distinción de diseño |
| B-MEM-1 (mapa de composición de patrones, context pruning) | NO | T-020 (evidencia de respaldo) | T-020 agrega campo pero no define propagación filtrada de claims |
| B-MEM-2 (Implementation Facade en evaluadores, tipo contracts) | PARCIAL | T-002 Sección 2 (AP-03..AP-06) | AP-03..AP-06 cubren type contracts en Python; no el contrato de output_key del evaluador |
| B-MEM-3 (crecimiento de contexto sin filtrado entre stages) | NO | — | Gap total — no existe mecanismo de context pruning entre stages |
| B-RAG-1 (claim sin fuente bloquea gate — consecuencia operacional) | PARCIAL | T-020 | T-020 agrega el campo pero no define la regla de bloqueo |
| B-RAG-2 (evaluador de consistencia — qué recupera y cómo detecta conflictos) | NO | — | Gap total — el evaluador de consistencia no está especificado |
| B-RAG-3 (confidence_threshold 0.80 sin derivación empírica) | PARCIAL | T-021 | T-021 usa 0.80 sin derivación — el problema es real pero T-021 lo propaga |
| B-PAR-1 (contratos output_key de cada evaluador) | NO | — | Gap total — ningún task diseña el schema de output de los evaluadores |
| B-PAR-2 (protocolo de failure de evaluador) | NO | — | Gap total — ningún task define qué pasa cuando un evaluador falla |
| B-PAR-3 (state files para barrera de sincronización) | NO | — | Gap total — ningún task crea el directorio de gate ni el protocolo de barrera |
| B-ROT-1 (routing intra-stage — criterios explícitos por tipo de causa) | NO | T-015 (árbol Agentic AI) | T-015 toca árbol de decisión para metodología, no routing intra-stage |
| B-ROT-2 (unclear-handler — protocolo de revisión de criterios) | NO | T-021 | T-021 agrega confidence_threshold pero no el handler de `unclear` |
| B-ROT-3 (estado acumulado como input del gate) | NO | — | Gap total — ningún evaluador especifica qué artefactos de stages anteriores consulta |
| B-PC-1 (context pruning — mecanismo de filtrado de claims) | NO | T-020 | T-020 agrega evidencia de respaldo pero no el filtrado al pasar entre stages |
| B-PC-2 (loops de rework — cuántos stages regresa) | NO | — | Gap total — el comportamiento del loop de rework no está definido |
| B-A2A-1 (A2A version tracking en MCPs) | PARCIAL | T-019 | T-019 trackea plataforma Claude Code, no protocolos externos como A2A |
| B-A2A-2 (state files como alternativa a in-memory) | PARCIAL | T-022, parallelization-deep-dive | Conexión entre patrón in-memory y state files no capturada explícitamente |
| B-A2A-3 (Named Mechanism vs. Implementation como criterio de validación de referencias) | NO | T-019 | T-019 trackea plataforma, no calidad de referencias bibliográficas |

### Hallazgos sin cobertura en T-001..T-024 (lista definitiva)

Los siguientes 9 hallazgos no tienen tarea que los cubra:

1. **B-MA-3** — Documentar que gate calibrado != Consenso (rondas de discusión)
2. **B-MEM-1 / B-PC-1 / B-MEM-3** — Context pruning: filtrado de claims sin evidencia entre stages (tres hallazgos convergen al mismo mecanismo)
3. **B-RAG-2** — Especificación del evaluador de consistencia (qué artefactos previos recupera, cómo detecta conflictos)
4. **B-PAR-1** — Contratos formales output_key de cada evaluador (schema, tipos, valores posibles)
5. **B-PAR-2** — Protocolo de failure de evaluador (state file ausente = unclear automático)
6. **B-PAR-3** — Estructura de state files para barrera de sincronización del gate
7. **B-ROT-2** — Protocolo unclear-handler (qué pasa cuando el gate no puede clasificar)
8. **B-ROT-3** — Estado acumulado como input del gate (qué artefactos de stages anteriores evalúa el evaluador de consistencia)
9. **B-PC-2** — Protocolo de loops de rework (cuántos stages regresa, criterio de selección)

Y los siguientes 3 hallazgos tienen cobertura parcial que requiere refuerzo:

- **B-MA-1** — Mitigaciones del Merger SPOF (T-021 toca el threshold pero no el comportamiento ante fallos)
- **B-RAG-1 / B-RAG-3** — La regla de bloqueo por claim sin fuente (T-020 agrega el campo, no la consecuencia) y el problema del threshold sin derivación empírica (T-021 propaga el valor sin resolverlo)
- **B-A2A-3** — Criterio de validación de referencias (T-019 no lo cubre)

---

## Parte 3 — Propuesta de nuevas tareas

### T-025 — Diseñar contratos formales de output_key para cada evaluador del gate calibrado

**Prioridad:** CRÍTICO — sin contratos, los evaluadores de T-020 no pueden implementarse sin ambigüedad

**Hallazgos cubiertos:** B-PAR-1, B-MA-2 (parcial — tool-set distinto como criterio)

**Acción:** Crear `.claude/skills/workflow-track/references/gate-evaluator-contracts.md`

**Contenido mínimo:**
- Schema completo para cada evaluador: `evaluador-completitud`, `evaluador-evidencia`, `evaluador-consistencia`
- Por evaluador: `output_key`, campos obligatorios con tipos Python, valores posibles, campo `error` con formato estándar
- Regla de herencia: si un evaluador no puede producir un campo obligatorio → `status: unclear` con `error.reason` obligatorio
- Regla de tool-set: cada evaluador debe tener tool-set distinto del generador del artefacto (criterio B-MA-2)

**Dependencias:** T-017 (define criterios de evidencia), T-020 (define qué evalúa el evaluador de evidencia)

---

### T-026 — Definir protocolo de failure de evaluador y structure de state files del gate

**Prioridad:** CRÍTICO — sin este protocolo, el gate paralelo no puede operar de forma determinista

**Hallazgos cubiertos:** B-PAR-2, B-PAR-3, B-A2A-2 (conexión state files vs in-memory)

**Acción:** Crear `.claude/skills/workflow-track/references/gate-state-files-protocol.md`

**Contenido mínimo:**
- Estructura de directorio de gate:
  ```
  .thyrox/context/work/{wp}/track/gate-{stage-N}-{timestamp}/
    ├── structural_result.md
    ├── evidence_result.md
    ├── consistency_result.md
    └── verdict.md
  ```
- Regla de barrera: el Merger no se invoca hasta que los tres archivos existen
- Protocolo de failure: si un state file no existe después de timeout → el evaluador correspondiente cuenta como `status: unclear`
- Formato mínimo de cada state file (encabezado yml con `output_key`, `status`, campos del contrato)
- Regla de rollback: si el gate produce `rework`, los state files del gate se archivan, no se eliminan (trazabilidad)

**Dependencias:** T-025 (contratos de evaluador), T-022 (validate-session-close.sh)

---

### T-027 — Especificar el evaluador de consistencia (qué artefactos recupera y cómo detecta conflictos)

**Prioridad:** CRÍTICO — es el tercer evaluador requerido para gates de alto riesgo, sin especificación no puede implementarse

**Hallazgos cubiertos:** B-RAG-2, B-ROT-3 (estado acumulado como input del gate)

**Acción:** Agregar sección "Evaluador de Consistencia — especificación" en el documento de contratos (T-025) o crear `.claude/skills/workflow-track/references/evaluador-consistencia-spec.md`

**Contenido mínimo:**
- Por tipo de gate (Stage 3→4, Stage 5→6, Stage 8→9): qué artefactos de stages anteriores son inputs del evaluador
- Criterio de detección de conflicto: qué cuenta como "contradicción con constraints de Stage 4" vs "divergencia aceptable"
- Tabla: Stage N → artefactos relevantes para consistencia → predicado de verificación
- Comportamiento cuando el artefacto anterior está ausente (WP nuevo sin baseline): `status: unclear` con advertencia, no `rework`

**Dependencias:** T-025 (contratos), T-027 no puede preceder a T-025

---

### T-028 — Definir el unclear-handler y el protocolo de revisión de criterios del gate

**Prioridad:** ALTO — sin handler definido, `unclear` es una ruta muerta que no tiene continuación operacional

**Hallazgos cubiertos:** B-ROT-2, B-MA-1 (parcial — circuito de escalada del Merger)

**Acción:** Agregar sección "Ruta unclear — protocolo" en `.claude/skills/workflow-track/SKILL.md`

**Contenido mínimo:**
- Definición operacional: `unclear` = el evaluador no pudo clasificar, no = el artefacto es malo
- Trigger condition: cualquier evaluador retorna `status: unclear` → gate retorna `unclear` (no intenta clasificar con datos incompletos)
- Handler de `unclear`:
  1. Registrar en `track/gate-{N}/verdict.md` con campo `unclear_reason` del evaluador que falló
  2. Crear issue en `technical-debt.md` si `unclear` se repite en el mismo tipo de gate más de 2 veces (criterio de mal-diseño de criterios)
  3. Escalar a SP humano para revisar el criterio de evaluación, no el artefacto
- Diferencia con `escalate`: `escalate` = el artefacto requiere decisión humana; `unclear` = el gate requiere calibración

**Dependencias:** T-026 (state files del gate), T-021 (confidence_threshold)

---

### T-029 — Documentar el protocolo de context pruning entre stages

**Prioridad:** ALTO — sin este mecanismo, los errores de Stage 1 se propagan amplificados hasta Stage 10

**Hallazgos cubiertos:** B-MEM-1, B-MEM-3, B-PC-1 (tres hallazgos convergen)

**Acción:** Agregar sección "Context Pruning — qué claims pasan al stage siguiente" en `.claude/skills/workflow-standardize/SKILL.md` y en `.claude/skills/workflow-discover/assets/exit-conditions.md.template`

**Contenido mínimo:**
- Regla de propagación: solo los claims con `Confianza: alta` (campo de sección "Evidencia de respaldo" de T-020) se propagan como hechos al stage siguiente
- Regla de claims de confianza media: se propagan como `hipótesis pendiente de confirmación` (no como hechos)
- Regla de claims de confianza baja o sin fuente: no se propagan — se registran en `track/gate-N/claims-no-propagados.md` con razón
- Implementación mínima: el gate de cada stage genera `context-summary-{stage-N}.md` con solo los claims aprobados
- Anti-patrón a eliminar: pasar el artefacto completo sin filtro como input del stage siguiente

**Dependencias:** T-020 (sección "Evidencia de respaldo" — sin ella el campo de confianza no existe), T-026 (state files del gate donde viven los claims no propagados)

---

### T-030 — Definir el protocolo de loops de rework (cuántos stages regresa)

**Prioridad:** ALTO — sin este protocolo, `rework` no tiene semántica operacional completa

**Hallazgos cubiertos:** B-PC-2

**Acción:** Agregar sección "Ruta rework — protocolo de regresión" en `.claude/skills/workflow-track/SKILL.md`

**Contenido mínimo:**
- Regla por defecto: `rework` regresa al stage inmediatamente anterior (Stage N → Stage N-1)
- Excepción: si el diagnóstico del evaluador indica que el problema es de Stage N-2 o anterior (ej. constraint omitido en Stage 4 que invalida Stage 5 y Stage 6), el rework puede saltar dos stages
- Criterio de salto: `rework.source_stage` en el veredicto del Merger — campo que indica qué stage introdujo el problema
- Tope máximo: el rework no puede regresar más allá de Stage 1 DISCOVER sin SP humano (sería reiniciar el WP)
- Registro: cada rework con su diagnóstico exacto se registra en `track/gate-{N}/rework-history.md`

**Dependencias:** T-025 (contratos del Merger para el campo `source_stage`), T-026 (state files)

---

### T-031 — Mitigaciones del Merger como SPOF (auditoría, cobertura, circuit breaker)

**Prioridad:** ALTO — el Merger sin mitigaciones es el punto de falla más crítico del sistema de gate

**Hallazgos cubiertos:** B-MA-1 (las 4 mitigaciones ausentes)

**Acción:** Agregar sección "Instrucción del Merger — protocolo anticonfabulación" en los contratos del gate (T-025) y crear el template del Merger en `.claude/skills/workflow-track/assets/merger-instruction.md.template`

**Contenido mínimo del template del Merger:**
```
Tu OUTPUT debe derivarse EXCLUSIVAMENTE de {structural_result}, {evidence_result}
y {consistency_result}. NO puedes agregar juicio propio.
NO puedes suavizar findings negativos.
Si ANY evaluador reportó status: rework → tu OUTPUT DEBE ser rework.
Si ANY evaluador reportó status: unclear → tu OUTPUT DEBE ser unclear.
Solo emites pass si TODOS los evaluadores reportaron status: pass.
```
- Auditoría: el Merger debe incluir en `verdict.md` el campo `evidence_chain` con copia de los tres resultados (trazabilidad)
- Verificación de cobertura: antes de emitir veredicto, el Merger verifica que los tres fields (`structural_result`, `evidence_result`, `consistency_result`) están presentes y no son `null`
- Circuit breaker: si `N >= 2` evaluadores retornan `unclear` → el Merger emite `unclear` sin intentar síntesis (no tiene datos suficientes para un veredicto confiable)

**Dependencias:** T-025 (contratos), T-026 (state files), T-028 (unclear handler)

---

### T-032 — Documentar que gate calibrado != Consenso y criterio de tool-set como definición de agente distinto

**Prioridad:** MEDIO — riesgo de confusión de diseño en futuras implementaciones

**Hallazgos cubiertos:** B-MA-3, B-MA-2 (parcial)

**Acción:** Agregar sección "Gate calibrado — qué patrón implementa y cuál no" en `.claude/references/agentic-mandate.md` (T-018) o como sub-sección de `workflow-track/SKILL.md`

**Contenido mínimo:**
- El gate calibrado THYROX implementa: Parallelization (evaluadores concurrentes) + Merger con grounding (no Consenso)
- El Consenso requeriría: rondas de discusión entre evaluadores con protocolo de terminación definido — THYROX NO implementa esto
- Regla de diseño de agentes nuevos: un agente es "distinto" de otro cuando tiene al menos un tool que el otro no tiene — la distinción de system prompt solo NO es suficiente para constituit especialización real

**Dependencias:** T-018 (agentic-mandate.md debe existir antes), T-025 (los contratos deben incluir el tool-set requerido)

---

### T-033 — Agregar criterio de validación de referencias (Named Mechanism vs. Implementation) en T-019

**Prioridad:** MEDIO — impacta la calidad de referencias bibliográficas del sistema a largo plazo

**Hallazgos cubiertos:** B-A2A-3

**Acción:** Agregar sección "Validación de referencias del libro de patrones" en `.claude/references/platform-evolution-tracking.md` (T-019)

**Contenido mínimo:**
- Criterio de validación para referencias del libro de patrones agentic: verificar que el mecanismo del código implementa el mecanismo del título (no solo que el concepto del título es correcto)
- Checklist de validación: (1) ¿el código ejecutable hace lo que el título del capítulo promete? (2) ¿los imports están completos? (3) ¿las URLs son raw content o HTML? (4) ¿los métodos de protocolo son de la versión actual?
- Lista de patrones sistémicos detectados en el libro: Named Mechanism vs. Implementation (Cap.10-15), Implementation Facade (Cap.8), Credibilidad Prestada sin derivación (Cap.7)
- Regla de uso: cuando THYROX adopta un patrón de esta fuente, citar el hallazgo específico del deep-dive, no solo el capítulo

**Dependencias:** T-019 (el documento debe existir primero)

---

## Parte 4 — Tabla de priorización y DAG de dependencias

### Tabla resumen

| Task | Hallazgos | Prioridad | Dependencias | Bloquea |
|------|-----------|-----------|--------------|---------|
| T-025 | B-PAR-1, B-MA-2 | CRÍTICO | T-017, T-020 | T-026, T-027, T-031, T-032 |
| T-026 | B-PAR-2, B-PAR-3, B-A2A-2 | CRÍTICO | T-025, T-022 | T-027, T-028, T-029, T-030, T-031 |
| T-027 | B-RAG-2, B-ROT-3 | CRÍTICO | T-025 | T-031 |
| T-028 | B-ROT-2, B-MA-1 parcial | ALTO | T-026, T-021 | T-031 |
| T-029 | B-MEM-1, B-MEM-3, B-PC-1 | ALTO | T-020, T-026 | — |
| T-030 | B-PC-2 | ALTO | T-025, T-026 | — |
| T-031 | B-MA-1 | ALTO | T-025, T-026, T-027, T-028 | — |
| T-032 | B-MA-3, B-MA-2 | MEDIO | T-018, T-025 | — |
| T-033 | B-A2A-3 | MEDIO | T-019 | — |

### DAG de dependencias (nuevas tareas)

```
T-017 (exit criteria agentic) ──┐
T-020 (Evidencia de respaldo)   ├──► T-025 (contratos output_key)
                                │        └──► T-026 (state files)
                                │                  ├──► T-027 (evaluador consistencia)
                                │                  │         └──► T-031 (Merger mitigaciones)
                                │                  ├──► T-028 (unclear-handler) ──► T-031
                                │                  ├──► T-029 (context pruning)
                                │                  └──► T-030 (loops de rework)
T-022 (validate-session-close.sh) ──► T-026
T-021 (confidence_threshold) ──► T-028
T-018 (agentic-mandate.md) ──► T-032
T-019 (platform-evolution) ──► T-033
T-025 ──► T-032
```

### Orden de ejecución sugerido para nuevas tareas

1. T-025 (contratos — prerequisito de todo lo demás)
2. T-026 (state files — segunda prioridad estructural), paralelo con T-027 si T-025 está completo
3. T-027 (evaluador consistencia), paralelo con T-028 (unclear-handler) y T-029 (context pruning)
4. T-030 (loops de rework) — paralelo con paso 3 si T-025 y T-026 completos
5. T-031 (Merger mitigaciones) — requiere T-025, T-026, T-027, T-028
6. T-032 (gate != Consenso) y T-033 (validación referencias) — independientes, menor prioridad

---

## Nota de completitud

Los archivos `routing-pattern-input.md` y `prompt-chaining-input.md` son inputs de análisis (no deep-dives con 6 capas), por lo que sus hallazgos son más directos y menos adversariales. Sus gaps son igualmente válidos para el task-plan — fueron tratados con el mismo criterio de contraste contra T-001..T-024.

El archivo `parallelization-deep-dive.md` es un deep-review (no deep-dive adversarial con 6 capas), pero su Sección 9 "Pendientes para Stage 3 DIAGNOSE" es una lista explícita de gaps de diseño que coincide con los hallazgos B-PAR-1..B-PAR-3 y B-ROT-3. Esa sección fue la fuente principal para T-025..T-027.
