```yml
created_at: 2026-04-19 07:01:59
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: Capítulo 10 — MCP Versión Corregida Calibrada
ratio_calibracion: "21.30/27 = 78.9%"
clasificacion: CALIBRADO
ratio_version_original: "18.35/28 = 65%"
delta: "+13.9 puntos porcentuales"
```

# Análisis de Calibración: Cap.10 MCP — Versión Corregida

> Protocolo: Modo 1 — Detección de realismo performativo.
> Input: `mcp-corrected-input.md`. Referencia: `mcp-pattern-calibration.md` (versión original, 65%).

---

## Ratio de calibración: 21.30/27 (78.9%)
## Clasificación: CALIBRADO

```
Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate:        ≥ 0.75   ✓ superado (78.9%)
```

---

## 1. Tabla resumen de claims — versión corregida

### Grupo A — Correcciones directas de claims problemáticos

| ID | Claim | Línea ref. | Score | Estado |
|----|-------|------------|-------|--------|
| A-00 | "reducción dramática en TRABAJO Y ACOPLAMIENTO" | L.49 | 0.25 | Afirmación performativa — intensificador persiste |
| A-01 | Tabla ANTES/DESPUÉS: 200-500 líneas → 50-100 líneas | L.40-45 | 0.20 | Afirmación performativa — números sin fuente |
| A-02 | "Descubrimiento de servidores requiere configuración explícita" | L.76, L.93 | 0.85 | Inferencia calibrada — técnicamente correcto |
| A-03 | Servicios financieros ANTI-PATRÓN + patrón 3 fases | L.159-191 | 0.75 | Inferencia calibrada — patrón correcto, condición incluida |
| A-04 | IoT VÁLIDO SOLO CON 5 requisitos | L.148-155 | 0.65 | Inferencia calibrada, alcance limitado |
| A-05 | Multi-paso VÁLIDO SOLO CON aislamiento transaccional | L.138-144 | 0.85 | Inferencia calibrada — técnicamente correcto |

### Grupo B — Claims heredados sin cambio material

| ID | Claim (equivalente en análisis original) | Score | Estado |
|----|------------------------------------------|-------|--------|
| B-01 | JSON-RPC/STDIO, HTTP/SSE (C-02, C-03) | 1.00 | Observación directa — doc oficial + código |
| B-02 | Tool/Resource/Prompt definiciones (C-05) | 0.90 | Observación directa — especificación oficial |
| B-03 | Flujo de 5 pasos (C-23) | 0.85 | Inferencia calibrada — especificación oficial |
| B-04 | Database Integration, Genmedia con referencia (C-25, C-26) | 0.80 | Inferencia calibrada — herramientas con URL oficiales |
| B-05 | Claims de arquitectura, advertencias honestas (C-01, C-06–C-10, C-16–C-18, C-22, C-24, C-27, C-28) | 0.90 | Inferencia calibrada promedio — documentación oficial |

*Nota: B-05 agrega 13 claims individuales del análisis original con score promedio 0.90. El desglose granular está en `mcp-pattern-calibration.md`.*

### Grupo C — Claims nuevos de la versión corregida

| ID | Claim | Línea ref. | Score | Estado |
|----|-------|------------|-------|--------|
| C-01 | "60-70% del esfuerzo a capas de producción" | L.405 | 0.20 | Afirmación performativa — número sin fuente |
| C-02 | Ejemplo 4 — código de producción (retry, timeout, logging) | L.278-372 | 0.65 | Inferencia calibrada con defecto JSON-RPC |
| C-03 | Gap Desarrollo/Producción — 7 requisitos | L.397-404 | 0.85 | Inferencia calibrada — principios estándar correctos |

### Claims eliminados en la versión corregida (vs. original)

| ID original | Claim | Score original | Razón de eliminación |
|-------------|-------|----------------|----------------------|
| C-14 | "supera sistemas convencionales de búsqueda" | 0.0 | Claim comparativo sin benchmark — eliminado |
| C-19 | `tool_filter` en `StdioServerParameters` (lugar incorrecto) | 0.0 | Defecto de código — corregido en ejemplos 1-3 |
| C-20 | `Client` importado sin uso | 0.0 | Defecto de código — eliminado |
| C-21 | `StdioConnectionParams` vs `StdioServerParameters` inconsistencia | 0.0 | Defecto de código — eliminado (solo un tipo en versión corregida) |

---

## 2. Cálculo del ratio

**Claims heredados sin cambio** (18 claims individuales de B-01 a B-05):

| Claim individual | Score |
|------------------|-------|
| C-01 arquitectura cliente-servidor | 0.90 |
| C-02 JSON-RPC/STDIO | 1.00 |
| C-03 HTTP/SSE | 1.00 |
| C-05 Tool/Resource/Prompt | 0.90 |
| C-06 FastMCP genera esquemas | 1.00 |
| C-07 Tool calling propietario | 0.75 |
| C-08 MCP open standard | 1.00 |
| C-10 Servidores MCP reutilizables | 0.80 |
| C-16 Agentes no reemplazan flujos deterministas | 0.90 |
| C-17 Considerar naturaleza de datos | 0.90 |
| C-18 MCP es un contrato | 0.95 |
| C-22 Código ADK versión condensada correcto | 0.90 |
| C-23 Flujo de 5 pasos | 0.85 |
| C-24 Ejemplo sistema de tickets | 0.85 |
| C-25 Database Integration | 0.80 |
| C-26 Genmedia Orchestration | 0.85 |
| C-27 FastMCP simplifica desarrollo Python | 0.85 |
| C-28 Advertencia seguridad auth/authz | 0.85 |
| **Subtotal** | **16.05** |

**Claims de corrección** (A-00 a A-05, 6 claims):

| Claim | Score |
|-------|-------|
| A-00 "reducción dramática" persiste | 0.25 |
| A-01 200-500 → 50-100 líneas | 0.20 |
| A-02 descubrimiento de servidores requiere config explícita | 0.85 |
| A-03 Anti-patrón financiero + patrón 3 fases | 0.75 |
| A-04 IoT con 5 requisitos | 0.65 |
| A-05 multi-paso con aislamiento transaccional | 0.85 |
| **Subtotal** | **3.55** |

**Claims nuevos** (C-01 a C-03, 3 claims):

| Claim | Score |
|-------|-------|
| C-01 60-70% esfuerzo | 0.20 |
| C-02 Ejemplo 4 código producción | 0.65 |
| C-03 7 requisitos de producción | 0.85 |
| **Subtotal** | **1.70** |

```
Total numerador: 16.05 + 3.55 + 1.70 = 21.30
Total denominador: 18 + 6 + 3 = 27 claims
Ratio: 21.30 / 27 = 78.9%
```

---

## 3. Comparación con versión original

| Métrica | Versión original | Versión corregida | Delta |
|---------|-----------------|-------------------|-------|
| Ratio de calibración | 65% (18.35/28) | 78.9% (21.30/27) | +13.9 pp |
| Clasificación | PARCIALMENTE CALIBRADO | CALIBRADO | Mejora de categoría |
| Supera umbral de gate (≥75%) | No | Sí | — |
| Claims con score 0 | 4 (C-14, C-19, C-20, C-21) | 0 | -4 |
| Claims performativos (score <0.25) | 3 (C-11, C-13, C-15) | 3 (A-00, A-01, C-01) | Mismo conteo, distintos claims |
| Claims calibrados (score ≥0.75) | 20 de 28 (71%) | 24 de 27 (89%) | +18 pp en proporción |
| Falsa precisión cuantitativa | Intensificadores cualitativos ("dramáticamente") | Números sin fuente (200-500 líneas, 60-70%) | Transformación del tipo |
| Defectos de código detectables | 3 defectos verificables internamente | 1 defecto parcial (payload JSON-RPC Ejemplo 4) | Mejora |

### Mecanismo principal de mejora

La mejora de 65% → 79% se originó en cuatro fuentes en orden de impacto:

1. **Eliminación de 4 claims con score 0** (C-14, C-19, C-20, C-21): El denominador baja de 28 a 27 sin pérdida en el numerador → efecto neto positivo de ~2.5 pp.

2. **Corrección de casos de uso sin condición** (IoT: 0.30→0.65, Financial Services: 0.20→0.75): Ganancia de +1.20 en el numerador → ~4.4 pp adicionales.

3. **Adición de claims calibrados nuevos** (C-03 requisitos de producción, A-02 corrección de discovery, A-05 multi-paso): +2.55 en el numerador → ~9.4 pp.

4. **Introducción de nueva deuda epistémica** (A-01 líneas de código, C-01 60-70%, A-00 "dramática" persiste): -0.30 en el numerador vs. si esos claims estuvieran bien calibrados → -1.1 pp.

**Conclusión del mecanismo:** La versión corregida mejoró el ratio principalmente eliminando "lo malo" (claims score 0) y mejorando los casos de uso problemáticos con condiciones explícitas. No añadió evidencia nueva a los claims cuantitativos existentes — transformó el patrón de falsa precisión de intensificadores cualitativos a números sin derivación.

---

## 4. Afirmaciones performativas: 3

| # | Texto exacto | Sección | Línea | Impacto | Evidencia propuesta |
|---|-------------|---------|-------|---------|---------------------|
| 1 | "El resultado es una reducción dramática en TRABAJO Y ACOPLAMIENTO" | §3 | L.49 | Medio | Reemplazar "dramática" por el ratio de la tabla: "una reducción de ~4x en líneas de código de integración (si se acepta la estimación de la tabla ANTES/DESPUÉS)" — o eliminar el intensificador si la estimación no tiene fuente |
| 2 | "200-500 líneas... 50-100 líneas" (tabla ANTES/DESPUÉS) | §3 | L.40-45 | Medio | Citar repositorio de referencia con integración ad-hoc medida vs. integración MCP para el mismo caso de uso, o reformular: "puede reducir significativamente el código de acoplamiento" sin rango específico |
| 3 | "asignar 60-70% del esfuerzo a estas capas" | §10 | L.405 | Medio | Citar post-mortem de proyecto MCP en producción, o reformular: "la mayoría del esfuerzo en proyectos de producción suele ir a estas capas" |

**Patrón identificado:** Los 3 claims performativos comparten una estructura: la dirección del claim es correcta (MCP reduce código, las capas de producción consumen esfuerzo), pero la cuantificación precisa no tiene fuente. La versión corregida mejoró la dirección de los claims problemáticos originales pero introdujo nueva falsa precisión numérica.

---

## 5. Defecto técnico: categoría separada

| # | Defecto | Línea | Severidad | Corrección |
|---|---------|-------|-----------|------------|
| 1 | Ejemplo 4: `payload = {'method': tool_name, 'params': params, 'id': 1}` — en el protocolo MCP real, el campo `method` debe ser `"tools/call"` con `params = {"name": tool_name, "arguments": params}`. El código funciona como cliente HTTP genérico con retry pero no implementa el protocolo MCP correctamente en la capa de mensajes. Además, `id: 1` hardcodeado no correlaciona requests concurrentes. | L.358-362 | Media — el código demuestra correctamente los patrones de producción (su propósito declarado), pero no es código MCP correcto si se reutiliza literalmente | Corregir a: `method: "tools/call"`, `params: {"name": tool_name, "arguments": params}`, `id: str(uuid.uuid4())`. Verificar contra especificación en `modelcontextprotocol.io/docs/concepts/architecture` |

---

## 6. Claims directamente adoptables de la versión corregida

**Sin validación adicional (score ≥ 0.75):**

| Claim | Score | Fuente |
|-------|-------|--------|
| A-02: Descubrimiento dentro de servidor vs. configuración de servidor | 0.85 | Verificable en especificación MCP oficial |
| A-03: Patrón 3 fases para servicios financieros (análisis → autorización → ejecución) | 0.75 | Arquitectura correcta para actividades reguladas |
| A-05: Multi-paso requiere garantías de aislamiento transaccional | 0.85 | Principio estándar de sistemas distribuidos |
| C-03: 7 requisitos de producción (discovery, load balancing, health checks, logging, monitoreo, retry, circuit breaker) | 0.85 | Principios estándar de microservicios |
| B-01 a B-05: Todos los claims heredados calibrados | 0.75-1.00 | Sin cambio vs. análisis original |

**Con corrección antes de adoptar:**

| Claim | Problema | Corrección mínima |
|-------|---------|-------------------|
| A-01: 200-500 → 50-100 líneas | Rango sin fuente | Reformular sin rango específico o citar repositorio medido |
| C-01: 60-70% del esfuerzo | Porcentaje sin fuente | Reformular como "la mayor parte" o citar proyecto de referencia |
| A-04: IoT con 5 requisitos | Lista incompleta para IoT crítico | Añadir: autenticación del dispositivo, integridad del mensaje, para IoT industrial o médico |
| C-02: Ejemplo 4 payload JSON-RPC | Defecto en `method` | Corregir `method: "tools/call"` según especificación MCP |

---

## 7. Evaluación por pregunta central

### ¿La versión corregida supera el umbral de gate (≥75%)?

**Sí. Ratio: 78.9% > 75%.**

La mejora de 65% → 79% es suficiente para cruzar el umbral de gate. La versión corregida puede usarse como base para decisiones de diseño de agentes con MCP.

### ¿Las correcciones son bien calibradas o introducen nuevos claims sin evidencia?

**Mixto, con patrón identificable.**

- Las correcciones narrativas y condicionales (A-02, A-03, A-05) son bien calibradas — añaden precisión técnica sin inventar datos.
- Las correcciones cuantitativas (A-01 tabla de líneas, C-01 porcentaje de esfuerzo) introducen nueva falsa precisión numérica. La versión corregida resolvió el problema de intensificadores cualitativos ("dramáticamente") sustituyéndolos por números específicos sin fuente — misma categoría epistemológica, presentación diferente.
- La nueva sección de producción (C-03) es el claim nuevo mejor calibrado — añade requisitos correctos sin inventar números.

### ¿Las correcciones elevaron el ratio o simplemente movieron claims performativos de un dominio a otro?

**Elevaron el ratio. La deuda epistémica restante es del mismo tamaño pero con menor impacto.**

El ratio mejoró 13.9 pp. Sin embargo, el conteo de claims performativos es idéntico (3 en ambas versiones). La diferencia es que los claims performativos de la versión original incluían C-13 (Financial Services, impacto Alto) y C-14 (superioridad sobre búsqueda, impacto Alto), mientras que los de la versión corregida son todos de impacto Medio (argumentos de adopción con cuantificaciones sin fuente).

**La deuda epistémica restante es menor en severidad, no menor en cantidad.**

---

## 8. Veredicto

**Ratio:** 78.9% (21.30/27) — CALIBRADO. Supera el umbral de gate (≥75%).

**Posición en la trayectoria del capítulo:**
```
Versión original: 65% (PARCIALMENTE CALIBRADO, no supera gate)
Versión corregida: 79% (CALIBRADO, supera gate por 3.9 pp)
```

**El capítulo ES usable para** (ampliado vs. versión original):
- Todo lo adoptable del análisis original (arquitectura MCP, FastMCP, advertencias honestas)
- Diseño de agentes financieros con separación análisis/autorización/ejecución (A-03 es adoptable)
- Evaluación de casos de uso IoT con lista de requisitos explícita (A-04, con nota de alcance)
- Planificación de producción con los 7 requisitos de C-03
- Argumento de por qué el discovery MCP requiere configuración de servidor previa (A-02)

**El capítulo NO es usable para:**
- Justificar adopción con "reduce en 200-500 líneas" (A-01, sin fuente)
- Planificar proyectos con "asignar 60-70% a capas de producción" (C-01, sin fuente)
- Implementar código de producción directo desde Ejemplo 4 sin corregir el payload JSON-RPC (C-02)
- Diseñar sistemas IoT industriales o médicos usando solo los 5 requisitos de A-04

**Recomendación para avance:** La versión corregida supera el umbral de gate. Los 3 claims performativos restantes son de impacto Medio y corregibles con reformulaciones que no requieren investigación adicional (eliminar números sin fuente, mantener dirección del claim). El defecto del Ejemplo 4 es corregible verificando la especificación MCP en `modelcontextprotocol.io`. El capítulo corregido puede usarse como referencia para WPs de THYROX que involucren diseño de agentes con MCP, con las restricciones documentadas en la sección 6.
