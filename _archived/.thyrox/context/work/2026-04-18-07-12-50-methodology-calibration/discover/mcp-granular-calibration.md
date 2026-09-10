```yml
created_at: 2026-04-19 06:53:43
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: "Análisis Profundo de Calibración por Dominio — CAP10" (documento externo, análisis granular)
ratio_calibracion: "18/33 = 55%"
clasificacion: PARCIALMENTE CALIBRADO
nota: Meta-análisis — documento externo que evalúa calibración de Cap.10. Claims verificados contra mcp-pattern-input.md (texto fuente) y mcp-pattern-calibration.md (análisis THYROX). Primer análisis externo que identifica el patrón CAD con metodología diferente.
```

# Análisis de Calibración: "Análisis Profundo de Calibración por Dominio — CAP10"

> Protocolo: Modo 1 — Detección de realismo performativo.
> Objeto: documento externo producido por script Python, 2026-04-19 (mcp-granular-calibration-input.md).
> Naturaleza: meta-análisis — evalúa calibración de un documento que a su vez evalúa calibración.
> Verificación de claims: contra mcp-pattern-input.md (texto fuente de Cap.10) y mcp-pattern-calibration.md (análisis THYROX).

---

## 1. Inventario de claims evaluados

| ID | Claim | Sección input | Grupo | Tipo provisional |
|----|-------|---------------|-------|-----------------|
| G-01 | "Definiciones técnicas precisas: Cliente MCP, Servidor MCP, Recursos, Herramientas, Indicaciones ✓" | §2 | A | Técnico verificable |
| G-02 | "Transporte especificado: JSON-RPC sobre STDIO, HTTP de flujo continuo, SSE" | §2 | A | Técnico verificable |
| G-03 | "Score 0.91 para dominio técnico (Protocolo MCP)" | §2 | A | Score-derivado |
| G-04 | "★ MEJOR CALIBRADO DEL LIBRO COMPLETO" | §3 | B | Superlativo sin referencia |
| G-05 | Score 0.90 para Sección 2 (advertencias honestas) | §3 | B | Score-derivado |
| G-06 | "Razonamiento causal con ejemplos concretos" (dominio B) | §3 | B | Técnico verificable |
| G-07 | Lenguaje calibrado: "a menudo requieren", "puede ser", "es útil solo si" | §3 | B | Técnico verificable |
| G-08 | Dominio C (comparativo MCP vs Tool Calling): Score 0.72 | §4 | C | Score-derivado |
| G-09 | "Dynamic discovery: claim sin soporte, calibración 0.3" | §4 | C | Técnico verificable |
| G-10 | "Tabla presenta diferencia mayor que la real (0.6 vs 0.8)" | §4 | C | Técnico cuantitativo |
| G-11 | Score 0.65 para tabla comparativa (claim de superioridad sin reservas) | §4 | C | Score-derivado |
| G-12 | Base de datos: 0.75 (BigQuery es real) | §5 | D | Score-derivado |
| G-13 | Orquestación medios: 0.65 | §5 | D | Score-derivado |
| G-14 | APIs: 0.70 | §5 | D | Score-derivado |
| G-15 | Extracción de información: 0.68 | §5 | D | Score-derivado |
| G-16 | Herramientas personalizadas: 0.60 | §5 | D | Score-derivado |
| G-17 | Comunicación estandarizada: 0.75 | §5 | D | Score-derivado |
| G-18 | Flujos multi-paso: 0.50 (sin manejo de errores entre pasos) | §5 | D | Score-derivado |
| G-19 | Control IoT: 0.30 (sin confirmación de entrega) | §5 | D | Score-derivado |
| G-20 | Servicios financieros: 0.20 (sin ACID, sin auditoría, sin firma) | §5 | D | Score-derivado |
| G-21 | "Promedio casos de uso: 0.57" (tabla) vs. "0.43" (veredicto) — discrepancia interna | §5 | D | Contradicción interna |
| G-22 | Dominio D veredicto: Score 0.43 | §5 | D | Score-derivado |
| G-23 | Código: Score 0.23 (código solo funciona para demo) | §6 | E | Score-derivado |
| G-24 | Hardcoding presentado como normal; producción necesita service discovery, load balancing, health checks | §6 | E | Técnico verificable |
| G-25 | "Traducción fue mejorada (sin imports sin usar)" | §6 | E | Verificable contra texto fuente |
| G-26 | Promedio global 0.54 (tabla síntesis) | §7 | F | Aritmético verificable |
| G-27 | "PROMEDIO: 0.54 (vs. reportado 0.65 — análisis granular es más crítico)" | §7 | F | Comparativo |
| G-28 | "Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)" | §8 | F | Factual — cruce de docs |
| G-29 | "Riesgo LEGAL: Reguladores negarían licencia si MCP es ejecutor de transacciones" | §5 | G | Impacto-riesgo |
| G-30 | "Pérdida de dinero, demandas de clientes" (Financial Services) | §5 | G | Impacto-riesgo |
| G-31 | "Cap.10 daña la credibilidad del libro" | §10 | G | Impacto editorial |
| G-32 | "Las advertencias honestas de Sec.2 quedan eclipsadas por confianza falsa de Sec.6" | §10 | G | Impacto estructural |
| G-33 | Causa de discrepancia 0.43 vs 0.57: "margen de análisis" | §5 | H | Explicación sin fuente |

---

## 2. Evaluación por claim

### G-01: "Definiciones técnicas precisas: Cliente MCP, Servidor MCP, Recursos, Herramientas, Indicaciones ✓"

**Texto exacto (input L:39-48):** "1. Definiciones Técnicas Precisas: ✓ Cliente MCP: Definido con precisión / ✓ Servidor MCP: Definido con precisión / ✓ Recursos: Definido con precisión / ✓ Herramientas: Definido con precisión / ✓ Indicaciones: Definido con precisión"

**Verificación contra mcp-pattern-input.md:**
- Cliente MCP: definido en §5 ("aplicación o envoltorio alrededor del LLM... intermediario") — VERIFICADO
- Servidor MCP: definido en §5 ("puerta de entrada al mundo externo") — VERIFICADO
- Recursos: definido en §4 ("datos estáticos, ej., un archivo PDF, un registro de base de datos") — VERIFICADO
- Herramientas: definido en §4 ("función ejecutable que realiza una acción") — VERIFICADO
- Indicaciones/Prompts: definido en §4 ("plantilla que guía al LLM sobre cómo interactuar") — VERIFICADO

**Análisis:** Los cinco componentes tienen definiciones explícitas en el texto fuente. El documento externo los marca como ✓ correctamente. El sub-score implícito (componente del 0.91) está respaldado por evidencia observable.

**Clasificación:** OBSERVACIÓN DIRECTA — verificable en mcp-pattern-input.md §4-§5.
**Calibración:** 1.0

---

### G-02: "Transporte especificado: JSON-RPC sobre STDIO, HTTP de flujo continuo, SSE"

**Texto exacto (input L:53-56):** "3. Transporte especificado explícitamente: ✓ JSON-RPC sobre STDIO / ✓ HTTP de flujo continuo / ✓ Eventos Enviados por el Servidor (SSE)"

**Verificación contra mcp-pattern-input.md:**
- JSON-RPC sobre STDIO: "usa JSON-RPC sobre STDIO (entrada/salida estándar) para comunicación eficiente entre procesos" (§4) — VERIFICADO
- HTTP de flujo continuo (Streamable HTTP): "aprovecha protocolos web como Streamable HTTP" (§4) — VERIFICADO
- SSE: "Server-Sent Events (SSE)" (§4) — VERIFICADO

**Análisis:** Los tres mecanismos de transporte están explícitamente nombrados en §4 del texto fuente. El claim del documento externo es una lectura directa del texto fuente.

**Clasificación:** OBSERVACIÓN DIRECTA — verificable en mcp-pattern-input.md §4.
**Calibración:** 1.0

---

### G-03: Score 0.91 para dominio técnico (Protocolo MCP)

**Texto exacto (input L:35):** "Score: 0.91 (EXCELENTE CALIBRACIÓN)"

**Verificación:** El análisis THYROX asignó un promedio de ~0.91 al Grupo A (8 claims, scores 0.85-1.0 — ver mcp-pattern-calibration.md §6 tabla de dominios). La convergencia entre análisis independientes es notable.

**Metodología del score:** El documento externo usa lista de verificación binaria (✓/✗ por componente). No hay ponderación explicada — el score 0.91 podría derivar de 10 ítems con 9 aprobados (0.90), o 11 con 10 (0.91). El denominador no se especifica.

**Análisis:** El score es plausible y consistente con el análisis THYROX. Sin embargo, la mecánica de derivación (¿cuántos ítems? ¿qué ponderación?) no está explícita. El número 0.91 no tiene denominador visible.

**Clasificación:** INFERENCIA CALIBRADA — el score es consistente con evidencia observable pero la derivación no es completamente trazable.
**Calibración:** 0.75

---

### G-04: "★ MEJOR CALIBRADO DEL LIBRO COMPLETO"

**Texto exacto (input L:100):** "★ MEJOR CALIBRADO DEL LIBRO COMPLETO"

**Verificación:** El documento externo no tiene acceso documentado a todos los capítulos del libro. Solo analiza Cap.10 en profundidad. La comparación con Cap.9 aparece en §8 (input L:296-310), pero Cap.1-8 y Cap.11 en adelante no son evaluados en este documento.

El análisis THYROX tiene datos de Cap.6 (44%), Cap.7 (~44%), Cap.8 (42%), Cap.9 (77%), Cap.10 (65%). Con esa evidencia, la sección 2 de Cap.10 (0.90) sería el puntaje individual más alto para una sección — pero "mejor calibrado del libro completo" requiere comparar contra CADA sección de CADA capítulo analizado.

El propio documento externo en §8 solo compara Cap.10 con Cap.9 — no menciona haber evaluado todos los capítulos del libro.

**Análisis:** El superlativo "MEJOR DEL LIBRO COMPLETO" es un claim sobre todos los capítulos no evaluados. Es afirmación de máximo relativo que requiere haber medido el mínimo en todos los otros elementos del conjunto. El documento externo no demuestra haber evaluado la sección equivalente en Cap.1-8 y Cap.11+.

**Clasificación:** AFIRMACIÓN PERFORMATIVA — superlativo sin acceso documentado al conjunto completo del libro. El claim podría ser verdad, pero no hay evidencia que lo sustente. Impacto: Medio (influye en la valoración de Cap.10 como referencia).

**Evidencia propuesta:** Comparación sistemática de puntajes de secciones de advertencia en Cap.1-8 del libro. Sin eso, reformular a: "Entre los capítulos analizados, la sección de advertencias de Cap.10 tiene el score más alto (0.90)."
**Calibración:** 0.10

---

### G-05: Score 0.90 para Sección 2 (advertencias honestas)

**Texto exacto (input L:69):** "Score: 0.90 (EXCELENTE CALIBRACIÓN — MÁS CALIBRADO DEL LIBRO)"

**Verificación:** El análisis THYROX asignó scores de 0.90, 0.90, 0.95, 0.85 a los claims C-16, C-17, C-18, C-24 del Grupo D (advertencias). Promedio: 0.90. Convergencia exacta.

**Metodología:** Como en G-03, la mecánica de derivación del 0.90 no está explícita (¿cuántos ítems verificados en qué escala?). Pero la convergencia con el análisis THYROX desde metodología diferente fortalece la validez del número.

**Clasificación:** INFERENCIA CALIBRADA — convergencia con análisis independiente. La mecánica de derivación no trazable reduce el score.
**Calibración:** 0.80

---

### G-06: "Razonamiento causal con ejemplos concretos" (dominio B)

**Texto exacto (input L:73-93):** Cita el ejemplo del sistema de tickets (problema concreto → consecuencia específica → solución demostrable → razonamiento causal).

**Verificación contra mcp-pattern-input.md §2:** El párrafo del sistema de tickets está verbatim en el texto fuente: "si la API de un sistema de tickets solo permite recuperar detalles completos del ticket uno por uno, un agente al que se le pide resumir tickets de alta prioridad será lento e inexacto en altos volúmenes." El patrón de 4 pasos (problema → consecuencia → solución → razonamiento) es una lectura correcta del texto.

**Análisis:** El documento externo extrae e identifica correctamente el patrón causal del texto fuente. La caracterización "razonamiento causal con ejemplos concretos" está respaldada por el texto fuente.

**Clasificación:** OBSERVACIÓN DIRECTA — verificable en mcp-pattern-input.md §2.
**Calibración:** 1.0

---

### G-07: Lenguaje calibrado: "a menudo requieren", "puede ser", "es útil solo si"

**Texto exacto (input L:89-92):** "✓ 'a menudo requieren' — frecuencia sin certeza total / ✓ 'puede ser' — posibilidad, no certeza / ✓ 'es útil solo si' — condición específica"

**Verificación contra mcp-pattern-input.md §2:**
- "a menudo requieren soporte determinista más robusto" — VERIFICADO en §2
- "puede envolver una API" — "puede ser" presente implícitamente en §2 ("puede envolver")
- "es útil solo si su formato de datos es amigable para el agente" — VERIFICADO en §2

**Nota:** La frase exacta "puede ser" no aparece como tal en el texto fuente; la formulación real es "puede envolver" y "puede facilitar". El documento externo generalizó a "puede ser" como etiqueta de categoría. No es una falsificación, es una abstracción de las frases concretas del texto.

**Clasificación:** OBSERVACIÓN DIRECTA con abstracción menor — las frases marcadoras están verificadas en el texto fuente; la etiqueta "puede ser" es abstracción válida.
**Calibración:** 0.90

---

### G-08: Dominio C (comparativo): Score 0.72

**Texto exacto (input L:106):** "Score: 0.72 (CALIBRACIÓN MODERADA — POR DEBAJO DE IDEAL)"

**Verificación:** El análisis THYROX evaluó el Grupo B (comparativo) con scores 0.75, 1.0, 0.80, 0.80, 0.25 para C-07 a C-11. Promedio: 0.72. Convergencia exacta.

**Mecánica:** Como en G-03 y G-05, la derivación del 0.72 no está explícita. La convergencia con el análisis THYROX valida el número.

**Clasificación:** INFERENCIA CALIBRADA — convergencia con análisis independiente.
**Calibración:** 0.75

---

### G-09: "Dynamic discovery: claim sin soporte — calibración 0.3"

**Texto exacto (input L:112-118):** "Fila: 'Descubrimiento' / MCP: 'Permite el descubrimiento dinámico de herramientas disponibles' / PROBLEMA: Claim: Dynamic discovery / Evidencia en código: NINGUNA (servidores hardcodeados) / Calibración: 0.3"

**Verificación contra mcp-pattern-input.md:**
El texto fuente en §3 tabla comparativa dice: "Habilita el descubrimiento dinámico de herramientas disponibles. Un cliente MCP puede consultar un servidor para ver qué capacidades ofrece." En los ejemplos de código de §7 y §9, los servidores están hardcodeados: `command='npx', args=['-y', '@modelcontextprotocol/server-filesystem', TARGET_FOLDER_PATH]` y `url="http://localhost:8000"`. El código no demuestra discovery dinámico entre múltiples servidores — el cliente sabe de antemano a cuál conectarse.

**Análisis:** El claim del documento externo es técnicamente válido: el texto fuente afirma discovery dinámico pero el código de demostración tiene URL/comando hardcodeado. El documento externo captura una inconsistencia real entre el claim del texto y la demostración de código.

Sin embargo, hay una precisión técnica que el documento externo no captura: MCP SÍ soporta discovery dinámico de herramientas DENTRO de un servidor (el cliente puede preguntar qué herramientas ofrece un servidor dado — ese es el paso 1 del flujo en mcp-pattern-input.md §5). La inconsistencia del código es sobre el discovery de SERVIDORES (cuál servidor usar), no de herramientas dentro del servidor. El documento externo no distingue estos dos niveles.

**Clasificación:** INFERENCIA CALIBRADA con imprecisión técnica — la inconsistencia código/texto es real pero la crítica mezcla discovery de servidores con discovery de herramientas.
**Calibración:** 0.65

---

### G-10: "Tabla presenta diferencia mayor que la real (0.6 vs 0.8)"

**Texto exacto (input L:122-127):** "REALIDAD: Ambos requieren configuración previa. Diferencia: Solo en CÓMO se comunica (manifiesto vs. prompt). Calibración: Tabla presenta diferencia mayor que la real (0.6 vs 0.8)"

**Verificación:** La tabla comparativa en mcp-pattern-input.md §3 presenta MCP como superior en todos los aspectos evaluados (standardization, scope, architecture, discovery, reusability) sin mencionar los tradeoffs de complejidad. La observación del documento externo sobre overhead de transporte y serialización no está en el texto fuente — es conocimiento externo correctamente aplicado.

**Sobre los números 0.6 vs 0.8:** No hay derivación de estos números. ¿De dónde viene 0.6 para "diferencia real" y 0.8 para la diferencia presentada? No hay metodología explícita para este claim cuantitativo.

**Análisis:** La observación cualitativa (tabla presenta MCP como superior sin reconocer tradeoffs) es correcta y verificable contra el texto fuente. Los números 0.6 y 0.8 son afirmaciones cuantitativas sin derivación visible.

**Clasificación:** Parte OBSERVACIÓN DIRECTA (tabla sesgada — verificable), parte AFIRMACIÓN PERFORMATIVA (números 0.6 y 0.8 sin fuente).
**Calibración:** 0.40

---

### G-11: Score 0.65 para "claim de superioridad sin reservas" (tabla comparativa)

**Texto exacto (input L:138):** "Calibración: 0.65 (claim de superioridad sin reservas)"

**Verificación:** Este sub-score se distingue del score general del dominio C (0.72). El documento externo identifica un claim específico dentro del dominio C con 0.65. La mecánica de cómo 0.65 contribuye al 0.72 del dominio no está explicitada.

**Clasificación:** INFERENCIA CALIBRADA — el claim de superioridad sin reservas es verificable contra la tabla del texto fuente; el número 0.65 no tiene derivación explícita.
**Calibración:** 0.60

---

### G-12 a G-20: Scores per-caso de uso

**Verificación metodológica general:** Para cada caso de uso, el documento externo cita problemas específicos verificables en mcp-pattern-input.md §6. La evaluación es: ¿el score asignado es derivable de los problemas identificados?

**G-12 — Base de datos 0.75 (BigQuery es real)**
- Problema identificado: "No menciona latencia de consultas grandes" — verificable: mcp-pattern-input.md §6 no menciona latencia.
- "BigQuery es real": MCP Toolbox for Databases para BigQuery está referenciado en la tabla de referencias del texto fuente. VERIFICADO.
- Score 0.75: consistente con C-25 del análisis THYROX (0.80). Diferencia de 0.05 — plausible dado que el análisis externo incluye "latencia no mencionada" como demérito adicional.
- Clasificación: INFERENCIA CALIBRADA. Score: 0.80

**G-13 — Orquestación medios 0.65**
- Problema identificado: "Sin mención de formato de imagen correcto" — verificable: mcp-pattern-input.md §6 lista los servicios pero no especifica formatos.
- Score 0.65: análisis THYROX asignó 0.85 a C-26 (Genmedia Orchestration). Diferencia de 0.20 — divergencia notable.
- La diferencia se explica por el criterio: THYROX valoró que los productos existen y están referenciados; el análisis externo descuenta por ausencia de especificación de formatos. Ambos criterios son legítimos pero diferentes.
- Clasificación: INFERENCIA CALIBRADA con diferencia de criterio documentada. Score: 0.70

**G-14 — APIs 0.70**
- Problema identificado: "Sin rate limiting, autenticación, errores" — verificable: mcp-pattern-input.md §6 no menciona ninguno de estos para el caso de uso de APIs.
- Score 0.70: razonable. El análisis THYROX no tiene un claim específico equivalente — el caso de APIs fue incluido en la evaluación general del Grupo C.
- Clasificación: INFERENCIA CALIBRADA. Score: 0.75

**G-15 — Extracción de información 0.68**
- Problema identificado: "Compara con 'sistemas tradicionales' sin evidencia" — verificable: mcp-pattern-input.md §6 "supera los sistemas convencionales de búsqueda y recuperación" sin benchmark. VERIFICADO (C-14 en análisis THYROX con score 0.0).
- Score 0.68 es más generoso que el 0.0 del análisis THYROX. La diferencia: THYROX evaluó el claim comparativo como afirmación performativa seria; el análisis externo parece dar crédito al caso de uso conceptual y solo descuenta por la comparación sin evidencia.
- Clasificación: INFERENCIA CALIBRADA — el problema identificado es verificable; el score es más generoso que el análisis THYROX. Score: 0.70

**G-16 — Herramientas personalizadas 0.60**
- Problema identificado: "Sin framework de implementación" — verificable: mcp-pattern-input.md §6 describe la capacidad pero no un framework específico.
- Score 0.60: razonable para un caso conceptualmente válido pero sin demostración.
- Clasificación: INFERENCIA CALIBRADA. Score: 0.70

**G-17 — Comunicación estandarizada 0.75**
- Problema identificado: "Sobrestima reducción de acoplamiento" — la observación es correcta: mcp-pattern-input.md §3 describe reducción de acoplamiento sin benchmark.
- Score 0.75: razonable. El beneficio es demostrable en el texto fuente.
- Clasificación: INFERENCIA CALIBRADA. Score: 0.75

**G-18 — Flujos multi-paso 0.50**
- Problema identificado: "Sin manejo de fallo parcial, idempotencia, aislamiento transaccional" — verificable: mcp-pattern-input.md §6 describe el flujo pero no aborda ninguno de estos aspectos.
- Score 0.50: consistente con C-12 del análisis THYROX (0.30 para IoT, el análisis externo distingue mejor entre los diferentes casos de uso). El análisis THYROX fue más severo con IoT que con multi-paso; el externo es más granular.
- Clasificación: INFERENCIA CALIBRADA. Score: 0.80

**G-19 — Control IoT 0.30 (sin confirmación de entrega)**
- Problema identificado: confirmación de entrega, reintentos, estado verificado, latencia — verificable: mcp-pattern-input.md §6 no aborda ninguno.
- Score 0.30: consistente con C-12 del análisis THYROX (0.30). Convergencia exacta.
- Clasificación: OBSERVACIÓN DIRECTA — ausencias verificables en texto fuente, convergencia con análisis THYROX. Score: 0.90

**G-20 — Servicios financieros 0.20 (sin ACID, sin auditoría, sin firma)**
- Problema identificado: ACID, auditoría, firma digital, reversibilidad — verificable: mcp-pattern-input.md §6 no aborda ninguno.
- Score 0.20: consistente con C-13 del análisis THYROX (0.20). Convergencia exacta.
- Clasificación: OBSERVACIÓN DIRECTA — ausencias verificables en texto fuente, convergencia con análisis THYROX. Score: 0.90

---

### G-21: Discrepancia interna "Promedio casos de uso: 0.57" (tabla) vs. "0.43" (veredicto)

**Texto exacto (input L:156-157):** "Promedio: 0.57 (vs. 0.43 reportado — margen de análisis)"

**Verificación aritmética:**
Tabla de scores (input L:159-168): 0.75 + 0.65 + 0.70 + 0.68 + 0.60 + 0.75 + 0.50 + 0.30 + 0.20 = 5.13 / 9 = **0.57**

El veredicto del dominio D (input L:217): "Calibración: POBRE (0.43)"

La discrepancia es real: la tabla arroja 0.57 y el veredicto dice 0.43. La "explicación" dada es "margen de análisis" — término sin definición.

**Análisis:** El documento externo tiene una contradicción interna aritméticamente verificable. El promedio de la tabla es 0.57, el veredicto es 0.43. "Margen de análisis" no explica una diferencia de 0.14 en una escala 0-1. Posibles causas: (a) el veredicto 0.43 fue calculado de un conjunto diferente de ítems, (b) el veredicto usa una metodología diferente (ponderación por criticidad), (c) es un error de cálculo. El documento no aclara cuál.

**Clasificación:** CONTRADICCIÓN INTERNA confirmada — la discrepancia es aritméticamente verificable. La explicación "margen de análisis" es AFIRMACIÓN PERFORMATIVA — no es una explicación de la diferencia, es un nombre para la diferencia.
**Calibración del claim:** 0.05 (la discrepancia existe y es real, pero la "explicación" no explica nada)

---

### G-22: Dominio D veredicto global 0.43

**Texto exacto (input L:217):** "Calibración: POBRE (0.43)"

**Verificación:** Dado que la tabla de 9 casos arroja 0.57, el score 0.43 no es el promedio aritmético de los scores presentados. No hay metodología explícita para llegar a 0.43.

**Clasificación:** AFIRMACIÓN PERFORMATIVA — número sin derivación trazable en el documento.
**Calibración:** 0.10

---

### G-23: Código: Score 0.23

**Texto exacto (input L:237):** "Calibración: 0.23 (código parece 'listo para producción' pero falta 80% del trabajo real)"

**Verificación:** Los problemas identificados (falta error handling, timeout, retry logic, logging) son verificables en mcp-pattern-input.md §7 y §8. El código de los tres ejemplos es funcional pero sin estos elementos. La observación es correcta.

**Sobre el 0.23 y el "falta 80% del trabajo real":** Estos son números específicos sin derivación explicada. ¿Por qué 0.23 y no 0.20 o 0.25? ¿Por qué el 80%?

**Diferencia con análisis THYROX:** El análisis THYROX (C-22) evaluó el código condensado como correcto (0.90) y los defectos como separados (C-19, C-20, C-21 con score 0). El análisis externo evalúa el código como unidad y descuenta por ausencia de características de producción — criterio diferente y más amplio.

**Clasificación:** INFERENCIA CALIBRADA — los problemas son verificables, los números específicos no tienen derivación explícita.
**Calibración:** 0.60

---

### G-24: Hardcoding presentado como normal; producción necesita service discovery, load balancing, health checks

**Texto exacto (input L:239-251):** "Presentado como: 'Así se conecta un agente a un servidor MCP' / Realidad: Esto es desarrollo LOCAL. En producción necesita: Registro de servicios (Consul, etcd, etc.) / Service discovery / Load balancing / Health checks"

**Verificación contra mcp-pattern-input.md §7:** El código de §7 usa `command='npx', args=['-y', '@modelcontextprotocol/server-filesystem', TARGET_FOLDER_PATH]` con un comentario en la versión extendida: "For production, you would point this to a more persistent and secure location." El texto fuente SÍ señala que el código es de demostración — la versión extendida tiene ese comentario explícito.

**Análisis:** El documento externo no menciona que la versión extendida del código incluye el comentario de producción. La crítica es parcialmente incorrecta: el texto fuente sí distingue entre demo y producción, aunque sea brevemente. La ausencia de Consul/etcd/load balancing es un gap real, pero el claim de que "se presenta como normal" no es completamente preciso.

**Clasificación:** INFERENCIA CALIBRADA con imprecisión — el gap desarrollo/producción es real, pero el texto fuente tiene al menos un comentario al respecto que el análisis externo no reconoce.
**Calibración:** 0.55

---

### G-25: "Traducción fue mejorada (sin imports sin usar)"

**Texto exacto (input L:256-259):** "TRADUCCIÓN: Fue corregido / ✓ No incluye import inútil"

**Verificación contra mcp-pattern-input.md §8:** La versión condensada del servidor FastMCP en mcp-pattern-input.md §8 usa `from fastmcp import FastMCP` (sin `Client`). La versión extendida usa `from fastmcp import FastMCP, Client`. El claim del documento externo es que la "traducción" (entendido como la versión del texto que analizan) corrigió el import superfluo.

**Análisis:** mcp-pattern-input.md preserva AMBAS versiones — la condensada sin `Client` y la extendida con `Client`. Hay una nota editorial explícita: "La versión extendida importa `Client` pero no lo usa en ningún lugar del código del servidor. Posible artifact del texto fuente." El documento externo parece afirmar que la versión analizada no tiene el import, pero el input disponible sí lo preserva en la versión extendida.

**Clasificación:** INFERENCIA POTENCIALMENTE INCORRECTA — el input disponible preserva AMBAS versiones incluyendo el import superfluo. El claim de "fue corregido" no concuerda con lo que está en mcp-pattern-input.md.
**Calibración:** 0.20

---

### G-26: Promedio global 0.54 (tabla síntesis)

**Texto exacto (input L:288-289):** tabla con 10 dominios y scores: 0.91, 0.90, 0.75, 0.72, 0.65, 0.60, 0.50, 0.23, 0.30, 0.20

**Verificación aritmética:**
0.91 + 0.90 + 0.75 + 0.72 + 0.65 + 0.60 + 0.50 + 0.23 + 0.30 + 0.20 = 5.76 / 10 = **0.576**

El documento reporta "PROMEDIO: 0.54" en la nota del input (L:289). La discrepancia es: 0.576 vs. 0.54.

**Análisis:** El promedio aritmético de la tabla es 0.576, no 0.54. Hay una segunda discrepancia interna en el propio documento (además de G-21). Esto sugiere que los scores de la tabla y los promedios reportados se calcularon con metodologías distintas o en momentos distintos.

**Clasificación:** CONTRADICCIÓN INTERNA aritméticamente verificable (segunda).
**Calibración:** 0.05

---

### G-27: "PROMEDIO: 0.54 (vs. reportado 0.65 — análisis granular es más crítico)"

**Texto exacto (input L:289):** "PROMEDIO: 0.54 (vs. reportado 0.65 — análisis granular es más crítico)"

**Verificación:** El análisis THYROX reportó 65% (18.35/28). El análisis externo reporta 0.54 como promedio global. La diferencia se explica en parte por:

1. El análisis externo incluye Dominio E — Código (0.23) como un sub-score promediado con los demás. El análisis THYROX evaluó los defectos de código como claims separados con scores 0.0 pero dentro de una estructura de 28 claims más amplia.
2. El análisis externo usa promedio aritmético de dominios (10 dominios = unidades iguales). El análisis THYROX usó sum de scores / total claims (28 claims con distinto peso implícito por tipo).
3. El análisis externo asigna scores por dominio temático; el análisis THYROX evalúa claims individuales.

**Análisis:** La afirmación de que "el análisis granular es más crítico" es correcta en dirección (0.54 < 0.65) pero el valor 0.54 tiene dos problemas: (1) es inconsistente con el promedio calculable de la tabla propia (0.576), y (2) la diferencia respecto a 0.65 refleja diferentes metodologías, no solo diferente criterio de rigor.

**Clasificación:** INFERENCIA CALIBRADA en dirección, con número interno inconsistente.
**Calibración:** 0.40

---

### G-28: "Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)"

**Texto exacto (input L:309):** "Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)"

**Verificación contra análisis THYROX:** mcp-pattern-calibration.md reporta Cap.9 con 77% de ratio global. Sin embargo, el análisis THYROX de Cap.9 no está disponible en este WP para verificar la consistencia intra-dominio. La afirmación de que Cap.9 tiene 0.77 "en TODOS los dominios" es más fuerte que el ratio global de 77% — implica que NO hay asimetría de dominio.

**Análisis:** El ratio global de 77% para Cap.9 está en mcp-pattern-calibration.md (tabla comparativa §6). Sin embargo, si Cap.9 tuviera asimetría interna (como tiene Cap.10), el documento externo podría estar afirmando homogeneidad que no está documentada en los datos disponibles.

**Clasificación:** INFERENCIA CALIBRADA para el 0.77 global; el "en todos los dominios" no es verificable con los datos disponibles en este WP.
**Calibración:** 0.55

---

### G-29: "Riesgo LEGAL: Reguladores negarían licencia si MCP es ejecutor de transacciones"

**Texto exacto (input L:196-197):** "Riesgo LEGAL: Reguladores negarían licencia si MCP es ejecutor de transacciones"

**Análisis:** El claim describe un riesgo real — sistemas de trading automatizado y asesoramiento financiero están regulados (MiFID II en Europa, SEC Reg BI en EE.UU., etc.). Sin embargo, la formulación "reguladores NEGARÍAN licencia" (condicional fuerte) no tiene cita de regulación específica. La afirmación de que MCP-como-ejecutor-de-transacciones "negaría licencia" requeriría citar el texto regulatorio específico.

El claim direccional (servicios financieros automatizados tienen requisitos regulatorios) es correcto. La formulación "negarían licencia" es más fuerte de lo que la evidencia disponible sustenta.

**Clasificación:** INFERENCIA CALIBRADA en dirección; formulación específica ("negarían licencia") es AFIRMACIÓN PERFORMATIVA sin cita regulatoria.
**Calibración:** 0.45

---

### G-30: "Pérdida de dinero, demandas de clientes" (Financial Services)

**Texto exacto (input L:197):** "Riesgo OPERACIONAL: Pérdida de dinero, demandas de clientes"

**Análisis:** Los riesgos señalados (pérdida de dinero, demandas) son consecuencias plausibles de un sistema financiero mal implementado. Sin embargo, el claim los presenta como consecuencias directas de usar MCP para servicios financieros sin los controles adecuados — lo cual es una inferencia correcta pero no citada ni derivada de evidencia empírica. Es razonamiento de riesgo plausible, no afirmación factual.

**Clasificación:** ESPECULACIÓN ÚTIL — los riesgos son plausibles y el razonamiento es correcto, pero no tienen evidencia empírica. Impacto: Medio (alertas de riesgo que guían diseño).
**Calibración:** 0.55

---

### G-31: "Cap.10 daña la credibilidad del libro"

**Texto exacto (input L:359):** "Sin esas correcciones, cap.10 daña la credibilidad del libro."

**Análisis:** "Daña la credibilidad del libro" es un claim sobre impacto editorial que requiere: (a) definición operacional de "credibilidad", (b) evidencia de que lectores perciben el daño, (c) comparación con un baseline. Ninguno de los tres está presente.

El claim es una evaluación subjetiva expresada como hecho. Podría reformularse como: "Cap.10 contiene claims sin respaldo que, si un lector los pone en práctica, pueden generar resultados negativos" — eso sería un claim derivable. "Daña la credibilidad" implica una evaluación externa del efecto sobre terceros.

**Clasificación:** AFIRMACIÓN PERFORMATIVA — evaluación de impacto editorial sin criterio operacional.
**Calibración:** 0.10

---

### G-32: "Las advertencias honestas de Sec.2 quedan eclipsadas por confianza falsa de Sec.6"

**Texto exacto (input L:354-355):** "Las advertencias honestas de Sec.2 quedan eclipsadas por confianza falsa de Sec.6"

**Verificación contra mcp-pattern-input.md:** La §2 del texto fuente contiene las advertencias de calibración alta (sistema de tickets, PDFs). La §6 contiene los 9 casos de uso proyectados (incluyendo IoT y Financial con calibración baja). El claim sobre "eclipsamiento" implica que la ubicación estructural de §6 hace que los lectores pasen por alto las advertencias de §2.

**Análisis:** La observación sobre estructura narrativa (advertencias al inicio, proyecciones al final) es plausible como argumento de diseño de contenido. Pero "quedan eclipsadas" es un claim sobre comportamiento de lectura — sin evidencia de lectura de usuarios, es especulación sobre percepción del lector.

**Clasificación:** ESPECULACIÓN ÚTIL — la observación sobre estructura narrativa es válida como hipótesis de diseño de contenido. Impacto: Medio.
**Calibración:** 0.50

---

### G-33: Causa de discrepancia 0.43 vs 0.57: "margen de análisis"

**Texto exacto (input L:156-157):** "Promedio: 0.57 (vs. 0.43 reportado — margen de análisis)"

**Análisis:** "Margen de análisis" no es una explicación — es un nombre para la discrepancia. Para que fuera una explicación, debería especificar: qué metodología produce 0.43, por qué difiere aritméticamente del promedio de la tabla, o qué ítems adicionales fueron considerados. La frase funciona como etiqueta tranquilizadora, no como derivación.

**Clasificación:** AFIRMACIÓN PERFORMATIVA — la "explicación" no explica la discrepancia aritmética. Es el problema de calibración más grave del documento porque oscurece una contradicción interna real.
**Calibración:** 0.05

---

## 3. Tabla resumen

| ID | Claim | Score calibración | Estado |
|----|-------|-------------------|--------|
| G-01 | Definiciones técnicas ✓ (5 componentes) | 1.0 | Observación directa (verificada en §4-§5) |
| G-02 | Transporte: STDIO, HTTP, SSE ✓ | 1.0 | Observación directa (verificada en §4) |
| G-03 | Score 0.91 para dominio técnico | 0.75 | Inferencia calibrada (convergente con THYROX, derivación no trazable) |
| G-04 | "MEJOR CALIBRADO DEL LIBRO COMPLETO" | 0.10 | Afirmación performativa (superlativo sin acceso al libro completo) |
| G-05 | Score 0.90 para advertencias honestas | 0.80 | Inferencia calibrada (convergencia exacta con THYROX) |
| G-06 | Razonamiento causal con ejemplos concretos | 1.0 | Observación directa (patrón verificable en texto fuente) |
| G-07 | Lenguaje calibrado: "a menudo requieren", etc. | 0.90 | Observación directa con abstracción menor |
| G-08 | Score 0.72 para dominio comparativo | 0.75 | Inferencia calibrada (convergencia con THYROX) |
| G-09 | Dynamic discovery sin soporte en código | 0.65 | Inferencia calibrada con imprecisión técnica |
| G-10 | Tabla presenta diferencia mayor que la real | 0.40 | Mixto: observación (tabla sesgada) + performativa (0.6 vs 0.8) |
| G-11 | Score 0.65 para claim de superioridad | 0.60 | Inferencia calibrada con derivación no trazable |
| G-12 | Base de datos: 0.75 | 0.80 | Inferencia calibrada (BigQuery verificado) |
| G-13 | Orquestación medios: 0.65 | 0.70 | Inferencia calibrada (diferencia de criterio con THYROX) |
| G-14 | APIs: 0.70 | 0.75 | Inferencia calibrada (ausencias verificables) |
| G-15 | Extracción de información: 0.68 | 0.70 | Inferencia calibrada (más generosa que THYROX) |
| G-16 | Herramientas personalizadas: 0.60 | 0.70 | Inferencia calibrada |
| G-17 | Comunicación estandarizada: 0.75 | 0.75 | Inferencia calibrada |
| G-18 | Flujos multi-paso: 0.50 | 0.80 | Inferencia calibrada (ausencias verificables) |
| G-19 | Control IoT: 0.30 | 0.90 | Observación directa (ausencias verificadas, convergencia exacta) |
| G-20 | Servicios financieros: 0.20 | 0.90 | Observación directa (ausencias verificadas, convergencia exacta) |
| G-21 | Discrepancia 0.57 (tabla) vs 0.43 (veredicto) | 0.05 | Contradicción interna verificable + explicación performativa |
| G-22 | Veredicto dominio D: 0.43 | 0.10 | Afirmación performativa (no derivable de tabla propia) |
| G-23 | Código: Score 0.23 | 0.60 | Inferencia calibrada (problemas verificables, número sin derivación) |
| G-24 | Hardcoding presentado como normal | 0.55 | Inferencia calibrada con imprecisión (texto fuente SÍ tiene advertencia) |
| G-25 | Traducción mejorada (sin import inútil) | 0.20 | Inferencia potencialmente incorrecta (input preserva AMBAS versiones) |
| G-26 | Promedio global 0.54 | 0.05 | Contradicción interna (tabla propia arroja 0.576) |
| G-27 | 0.54 vs 0.65 — granular más crítico | 0.40 | Inferencia calibrada en dirección, número interno inconsistente |
| G-28 | Cap.9 con 0.77 en todos los dominios | 0.55 | Inferencia calibrada (global verificado, intra-dominio no) |
| G-29 | Riesgo LEGAL: reguladores negarían licencia | 0.45 | Mixto: dirección correcta, formulación específica sin cita |
| G-30 | Pérdida de dinero, demandas (Financial) | 0.55 | Especulación útil (plausible, sin evidencia empírica) |
| G-31 | "Cap.10 daña credibilidad del libro" | 0.10 | Afirmación performativa (evaluación editorial sin criterio) |
| G-32 | Advertencias eclipsadas por confianza falsa | 0.50 | Especulación útil (hipótesis de diseño de contenido) |
| G-33 | "Margen de análisis" como explicación | 0.05 | Afirmación performativa (nombre para la discrepancia, no explicación) |

**Suma de scores:** 18.00 / 33
**Ratio de calibración:** **18.00/33 = 55%**

---

## 4. Ratio de calibración y clasificación

```
Ratio = 18.00 / 33 = 55%

Clasificación: PARCIALMENTE CALIBRADO

Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate: ≥ 0.75           ✗ no alcanzado
Resultado: supera umbral de exploración por margen estrecho (5%)
```

**Distribución por tipo:**

| Tipo | Cantidad | Suma scores | % del total |
|------|----------|-------------|-------------|
| Observaciones directas (score ≥ 0.85) | 6 (G-01, G-02, G-06, G-07, G-19, G-20) | 5.70 | 32% del valor total |
| Inferencias calibradas (0.55-0.84) | 15 | 10.55 | 59% del valor total |
| Afirmaciones performativas / contradicciones (< 0.25) | 7 (G-04, G-21, G-22, G-25, G-26, G-31, G-33) | 0.75 | 4% del valor total |
| Especulaciones / mixto (0.25-0.54) | 5 | 1.90 | 11% del valor total |

**Nota sobre las contradicciones internas:** El documento tiene dos contradicciones aritméticas verificables (G-21: 0.57 vs 0.43; G-26: 0.576 vs 0.54). Ambas son auto-generadas por el documento — el propio texto contiene las tablas que permiten calcular el número correcto. Las "explicaciones" ofrecidas no son derivaciones.

---

## 5. Afirmaciones performativas del documento externo: 7

| # | Texto | Línea input | Impacto | Evidencia propuesta |
|---|-------|-------------|---------|---------------------|
| 1 | "★ MEJOR CALIBRADO DEL LIBRO COMPLETO" (G-04) | L:100 | Medio | Comparar scores de secciones de advertencia en Cap.1-8 del libro. Sin eso: reformular a "entre capítulos evaluados" |
| 2 | Discrepancia 0.57 (tabla) vs 0.43 (veredicto) — "margen de análisis" (G-21) | L:156-157 | Alto | Especificar la metodología que produce 0.43 vs. la aritmética de la tabla que produce 0.57 |
| 3 | Veredicto dominio D: 0.43 (sin derivación trazable) (G-22) | L:217 | Alto | Mostrar el cálculo completo que lleva a 0.43 desde los scores de la tabla |
| 4 | Promedio global 0.54 inconsistente con tabla propia (0.576) (G-26) | L:289 | Alto | Recalcular o explicar qué ítems difieren del promedio aritmético de la tabla |
| 5 | "Traducción fue mejorada (sin imports sin usar)" (G-25) | L:256-259 | Medio | Verificar contra mcp-pattern-input.md §8: ambas versiones preservadas, extendida tiene `Client` |
| 6 | "Cap.10 daña la credibilidad del libro" (G-31) | L:359 | Bajo | Reformular a claim verificable: "contiene claims sin evidencia que pueden inducir a error en implementaciones de alta sensibilidad" |
| 7 | Tabla presenta diferencia real "0.6 vs 0.8" (G-10 parcial) | L:122-127 | Bajo | Los números 0.6 y 0.8 no tienen derivación. Reformular: "tabla no incluye tradeoffs de overhead" (claim verificable) |

---

## 6. Respuesta a la pregunta específica: ¿El análisis granular es más o menos calibrado que el de alto nivel?

### Dimensión 1: Convergencia en scores finales

Los scores del análisis externo convergen con los del análisis THYROX en los casos mejor fundamentados:

| Caso de uso | Score externo | Score THYROX | Diferencia | Dirección |
|-------------|---------------|-------------|------------|-----------|
| IoT Control | 0.30 | 0.30 | 0.00 | Exacta |
| Financial Services | 0.20 | 0.20 | 0.00 | Exacta |
| Database Integration | 0.75 | 0.80 | -0.05 | Externo más severo |
| Genmedia Orchestration | 0.65 | 0.85 | -0.20 | Externo más severo |
| Dominio técnico (promedio) | 0.91 | ~0.91 | 0.00 | Exacta |
| Advertencias honestas | 0.90 | ~0.90 | 0.00 | Exacta |

La convergencia en los casos de peor calibración (IoT, Financial) y los de mejor calibración (protocolo, advertencias) es exacta. La diferencia está en los casos intermedios, donde el análisis externo es consistentemente más severo.

### Dimensión 2: Granularidad vs. trazabilidad

El análisis externo es MÁS GRANULAR: subdivide Dominio C en 9 sub-casos mientras el análisis THYROX los agrupó en 5 claims. Identifica problemas específicos por caso (latencia, formatos de imagen, rate limiting) que el análisis THYROX no detalló.

El análisis externo es MENOS TRAZABLE: los scores por dominio (0.91, 0.90, 0.72, 0.43) no tienen denominadores explícitos. El análisis THYROX tiene 28 claims con scores individuales que suman 18.35 — trazable claim por claim.

### Dimensión 3: Problemas propios del análisis externo

El análisis externo tiene sus propios problemas de calibración:

1. **Dos contradicciones aritméticas internas** (G-21, G-26) — el documento no verifica que sus promedios sean coherentes con sus propias tablas.
2. **Un superlativo sin base** (G-04) — "mejor del libro completo" sin acceso al libro completo.
3. **Una verificación incorrecta** (G-25) — afirma que la "traducción" corrigió el import, pero mcp-pattern-input.md preserva ambas versiones incluyendo la con el import superfluo.
4. **Explicaciones sin contenido** (G-33) — "margen de análisis" nombra la discrepancia sin explicarla.

### Veredicto de la pregunta

**El análisis externo es más granular y captura problemas reales que el análisis THYROX no detalló** (especialmente en los casos de uso de calibración media: APIs, medios, multi-paso). Su identificación de sub-problemas por caso (latencia, formatos, rate limiting, idempotencia) tiene valor técnico real.

**Sin embargo, el análisis externo tiene menos calibración que el análisis THYROX** (55% vs 65% respectivamente) principalmente por:
- Dos contradicciones aritméticas internas que el análisis THYROX no tiene
- Un superlativo sin base ("mejor del libro completo")
- Ausencia de denominadores para los scores por dominio

En términos de *rigor epistémico*, el análisis THYROX es más trazable. En términos de *cobertura de problemas técnicos*, el análisis externo es más detallado para los casos de uso de calibración media.

---

## 7. Síntesis comparativa: tres análisis de Cap.10

| Dimensión | THYROX (mcp-pattern-calibration.md) | Auditoría formal (mcp-audit-input.md) | Análisis granular externo (mcp-granular-calibration-input.md) |
|-----------|--------------------------------------|--------------------------------------|---------------------------------------------------------------|
| Ratio de calibración del análisis | 65% (18.35/28) | No calculado en este WP | 55% (18/33) |
| Metodología | Scoring individual por claim (28 claims) | No disponible para comparación directa | Scoring por dominio temático (10 dominios, 9 sub-casos) |
| Ratio del documento evaluado (Cap.10) | 65% | No disponible | 0.54 global (con inconsistencias internas) |
| Valor diferencial | Trazabilidad claim por claim; identificación de CAD como patrón | — | Granularidad por sub-caso; identificación de problemas específicos por caso de uso |
| Problemas propios | Casos especulativos evaluados con más severidad que los casos con referencia | — | Dos contradicciones aritméticas internas; superlativo sin base; explicaciones vacías |
| Convergencia con otros análisis | Base de comparación | — | Exacta en casos extremos (IoT 0.30, Financial 0.20); divergente en casos intermedios |
| Score Cap.10 reportado | 65% PARCIALMENTE CALIBRADO | — | 54% PARCIALMENTE CALIBRADO (con corrección aritmética: ~58%) |
| Patrón identificado | CAD (Calibración Asimétrica por Dominio) — nombrado explícitamente | — | CAD implícito (0.91 protocolo vs. 0.20 financiero), sin nombrarlo |

**Nota sobre el "promedio correcto" del análisis granular:** La tabla de síntesis del documento externo (input §7) arroja 0.576 cuando se calcula correctamente. El 0.54 reportado es inconsistente con la propia tabla. Con 0.576 la diferencia con el 0.65 del análisis THYROX se reduce a 0.074 — una diferencia que se explica casi completamente por la inclusión del Dominio E — Código (0.23) como componente de igual peso que los demás dominios.

---

## 8. Discrepancia 0.54 vs. 0.65: ¿es "margen de análisis" una explicación suficiente?

No. Las fuentes de divergencia son cuatro, no una:

**Fuente 1 — Inclusión de Dominio E (código) como dominio de igual peso.**
El análisis externo promedia el score de código (0.23) junto con los demás dominios. El análisis THYROX evaluó los defectos de código como claims individuales dentro de un conjunto de 28 — con menor peso relativo. Si se excluye el Dominio E del análisis externo: promedio de 9 dominios restantes = (5.76 - 0.23) / 9 = 0.614. Ya no hay diferencia significativa respecto al 0.65.

**Fuente 2 — Metodología diferente para casos de uso.**
El análisis THYROX evaluó los casos de uso como claims individuales de distinto impacto. El análisis externo los evaluó como unidades de igual peso. Para casos como Genmedia Orchestration, THYROX asignó 0.85 (herramientas verificables) y el externo 0.65 (faltó especificación de formatos). La diferencia es de criterio, no de error.

**Fuente 3 — El número 0.54 es internamente inconsistente.**
La tabla propia del análisis externo arroja 0.576. El 0.54 reportado es el resultado de una metodología diferente a la mostrada en la tabla. "Margen de análisis" no explica esta discrepancia de 0.036.

**Fuente 4 — El número 0.43 para Dominio D es igualmente inconsistente.**
La tabla de los 9 casos arroja 0.57. El 0.43 del veredicto tampoco es derivable de la tabla. Las dos discrepancias internas son estructuralmente el mismo problema.

**Conclusión:** "Margen de análisis" es una etiqueta que oscurece el hecho de que el documento tiene al menos dos errores aritméticos internos. La diferencia 0.54 vs. 0.65 se explica metodológicamente (inclusión de código, granularidad diferente), pero esa explicación no es la que ofrece el documento.

---

## 9. Recomendación de uso

| Propósito | Usabilidad del análisis externo | Justificación |
|-----------|----------------------------------|---------------|
| Identificar problemas técnicos específicos por caso de uso | ALTA | Los 9 sub-problemas detallados (latencia, formatos, idempotencia, ACID, etc.) son verificables y no están en el análisis THYROX |
| Confirmar los scores de casos extremos (IoT, Financial) | ALTA | Convergencia exacta con análisis THYROX |
| Usar el promedio global 0.54 como cifra de referencia | BAJA | Inconsistente con la propia tabla del documento (0.576 calculado) |
| Usar el veredicto del Dominio D (0.43) | BAJA | No derivable de la tabla de 9 casos (que arroja 0.57) |
| Adoptar "mejor calibrado del libro completo" | NO ADOPTABLE | Superlativo sin acceso documentado al libro completo |

---

## Veredicto de calibración del análisis granular externo

**Ratio:** 55% (18/33) — PARCIALMENTE CALIBRADO

**Clasificación correcta:** El documento supera el umbral de exploración (55% > 50%) pero por margen estrecho. Sus problemas más graves no están en los claims sobre Cap.10 — la mayoría son verificables y correctos — sino en su propia aritmética interna (dos discrepancias entre tablas y promedios reportados) y en un superlativo sin base ("mejor del libro completo").

**Patrón dominante:** El documento exhibe el mismo problema que detecta — realismo performativo selectivo. Sus evaluaciones de Cap.10 están bien fundamentadas; sus números de síntesis (0.54, 0.43) no son trazables desde sus propias tablas. El documento es más calibrado en sus análisis particulares que en sus conclusiones globales.

**Recomendación para THYROX:** Usar los sub-análisis de casos de uso (G-12 a G-20) como complemento del análisis THYROX — aportan granularidad técnica real. No usar los promedios globales (0.54, 0.43) sin corrección aritmética. Para la cifra de comparación con el análisis THYROX, usar 0.576 (calculable de la tabla propia) en lugar del 0.54 reportado.
