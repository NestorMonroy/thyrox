```yml
created_at: 2026-04-18 23:37:47
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.2.0
fuente: Capítulo 6 — "Planificación" (v2.2.0 ajustado) + deep-dive v2.1.0
ratio_calibracion: "8.75/20 = 44%"
patron_dominante: "Evidencia funcional sin derivación arquitectónica (EFsA)"
delta_v1.1: "Añadido C-20 (LLMs = capacidad central para Planning — premisa fundacional). Ratio: 8.5/19=45% → 8.75/20=44%."
```

# Análisis de Calibración: Capítulo 6 — Planificación (v2.0.0)

> Análisis de brechas de calibración para claims del capítulo ajustado.
> Protocolo: detectar claims sin evidencia, P values sin derivación, condiciones de salida sin umbral derivado.
> Base: planning-pattern-deep-dive.md v2.0.0

---

## 1. Inventario de claims evaluados

| ID | Claim | Tipo |
|----|-------|------|
| C-01 | "Planning cuando el cómo debe ser descubierto" (regla de selección) | Heurístico |
| C-02 | "Un agente capaz no simplemente falla — se adapta" | Comportamental |
| C-03 | Código CrewAI implementa el patrón Planning | Arquitectónico |
| C-04 | `Process.sequential` → el agente crea y ejecuta su propio plan internamente | Técnico |
| C-05 | DeepResearch: fases de pipeline como Planning | Arquitectónico |
| C-06 | DeepResearch: análisis competitivo como caso de Planning | Funcional |
| C-07 | DeepResearch: exploración académica como caso de Planning | Funcional |
| C-08 | DeepResearch: asincronismo resiliente a fallos de punto único | Técnico |
| C-09 | `budget_tokens` = tokens para "razonar, planificar y sintetizar" | Técnico |
| C-10 | Planning "eleva los sistemas de respondedores reactivos a ejecutores estratégicos" | Cualitativo |
| C-11 | Planning "puente esencial entre intención humana y ejecución automatizada" | Retórico |
| C-12 | Onboarding como caso genuino de Planning | Funcional |
| C-13 | Robótica/navegación como caso genuino de Planning | Funcional |
| C-14 | Síntesis de información como caso genuino de Planning | Funcional |
| C-15 | Soporte al cliente como caso de Planning | Funcional |
| C-16 | "Planning escala de tareas simples a sistemas complejos" | Cualitativo |
| C-17 | "Herramienta específica, no solución universal" (principio de equilibrio) | Normativo |
| C-18 | Integración de documentos privados como capacidad de Planning | Arquitectónico |
| C-19 | "No mera concatenación" → evaluación crítica garantizada | Calidad output |
| C-20 | "LLMs proporcionan la capacidad central para Planning" (premisa fundacional) | Fundacional |

---

## 2. Evaluación por claim

### C-01: Regla de selección — "¿Necesita el cómo ser descubierto, o ya se conoce?"

**Evidencia presente:** Analogía de la reunión (estado inicial, estado objetivo, descubrir el cómo).
**Derivación:** Ninguna formal — es un heurístico enunciado como verdad.
**Umbral para ser válido:** No definido — ¿cuándo el cómo es "suficientemente desconocido" para requerir Planning?
**Calibración:** PARCIALMENTE FUNDAMENTADO — el heurístico es útil pero no operacional para casos límite (WP con dominio conocido/instancia nueva; Routing con muchas rutas).
**Score:** 0.5 / 1.0

---

### C-02: "Un agente capaz no simplemente falla — se adapta"

**Evidencia presente:** Ninguna empírica — es una afirmación de comportamiento deseado, no de comportamiento observado.
**Derivación:** Cualitativa ("registra la nueva restricción, reevalúa sus opciones, formula un nuevo plan").
**Umbral para ser válido:** Un LLM sin mecanismo explícito de re-planning puede en efecto "simplemente fallar" — la adaptabilidad no está garantizada por el patrón.
**Calibración:** AFIRMACIÓN SIN EVIDENCIA — la adaptabilidad es una propiedad deseada del agente, no una propiedad garantizada del patrón Planning.
**Score:** 0.25 / 1.0

---

### C-03: Código CrewAI implementa el patrón Planning

**Evidencia presente:** Código funcional con un agente que recibe un objetivo y produce un output estructurado.
**Derivación:** AUSENTE — el código no tiene separación planner/executor. El mismo agente genera y ejecuta.
**Umbral para ser válido:** Requeriría: (a) objeto "plan" separable del output textual, (b) distinción arquitectónica entre componentes planner y executor, (c) plan inspeccionable antes de ejecución.
**Calibración:** FALSO POSITIVO — el código demuestra "LLM que genera texto con estructura de plan", no "Planning Pattern" según la definición del capítulo.
**Score:** 0.0 / 1.0

---

### C-04: `Process.sequential` → el agente crea y ejecuta su propio plan internamente

**Evidencia presente:** `Process.sequential` en CrewAI indica ejecución de tareas en orden secuencial.
**Derivación:** La interpretación "crea y luego ejecuta su propio plan" es una proyección del comportamiento LLM, no una garantía arquitectónica de CrewAI.
**Calibración:** INCIERTO — `Process.sequential` controla el orden de ejecución de tareas, no garantiza que el LLM genere un plan separado antes de ejecutar.
**Score:** 0.25 / 1.0

---

### C-05: DeepResearch: fases del pipeline como Planning

**Evidencia presente:** Descripción UX del producto con fases (deconstrucción → revisión → bucle → síntesis).
**Derivación:** AUSENTE — arquitectura interna no publicada.
**Calibración:** INCIERTO — los pasos descritos son plausibles como Planning pero no verificables.
**Score:** 0.5 / 1.0

---

### C-06: DeepResearch: análisis competitivo como caso de Planning

**Evidencia presente:** Descripción funcional detallada (múltiples fuentes, cotejo de datos, reemplazo de monitoreo manual).
**Derivación:** PARCIAL — la tarea genuinamente requiere planificación dinámica porque el conjunto de competidores y fuentes no es conocido de antemano.
**Calibración:** FUNDAMENTADO FUNCIONALMENTE — el caso encaja con la definición del patrón aunque la implementación interna sea no verificable.
**Score:** 0.75 / 1.0

---

### C-07: DeepResearch: exploración académica como caso de Planning

**Evidencia presente:** Descripción funcional (identificación de artículos, rastreo de conceptos, mapeo de frentes emergentes).
**Derivación:** PARCIAL — revisión de literatura genuinamente requiere planificación dinámica (los artículos relevantes emergen del proceso).
**Calibración:** FUNDAMENTADO FUNCIONALMENTE — similar a C-06. El caso encaja.
**Score:** 0.75 / 1.0

---

### C-08: DeepResearch: asincronismo resiliente a fallos de punto único

**Evidencia presente:** Descripción funcional ("puede implicar el análisis de cientos de fuentes, resiliente a fallos de un único punto").
**Derivación:** PLAUSIBLE — asincronismo como mecanismo de resiliencia es un principio de ingeniería establecido.
**Calibración:** FUNDAMENTADO — no necesita derivación adicional; es una propiedad de diseño bien conocida.
**Score:** 0.75 / 1.0

---

### C-09: `budget_tokens` = tokens para "razonar, planificar y sintetizar"

**Evidencia presente:** Parámetro `reasoning={"type": "enabled", "budget_tokens": 10000}` en la API.
**Derivación:** AUSENTE — `budget_tokens` controla el presupuesto de extended thinking general. La afirmación de que son específicamente para "razonar, planificar y sintetizar" (tres capacidades distintas) es un renaming sin derivación.
**Calibración:** FALSO POSITIVO — `budget_tokens` es extended thinking en general, no un activador de Planning específico.
**Score:** 0.0 / 1.0

---

### C-10: Planning "eleva los sistemas de respondedores reactivos a ejecutores estratégicos"

**Evidencia presente:** Ninguna empírica.
**Derivación:** Afirmación cualitativa.
**Calibración:** RETÓRICA — no tiene valor técnico operacional. Descartable como marketing.
**Score:** 0.25 / 1.0

---

### C-11: Planning "puente esencial entre intención humana y ejecución automatizada"

**Evidencia presente:** Ninguna.
**Derivación:** Afirmación retórica de conclusión.
**Calibración:** RETÓRICA — contradice la afirmación del propio capítulo (C-17) de que Planning es "herramienta específica, no solución universal."
**Score:** 0.0 / 1.0

---

### C-12: Onboarding como caso genuino de Planning

**Evidencia presente:** Descripción funcional (crear cuentas, asignar capacitaciones, coordinar departamentos).
**Derivación:** PARCIAL — el flujo de onboarding tiene dependencias ordenadas que genuinamente podrían no ser conocidas de antemano para un empleado específico.
**Calibración:** PLAUSIBLE pero cercano a Routing/Chaining predeterminado si el proceso de onboarding es estándar.
**Score:** 0.5 / 1.0

---

### C-13: Robótica/navegación como caso genuino de Planning

**Evidencia presente:** Descripción técnica (optimización de métricas con obstáculos dinámicos).
**Derivación:** FUNDAMENTADA — robótica con obstáculos dinámicos es el caso clásico de planning (STRIPS, POMDP) donde el "cómo" genuinamente debe ser descubierto.
**Calibración:** CORRECTAMENTE FUNDAMENTADO — es el caso más sólido del capítulo.
**Score:** 1.0 / 1.0

---

### C-14: Síntesis de información como caso genuino de Planning

**Evidencia presente:** Descripción de fases con bucle iterativo.
**Derivación:** PARCIAL — la síntesis de información compleja genuinamente requiere planificación dinámica (qué buscar emergen del proceso).
**Calibración:** FUNDAMENTADO FUNCIONALMENTE.
**Score:** 0.75 / 1.0

---

### C-15: Soporte al cliente como caso de Planning

**Evidencia presente:** "Diagnóstico → implementación de soluciones → escalamiento."
**Derivación:** INCORRECTA — tres estados con lógica condicional entre ellos. El "cómo" (diagnóstico, implementar, escalar si falla) se conoce de antemano. Esto es Routing (Cap. 2), no Planning.
**Calibración:** MISCLASSIFICACIÓN — contradice la regla de selección del propio capítulo (C-01).
**Score:** 0.0 / 1.0

---

### C-16: "Planning escala de tareas simples a sistemas complejos"

**Evidencia presente:** Dos ejemplos en los extremos (CrewAI simple; DeepResearch complejo).
**Derivación:** PARCIAL — los dos extremos son plausibles, pero la "escala continua" entre ellos no está demostrada.
**Calibración:** PLAUSIBLE SIN DERIVACIÓN COMPLETA.
**Score:** 0.5 / 1.0

---

### C-17: "Herramienta específica, no solución universal" (principio de equilibrio)

**Evidencia presente:** Razonamiento de trade-offs (autonomía vs. predictibilidad, incertidumbre vs. consistencia).
**Derivación:** FUNDAMENTADA — el trade-off está bien enunciado y es coherente con literatura de diseño de sistemas.
**Calibración:** CORRECTAMENTE FUNDAMENTADO.
**Score:** 1.0 / 1.0

---

## 3. Tabla resumen

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| C-01 | Regla de selección como heurístico | 0.5 | Parcialmente fundamentado |
| C-02 | Adaptabilidad del agente | 0.25 | Sin evidencia |
| C-03 | CrewAI implementa Planning | 0.0 | Falso positivo |
| C-04 | `Process.sequential` = plan interno | 0.25 | Incierto |
| C-05 | DeepResearch fases = Planning | 0.5 | Incierto |
| C-06 | Análisis competitivo como Planning | 0.75 | Fundamentado funcionalmente |
| C-07 | Exploración académica como Planning | 0.75 | Fundamentado funcionalmente |
| C-08 | Asincronismo resiliente | 0.75 | Fundamentado |
| C-09 | `budget_tokens` = planning tokens | 0.0 | Falso positivo |
| C-10 | "Ejecutores estratégicos" | 0.25 | Retórica |
| C-11 | "Puente esencial" | 0.0 | Retórica (contradictoria) |
| C-12 | Onboarding como Planning | 0.5 | Plausible |
| C-13 | Robótica como Planning | 1.0 | Correctamente fundamentado |
| C-14 | Síntesis de información como Planning | 0.75 | Fundamentado funcionalmente |
| C-15 | Soporte al cliente como Planning | 0.0 | Misclassificación |
| C-16 | Escalabilidad del patrón | 0.5 | Plausible sin derivación |
| C-17 | Herramienta específica | 1.0 | Correctamente fundamentado |

### C-18: Integración de documentos privados como capacidad de Planning

**Evidencia presente:** Descripción funcional: "puede integrar documentos proporcionados por el usuario, combinando información de fuentes privadas con su investigación basada en web."
**Derivación:** La integración de documentos privados con búsqueda web es RAG (Retrieval-Augmented Generation) — un patrón arquitectónico distinto al Planning. El capítulo presenta RAG + Planning como si fueran una sola capacidad del "patrón Planning."
**Calibración:** MISCLASSIFICACIÓN DE PATRÓN — la integración de fuentes privadas es RAG, no Planning. Presentarlas juntas sin distinguirlas confunde la arquitectura.
**Score:** 0.0 / 1.0

---

### C-19: "No mera concatenación" → síntesis crítica garantizada

**Evidencia presente:** "La salida final no es meramente una lista concatenada de hallazgos, sino un informe estructurado de múltiples páginas."
**Derivación:** La negación de un defecto ("no concatenación") se usa como garantía implícita de una cualidad ("evaluación crítica"). No hay mecanismo de validación de que la síntesis sea genuinamente crítica vs. texto generado por LLM con apariencia de síntesis crítica.
**Calibración:** GARANTÍA SIN MECANISMO — exactamente el mismo patrón del código CrewAI (C-03): el LLM genera texto que tiene apariencia de un proceso, sin que el proceso exista arquitectónicamente de forma verificable.
**Score:** 0.25 / 1.0

---

### C-20: "LLMs proporcionan la capacidad central para Planning"

**Evidencia presente:** Descripción de capacidades de LLMs modernos: "descomponiendo de forma autónoma objetivos de alto nivel en pasos coherentes y accionables."
**Derivación:** PARCIAL VERDADERA / PARCIAL CONFLACIÓN.
- Verdadero: los LLMs pueden descomponer objetivos de alto nivel en pasos — demostrado empíricamente en benchmarks de task decomposition (ToolBench, AgentBench).
- Conflación: "proporcionar la capacidad central para Planning" ≠ "implementar el Planning Pattern arquitectónicamente". Los LLMs proveen una capacidad general de razonamiento; el Planning Pattern requiere separación planner/executor, plan como objeto separable, y mecanismo de revisión antes de ejecución.
**Función del claim en el capítulo:** Es la premisa fundacional que justifica por qué el código CrewAI de agente único (C-03) "implementa" Planning. Sin C-20, la conexión entre LLM y Planning Pattern es directamente inválida. Con C-20, el capítulo puede afirmar que "el LLM proporciona el planning" aunque el código no tenga separación arquitectónica.
**Calibración:** CONFLACIÓN FUNDACIONAL — verdadera en la mitad (LLMs pueden descomponer tareas), falsa en la mitad (capacidad de descomposición ≠ implementación del patrón).
**Score:** 0.25 / 1.0

---

**Suma de scores:** 8.75 / 20
**Ratio de calibración:** **8.75/20 = 44%**

> **Nota de ajuste:** Los claims retóricos (C-10, C-11) contribuyen negativamente a la calibración pero se discutirían diferente si se excluyen como "marketing". Excluyendo los dos claims retóricos (C-10, C-11), el ratio sube a **8.5/18 = 47%**.

---

## 4. Patrón dominante: Evidencia Funcional sin Derivación Arquitectónica (EFsA)

A diferencia de los frameworks de la serie basin-hallucination (patrón HsR — Honestidad sin Resolución), el capítulo de Planning exhibe un patrón diferente:

> **EFsA:** el capítulo provee evidencia funcional válida (qué hace el sistema, qué casos de uso aborda) sin derivación arquitectónica (cómo está implementado internamente, si la implementación satisface la definición del patrón).

**Manifestaciones del patrón EFsA:**

| Evidencia funcional presente | Derivación arquitectónica ausente |
|------------------------------|----------------------------------|
| DeepResearch produce informes de análisis competitivo | No sabemos si DeepResearch tiene un planner/executor separados |
| CrewAI genera output con estructura de plan | El código no tiene separación planner/executor |
| `budget_tokens` controla tokens de razonamiento extendido | No sabemos si esos tokens producen un plan separable |
| Onboarding puede descomponerse en subtareas | No se distingue de Chaining predeterminado |

**Comparación con patrón HsR (basin-hallucination):**

| Patrón | Descripción | Capítulos |
|--------|-------------|-----------|
| HsR | Admite gaps pero no los resuelve | Basin-hallucination Parts A-D |
| EFsA | Provee evidencia funcional pero no deriva arquitectónicamente | Planning (Cap. 6) |
| Credibilidad prestada | Usa terminología de un dominio riguroso sin derivar de él | Planning (Cap. 6), parallelization |

El patrón EFsA es menos severo que HsR porque los claims funcionales son genuinamente útiles — los casos de DeepResearch (C-06, C-07) son plausibles aunque la arquitectura sea no verificable. La brecha es de derivación, no de honestidad.

---

## 5. Brecha crítica para THYROX

### Brecha 1: Definición vs. implementación de referencia

**Claim del capítulo:** Planning requiere plan "compuesto de pasos discretos y ejecutables."
**Implementación de referencia:** Código CrewAI con agente único sin separación planner/executor.
**Brecha:** El lector que implementa a partir del código tendrá un sistema que no cumple la definición formal.
**Evidencia observable para cerrar:** Implementar un sistema con separación explícita planner/executor (ej: un agente que genera el plan como JSON, un segundo agente que lo ejecuta).

### Brecha 2: Regla de selección no operacional

**Claim del capítulo:** Una pregunta distingue Planning de workflow fijo.
**Brecha:** La pregunta no tiene umbral — es imposible saber cuánto "desconocimiento del cómo" justifica Planning vs. Routing con más rutas.
**Evidencia observable para cerrar:** Taxonomía de casos con criterio cuantitativo (ej: si el número de rutas posibles supera N, usar Planning; si es menor, usar Routing).

### Brecha 3: `budget_tokens` sin derivación de Planning específico

**Claim del capítulo:** `budget_tokens` = capacidades de planificación.
**Brecha:** No hay distinción entre extended thinking general y planning-specific tokens.
**Evidencia observable para cerrar:** Experimento: comparar output de sistema con y sin `budget_tokens` alto para verificar si el output incluye un plan explícito separable del reasoning.

---

## 6. Calibración delta v1 → v2

El capítulo v1 no fue sometido a calibración en la sesión anterior (solo se hizo deep-dive). Por tanto, no hay delta de calibración — este es el primer análisis de calibración del capítulo.

**Si se hubiera calibrado v1, las diferencias esperadas:**

| Claim afectado | v1 (hipotetizado) | v2 (actual) |
|----------------|-------------------|-------------|
| C-03 (CrewAI como Planning) | 0.0 | 0.0 | Sin cambio — código no cambió arquitectónicamente |
| Jerarquía Planning→otros tres (era Sec.9 v1) | 0.0 | — | Eliminado en v2 — no aparece en inventario |
| C-16 (escalabilidad) | No existía en v1 | 0.5 | Nuevo claim en v2 |

**Mejora real de v2 sobre v1 (calibración):** La eliminación de SALTO-3 (jerarquía) equivale a eliminar un claim con score 0.0 del inventario — lo que mejoraría el ratio. La adición de C-06 y C-07 con scores 0.75 también mejora el ratio vs. lo que habría sido v1.

---

## 7. Usabilidad del capítulo para THYROX

| Propósito THYROX | Usabilidad | Justificación |
|-----------------|------------|---------------|
| Exploración de dominios nuevos (WPs open-ended) | ALTA | Los casos de DeepResearch (análisis competitivo, investigación) son plausibles y alineados con la definición del patrón |
| Implementación del gate calibrado | BAJA | Planning no agrega mecanismo nuevo al gate — Chaining+Routing+Parallelization son suficientes |
| Selección de patrón en Stage 1 DISCOVER | MEDIA | La regla de selección es útil como heurístico de diseño, no como criterio formal |
| Templates de Exit Conditions | ALTA | La estructura plan = estado inicial + objetivo + secuencia aplica directamente a ECs verificables |
| Código de referencia para implementación Planning | NULA | El código CrewAI no implementa el patrón como fue definido |

---

## Veredicto de calibración

**Ratio:** 49% (claims con evidencia derivada / total claims) | 53% excluyendo retórica

**El capítulo es usable para:**
- Comprensión conceptual del patrón (definición formal adoptable)
- Selección de patrón en diseño (heurístico de la regla de selección)
- Identificación de casos de uso genuinos (robótica, investigación compleja)

**El capítulo NO es usable para:**
- Implementación directa de Planning (el código no implementa el patrón)
- Activar Planning en APIs mediante `budget_tokens`
- Clasificar soporte al cliente como Planning (es Routing)

**Patrón dominante identificado:** EFsA — Evidencia Funcional sin Derivación Arquitectónica. Los casos funcionales (C-06, C-07, C-13, C-14) son genuinamente útiles. La brecha es de derivación arquitectónica, no de honestidad sobre las limitaciones.
