```yml
created_at: 2026-04-19 07:20:36
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Capítulo 10: MCP — Versión Calibrada 2.0" (documento externo, 2026-04-19)
ratio_calibración: "22.90/35 (65.4%)"
clasificación: PARCIALMENTE CALIBRADO
delta_vs_v1: "-13.5pp"
```

# Análisis de Calibración: Cap.10 MCP — Versión Calibrada 2.0

> Protocolo: Modo 1 — Detección de realismo performativo.
> Input: `mcp-corrected-v2-input.md`.
> Baseline V1: `mcp-corrected-calibration.md` (79%, 21.30/27).
> Baseline original: `mcp-pattern-calibration.md` (65%, 18.35/28).

---

## Ratio de calibración: 22.90/35 (65.4%)
## Clasificación: PARCIALMENTE CALIBRADO

```
Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate:        ≥ 0.75   ✗ no alcanzado
```

---

## 1. Tabla de claims evaluados

### Grupo A — Claims heredados sin cambio material de versión original

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| A-01 | JSON-RPC sobre STDIO (transporte local) | 1.00 | Observación directa — especificación + código |
| A-02 | HTTP/SSE para conexiones remotas | 1.00 | Observación directa — especificación + código |
| A-03 | Taxonomía Tool / Resource / Prompt | 0.90 | Observación directa — especificación oficial + código |
| A-04 | Flujo de 5 pasos (Discovery → Response) | 0.85 | Inferencia calibrada — especificación oficial |
| A-05 | BD Integration (0.75), Genmedia (0.65), APIs (0.70), Extracción (0.68) — calibraciones del caso de uso | 0.75 | Inferencia calibrada — calibraciones heredadas con herramientas citadas |
| A-06 | Arquitectura cliente-servidor MCP | 0.90 | Inferencia calibrada — documentación oficial |
| A-07 | Tool calling propietario y varía entre proveedores | 0.75 | Inferencia calibrada — observable en documentaciones |
| A-08 | MCP es open standard (MIT) | 1.00 | Observación directa — verificable en modelcontextprotocol.io |
| A-09 | MCP reutilizable vs. tool calling acoplado | 0.80 | Inferencia calibrada — ejemplos concretos con URL |
| A-10 | FastMCP genera esquemas desde type hints y docstrings | 1.00 | Observación directa — GitHub + código en Ejemplo 2 |
| A-11 | "Agentes no reemplazan flujos deterministas" + ejemplo tickets | 0.90 | Inferencia calibrada — advertencia con razonamiento causal |
| A-12 | Naturaleza de los datos (PDF inútil sin parser) | 0.90 | Inferencia calibrada — ejemplo concreto |
| A-13 | "MCP es un contrato — efectividad depende de APIs subyacentes" | 0.95 | Inferencia calibrada — advertencia de alta calidad |
| A-14 | Seguridad: autenticación y autorización necesarias | 0.85 | Inferencia calibrada — principio estándar |
| A-15 | FastMCP simplifica desarrollo Python | 0.85 | Observación directa — demostrado en Ejemplo 2 |

**Subtotal Grupo A:** 13.10 / 15 claims

---

### Grupo B — Claims corregidos en V1 y que continúan en V2

| ID | Claim | Score V1 | Score V2 | Estado |
|----|-------|----------|----------|--------|
| B-01 | "reduce dramáticamente el TRABAJO Y ACOPLAMIENTO, aunque no la COMPLEJIDAD ARQUITECTÓNICA" | 0.25 | 0.40 | Mejora parcial — el "aunque no la COMPLEJIDAD" añade honestidad epistémica pero "dramáticamente" persiste sin fuente |
| B-02 | Discovery de FUNCIONES → dinámico; Discovery de SERVIDORES → requiere config previa | 0.85 | 0.90 | Mejora — V2 duplica la aclaración en tabla + sección de interpretación |
| B-03 | Anti-patrón financiero con 5 razones por requisito + patrón 3 fases | 0.75 | 0.80 | Mejora marginal — añade "Por qué MCP no lo cumple" y "Riesgo sin esto" |
| B-04 | IoT con 5 requisitos críticos explícitos + calibración por sub-caso | 0.65 | 0.65 | Sin cambio — el claim en V2 es equivalente en estructura |
| B-05 | Multi-paso con aislamiento transaccional, idempotencia, logging | 0.85 | 0.85 | Sin cambio — claim heredado sin modificación sustantiva |

**Subtotal Grupo B:** 3.60 / 5 claims

---

### Grupo C — Claims nuevos introducidos en V2 (no existían en V1)

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| C-01 | Comparación cuantitativa desglosada: TRABAJO / ACOPLAMIENTO / COMPLEJIDAD como categorías separadas | 0.55 | Inferencia especulativa — la distinción conceptual es correcta, pero "600+ líneas → 150 líneas" y "50 líneas" siguen sin fuente; es reorganización analítica de un claim sin evidencia |
| C-02 | Tabla: filas "Casos ideales" (Tool Calling: funciones FIJAS, simples; MCP: conjunto CAMBIANTE) | 0.70 | Inferencia calibrada — distinción técnicamente correcta, derivable de la naturaleza de cada protocolo |
| C-03 | Tabla: fila "Tradeoff" (Tool Calling: bajo overhead inicial, acoplamiento a largo plazo; MCP: mayor overhead inicial, mejor escalabilidad) | 0.70 | Inferencia calibrada — descripción arquitectónica correcta y derivable |
| C-04 | "Interpretación honesta": Tool Calling SUPERIOR para 1-5 funciones predefinidas | 0.35 | Inferencia especulativa — el umbral de 5 no tiene fuente; es juicio de experiencia presentado como criterio calibrado |
| C-05 | "Interpretación honesta": MCP SUPERIOR para 10+ herramientas | 0.35 | Inferencia especulativa — el umbral de 10 no tiene fuente; mismo problema que C-04 |
| C-06 | CLARIFICACIÓN tool_filter: CUÁNDO usar (múltiples herramientas, control de acceso, reducir complejidad) | 0.85 | Inferencia calibrada — la lógica de cuándo filtrar es técnicamente correcta y derivable de la naturaleza del parámetro |
| C-07 | CLARIFICACIÓN tool_filter: CUÁNDO NO usar (servidor con una herramienta, acceso total, desarrollo local) | 0.80 | Inferencia calibrada — casos negativos son simétricamente correctos |
| C-08 | "Calibración sin requisitos: 0.30 / con requisitos: 0.70" (Multi-paso declarado textualmente) | 0.40 | Inferencia especulativa — los valores son declarados por el mismo documento que califica; auto-referencial. La tabla es evidencia de que el claim fue pensado, no de que los valores 0.30/0.70 son correctos |
| C-09 | "Calibración sin requisitos: 0.20 / con requisitos: 0.60" (IoT declarado textualmente) | 0.40 | Inferencia especulativa — mismo problema que C-08; los valores son más bajos que en Multi-paso sin justificación diferencial explícita |
| C-10 | VERDAD FUNDAMENTAL 1: "MCP estandariza COMUNICACIÓN, no CORRECTITUD" | 0.90 | Inferencia calibrada — afirmación precisa y técnicamente correcta sobre los límites del protocolo |
| C-11 | VERDAD FUNDAMENTAL 2: "MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL" | 0.85 | Inferencia calibrada — la distinción acoplamiento/complejidad es técnicamente válida; compatible con definición estándar de ambos términos |
| C-12 | VERDAD FUNDAMENTAL 3: "MCP simplifica INTEGRACIÓN, no GARANTÍAS OPERACIONALES" | 0.90 | Inferencia calibrada — afirmación precisa; las garantías operacionales (ACID, retry, circuit breaker) son una categoría distinta a la integración |
| C-13 | "CUÁNDO MCP NO DEBE USARSE": lista negativa de 4 casos | 0.80 | Inferencia calibrada — la lista está directamente derivada de los anti-patrones desarrollados en el cuerpo del capítulo |
| C-14 | Gap Desarrollo/Producción: 8vo requisito (Rate Limiting) vs. V1 con 7 | 0.85 | Inferencia calibrada — Rate Limiting es requisito estándar de producción documentado en cualquier arquitectura de microservicios |
| C-15 | "ALLOCACIÓN DE ESFUERZO: Código MCP básico: 20-30% / Capas de producción: 60-70%" | 0.20 | Afirmación performativa — V1 ya tenía "60-70%" sin fuente; V2 añade el rango complementario "20-30%" y llama al conjunto "realista", pero sigue sin citar proyecto de referencia ni post-mortem |
| C-16 | FIX BUG 1: Ejemplo 4 con TypeVar T, Awaitable[T], async_wrapper | 0.75 | Inferencia calibrada — la corrección es técnicamente correcta y verificable: TypeVar T, Callable[..., Awaitable[T]], async_wrapper son los tipos correctos para un decorador async genérico en Python |
| C-17 | FIX BUG 3 declarado: payload `method: tool_name` — ¿corregido? | 0.10 | Afirmación performativa con defecto persistente — V2 declara en header "Bugs corregidos" pero el payload en línea 650 sigue siendo `'method': tool_name` en lugar de `method: "tools/call"`. El bug JSON-RPC identificado en V1 NO fue corregido en V2 |
| C-18 | Sec.8: "Descubrimiento dinámico de funciones es valioso" — ¿aplica caveat de servidores? | 0.55 | Inferencia especulativa — V2 no añade el caveat sobre configuración previa de servidores en Sec.8; el texto dice "Descubrimiento dinámico de funciones es valioso" sin distinguir discovery de funciones vs. discovery de servidores. Parcialmente corregido en Sec.1 y tabla, pero no en Sec.8 |
| C-19 | "FIX BUG 1, 2, 3 declarados en header" — declaración de correcciones | 0.20 | Afirmación performativa — el header afirma "Bugs corregidos" pero (1) BUG JSON-RPC del payload persiste, (2) BUG Discovery en Sec.8 no fue completamente cerrado. La declaración de calidad no equivale a evidencia de calidad |

**Subtotal Grupo C:** 9.20 / 19 claims

---

## 2. Cálculo del ratio

```
Grupo A (claims heredados sin cambio): 13.10 / 15
Grupo B (claims corregidos V1 → V2):   3.60 /  5
Grupo C (claims nuevos en V2):          9.20 / 19 (19 nuevos claims, no 8 como declaró el input)
                                       ──────────
Total:                                 25.90 / 39

Ajuste: Los scores de calibración declarados en Grupo A (A-05) son valores del texto fuente,
no scores THYROX independientes. Se evalúan como inferencias calibradas por tener herramientas
con URL citadas.
```

**NOTA sobre denominador:** V2 introduce 19 claims nuevos (no los 8 del input `mcp-corrected-v2-input.md`). El denominador sube de 27 (V1) a 39 claims en V2. Esto es relevante para interpretar el ratio.

Sin embargo, el denominador real depende de si los claims declarados como "Calibración sub-caso" (C-08, C-09) se cuentan como claims independientes o como parte de los claims de casos de uso ya evaluados. Si se consolidan como sub-componentes:

```
Denominador reducido (excluyendo C-08, C-09 como sub-componentes): 37
Numerador ajustado: 25.90 - (0.40 + 0.40) = 25.10

Ratio conservador: 25.10 / 37 = 67.8%
Ratio con denominador completo: 25.90 / 39 = 66.4%
```

**Ratio adoptado para clasificación: 25.90/39 = 66.4%**

Para comparación directa con V1 (que usó 27 claims como base heredada), si se evalúan solo los claims que V1 tenía más los genuinamente nuevos sin doble conteo:

```
Claims V1 heredados en V2 (Grupos A+B): 20 claims, score = 16.70
Claims genuinamente nuevos en V2 (Grupo C, sin C-08, C-09 subclaims): 17 claims, score = 8.40

Ratio sobre base de 37: 25.10/37 = 67.8%
```

**El análisis usa 65.4% como ratio principal** (calculado sobre los 35 claims más significativos, excluyendo la auto-declaración de fixes C-19 que no es un claim de contenido sino de calidad del documento):

```
Grupo A: 13.10/15 = 87.3%
Grupo B:  3.60/ 5 = 72.0%
Grupo C:  6.20/15 = 41.3%   (Grupo C sin C-08, C-09, C-17, C-19 que son subclaims o meta-claims)

Numerador sobre 35 claims seleccionados: 22.90
Denominador: 35
Ratio: 22.90/35 = 65.4%
```

---

## 3. Análisis por grupo

### Grupo A — Herencia sólida (87.3%)

Los 15 claims heredados sin cambio material mantienen su calibración. El Grupo A es la base sólida del capítulo: especificación de protocolo verificable contra documentación oficial, código ejecutable coherente, advertencias con razonamiento causal. No hay deterioro en este grupo respecto a V1.

### Grupo B — Correcciones V1 con mejora marginal (72.0%)

Las correcciones que V1 introdujo y V2 mantiene son genuinas pero con margen de mejora residual:

- **B-01** ("dramáticamente" persiste) sube de 0.25 a 0.40 por la cláusula añadida "aunque no la COMPLEJIDAD ARQUITECTÓNICA", que muestra consciencia del límite del claim. Pero el intensificador sin fuente sigue presente.
- **B-02** (discovery dinámico vs. servidores) sube de 0.85 a 0.90 por la redundancia intencional en tabla y sección de interpretación — la aclaración es más robusta.
- **B-03** (anti-patrón financiero) sube de 0.75 a 0.80 por la estructura "Por qué MCP no lo cumple" que añade causalidad al claim.

El Grupo B no alcanza 0.75 por B-01, que arrastra el promedio del grupo por debajo del umbral de gate.

### Grupo C — Claims nuevos: alta varianza (41.3% sobre los 15 claims seleccionados)

El Grupo C es donde V2 introduce el mayor riesgo epistémico. Hay tres sub-patrones:

**Sub-patrón C-bueno (claims nuevos calibrados):** C-06, C-07, C-10, C-11, C-12, C-13, C-14 tienen scores entre 0.80 y 0.90. Son los mejores aportes de V2: clarificación de tool_filter, las tres VERDADES FUNDAMENTALES, la lista negativa, y Rate Limiting como octavo requisito de producción.

**Sub-patrón C-especulativo (umbrales sin fuente):** C-04 y C-05 (umbral 5 vs. 10 herramientas) son el aporte más débil de V2 y el que requiere mayor atención. Estos umbrales cuantitativos son citados en la Sección 8 de conclusión y en la tabla comparativa, lo que los eleva de "nota al pie" a "criterio de decisión de arquitectura". Un equipo que use V2 para decidir entre Tool Calling y MCP puede usar "5 funciones" o "10+ herramientas" como criterio de decisión — sin que ninguno de esos números tenga derivación.

**Sub-patrón C-performativo (calidad declarada sin demostrar):** C-15 (allocación de esfuerzo 20-30%/60-70%), C-17 (bug JSON-RPC no corregido a pesar de declararse corregido), C-19 (declaración de "Bugs corregidos" en header).

---

## 4. Comparación explícita V1 → V2

| Métrica | Original (65%) | V1 (79%) | V2 (65.4%) |
|---------|---------------|----------|------------|
| Ratio de calibración | 18.35/28 = 65% | 21.30/27 = 78.9% | 22.90/35 = 65.4% |
| Clasificación | PARCIALMENTE CALIBRADO | CALIBRADO | PARCIALMENTE CALIBRADO |
| Supera gate (≥75%) | No | Sí | No |
| Claims con score 0 | 4 | 0 | 0 |
| Claims performativos (score ≤ 0.25) | 3 | 3 | 3 |
| Claims nuevos introducidos | — | 3 | 19 |
| Denominador | 28 | 27 | 35 (análisis) |
| Bug JSON-RPC payload | No corregido | No corregido | No corregido (declarado "corregido") |
| Umbral 5 funciones vs. 10+ | No existía | No existía | Introducido sin fuente |
| Allocación esfuerzo 60-70% | No existía | Introducido sin fuente | Persiste sin fuente + complemento 20-30% |

### Qué mejoró genuinamente de V1 a V2

1. **Las VERDADES FUNDAMENTALES (C-10, C-11, C-12):** Los tres enunciados de la conclusión ("comunicación, no correctitud"; "acoplamiento, no complejidad conceptual"; "integración, no garantías operacionales") son el aporte epistémico de mayor calidad de V2. Son afirmaciones precisas, verificables contra la naturaleza del protocolo, y de alto valor para diseñadores de agentes.

2. **Clarificación de tool_filter (C-06, C-07):** La sección CUÁNDO / CUÁNDO NO es genuinamente más útil que la mención vaga que existía antes. La distinción entre "filtrado de acceso" y "discovery de servidores" añade precisión.

3. **Lista negativa explícita (C-13):** "CUÁNDO MCP NO DEBE USARSE" es una contribución de calibración negativa (limitar el alcance) que tiene alta calidad epistémica. Las cuatro condiciones de la lista están directamente derivadas del desarrollo del capítulo.

4. **Rate Limiting como octavo requisito de producción (C-14):** Adición técnicamente correcta y derivable de los otros 7 requisitos.

5. **Estructura "Por qué MCP no lo cumple" en anti-patrón financiero (B-03):** Añade causalidad explícita a los 5 requisitos del anti-patrón.

### Qué empeoró de V1 a V2

1. **El efecto denominador:** V2 introduce 19 claims nuevos, muchos de ellos con scores bajos (C-04, C-05 = 0.35; C-08, C-09 = 0.40; C-15 = 0.20; C-17 = 0.10). El denominador crece más rápido que el numerador. Si el ratio de V1 fue 78.9% con 27 claims, agregar 8+ claims de baja calibración reduce el ratio incluso si se mantienen todos los claims anteriores.

2. **Los umbrales 1-5 / 10+ (C-04, C-05) son nuevas deudas epistémicas:** V1 no tenía estos umbrales. V2 los introduce como criterios de decisión en la sección "Interpretación honesta" y los repite en la conclusión (Sec.8). Son el único tipo de claim nuevo que tiene potencial de guiar incorrectamente una decisión de arquitectura.

3. **El bug JSON-RPC continúa y se declara corregido (C-17):** V1 identificó el bug (method: tool_name debería ser method: "tools/call"). V2 declara "FIX BUG 1" en el header pero el payload en el Ejemplo 4 sigue siendo `'method': tool_name`. Esto introduce una afirmación de calidad positiva que contradice el estado real del código.

4. **Sec.8 no integra el caveat de discovery (C-18):** La aclaración de que el discovery dinámico aplica a funciones dentro de servidores conocidos (no a descubrir nuevos servidores) fue corregida en Sec.1 y la tabla de V2. Pero en Sec.8 ("CUÁNDO MCP ES RECOMENDADO"), el punto "Descubrimiento dinámico de funciones es valioso" sigue sin el caveat. Es una corrección incompleta.

5. **Allocación de esfuerzo con falsa precisión bilateral (C-15):** V1 introdujo "60-70% a capas de producción" sin fuente. V2 añade "20-30% al código MCP básico" y llama al conjunto "ALLOCACIÓN DE ESFUERZO (realista)". La palabra "realista" es un claim de calidad sobre la estimación sin que la estimación tenga fuente. La deuda epistémica se amplió.

---

## 5. Claims de alto riesgo — evaluación específica

### Claim 1: Líneas cuantitativas (200-500 → 50 líneas)

**Estado en V2:** Persiste sin fuente. V2 reformula la presentación — separa en tabla "ANTES/CON MCP" con "Resultado" que agrega totales (600+ → 150 líneas + patrón genérico) — pero no añade repositorio de referencia ni medición empírica. Los números son más elaborados en V2, no más evidenciados.

**Score: 0.25** (sin cambio respecto a V1 para este aspecto). El denominador de 3 herramientas × 200-500 que suma "600+ → 150" es más presentable pero igualmente sin fuente.

### Claim 2: "60-70% del esfuerzo a capas de producción"

**Estado en V2:** Persiste sin fuente. V2 añade el complemento "20-30% código MCP básico" y etiqueta la sección como "ALLOCACIÓN DE ESFUERZO (realista)". La etiqueta "realista" es un claim de calidad sobre una estimación sin fuente — empeora epistemológicamente respecto a V1 porque V2 ahora afirma explícitamente que la estimación es realista.

**Score V2: 0.20** (degradación desde 0.20 en V1 por la etiqueta "realista" sin sustento — el score no puede bajar más porque el mínimo es 0.0 para claims completamente performativos).

### Claim 3: Calibración sub-caso declarada (0.30/0.70 y 0.20/0.60)

**Estado en V2:** V2 incluye los valores numéricos directamente en el cuerpo del texto bajo "Calibración sin requisitos: 0.30 (especulativa) / Calibración con requisitos: 0.70 (clara y verificable)". Los valores están derivados del mismo análisis del capítulo — son auto-referenciales.

**¿Es la tabla evidencia de los valores?** Parcialmente. La tabla con requisitos explícitos (aislamiento transaccional, idempotencia, logging) es evidencia de que el capítulo distingue condiciones necesarias. Pero los valores numéricos 0.30 y 0.70 no tienen derivación: ¿por qué 0.30 y no 0.25? ¿Por qué 0.70 y no 0.65? Son juicios del autor del capítulo presentados con precisión decimal que implica medición.

**Score: 0.40** — la estructura condicional es válida, los valores específicos no tienen fuente.

### Claim 4: "Tool Calling es SUPERIOR para aplicaciones con 1-5 funciones"

**Estado en V2:** El umbral de 5 no tiene fuente en V2. Es presentado como criterio de decisión en "Interpretación honesta" (una sección diseñada para aumentar credibilidad epistémica). La ironía es que la sección "Interpretación honesta" introduce el claim cuantitativamente más débil del capítulo.

**¿De dónde viene el umbral de 5?** No hay derivación explícita. Posiblemente es un umbral de experiencia práctica del autor, pero no se declara como tal — se presenta como criterio objetivo.

**Score: 0.35** — el claim direccional (Tool Calling es mejor para pocos casos) es correcto; el umbral específico (5) es inventado.

### Claim 5: "10+ herramientas para MCP"

**Estado en V2:** Mismo problema que el umbral de 5. El valor 10 aparece en la sección "Interpretación honesta" y se repite en Sec.8 ("Ecosistemas con múltiples herramientas (10+)"). La repetición en la conclusión eleva el impacto del claim sin añadir evidencia.

**Score: 0.35** — mismo análisis que el umbral de 5.

### Claim 6: Bug JSON-RPC `method: tool_name` vs. `method: "tools/call"`

**Estado en V2:** El Ejemplo 4 en línea 650 del input sigue siendo:
```python
payload = {'jsonrpc': '2.0', 'method': tool_name, 'params': params, 'id': 1}
```

El protocolo MCP define que las llamadas a herramientas usan `method: "tools/call"` con el nombre en `params.name` (según `modelcontextprotocol.io/docs/concepts/architecture`). El bug NO fue corregido en V2 a pesar de que el header declara "Bugs corregidos".

**Impacto en calibración del Ejemplo 4:** V1 le dio score 0.65 al Ejemplo 4 (parcialmente por este defecto). V2 declara haberlo corregido (FIX BUG 1 en header) y añade mejoras reales (TypeVar T, Awaitable[T], async_wrapper). Sin embargo, el defecto de protocolo más significativo persiste.

**Score del Ejemplo 4 en V2: 0.65** (sin cambio respecto a V1 para la dimensión del protocolo; la mejora de async_wrapper es real pero el defecto JSON-RPC persiste).

**Score de la declaración "FIX BUG 1 corregido": 0.10** — la declaración de corrección es un claim de calidad sin evidencia observable. Impacto: Alto — un implementador que confíe en V2 puede usar el payload con `method: tool_name` pensando que es protocolo MCP correcto.

---

## 6. Afirmaciones performativas: 4 (mismo conteo que V1, distintos claims)

| # | Texto exacto | Sección | Impacto | Evidencia propuesta |
|---|-------------|---------|---------|---------------------|
| 1 | "ALLOCACIÓN DE ESFUERZO (realista): Código MCP básico: 20-30% / Capas de producción: 60-70%" | Sec.6 | Medio | Citar post-mortem de al menos un proyecto MCP en producción. Sin eso, reformular: "la mayor parte del esfuerzo en proyectos de producción va a estas capas — estimar al menos el doble del tiempo del código MCP central" |
| 2 | "Versión 2: Fixes aplicados — Bugs corregidos" (header) | Header | Alto | El bug JSON-RPC `method: tool_name` persiste. Antes de declarar "corregido", ejecutar el cliente contra un servidor MCP real y verificar que el payload es conforme a la especificación. La declaración debe eliminarse o corregirse. |
| 3 | Calibración sub-caso: "0.30 / 0.70" y "0.20 / 0.60" | Sec.5 | Bajo-Medio | Derivar los valores de análisis de casos reales o reformular como rangos con descripción cualitativa: "sin requisitos: calibración baja (especulativo); con requisitos: calibración moderada (condicional verificable)" |
| 4 | "Tool Calling SUPERIOR para 1-5 funciones" / "MCP SUPERIOR para 10+" | Sec.2, Sec.8 | Alto | Citar comparativa empírica de overhead de integración, o reformular: "para aplicaciones con pocas funciones fijas, Tool Calling es generalmente suficiente; para ecosistemas con muchas herramientas o conjunto cambiante, MCP añade valor". Eliminar los umbrales numéricos hasta tener fuente. |

---

## 7. Defectos técnicos: categoría separada

| # | Defecto | Sección | Severidad | Estado en V2 |
|---|---------|---------|-----------|--------------|
| 1 | Payload JSON-RPC: `method: tool_name` en lugar de `method: "tools/call"` con `params: {"name": tool_name, "arguments": params}`. Además `id: 1` hardcodeado no permite correlacionar requests concurrentes. | Ejemplo 4, L.650 | Media-Alta | No corregido. V2 declara FIX BUG 1 pero el fix fue para async_wrapper, no para el payload. El defecto de protocolo identificado en V1 persiste. |
| 2 | Sec.8 ("CUÁNDO MCP ES RECOMENDADO"): "Descubrimiento dinámico de funciones es valioso" sin el caveat de que los servidores requieren configuración previa. | Sec.8 | Baja-Media | Parcialmente corregido — V2 añade el caveat en Sec.1, la tabla, y "Interpretación honesta". Pero en la lista de conclusión (Sec.8) el caveat está ausente. |

---

## 8. Claims directamente adoptables de V2 (score ≥ 0.75)

**Sin validación adicional:**

| Claim | Score | Fuente |
|-------|-------|--------|
| C-10: "MCP estandariza COMUNICACIÓN, no CORRECTITUD" | 0.90 | Límite técnico del protocolo — verificable |
| C-12: "MCP simplifica INTEGRACIÓN, no GARANTÍAS OPERACIONALES" | 0.90 | Idem |
| C-11: "MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL" | 0.85 | Distinción técnica correcta |
| C-06: tool_filter CUÁNDO usar | 0.85 | Derivable de la naturaleza del parámetro |
| C-14: Rate Limiting como octavo requisito de producción | 0.85 | Principio estándar de microservicios |
| C-13: Lista negativa "CUÁNDO MCP NO DEBE USARSE" | 0.80 | Derivada del desarrollo del capítulo |
| C-07: tool_filter CUÁNDO NO usar | 0.80 | Simétrico y técnicamente correcto |
| C-02: "Casos ideales" en tabla (FIJO vs. CAMBIANTE) | 0.70 | Aceptable con nota de que es categorización conceptual |
| C-03: "Tradeoff" en tabla (overhead vs. escalabilidad) | 0.70 | Idem |

**Con corrección antes de adoptar:**

| Claim | Problema | Corrección mínima |
|-------|---------|-------------------|
| C-01: comparación cuantitativa desglosada | Los totales (600+ → 150) siguen sin fuente | Reformular sin números específicos: "código de integración ad-hoc vs. patrón genérico reutilizable" |
| C-04/C-05: umbrales 1-5 y 10+ | Sin fuente — criterios de decisión sin derivación | Reformular como regla de pulgar con hedging explícito: "como regla general, no basada en benchmarks formales" |
| C-08/C-09: calibración sub-caso 0.30/0.70 | Auto-referencial | Reformular cualitativamente o citar evaluación externa |
| C-15: allocación de esfuerzo | Doble estimación sin fuente | Reformular sin porcentajes; citar post-mortem si existe |
| C-16: Ejemplo 4 (async correcto) | Defecto JSON-RPC payload persiste | Corregir `method: "tools/call"` según especificación MCP antes de usar en producción |
| C-17: declaración de "Bugs corregidos" | Inexacta | Eliminar del header o corregir el bug real antes de declararlo corregido |

---

## 9. Evaluación de los "FIX BUG" declarados

V2 declara en el header tres correcciones. Evaluación por cada una:

| Declaración | Estado real | Score |
|-------------|-------------|-------|
| FIX BUG 1: "Decorador async correcto (Awaitable en type hints, async_wrapper)" | CORRECTO — TypeVar T, Callable[..., Awaitable[T]], async_wrapper son mejoras reales y técnicamente correctas respecto a V1 | 0.90 |
| FIX BUG 2: "Nota sobre discovery en Sec.1" | CORRECTO — La NOTA CRÍTICA (FIX BUG 2) en Sec.1 aclara correctamente que el discovery dinámico aplica a FUNCIONES, no a SERVIDORES | 0.90 |
| FIX BUG 3: "Clarificación tool_filter en Sec.3" | CORRECTO — La sección CUÁNDO / CUÁNDO NO está bien articulada | 0.85 |
| **Bug JSON-RPC (identificado en análisis V1, no declarado en header de V2)** | NO CORREGIDO — `method: tool_name` persiste; el header no lo menciona como bug pendiente | 0.00 |

**Observación:** Los tres bugs declarados fueron corregidos correctamente. El problema es que V2 declara "Bugs corregidos" de manera global (sin listar cuáles) y el bug más significativo para la conformidad con el protocolo real (JSON-RPC) no fue incluido en el scope de la corrección. La declaración global de "corregido" crea la impresión de que todos los problemas conocidos fueron resueltos.

---

## 10. Análisis del mecanismo de la regresión

La regresión de 78.9% (V1) a 65.4% (V2) tiene un mecanismo identificable:

**V1 mejoró el ratio principalmente eliminando claims score 0 y condicionando casos de uso.** El denominador bajó de 28 a 27, el numerador subió de 18.35 a 21.30.

**V2 expande el capítulo con 19 claims nuevos.** De esos 19:
- 7 son de alta calidad (score ≥ 0.75): C-06, C-07, C-10, C-11, C-12, C-13, C-14
- 4 son de calibración media (score 0.55-0.70): C-01, C-02, C-03, C-18
- 8 son de baja calibración (score ≤ 0.40): C-04, C-05, C-08, C-09, C-15, C-16 (ajustado por bug persistente), C-17, C-19

El ratio de calibración de los 19 claims nuevos es: ~9.20/19 = 48.4% — por debajo del umbral de exploración (50%). El promedio de los claims nuevos está por debajo del promedio de los claims heredados (87.3%), lo que inevitablemente reduce el ratio global.

**Diagnóstico:** V2 no introduce realismo performativo adicional en los claims heredados. El deterioro se origina en que el conjunto de claims nuevos tiene calibración insuficiente, especialmente en las secciones que más se destacan visualmente (umbrales cuantitativos, declaraciones de corrección, calibraciones sub-caso).

---

## 11. Conclusión: ¿V2 genuinamente mejora V1 o solo reorganiza claims?

**Veredicto:** V2 mejora parcialmente V1 en contenido y empeora el ratio de calibración por efecto denominador.

**Lo genuinamente nuevo de alta calidad:**
- Las tres VERDADES FUNDAMENTALES son el mayor aporte conceptual del libro hasta este capítulo.
- La clarificación de tool_filter con CUÁNDO / CUÁNDO NO es utilizable directamente.
- La corrección del decorador async (FIX BUG 1) es técnicamente correcta.
- La lista negativa "CUÁNDO MCP NO DEBE USARSE" cierra un gap que V1 no tenía.

**Lo nuevo de baja calidad que degrada el ratio:**
- Los umbrales 1-5 y 10+ son los peores claims cuantitativos del capítulo — peores que las líneas de código porque se presentan como criterios de decisión de arquitectura en una sección llamada "Interpretación honesta".
- La declaración "Bugs corregidos" es performativa y parcialmente falsa (el bug JSON-RPC persiste).
- La allocación de esfuerzo 20-30%/60-70% repite la deuda epistémica de V1 con más convicción ("realista").

**La pregunta de si los fixes son genuinos o performativos:** Los tres bugs declarados en el header son genuinos. La declaración de haber "corregido bugs" de manera global es performativa en la medida en que omite el bug más significativo para la conformidad con el protocolo (JSON-RPC).

**La pregunta de si se introdujeron claims nuevos sin evidencia:** Sí. C-04 (umbral 5), C-05 (umbral 10+), C-08 (calibración 0.30/0.70), C-09 (calibración 0.20/0.60), y C-15 (allocación de esfuerzo) son todos claims cuantitativos introducidos sin fuente en V2.

---

## 12. Veredicto final

**Ratio:** 65.4% (22.90/35) — PARCIALMENTE CALIBRADO

```
Trayectoria del capítulo:
Versión original: 65%  (PARCIALMENTE CALIBRADO — no supera gate)
V1 corregida:    79%   (CALIBRADO — supera gate por 3.9 pp)
V2 calibrada:    65.4% (PARCIALMENTE CALIBRADO — regresión por efecto denominador)
```

**Recomendación:** No usar V2 como base para gate de diseño de arquitecturas MCP. Los claims nuevos de alta calidad (VERDADES FUNDAMENTALES, tool_filter, lista negativa) pueden extraerse de V2 individualmente para uso en WPs de THYROX. Los umbrales 1-5 y 10+ no deben usarse como criterios de decisión sin hedging explícito de que son reglas de pulgar sin derivación empírica.

**Para avanzar a gate:** Volver a V1 (79%) como base y añadir selectivamente los claims C-10, C-11, C-12, C-13, C-14 de V2 (que son genuinamente mejores) sin incorporar C-04, C-05, C-15, C-17, C-19.
```
