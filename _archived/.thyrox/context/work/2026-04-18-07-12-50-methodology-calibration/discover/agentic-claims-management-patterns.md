```yml
created_at: 2026-04-19 07:50:03
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Patrones de Gestión de Claims para el Sistema Agentic AI

Este documento formaliza los patrones de gestión de claims observados durante los
análisis de Cap.10 (3 versiones) y el ciclo de auto-corrección del plan metodológico.
Complementa `agentic-calibration-workflow-example.md`.

---

## 1. El Ciclo de Auto-Corrección como Comportamiento Agéntico

Antes de documentar los patrones técnicos, vale observar el meta-patrón que generó
este documento: el autor del plan metodológico de Cap.11 revisó su propio plan tras
recibir feedback adversarial e identificó cuatro errores propios:

1. **Error factual:** "Target 0.78+ (como Cap.10 V2)" — V2 fue 65.4%, no 0.78
2. **Criterio irrealista:** "0.85-0.95 en todos los dominios" — contradicción interna con
   el mismo documento que ya decía "ningún dominio < 0.60"
3. **Insight faltante:** "Reescritura Única" sin cherry-pick puede destruir correcciones buenas
4. **Falta de preservación explícita:** no había instrucción de conservar claims ≥ 0.80

El autor corrigió los cuatro puntos antes de implementar el plan.

**Implicación para el sistema:** Un agente que puede revisar sus propios artefactos
con la misma adversarialidad que aplica a artefactos externos produce outputs más
confiables que uno que solo revisa hacia afuera. El "review externo" debe disparar
también "review interno" sobre los planes propios.

---

## 2. Patrón: Cherry-Pick Consciente

### Problema que resuelve

En iteraciones de documentos técnicos, existe la tendencia a reescribir completamente
una versión nueva cuando se detectan problemas en la anterior. Esto destruye claims que
estaban correctamente formulados.

En Cap.10: la corrección de V1 a V2 agregó 19 claims nuevos con ratio promedio de 48.4%.
El ratio global cayó de 79% a 65.4% aunque los claims heredados (87.3%) no empeoraron.

### Definición formal

**Cherry-Pick Consciente:** estrategia de edición que clasifica cada claim existente
antes de decidir si reescribir, y preserva exactamente los claims con evidencia sólida.

### Algoritmo

```
Para cada claim en versión_actual:

  IF score(claim) >= 0.80:
    PRESERVAR EXACTAMENTE
    (el claim está bien calibrado; reescribirlo introduce riesgo innecesario)

  ELIF score(claim) >= 0.60:
    EVALUAR si mejora es posible sin degradar
    SI mejora tiene fuente → mejorar
    SI mejora es editorial → preservar

  ELSE score(claim) < 0.60:
    REESCRIBIR
    (el claim está mal calibrado; debe ser reemplazado o eliminado)

Al agregar claims NUEVOS:
  VERIFICAR que cada claim nuevo tenga fuente o hedging apropiado
  ANTES de agregar, estimar su score esperado
  SI score_esperado < 0.65 → reconsiderar si es necesario
```

### Por qué el umbral es 0.80 para preservar

Un claim con score 0.80 está respaldado por evidencia directa o inferencia bien
fundamentada. Reescribirlo con lenguaje diferente puede degradar sutilmente esa
precisión. El umbral de preservación (0.80) es intencionalmente más alto que el
umbral de gate (0.75).

### Anti-patrón detectado: "Reescritura Ciega"

Reescribir todo el capítulo para una versión corregida, bajo el supuesto de que
"la nueva versión es mejor." Sin cherry-pick explícito, claims buenos en V1 son
reformulados con menor precisión en V2.

---

## 3. Patrón: Efecto Denominador en Calibración Iterativa

### Problema que resuelve

Al agregar contenido nuevo a una versión, el ratio de calibración puede degradarse
aunque el contenido existente no empeore. Esto ocurre cuando los nuevos claims tienen
calibración menor que el promedio de los existentes.

### Fórmula

```
ratio_v2 = (numerador_v1 + aportes_nuevos) / (denominador_v1 + claims_nuevos)

Condición de degradación:
  (aportes_nuevos / claims_nuevos) < ratio_v1

Ejemplo real:
  V1: 19.75 / 25 = 79%
  Nuevos: 9.2 / 19 = 48.4%
  V2: (19.75 + 9.2) / (25 + 19) = 28.95 / 44 = 65.8% ≈ 65.4%
```

### Implicación operacional

Antes de agregar claims nuevos, calcular el "break-even ratio":

```
break_even = ratio_actual

Para que V2 ≥ V1:
  score_promedio_nuevos_claims ≥ ratio_v1

Si score_esperado_nuevos < ratio_v1 → agregar esos claims DEGRADA el resultado
```

En el caso real: break-even era 79%. Los nuevos claims llegaron al 48.4%.
La degradación era matemáticamente inevitable antes de escribir una sola línea.

### Cuándo agregar claims igualmente

Si los claims nuevos son necesarios para la completitud del capítulo y tienen
score < break-even, la estrategia correcta es:
1. Agregar los claims necesarios
2. Simultáneamente mejorar o eliminar claims existentes de bajo score
3. Mantener el denominador controlado (no crecer sin escalar el numerador)

---

## 4. Patrón: Varianza por Dominio — CAD (Calibración Asimétrica por Dominio)

### Problema que resuelve

Un score global de calibración (e.g., 65%) oculta distribuciones extremas. Un capítulo
puede tener 0.91 en especificación técnica y 0.20 en casos de uso — el promedio (0.55)
no refleja que la mitad del capítulo es peligrosamente mal calibrada.

### Definición

**CAD:** Un capítulo exhibe Calibración Asimétrica por Dominio cuando la desviación
estándar de scores por dominio supera 0.20, o cuando el dominio mínimo está más de
0.40 por debajo del dominio máximo.

**Ejemplo real (Cap.10 original):**

| Dominio | Score |
|---------|-------|
| Protocolo MCP | 0.91 |
| Advertencias | 0.90 |
| Comparativo | 0.72 |
| Casos BD/API | 0.70 |
| Casos IoT/Financiero | 0.20–0.30 |
| Código | 0.23 |

Rango: 0.91 − 0.20 = 0.71 → CAD severo.

### Criterios de gate por dominio

| Criterio | Umbral | Razón |
|----------|--------|-------|
| Score global | ≥ 0.75 | Gate de calidad del sistema |
| Mínimo por dominio | ≥ 0.60 | Evitar dominio peligrosamente mal calibrado |
| Máximo − Mínimo | ≤ 0.35 | Evitar asimetría extrema |

El criterio de mínimo por dominio (0.60) es más estricto que el criterio de gate
global (0.75 → 75%) porque un dominio con 0.20 indica proyecciones sin validación
que pueden causar daño operacional real, independientemente del promedio.

### Por qué el rango Cap.9 es la referencia correcta

Cap.9 (77% global) es la referencia para "bien calibrado" porque:
- Tuvo varianza por dominio, no homogeneidad artificial
- Sus correcciones fueron basadas en mecanismos específicos, no en checklist editorial
- Sus referencias (arXiv:1707.06347 PPO, arXiv:2504.15228v2 SICA) transformaron
  claims de mismo tipo a observaciones directas

El criterio de "0.85-0.95 en todos los dominios" es artificialmente homogéneo y no
tiene precedente empírico en los capítulos analizados. Cap.9 no lo alcanzó.

---

## 5. Patrón: Falsa Precisión como Performatividad Numérica

### Problema que resuelve

Los claims cuantitativos sin fuente son más peligrosos que los intensificadores cualitativos
porque el lector asigna mayor credibilidad a números específicos.

### Taxonomía

| Tipo | Ejemplo | Score | Razón |
|------|---------|-------|-------|
| Intensificador cualitativo | "reduce dramáticamente la complejidad" | 0.25 | Subjetivo, fácilmente reconocible como tal |
| Número sin fuente | "200-500 líneas → 50-100 líneas" | 0.20 | Implica medición donde no la hubo |
| Número con etiqueta de veracidad | "60-70% del esfuerzo (realista)" | 0.15 | Doble carga: número sin fuente + claim de calidad sobre ese número |
| Umbral de decisión sin fuente | "Tool Calling para 1-5 funciones; MCP para 10+" | 0.35 | El lector usa el umbral para decisiones arquitectónicas reales |

**El peor caso:** un umbral de decisión sin fuente — un número que guía una decisión
de arquitectura pero fue inventado. El lector no puede distinguirlo de un umbral derivado
de benchmarks reales.

### Regla para el sistema

Un claim numérico sin fuente explícita debe clasificarse como performativo (score ≤ 0.35)
independientemente de si el número es plausible. La plausibilidad no es evidencia.

---

## 6. Patrón: Fix Declarado vs. Fix Verificado

### Problema que resuelve

El autor de un documento puede declarar "Bugs corregidos" en el header de una nueva
versión. Un agente adversarial que reduzca su búsqueda ante esa declaración dejará
pasar bugs no declarados.

### Comportamiento requerido del agente adversarial

```
REGLA: Las declaraciones del autor sobre correcciones son hipótesis a verificar,
       no hechos a aceptar.

PROTOCOLO al recibir versión con "Fixes aplicados":
  1. Leer los fixes declarados
  2. Verificar CADA fix declarado independientemente
  3. Evaluar: ¿el fix corrige el problema en CÓDIGO o solo en TEXTO?
  4. Buscar bugs NO declarados con la misma intensidad que si no hubiera fixes
```

### Taxonomía de fixes detectada en Cap.10

| Fix | Tipo | Evaluación |
|-----|------|------------|
| FIX BUG 2: Discovery en tabla | Real | Corregido en Sec.1, Sec.2, tabla |
| FIX BUG 3: Clarificación tool_filter | Textual | Descripción corregida; código Ejemplo 3 sin cambio |
| FIX BUG 1: TypeVar T en decorador | Performativo | Mejora anotación de tipos; bug runtime idéntico |
| Bug JSON-RPC (no declarado) | No corregido | `method: tool_name` ≠ `method: "tools/call"` persiste |

### El bug no declarado es el más riesgoso

El bug JSON-RPC no fue nombrado en ningún análisis previo al que el autor tuvo acceso.
Por eso no fue corregido. El agente adversarial lo encontró porque no redujo su
búsqueda ante la declaración "Bugs corregidos".

**Implicación:** El sistema adversarial debe mantener búsqueda exhaustiva en cada
versión. La historia de correcciones es contexto, no garantía.

---

## 7. Criterios de Éxito Calibrados (Versión Corregida)

Derivados del análisis comparativo de todos los capítulos analizados:

| Métrica | Criterio | Fuente de derivación |
|---------|----------|---------------------|
| Score global | ≥ 0.75 | Gate del sistema THYROX |
| Score objetivo | ≥ 0.77 | Cap.9 (referencia empírica más alta) |
| Mínimo por dominio | ≥ 0.60 | Cap.10 original tuvo 0.20 → consecuencias operacionales |
| Varianza por dominio | Max − Min ≤ 0.35 | Evitar asimetría tipo CAD |
| Claims performativos | ≤ 3 | Cap.9 y Cap.10 V1 tuvieron 3 como mínimo; 0 es imposible |
| Bugs de código | 0 en runtime | Los bugs de runtime no tienen calibración — son errores binarios |
| Claims nuevos por versión | Score esperado ≥ break-even | Evitar efecto denominador |

### Por qué el target es 0.77 y no 0.79

Cap.10 V1 alcanzó 0.79 pero con 3 bugs técnicos latentes (async/síncrono, JSON-RPC,
discovery en conclusiones). Un 0.77 sin bugs técnicos es epistémicamente más sólido
que un 0.79 con bugs ocultos. La métrica de calibración no captura bugs de código
— estos deben verificarse por separado.

---

## 8. Metodología Óptima para Versión Única

Sintetizando los patrones anteriores, la metodología de generación de una versión
calibrada en un solo ciclo:

```
PASO 1: ANÁLISIS ADVERSARIAL (agentes THYROX)
  └─ deep-dive: detectar contradicciones, saltos, engaños
  └─ agentic-reasoning: calcular ratio y distribución CAD
  └─ Output: lista de claims por score

PASO 2: ESPECIFICACIÓN ("¿Qué es CORRECTO?")
  └─ Basada en veredicto THYROX, no en interpretación propia
  └─ Definir: ¿qué debe quedar, qué debe cambiar, qué debe eliminarse?
  └─ Identificar claims a preservar (score ≥ 0.80)

PASO 3: CHERRY-PICK + REESCRITURA
  └─ Claims ≥ 0.80: copiar exactamente
  └─ Claims 0.60-0.80: evaluar mejora sin degradar
  └─ Claims < 0.60: reescribir con fuente o eliminar
  └─ Claims nuevos: calcular break-even ANTES de escribir

PASO 4: VALIDACIÓN TÉCNICA (código primero)
  └─ Ejecutar código de cada ejemplo
  └─ Verificar conformidad con especificación del protocolo
  └─ No incluir código que no se pueda ejecutar

PASO 5: BUG HUNTING ADVERSARIAL
  └─ Revisar el propio texto como adversario
  └─ ¿Hay afirmaciones que critiqué en otros pero hago yo?
  └─ ¿Los números tienen fuente?
  └─ ¿Los umbrales de decisión están derivados?
  └─ ¿Los fixes declarados corrigen el problema o solo el texto?

PASO 6: VERIFICACIÓN CAD
  └─ Calcular score por dominio
  └─ Verificar: ningún dominio < 0.60
  └─ Verificar: varianza Max-Min ≤ 0.35

ENTREGA: una sola versión
  └─ Si se detectan bugs después: V1.1 (parche), no V2 (reescritura)
  └─ V1.1 NO agrega claims nuevos, solo corrige los defectuosos
```

---

## 9. Anti-Patrones Documentados

| Anti-patrón | Consecuencia | Ejemplo real |
|-------------|-------------|--------------|
| Reescritura ciega | Destruye claims bien calibrados de versiones anteriores | Cap.10 V2 deshizo precisión de V1 en algunos dominios |
| Denominador sin control | Degrada ratio global con contenido bien intencionado | Cap.10 V2: 19 claims nuevos a 48.4% → 65.4% global |
| Fix declarado = fix verificado | Deja pasar bugs no nombrados | JSON-RPC payload en Cap.10 V2 |
| Score global sin distribución | Oculta dominios peligrosamente mal calibrados | Cap.10 original: 65% global = 0.91 + 0.20 promediados |
| Umbral numérico sin fuente | Guía decisiones arquitectónicas con datos inventados | 1-5 funciones / 10+ herramientas en Cap.10 V2 |
| Target de versión anterior incorrecta | El plan se basa en un baseline factualmente erróneo | "0.78+ como V2" cuando V2 fue 65.4% |
| Criterio homogéneo irreal | El sistema nunca pasará el gate aunque el contenido sea correcto | "0.85-0.95 en todos los dominios" |
