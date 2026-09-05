```yml
created_at: 2026-04-20 00:16:07
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: deep-dive
status: Borrador
```

# Cluster C — Gaps de Cobertura: MCP, Exception Handling, Goal Monitoring, Guardrails

**Fuente:** 7 archivos de `discover/` en el WP de methodology-calibration
**Contraste contra:** T-001..T-024 en `plan-execution/methodology-calibration-task-plan.md`
**Objetivo:** identificar hallazgos no capturados y proponer tasks concretos

---

## Sección 1 — Hallazgos por archivo

### 1.1 `mcp-pattern-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — 6 saltos lógicos, 4 contradicciones, 5 engaños estructurales.

**Hallazgos más importantes para THYROX:**

**H-C01 — MCP no elimina complejidad, la transfiere (distinta a reducirla)**
El deep-dive demuestra que "reduce dramáticamente la complejidad" (Sec. 2 del cap.) es FALSO: MCP estandariza integraciones ad-hoc hacia un protocolo estándar, pero introduce 8 consideraciones adicionales de implementación (taxonomía, seguridad, error handling, transport, etc.). La distinción correcta es: MCP reduce *acoplamiento*, no *complejidad conceptual*. Para THYROX: cuando el sistema genere código de integración con MCP, el guideline debe reflejar esta distinción — no afirmar que MCP "simplifica" sin calificar qué simplifica.

**H-C02 — "Dynamic discovery" de MCP es discovery de funciones dentro de servidores preconfigurados, no discovery de servidores nuevos**
CONTRADICCIÓN-2 del deep-dive: todos los ejemplos de código hardcodean el servidor antes de que cualquier discovery ocurra. El "dynamism" es relativo al conjunto de funciones dentro de un servidor conocido. Este es un patrón de confusión que cualquier agente de THYROX podría propagar si no tiene la distinción clara.

**H-C03 — La advertencia honesta de Sec.2 es estructuralmente desconectada de los 9 casos de uso**
"Los agentes no reemplazan mágicamente flujos deterministas" está en Sec.2 pero nunca se conecta a los 9 casos de Sec.6. Patrón sistemático del libro: la advertencia existe para que el capítulo no parezca ingenuo, pero no opera como condición en el material posterior. Para THYROX: patrón de engaño estructural "advertencia desconectada" debe ser un patrón nombrado en el catálogo AP.

---

### 1.2 `mcp-granular-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — CON ERRORES DE CÁLCULO Y SALTOS DE DEFINICIÓN.

**Hallazgos más importantes para THYROX:**

**H-C04 — Scoring numérico no reproducible como anti-patrón de análisis**
El análisis granular externo produce promedios (0.43, 0.54, 0.72) que no son reproducibles aritméticamente desde los datos que el mismo documento presenta. La diferencia entre 0.54 (externo) y 0.65 (THYROX) no refleja mayor rigor — refleja un criterio diferente no declarado (completitud de código) mezclado con el criterio declarado (alineación claim/evidencia). Para THYROX: cuando se produzcan scores de calibración propios, los cálculos deben ser verificables y el criterio de scoring no debe cambiar silenciosamente entre dominios.

**H-C05 — Redefinición silenciosa de criterio de evaluación durante el análisis**
El Dominio E del análisis granular aplica "calibración" a ausencia de error handling en el código, cuando la definición del propio documento establece calibración = alineación entre certeza expresada y evidencia presentada. Esto es un defecto de completitud, no de calibración. Para THYROX: el patrón "redefinición silenciosa de criterio" es un engaño estructural nombrable que el sistema debe poder detectar en sus propios análisis y en textos externos.

**H-C06 — Convergencia en el patrón CAD (Calibración Asimétrica por Dominio)**
Tanto el análisis THYROX como el externo (independientemente) identificaron el mismo patrón: en Cap.10, la especificación técnica está bien calibrada (~0.91) pero los casos de uso proyectados están pobremente calibrados (~0.43). Esto confirma CAD como patrón diagnóstico real. Para THYROX: CAD debería ser un patrón nombrado en el toolkit de diagnóstico, no solo observado ad-hoc.

---

### 1.3 `exception-handling-pattern-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — 7 saltos lógicos, 5 contradicciones, 4 engaños estructurales.

**Hallazgos más importantes para THYROX:**

**H-C07 — Arquitectura plausible como sustituto de implementación verificable (nuevo patrón de engaño)**
El código de Cap.12 tiene arquitectura exactamente correcta para exception handling con fallback (`primary_handler` → `fallback_handler` → `response_agent`) pero los mecanismos de estado que conectan esos agentes (`state["primary_location_failed"]`, `state["location_result"]`) nunca se establecen en el snippet. El sistema tiene la forma sin la función. El fallback NUNCA se activa con el código tal como está. Para THYROX: este es un patrón de engaño nuevo y más sutil que AP-25 (Named Mechanism vs. Implementation) — es "Architectural Shell Without Behavioral Core". Debe añadirse al catálogo.

**H-C08 — Patrón sistemático de omisión regulatoria en dominios de alto riesgo (3 capítulos consecutivos)**
Cap.10 (MCP), Cap.11 (Goal Monitoring), y Cap.12 (Exception Handling) presentan trading bots como caso de uso sin mencionar MiFID II, ACID, auditoría algorítmica. Cap.12 también presenta robotics sin mencionar ISO 10218 e IEC 62061. Tres capítulos consecutivos — no es descuido puntual, es un patrón sistemático del libro. Para THYROX: el sistema debe tener una regla explícita de que cuando genere código o diseño para dominios regulados (finanzas, healthcare, robotics, automotive), debe emitir caveat de compliance explícito.

**H-C09 — Referencias de alta calidad usadas de forma decorativa (0 citaciones inline)**
Cap.12 tiene las mejores referencias académicas de la serie (McConnell 2004, arXiv:2412.00534, O'Neill 2022) y cero citaciones inline. La paradoja inversa a capítulos anteriores: aquí hay buenas fuentes que no se usan. Para THYROX: la regla de uso de referencias debe exigir tanto la calidad de las fuentes como su conexión explícita a claims específicos.

---

### 1.4 `goal-monitoring-pattern-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — 7 saltos lógicos, 5 contradicciones, 4 engaños estructurales.

**Hallazgos más importantes para THYROX:**

**H-C10 — "Monitoring" como término prestado de observabilidad de sistemas aplicado a LLM-as-judge**
El capítulo titula el patrón "Goal Setting and MONITORING" pero implementa evaluación heurística LLM-over-LLM. "Monitoring" en sistemas tiene connotaciones técnicas específicas: métricas objetivas, alertas, observabilidad. LLM-as-judge es cualitativamente diferente. Para THYROX: cuando el sistema documente o recomiende "monitoreo" de agentes, debe distinguir entre monitoring técnico (métricas observables) y evaluación heurística LLM-based.

**H-C11 — LLM-as-judge para code evaluation sin reconocimiento de sesgos documentados**
La función `objetivos_cumplidos` del cap. llama a un LLM para determinar si el código generado cumple los objetivos. La literatura sobre LLM-as-judge (Zheng et al. 2023) documenta sesgos conocidos: autopreferencia, sesgo de posición, incapacidad de ejecutar el código. Para verificar corrección de código Python, la única forma objetiva es ejecutar el código contra test cases. Para THYROX: cuando el sistema recomiende LLM-as-judge como mecanismo de evaluación, debe incluir el caveat de sesgos conocidos.

**H-C12 — Terminación silenciosa cuando el monitoring detecta fallo de objetivos**
CONTRADICCIÓN-2 del deep-dive: cuando `objetivos_cumplidos` nunca retorna True y el bucle agota `max_iteraciones`, el código termina silenciosamente y guarda el archivo sin advertencia sobre el fallo. El "monitoring" no tiene efecto cuando detecta fallo. Para THYROX: cualquier bucle de refinamiento iterativo generado por el sistema debe incluir manejo explícito del caso "límite de iteraciones agotado sin convergencia" — no puede terminar silenciosamente.

---

### 1.5 `guardrails-safety-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — 5 saltos lógicos, 3 contradicciones, 4 engaños estructurales.

**Hallazgos más importantes para THYROX:**

**H-C13 — Observabilidad performativa: logging desactivado por defecto contradice el claim de observabilidad**
CONTRADICCIÓN-1 del deep-dive: el capítulo presenta "logging and observability are vital" y tiene múltiples `logging.info()` calls. Pero `logging.basicConfig(level=logging.ERROR)` silencia todos los INFO y WARNING. Los logs de observabilidad son dead code en la configuración presentada. Para THYROX: cuando el sistema genere código con logging, la configuración por defecto debe corresponder al nivel declarado como necesario. Esta es una regla específica de agentic Python.

**H-C14 — LLM-as-guardrail es vulnerable a prompt injection en sus propios inputs**
SALTO-3 del deep-dive: un guardrail que llama a un LLM para clasificar inputs es en sí mismo vulnerable al prompt injection. El capítulo cita Wikipedia Prompt Injection como referencia pero no la aplica al propio código. El payload puede diseñarse para que el clasificador lo marque como "compliant" mientras engaña al sistema downstream. Para THYROX: cuando el sistema recomiende LLM-as-classifier como guardrail, debe documentar esta vulnerabilidad y proponer mitigaciones (sandboxing del input, validación adicional).

**H-C15 — `temperature=0.0` reduce variabilidad pero no garantiza determinismo**
SALTO-1 del deep-dive: temperature=0.0 es condición necesaria pero no suficiente para determinismo. Algunos LLM APIs tienen non-determinismo de infraestructura independiente de temperature (paralelismo GPU, batching, versiones del modelo). Para THYROX: el guideline de agentic Python debe aclarar esta distinción en el contexto de clasificadores/guardrails.

---

### 1.6 `mcp-corrected-v2-deep-dive.md`

**Veredicto del archivo:** PARCIALMENTE VÁLIDO — PARCHE CON REGRESIÓN TÉCNICA — 6 saltos lógicos, 6 contradicciones, 5 engaños estructurales.

**Hallazgos más importantes para THYROX:**

**H-C16 — Corrección performativa: fixes nombrados que son parciales, bugs no nombrados que persisten**
El deep-dive de V2 identifica un patrón con implicaciones directas para THYROX: los "FIX BUG N" nombrados crean la impresión de corrección completa. FIX BUG 1 corrige el type hint pero no el comportamiento en runtime (Python no enforce type hints). FIX BUG 3 añade texto prescriptivo sin verificar el código. El bug más grave (JSON-RPC `method: tool_name` en lugar de `method: "tools/call"`) no fue nombrado como bug — y por tanto no fue corregido. Para THYROX: el proceso de revisión de artefactos (WPs, análisis) debe distinguir entre correcciones que cambian la documentación y correcciones que cambian el comportamiento. Un "fix" que solo cambia texto sin cambiar comportamiento debe marcarse como `fix-parcial`, no como `fix`.

**H-C17 — Regresión numérica: un rango honesto reemplazado por un valor único más falso**
V1 usaba "50-100 líneas" (rango que expresa incertidumbre). V2 usa "50 líneas" (valor único con falsa precisión). El cambio es regresivo en honestidad epistémica: mayor especificidad, mayor incorrección. El Ejemplo 4 del mismo capítulo tiene ~115 líneas antes de las 8 consideraciones de producción. Para THYROX: cuando se hagan correcciones a estimaciones numéricas, la dirección correcta es añadir rango o fuente empírica, nunca colapsar a un valor único sin fuente.

**H-C18 — JSON-RPC payload incorrecto en código presentado como "para PRODUCCIÓN"**
El Ejemplo 4 usa `method: tool_name` cuando la especificación MCP requiere `method: "tools/call"` con `params: {name: tool_name, arguments: params}`. Este es el bug más grave del capítulo y no fue nombrado en ninguna versión. El cliente solo funciona con FastMCP si es permisivo con routing — no con servidores MCP conformantes a la especificación. Para THYROX: cuando el sistema genere clientes MCP, el payload JSON-RPC debe seguir la especificación oficial, no el ejemplo del libro.

---

### 1.7 `agentic-callback-contract-misunderstanding.md`

**Veredicto del archivo:** Documento de patrón — documenta un anti-patrón confirmado con evidencia de intencionalidad.

**Hallazgos más importantes para THYROX:**

**H-C19 — `return None` en ADK `before_model_callback` después de modificación in-place propaga el request ORIGINAL, no el modificado**
El contrato real de ADK es: `return None` → framework continúa con el request original (sin la modificación). `return llm_request` → framework usa el objeto modificado. El código del cap. hace `llm_request.contents.insert(0, content)` y luego `return None` con comentario explícito "Return None to continue with the modified request" — comentario incorrecto. El mismo bug aparece en dos agentes distintos del mismo capítulo, lo que confirma que no es typo sino creencia incorrecta sobre el contrato. Para THYROX: esta es la distinción más crítica para `before_model_callback` — ya está documentada como AP-01 en el task-plan, pero la evidencia de que es una creencia activa (no descuido) refuerza por qué AP-01 debe estar en posición prominente con el ejemplo INCORRECTO/CORRECTO.

**H-C20 — El comentario incorrecto enseña activamente el patrón erróneo**
Un bug sin comentario puede ser descuido. Un bug acompañado de un comentario que describe el comportamiento incorrecto como si fuera correcto enseña activamente el patrón erróneo a cada desarrollador que copie el código. Para THYROX: el agentic-validator debe buscar específicamente el patrón `in-place modification + return None` en callbacks de ADK, no solo el `return None` aislado.

---

## Sección 2 — Mapeo contra T-001..T-024

### Hallazgos CUBIERTOS por el task-plan actual

| Hallazgo | Task que lo cubre | Cobertura |
|---------|-------------------|-----------|
| H-C19 (callback contract `return None`) | T-002 AP-01, T-005 AP-01, T-006 AP-01 | COMPLETA |
| H-C20 (comentario enseña patrón erróneo) | T-005 AP-01 (catálogo con ejemplo INCORRECTO/CORRECTO) | PARCIAL — el foco en el comentario como señal de intencionalidad no está en T-005 explícitamente |
| H-C15 (`temperature=0.0` no garantiza determinismo) | T-002 Sección 3 Classifier Temperature (AP-07, AP-08) | COMPLETA |
| H-C13 (logging desactivado contradice claim de observabilidad) | T-002 Sección 5 Observability (AP-13, AP-14, AP-15) | PARCIAL — la regla sobre nivel de logging default no está explicitada |
| H-C06 (patrón CAD como patrón diagnóstico) | No identificado por nombre como patrón reutilizable | NO CUBIERTO — ver H-C06 en gaps |

### Hallazgos NO CUBIERTOS por T-001..T-024

Los siguientes hallazgos no tienen correspondencia en ningún task del plan actual:

| Hallazgo | Descripción breve | Prioridad |
|---------|-------------------|-----------|
| H-C01 | Distinción "MCP reduce acoplamiento, no complejidad" como regla de escritura | MEDIO |
| H-C02 | Discovery de funciones vs. discovery de servidores — distinción en guidelines | MEDIO |
| H-C03 | "Advertencia desconectada" como patrón de engaño nombrado en catálogo AP | MEDIO |
| H-C04 | Scoring con aritmética verificable — criterio para análisis cuantitativos THYROX | ALTO |
| H-C05 | "Redefinición silenciosa de criterio" como engaño estructural nombrado | MEDIO |
| H-C06 | CAD (Calibración Asimétrica por Dominio) como patrón diagnóstico en el toolkit | ALTO |
| H-C07 | "Architectural Shell Without Behavioral Core" — nuevo patrón de engaño más allá de AP-25 | CRÍTICO |
| H-C08 | Regla de caveat obligatorio en dominios regulados (finanzas, healthcare, robotics, automotive) | CRÍTICO |
| H-C09 | Regla de citaciones inline — no basta con listar referencias | BAJO |
| H-C10 | Distinción monitoring técnico vs. evaluación heurística LLM-based | ALTO |
| H-C11 | LLM-as-judge con caveat de sesgos documentados | ALTO |
| H-C12 | Manejo explícito de "límite de iteraciones agotado sin convergencia" | ALTO |
| H-C14 | LLM-as-guardrail vulnerable a prompt injection — regla de documentación de riesgo | CRÍTICO |
| H-C16 | "Fix parcial" vs. "fix completo" — distinción en proceso de revisión de artefactos | ALTO |
| H-C17 | Regresión numérica: colapsar rango a valor único sin fuente es regresión epistémica | MEDIO |
| H-C18 | Payload JSON-RPC correcto para clientes MCP — regla específica de código | ALTO |

---

## Sección 3 — Tasks propuestos (T-025..T-034)

Los tasks se ordenan por prioridad descendente. Se usa el formato del task-plan existente.

---

### T-025 — Regla de caveat en dominios regulados [CRÍTICO]

**Hallazgos:** H-C08
**Acción:** Agregar regla AP-31 al catálogo en `agentic-python.instructions.md` y al body del agente `agentic-validator.md`

**Descripción:**
Cuando el sistema genere código, diseño, o recomendaciones que involucren dominios regulados, DEBE emitir caveat explícito antes de continuar. Los dominios regulados identificados en el análisis:
- Servicios financieros: MiFID II, Dodd-Frank, SEC Reg BI, ACID para transacciones, auditoría algorítmica, circuit breakers
- Healthcare: HIPAA, MDR (UE), FDA 21 CFR Part 11 para software médico
- Robotics/industrial: ISO 10218-1/2, IEC 62061, ISO/TS 15066, OSHA 1910.217
- Automotive: ISO 26262 (safety funcional), SOTIF (ISO 21448), ASIL ratings
- Aviación: DO-178C, DO-254

Anti-patrón (AP-31 INCORRECTO):
```python
# Caso de uso: trading bot que ejecuta órdenes
def execute_trade(order: Order) -> TradeResult:
    # Implementar lógica de ejecución...
    pass
```

Correcto (AP-31 CORRECTO):
```python
# CAVEAT DE DOMINIO REGULADO (Servicios financieros):
# Este código requiere análisis de compliance antes de producción:
# - MiFID II Art. 17: requisitos de circuit breaker y supervisión
# - Reg NMS (US): best execution y auditoría de órdenes
# - ACID: las transacciones financieras requieren atomicidad completa
# - Auditoría: todas las órdenes deben ser persistidas antes de ejecución
# Consultar compliance officer antes de desplegar en entorno real.
def execute_trade(order: Order) -> TradeResult:
    # Implementar lógica...
    pass
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — agregar Sección 9: Regulated Domains con AP-31
2. `.claude/agents/agentic-validator.md` — agregar AP-31 al catálogo del agente con señales de detección (keywords: "trading", "financial", "medical", "robot", "autonomous vehicle")

**Dependencias:** T-002 (debe existir el archivo de guidelines), T-005 (debe existir el agente)
**Estimación:** 1-2 horas

---

### T-026 — Nuevo patrón AP-32: "Architectural Shell Without Behavioral Core" [CRÍTICO]

**Hallazgos:** H-C07
**Acción:** Documentar AP-32 en el catálogo AP, en el agente validador, y crear patrón consultable

**Descripción:**
AP-25 (Named Mechanism vs. Implementation) captura la brecha entre el nombre del patrón y su implementación. AP-32 es una variante más sutil y más grave: el mecanismo central tiene la arquitectura correcta (nombres de componentes exactos, estructura plausible) pero los conectores entre componentes (mecanismos de estado, callbacks, contratos de datos) no están implementados. El sistema tiene forma sin función.

Anti-patrón (AP-32 INCORRECTO):
```python
# Arquitectura de fallback — parece correcto
primary = Agent(name="primary_handler", instruction="Use get_data. If it fails...")
fallback = Agent(name="fallback_handler",
    instruction="Check state['primary_failed']. If True, use backup_data.")
# PROBLEMA: ningún agente escribe state['primary_failed']
# fallback siempre ejecuta el branch "If False, do nothing"
```

Correcto (AP-32 CORRECTO):
```python
# Los conectores de estado deben ser explícitos y verificables
primary = Agent(
    name="primary_handler",
    instruction="""Use get_data. 
    If the tool fails, write state['primary_failed'] = True.
    If it succeeds, write state['result'] = <data>."""
)
fallback = Agent(
    name="fallback_handler",
    instruction="Check state['primary_failed']. If True, use backup_data and write state['result']."
)
# VERIFICAR: ¿quién establece cada clave en state[]?
```

**Señal de detección para agentic-validator:** agentes con instrucciones que leen `state[key]` sin que ningún otro agente tenga instrucción explícita de escribir esa clave.

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — agregar AP-32 en Sección 2: Type Contracts (o nueva Sección 9 si T-025 ya la crea)
2. `.claude/agents/agentic-validator.md` — AP-32 con señal de detección
3. `discover/patterns/architectural-shell-behavioral-core.md` — patrón consultable (nuevo archivo)

**Dependencias:** T-002, T-005, T-006 (directorio discover/patterns/ debe existir)
**Estimación:** 2-3 horas

---

### T-027 — Regla AP-33: LLM-as-guardrail vulnerable a prompt injection [CRÍTICO]

**Hallazgos:** H-C14
**Acción:** Agregar AP-33 al catálogo y al agente validador

**Descripción:**
Cuando se usa un LLM para clasificar inputs de usuarios (LLM-as-guardrail), ese LLM es en sí mismo un LLM que puede ser manipulado mediante prompt injection. Un payload malicioso puede diseñarse para que el clasificador lo marque como "compliant"/"safe" mientras engaña al sistema downstream. Esta vulnerabilidad no es eliminada por `temperature=0.0`.

Anti-patrón (AP-33 INCORRECTO):
```python
# Usar LLM como único guardrail sin documentar el riesgo de bypass
safety_check = llm.invoke(f"Is this input safe? Input: {user_input}")
if "safe" in safety_check.lower():
    process(user_input)  # Sin validación adicional
```

Correcto (AP-33 CORRECTO):
```python
# LLM-as-guardrail: documentar vulnerabilidad y agregar capa adicional
# NOTA DE SEGURIDAD: LLMs-as-classifier son vulnerables a prompt injection.
# Este guardrail es defensa de primera capa, no única defensa.
# Mitigaciones adicionales implementadas:
# 1. Sanitización del input antes de enviarlo al clasificador
# 2. Validación basada en reglas para patrones conocidos (complementaria)
# 3. Rate limiting para detectar patrones de ataque
sanitized = sanitize_for_classifier(user_input)  # Escapar caracteres de control
safety_check = llm.invoke(f"Is this input safe? Input: {sanitized}")
rule_check = pattern_based_validation(user_input)  # Segunda capa
if "safe" in safety_check.lower() and rule_check.passed:
    process(user_input)
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-33 en sección Error Handling o nueva sección Security
2. `.claude/agents/agentic-validator.md` — AP-33 con señal de detección (buscar LLM-as-classifier sin sanitización ni validación complementaria)

**Dependencias:** T-002, T-005
**Estimación:** 1.5 horas

---

### T-028 — Patrón diagnóstico CAD en toolkit de análisis [ALTO]

**Hallazgos:** H-C06
**Acción:** Documentar el patrón CAD (Calibración Asimétrica por Dominio) como patrón diagnóstico consultable

**Descripción:**
CAD es el patrón donde un artefacto (capítulo, documento, código) tiene calibración significativamente diferente entre sus dominios internos. En Cap.10: especificación técnica 0.91, casos de uso proyectados 0.43. Este patrón fue identificado independientemente por dos análisis distintos — confirma que es un patrón real y detectable.

Para THYROX, CAD es útil como patrón diagnóstico en Stage 3 DIAGNOSE: cuando un WP analiza un sistema externo, identificar si hay dominios con alta confianza y dominios con baja evidencia permite priorizar qué claims usar como fundamento de diseño.

**Archivo a crear:**
`discover/patterns/calibracion-asincronica-por-dominio.md` con:
- Definición operacional de CAD
- Señales de detección (qué buscar en un documento para identificar CAD)
- Tabla de aplicación: cómo usar CAD en Stage 3 DIAGNOSE
- Regla de uso para THYROX: claims del dominio bien calibrado (>0.85) pueden usarse como fundamento; claims del dominio pobremente calibrado (<0.50) requieren validación adicional antes de propagar

**Archivos a modificar:**
1. Crear `discover/patterns/calibracion-asincronica-por-dominio.md`
2. Agregar referencia en `analyze/methodology-calibration-diagnose.md` si existe sección de patrones diagnósticos

**Dependencias:** T-006 (directorio discover/patterns/ debe existir)
**Estimación:** 1.5 horas

---

### T-029 — Regla AP-34: LLM-as-judge con caveat de sesgos documentados [ALTO]

**Hallazgos:** H-C11
**Acción:** Agregar AP-34 al catálogo y al agente validador

**Descripción:**
LLM-as-judge para evaluación de código, calidad, o cumplimiento de objetivos tiene sesgos documentados en la literatura: autopreferencia (el LLM prefiere su propio output), sesgo de posición (la posición en el prompt afecta el juicio), e incapacidad de ejecutar código para verificar corrección real. Para evaluación de código Python, la única forma objetiva es ejecutar el código contra test cases.

Anti-patrón (AP-34 INCORRECTO):
```python
def goals_achieved(code: str, objectives: str) -> bool:
    """Usar LLM para evaluar si el código cumple los objetivos."""
    response = llm.invoke(f"Does this code achieve: {objectives}\n\nCode: {code}")
    return "yes" in response.lower()  # Sin caveats de limitación
```

Correcto (AP-34 CORRECTO):
```python
def goals_achieved_with_caveats(code: str, objectives: str, test_cases: list = None) -> dict:
    """
    Evalúa cumplimiento de objetivos.
    
    LIMITACIONES DE LLM-AS-JUDGE (documentadas):
    - Sesgo de autopreferencia: el LLM puede preferir su propio output
    - Sesgo de posición: el orden de presentación afecta el juicio
    - No puede ejecutar el código para verificar corrección real
    
    Para evaluación objetiva de código, usar test_cases (ejecución real).
    LLM-as-judge es heurística complementaria, no fuente de verdad.
    """
    results = {"llm_judge": None, "test_execution": None, "caveats": ["LLM-as-judge"]}
    
    if test_cases:
        results["test_execution"] = run_tests(code, test_cases)  # Evaluación objetiva
    
    llm_response = llm.invoke(f"Does this code achieve: {objectives}\n\nCode: {code}")
    results["llm_judge"] = "yes" in llm_response.lower()
    
    return results
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-34 en sección Agentic Design
2. `.claude/agents/agentic-validator.md` — AP-34 con señal de detección

**Dependencias:** T-002, T-005
**Estimación:** 1.5 horas

---

### T-030 — Regla AP-35: manejo explícito de convergencia fallida en bucles iterativos [ALTO]

**Hallazgos:** H-C12
**Acción:** Agregar AP-35 al catálogo y al agente validador

**Descripción:**
Todo bucle de refinamiento iterativo (generación → evaluación → refinamiento) debe incluir manejo explícito del caso "límite de iteraciones agotado sin convergencia". El sistema no puede terminar silenciosamente ni guardar el resultado como si el proceso hubiera tenido éxito. Python tiene `for...else` diseñado exactamente para este caso.

Anti-patrón (AP-35 INCORRECTO):
```python
for i in range(max_iterations):
    result = generate(task)
    if goals_achieved(result, objectives):
        break
# Post-bucle: guarda result sin verificar si el break ocurrió
save(result)  # SILENCIOSO: no advierte si objectives nunca se cumplieron
```

Correcto (AP-35 CORRECTO):
```python
for i in range(max_iterations):
    result = generate(task)
    if goals_achieved(result, objectives):
        break  # Convergencia exitosa
else:
    # El bucle agotó las iteraciones sin break (convergencia fallida)
    logger.warning(f"ADVERTENCIA: Objetivos no cumplidos después de {max_iterations} iteraciones.")
    # Opciones: raise exception, retornar None, retornar resultado parcial con flag
    return IterationResult(result=result, converged=False, reason="max_iterations_exhausted")
save(result)  # Solo llega aquí si convergencia fue exitosa
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-35 en sección Error Handling
2. `.claude/agents/agentic-validator.md` — AP-35 con señal de detección (buscar bucles for con break sin else)

**Dependencias:** T-002, T-005
**Estimación:** 1.5 horas

---

### T-031 — Regla AP-36: payload JSON-RPC correcto para clientes MCP [ALTO]

**Hallazgos:** H-C18
**Acción:** Agregar AP-36 al catálogo y al agente validador; crear patrón consultable MCP

**Descripción:**
La especificación MCP define que las llamadas a herramientas usan `method: "tools/call"` con `params: {"name": "<tool_name>", "arguments": {...}}`. Un error común (presente en el libro analizado) es usar `method: tool_name` directamente — esto solo funciona con servidores FastMCP si son permisivos con el routing, pero NO con servidores MCP conformantes a la especificación oficial.

Anti-patrón (AP-36 INCORRECTO):
```python
# INCORRECTO: viola la especificación MCP JSON-RPC
payload = {
    "jsonrpc": "2.0",
    "method": tool_name,  # ← tool_name no es un método JSON-RPC válido
    "params": params,     # ← params debería ser {name: tool_name, arguments: params}
    "id": 1
}
```

Correcto (AP-36 CORRECTO):
```python
# CORRECTO: conforme a la especificación MCP
payload = {
    "jsonrpc": "2.0",
    "method": "tools/call",          # ← método MCP correcto
    "params": {
        "name": tool_name,           # ← nombre de la herramienta en params.name
        "arguments": params          # ← argumentos en params.arguments
    },
    "id": 1
}
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-36, posiblemente en nueva sección "MCP Protocol"
2. `.claude/agents/agentic-validator.md` — AP-36 con señal de detección
3. `discover/patterns/mcp-jsonrpc-payload.md` — patrón consultable con especificación completa

**Dependencias:** T-002, T-005, T-006 (directorio patterns/)
**Estimación:** 1.5 horas

---

### T-032 — Regla AP-37: distinción monitoring técnico vs. evaluación heurística LLM [ALTO]

**Hallazgos:** H-C10
**Acción:** Agregar AP-37 al catálogo, actualizar referencias de diseño agentic

**Descripción:**
"Monitoring" en sistemas tiene connotaciones técnicas establecidas: métricas objetivas y verificables, alertas basadas en umbrales, observabilidad del estado del sistema. LLM-as-judge para evaluar si un agente cumplió sus objetivos es cualitativamente diferente: es evaluación heurística, no monitoreo técnico. Usar el término "monitoring" para ambos crea confusión sobre las garantías del sistema.

Anti-patrón (AP-37 INCORRECTO):
```python
# "Monitoreo" de objetivos — pero es evaluación LLM, no monitoring
def monitor_goal_achievement(output, goal):
    """Monitorea si el agente cumplió su objetivo."""
    return llm.invoke(f"Did the agent achieve: {goal}?\nOutput: {output}")
```

Correcto (AP-37 CORRECTO):
```python
# ACLARACIÓN DE TERMINOLOGÍA:
# evaluate_goal_achievement = evaluación heurística LLM (sesgada, no determinística)
# monitor_system_health = monitoring técnico (métricas objetivas, verificables)
# Usar el término correcto según el mecanismo implementado

def evaluate_goal_achievement(output: str, goal: str) -> EvaluationResult:
    """
    Evaluación heurística LLM de cumplimiento de objetivos.
    NOTA: Esto es evaluación heurística, no monitoring técnico.
    Para monitoring técnico, usar métricas observables (latencia, tasa de error,
    throughput) capturadas en el sistema de logging, no preguntando a un LLM.
    """
    ...

def monitor_system_health(metrics: SystemMetrics) -> HealthStatus:
    """Monitoring técnico con métricas objetivas."""
    ...
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-37 en Sección 5 Observability
2. `.claude/agents/agentic-validator.md` — AP-37 con señal de detección

**Dependencias:** T-002, T-005
**Estimación:** 1 hora

---

### T-033 — "Fix parcial" como estado en proceso de revisión de artefactos [ALTO]

**Hallazgos:** H-C16, H-C17
**Acción:** Actualizar el proceso de revisión de WPs para distinguir correcciones de documentación vs. comportamiento

**Descripción:**
El análisis de V2 de Cap.10 revela que las correcciones pueden ser de dos tipos: (a) correcciones de documentación/anotaciones que no cambian el comportamiento en runtime, y (b) correcciones que cambian el comportamiento real. Nombrar ambas como "FIX" crea la impresión de corrección completa cuando solo se resolvió la mitad. Además, colapsar un rango numérico honesto a un valor único sin fuente es regresión epistémica, no mejora.

Para THYROX: en los artefactos de WP, cuando se documente una corrección, usar:
- `fix-completo`: el comportamiento cambió según lo esperado
- `fix-parcial(documentación)`: solo la documentación/anotación cambió, el comportamiento en runtime no
- `fix-pendiente`: el issue fue identificado pero no resuelto

Adicionalmente: cuando se corrija una estimación numérica, la dirección correcta es añadir rango o fuente empírica, nunca colapsar a un valor único sin fuente.

**Archivos a modificar:**
1. `.claude/skills/workflow-standardize/SKILL.md` — agregar distinción de tipos de fix en la fase de documentación de correcciones
2. Considerar agregar a `exit-conditions.md.template` (si existe) — verificar que los fixes marcados como resueltos sean fix-completo, no fix-parcial

**Dependencias:** T-013 (que ya existe y modifica workflow-standardize)
**Estimación:** 1 hora

---

### T-034 — Patrón diagnóstico: "Advertencia Desconectada" en catálogo AP [MEDIO]

**Hallazgos:** H-C03
**Acción:** Agregar AP-38 al catálogo y al agente validador

**Descripción:**
El patrón "Advertencia Desconectada" ocurre cuando un documento (o código) incluye una advertencia o caveat honesto en una sección, pero esa advertencia nunca se conecta de vuelta a las secciones que la requieren. El efecto: la advertencia existe para que el documento no pueda ser acusado de ingenuidad, pero está contenida en una sección y nunca opera como condición en el material posterior.

Ejemplo del cap.: "Los agentes no reemplazan mágicamente flujos deterministas" (Sec.2) — correcta y honesta. Pero los 9 casos de uso (Sec.6) no mencionan esta condición. Un lector que va directo a los casos de uso nunca ve la advertencia.

Para THYROX: cuando el sistema produzca artefactos con advertencias o caveats, verificar que cada sección posterior que depende de ese caveat lo cite o lo reitere.

Anti-patrón (AP-38 INCORRECTO):
```markdown
## Sec.2 — Advertencia
Los resultados de este análisis dependen de que el dataset sea representativo.

## Sec.5 — Casos de uso
Este patrón aplica a: [lista de 9 casos, ninguno menciona la condición de Sec.2]
```

Correcto (AP-38 CORRECTO):
```markdown
## Sec.2 — Advertencia
Los resultados de este análisis dependen de que el dataset sea representativo.

## Sec.5 — Casos de uso (aplican condicionalmente — ver Sec.2)
Este patrón aplica a los siguientes casos, **siempre que el dataset sea representativo**:
[lista de 9 casos]
```

**Archivos a modificar:**
1. `.thyrox/guidelines/agentic-python.instructions.md` — AP-38 en Sección 8 Agentic Design (o sección de escritura de artefactos)
2. `.claude/agents/agentic-validator.md` — AP-38, señal de detección

**Dependencias:** T-002, T-005
**Estimación:** 1 hora

---

## Sección 4 — DAG de dependencias para T-025..T-034

```
T-025 (AP-31: dominios regulados) — depende de T-002 y T-005
T-026 (AP-32: Architectural Shell) — depende de T-002, T-005, T-006
T-027 (AP-33: LLM-as-guardrail + injection) — depende de T-002, T-005
T-028 (patrón CAD consultable) — depende de T-006
T-029 (AP-34: LLM-as-judge sesgos) — depende de T-002, T-005
T-030 (AP-35: convergencia fallida) — depende de T-002, T-005
T-031 (AP-36: MCP JSON-RPC payload) — depende de T-002, T-005, T-006
T-032 (AP-37: monitoring vs. evaluación heurística) — depende de T-002, T-005
T-033 (fix-parcial en proceso de revisión) — depende de T-013
T-034 (AP-38: advertencia desconectada) — depende de T-002, T-005

Paralelos posibles: T-025, T-027, T-029, T-030, T-032, T-034 (todos dependen de T-002/T-005 y no
  interfieren entre sí — editan secciones distintas del mismo archivo)
T-026 y T-031 requieren además T-006 (directorio patterns/)
T-028 solo requiere T-006
T-033 requiere T-013
```

---

## Sección 5 — Trazabilidad

| Task propuesto | Hallazgos | Archivos fuente en discover/ |
|---------------|-----------|------------------------------|
| T-025 (AP-31) | H-C08 | exception-handling-pattern-deep-dive.md (IC-1, IC-2), goal-monitoring-pattern-deep-dive.md (E-4), mcp-pattern-deep-dive.md (CONTRADICCIÓN-3) |
| T-026 (AP-32) | H-C07 | exception-handling-pattern-deep-dive.md (CONTRADICCIÓN-1, patrón dominante) |
| T-027 (AP-33) | H-C14 | guardrails-safety-deep-dive.md (SALTO-3) |
| T-028 (CAD) | H-C06 | mcp-granular-deep-dive.md (Punto 6, Veredicto Comparativo) |
| T-029 (AP-34) | H-C11 | goal-monitoring-pattern-deep-dive.md (SALTO-1, E-1) |
| T-030 (AP-35) | H-C12 | goal-monitoring-pattern-deep-dive.md (CONTRADICCIÓN-2) |
| T-031 (AP-36) | H-C18 | mcp-corrected-v2-deep-dive.md (SALTO-6, CONTRADICCIÓN-6) |
| T-032 (AP-37) | H-C10 | goal-monitoring-pattern-deep-dive.md (E-1) |
| T-033 | H-C16, H-C17 | mcp-corrected-v2-deep-dive.md (SALTO-4, CONTRADICCIÓN-5, Capa 7) |
| T-034 (AP-38) | H-C03 | mcp-pattern-deep-dive.md (patrón dominante, Capa 5) |

---

## Sección 6 — Resumen ejecutivo

**Total de hallazgos en Cluster C:** 20 (H-C01..H-C20)
**Hallazgos cubiertos por T-001..T-024:** 3 (H-C19 completamente, H-C15 completamente, H-C13 parcialmente)
**Hallazgos no cubiertos:** 17

**Tasks propuestos:** T-025..T-034 (10 tasks nuevos)

**Distribución por prioridad:**
- CRÍTICO: T-025 (dominios regulados), T-026 (Architectural Shell), T-027 (LLM-as-guardrail injection)
- ALTO: T-028 (CAD), T-029 (LLM-as-judge sesgos), T-030 (convergencia fallida), T-031 (MCP JSON-RPC), T-032 (monitoring vs. heurística), T-033 (fix-parcial)
- MEDIO: T-034 (advertencia desconectada)

**Observación sobre el patrón dominante del Cluster C:**
Los 7 archivos convergen en un hallazgo transversal que ningún task anterior captura explícitamente: el patrón "mecanismo central no implementado en el código de demostración" aparece en Cap.10 (dynamic discovery requiere config previa), Cap.11 (monitoring no tiene efecto cuando detecta fallo), y Cap.12 (fallback nunca se activa porque el estado no se establece). En Cap.18 (Guardrails), el patrón se reproduce internamente en la sección "Engineering Reliable Agents" (nombra checkpoint/rollback sin código). T-026 (AP-32: Architectural Shell) captura la manifestación más técnica de este patrón. T-034 (AP-38: Advertencia Desconectada) captura la manifestación textual. Juntos constituyen una familia de patrones relacionados que el sistema THYROX necesita poder detectar y señalizar.
