---
name: dmaic-analyze
description: "Use when identifying root causes in a DMAIC project. dmaic:analyze — perform root cause analysis using statistical tools (Pareto, Ishikawa, regression), validate causes with data."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-analyze — DMAIC: Analyze

> *"The most important thing is not to stop questioning. A root cause is only valid when data confirms it — not when the team believes it."*

Ejecuta la fase **Analyze** de DMAIC. Identifica y valida causas raíz con evidencia estadística.

**Tollgate:** Causas raíz validadas con datos (no solo con opiniones o brainstorming).

---

## Cuándo usar este paso

- Cuando el baseline de Measure está establecido y el MSA validado
- Para identificar qué variables del proceso explican la variación observada en el CTQ
- Antes de definir soluciones — nunca diseñar mejoras sin causas raíz confirmadas

## Cuándo NO usar este paso

- Sin baseline de Measure — Analyze necesita datos del proceso para analizar
- Si la causa raíz ya está confirmada con datos previos — documentarla y avanzar a Improve
- Si el equipo quiere *confirmar* una causa ya decidida sin análisis real — ese no es Analyze, es racionalización post-hoc

---

## Actividades

### 1. Generar hipótesis de causas — lluvia de ideas estructurada

Antes de analizar datos, mapear todas las causas *posibles*:

**Diagrama de Ishikawa (5M / 6M):**

| Categoría | Preguntas guía |
|-----------|---------------|
| **Máquina / Equipo** | ¿Hay variación entre máquinas? ¿Mantenimiento? ¿Calibración? |
| **Método / Proceso** | ¿El proceso está documentado? ¿Se sigue? ¿Hay variación entre operadores? |
| **Material** | ¿Hay variación en los insumos? ¿Diferentes proveedores? |
| **Mano de obra** | ¿Hay diferencias entre turnos, operadores, equipos? |
| **Medio ambiente** | ¿Temperatura, humedad, ruido, hora del día afectan? |
| **Medición** (6M) | ¿El sistema de medición introduce variación? (ya validado en MSA) |

El objetivo del Ishikawa es generar hipótesis, no confirmarlas. Cada rama es una hipótesis a validar.

### 2. Seleccionar herramienta de análisis según el problema

| Herramienta | Cuándo usar | Qué responde |
|-------------|-------------|-------------|
| **Análisis de Pareto** | Múltiples categorías de defectos | ¿Cuáles pocas causas generan la mayoría del problema? |
| **5 Whys** | Causa aparentemente simple; buen punto de partida | ¿Cuál es la causa raíz profunda? |
| **Análisis de estratificación** | Datos recopilados por subgrupos | ¿La causa está en el turno X, la máquina Y, el operador Z? |
| **Diagrama de dispersión** | Dos variables continuas | ¿Existe correlación entre variable X y el CTQ? |
| **Regresión lineal** | Una o más variables continuas predictoras | ¿Cuánto explica X la variación en CTQ? |
| **ANOVA** | Variable categórica con múltiples grupos | ¿La media del CTQ difiere significativamente entre grupos? |
| **Chi-cuadrado** | Dos variables categóricas | ¿Hay asociación estadística entre categoría A y defecto B? |
| **DOE exploratorio** | Múltiples factores con posibles interacciones | ¿Qué combinación de factores explica la variación? |

### 3. Análisis de Pareto — identificar las pocas causas vitales

Pasos:
1. Listar todas las categorías de defectos/causas con frecuencia
2. Ordenar de mayor a menor
3. Calcular % acumulado
4. Identificar el punto donde se llega al 80% (las "pocas vitales")

```
Las pocas vitales (20% de causas → 80% del problema) son las que merece la pena investigar primero.
Las muchas triviales (80% de causas → 20% del problema) no justifican esfuerzo de mejora.
```

### 4. 5 Whys — profundizar en causas raíz

Para cada causa identificada como "vital", preguntar "¿Por qué?" repetidamente:

```
Problema: 18% de pedidos llegan tarde
¿Por qué? → La ruta de despacho se asigna manualmente y hay errores
¿Por qué? → No hay criterios claros de asignación de ruta
¿Por qué? → El proceso de asignación nunca fue documentado
¿Por qué? → El responsable original no hizo transfer de conocimiento
¿Por qué? → No existe proceso de onboarding para este rol  ← causa raíz
```

**Criterios para saber cuándo parar:**
- Llegaste a algo que puedes cambiar directamente (política, herramienta, proceso)
- El siguiente "¿por qué?" escapa del scope del proyecto
- La respuesta es *"así siempre se ha hecho"* → causa raíz de proceso/cultura

### 5. Validar causas con datos — el paso crítico

Una causa hipotética se convierte en causa raíz confirmada cuando los datos la respaldan:

| Tipo de causa | Herramienta de validación | Criterio de confirmación |
|---------------|--------------------------|-------------------------|
| Categórica (turno A vs B) | ANOVA / t-test / Chi-cuadrado | p-value < 0.05 |
| Continua (temperatura vs defectos) | Regresión / diagrama de dispersión | R² significativo, pendiente ≠ 0 |
| Temporal (antes/después de evento) | Gráfica de control / comparación de medias | Cambio estadísticamente significativo |
| Proceso vs proceso | Comparación de proporciones | Diferencia significativa con IC |

> **Correlación ≠ Causalidad.** Que X correlacione con el CTQ no significa que X *cause* el problema. Buscar el mecanismo causal que explica por qué X influye en CTQ.

### 6. Priorizar causas raíz confirmadas

Al final de Analyze, tener una lista de causas validadas con:
- Magnitud del impacto (cuánto explica cada causa de la variación total)
- Facilidad de intervención (costo/esfuerzo para eliminarla)
- Prioridad: atacar primero las que tienen mayor impacto y menor costo

---

## Artefacto esperado

`{wp}/dmaic-analyze.md` — Estructura mínima:

```markdown
## Hipótesis de causas (Ishikawa)
[Diagrama o tabla por categoría 5M/6M]

## Análisis de Pareto
[Tabla: categorías, frecuencia, % acumulado — pocas vitales identificadas]

## 5 Whys (por causa vital)
[Cadena de por qués para cada causa vital — hasta causa raíz]

## Validación estadística
| Causa hipotética | Herramienta | Resultado | ¿Confirmada? |
|-----------------|-------------|-----------|-------------|

## Causas raíz confirmadas (priorizadas)
| Causa raíz | Impacto estimado | Esfuerzo de solución | Prioridad |
```

---

## Red Flags — señales de Analyze mal ejecutado

- **"Ya sabemos la causa"** — si el equipo decide la causa antes de analizar datos, el análisis es teatro
- **Ishikawa sin datos** — el diagrama de Ishikawa solo genera hipótesis; sin validación estadística, no hay causa raíz
- **5 Whys que se detiene en el síntoma** — *"¿Por qué? Porque falla"* no es profundización
- **Confundir correlación con causalidad** — dos variables que se mueven juntas no implican que una cause la otra
- **Validar solo las causas que el equipo quería encontrar** — sesgo de confirmación; analizar *todas* las hipótesis del Ishikawa, no solo las favoritas
- **Causas raíz fuera del scope del proyecto** — si la causa raíz es *"la estrategia de la empresa"*, está fuera del alcance; redefinir scope o escalar

---

## Estado en now.md

```
methodology_step: dmaic:analyze
flow: dmaic
```

## Siguiente paso

Cuando las causas raíz están validadas con datos y priorizadas → `dmaic:improve`

---

## Limitaciones

- Para análisis estadísticos avanzados (DOE completo, regresión múltiple, SEM), se requieren herramientas especializadas (Minitab, R, Python statsmodels)
- El número de "Whys" en 5 Whys no es literal — puede requerir más o menos de 5 iteraciones dependiendo del problema
- Si los datos de Measure no tienen suficiente estratificación, Analyze no podrá identificar las fuentes de variación
