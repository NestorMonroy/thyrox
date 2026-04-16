---
name: dmaic-improve
description: "Use when implementing solutions in a DMAIC project. dmaic:improve — generate improvement alternatives, select optimal solution, implement pilot, validate improvement vs baseline."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-improve — DMAIC: Improve

> *"Solve the root cause, not the symptom. A solution that doesn't address the validated root cause is just moving the problem."*

Ejecuta la fase **Improve** de DMAIC. Diseña, selecciona e implementa soluciones que eliminan las causas raíz identificadas en Analyze. Valida la mejora con datos.

**Tollgate:** Mejora validada con datos post-implementación vs baseline de Measure.

---

## Cuándo usar este paso

- Cuando Analyze ha producido causas raíz confirmadas con datos
- Para diseñar e implementar soluciones dirigidas a esas causas raíz
- Para validar que las soluciones realmente mejoraron el CTQ

## Cuándo NO usar este paso

- Sin causas raíz validadas de Analyze — implementar soluciones sin causas confirmadas es apostar, no mejorar
- Si la solución ya está decidida sin análisis — eso no es DMAIC Improve, es implementación directa
- Si el alcance de la solución excede el scope del proyecto — escalar o redefinir el charter primero

---

## Actividades

### 1. Generar alternativas de solución

Para cada causa raíz confirmada, generar múltiples opciones. No diseñar con una sola solución:

| Causa raíz confirmada | Solución A | Solución B | Solución C |
|----------------------|-----------|-----------|-----------|
| [Causa 1] | [Opción 1a] | [Opción 1b] | [Opción 1c] |
| [Causa 2] | [Opción 2a] | [Opción 2b] | — |

**Técnicas para generar alternativas:**
- Brainstorming estructurado (equipo multifuncional)
- Benchmarking (¿cómo lo resuelven otros?)
- Transferencia de soluciones de industrias análogas
- Poka-yoke (error-proofing): ¿cómo hacer imposible que la causa vuelva a ocurrir?

### 2. Evaluar y seleccionar solución

**Matriz de decisión (Impact × Effort):**

| Solución | Impacto esperado (1-5) | Esfuerzo/Costo (1-5, 5=alto) | Riesgo (1-5, 5=alto) | Score (Impacto / (Esfuerzo × Riesgo)^0.5) |
|---------|----------------------|------------------------------|---------------------|------------------------------------------|
| [Opción A] | | | | |
| [Opción B] | | | | |

**Criterios adicionales de selección:**

| Criterio | Descripción |
|----------|-------------|
| **Ataca la causa raíz** | ¿La solución elimina la causa o solo mitiga el síntoma? |
| **Sostenibilidad** | ¿La solución puede mantenerse sin esfuerzo continuo? |
| **Reversibilidad** | ¿Se puede deshacer si no funciona? |
| **Efectos colaterales** | ¿Podría crear nuevos problemas? |
| **Poka-yoke level** | ¿Hace imposible la recurrencia, o solo más difícil? |

### 3. FMEA — Failure Mode and Effects Analysis (antes del piloto)

Para la solución seleccionada, evaluar los modos de falla antes de implementar:

| Paso del proceso | Modo de falla potencial | Efecto | Severidad (1-10) | Ocurrencia (1-10) | Detección (1-10) | RPN (S×O×D) | Acción preventiva |
|-----------------|------------------------|--------|------------------|-------------------|------------------|-------------|------------------|

**Criterio:** RPN > 100 → requiere acción preventiva antes del piloto.

> El FMEA es opcional para soluciones de bajo riesgo, pero obligatorio si la implementación puede afectar procesos críticos o clientes.

### 4. Diseñar y ejecutar el piloto

Principios del piloto (igual que PDCA:Do, aplicados con rigor estadístico):

| Elemento | Decisión |
|----------|----------|
| **Scope** | Subconjunto representativo del proceso |
| **Duración** | Suficiente para capturar variabilidad normal |
| **Variables a medir** | Exactamente las mismas que en Measure (baseline) |
| **Control de variables** | Solo cambiar lo definido en la solución; nada más |
| **Rollback** | Condición y procedimiento para revertir |

**Poka-yoke en el piloto:** si la solución requiere que las personas hagan algo diferente, automatizarla o hacer imposible el comportamiento anterior, no solo pedir que cambien el hábito.

### 5. Validar mejora — comparación estadística rigurosa

Recopilar datos post-implementación con las mismas métricas de Measure:

| Métrica | Baseline (Measure) | Post-Improve | Delta | Significancia |
|---------|-------------------|--------------|-------|--------------|
| CTQ principal (DPMO/Sigma) | | | | p-value < 0.05? |
| CTQs de control | | | | Sin regresión? |

**Herramientas de validación:**

| Comparación | Herramienta | Criterio |
|-------------|-------------|---------|
| Proporciones (antes/después) | Chi-cuadrado / test de proporciones | p < 0.05 |
| Medias continuas (antes/después) | t-test de dos muestras | p < 0.05 |
| Varianzas (antes/después) | F-test / Levene | p < 0.05 |
| Distribuciones completas | Mann-Whitney (no paramétrico) | p < 0.05 |

**Calcular el nuevo Sigma Level y comparar con baseline de Measure.**

### 6. DOE — Design of Experiments (si múltiples factores)

Si la solución involucra múltiples variables que interactúan:

| Cuándo usar DOE | Ejemplo |
|-----------------|---------|
| Múltiples factores con posibles interacciones | Temperatura + tiempo + presión en proceso de manufactura |
| Se quiere optimizar niveles, no solo eliminar la causa | ¿Cuál es el nivel óptimo de cada factor? |
| Recursos limitados y se quiere maximizar información | Diseño fraccionado para explorar con pocas corridas |

> DOE es overhead si la causa raíz es simple y la solución obvia. Usar cuando hay genuina incertidumbre sobre qué combinación de factores da el mejor resultado.

---

## Artefacto esperado

`{wp}/dmaic-improve.md` — Estructura mínima:

```markdown
## Alternativas de solución evaluadas
[Tabla: causa raíz → opciones A/B/C]

## Solución seleccionada
[Opción elegida + justificación con matriz de decisión]

## FMEA (si aplica)
[Tabla RPN — acciones preventivas para RPN > 100]

## Diseño del piloto
[Scope, duración, métricas, rollback]

## Datos post-implementación
[Tabla: baseline vs resultado]

## Validación estadística
[Herramienta usada, resultado, conclusión]

## Nuevo Sigma Level
[Baseline Measure → Post-Improve → Delta]
```

---

## Red Flags — señales de Improve mal ejecutado

- **Solución que no ataca la causa raíz confirmada** — la solución favorita del equipo vs la causa real no siempre coinciden
- **Piloto sin control de variables** — si cambiaron otras cosas durante el piloto, no se puede atribuir la mejora a la solución
- **Validación solo con promedio** — verificar también si cambió la variabilidad (desviación estándar); un proceso puede mejorar el promedio pero volverse más errático
- **Sin comparación estadística** — *"claramente mejoró"* sin p-value no es validación en DMAIC
- **Solución que requiere disciplina continua** — las soluciones que dependen de que las personas recuerden hacer algo diferente degradan con el tiempo; preferir poka-yoke
- **Comparar contra objetivo del charter, no contra el baseline de Measure** — el tollgate de Improve es mejorar vs baseline, no necesariamente alcanzar el objetivo final (eso se confirma en Control)

---

## Estado en now.md

```
methodology_step: dmaic:improve
flow: dmaic
```

## Siguiente paso

Cuando la mejora está validada estadísticamente (nuevo Sigma Level documentado) → `dmaic:control`

---

## Limitaciones

- DOE completo y análisis multivariante avanzado requieren herramientas especializadas (Minitab, R, Python)
- FMEA detallado para procesos críticos de seguridad requiere conocimiento profundo del dominio
- La validación estadística asume independencia de las observaciones — si los datos tienen autocorrelación temporal, usar Series de Tiempo en lugar de t-test
