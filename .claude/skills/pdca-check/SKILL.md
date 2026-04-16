---
name: pdca-check
description: "Use when reviewing results of a PDCA pilot. pdca:check — compare actual results against Plan objectives, identify gaps, and analyze causes of success or failure."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-check — PDCA: Check

> *"Data kills opinions. Check is the moment of truth — what the numbers say, not what we hoped."*

Ejecuta el paso **Check** del ciclo PDCA. Compara los resultados del piloto contra el objetivo SMART del Plan. Produce un veredicto basado en datos.

---

## Cuándo usar este paso

- Cuando el piloto de Do está completo y los datos están recopilados
- Para determinar si la hipótesis de mejora fue confirmada o refutada
- Para decidir si proceder a estandarizar (Act success) o a ajustar el Plan (Act fail)

## Cuándo NO usar este paso

- Si los datos del Do son insuficientes (muestra muy pequeña, duración muy corta) — extender el piloto primero
- Si las condiciones del piloto fueron radicalmente distintas a las del baseline — los datos no son comparables; documentar y reiniciar Do
- Sin baseline definido en Plan — sin referencia, el Check no puede concluir nada

---

## Actividades

### 1. Comparar resultados con el objetivo SMART

Construir una tabla de comparación directa:

| Métrica | Baseline (Plan) | Objetivo SMART (Plan) | Resultado Do | Delta vs Baseline | ¿Objetivo alcanzado? |
|---------|-----------------|----------------------|--------------|-------------------|---------------------|
| [Principal] | [valor] | [meta] | [valor real] | [+/-X%] | ✅ / ❌ |
| [Control 1] | [valor] | sin regresión | [valor real] | [+/-X%] | ✅ / ❌ |
| [Control 2] | | | | | |

### 2. Evaluar magnitud de la mejora

No es solo "¿se alcanzó el objetivo?" — es cuánto se mejoró y si es estadísticamente significativo:

| Nivel | Criterio | Acción en Act |
|-------|----------|---------------|
| **Objetivo superado** | Resultado > meta con margen | Estandarizar y buscar nuevo objetivo |
| **Objetivo alcanzado** | Resultado = meta ± margen aceptable | Estandarizar |
| **Mejora parcial** | Resultado mejoró pero no alcanzó la meta | Act: ajustar plan, nuevo ciclo |
| **Sin cambio** | Resultado = baseline | Act: revisar hipótesis |
| **Regresión** | Resultado peor que baseline | Act: revertir cambio, reinvestigar |

### 3. Evaluar significancia de la diferencia

Para evitar concluir que "mejoró" cuando la diferencia es ruido estadístico:

| Herramienta | Usar cuando... |
|-------------|---------------|
| **Rango de variación histórica** | ¿El resultado está fuera del rango normal del proceso antes del cambio? |
| **Comparar medias con desviación** | ¿La diferencia supera al menos 1 desviación estándar del baseline? |
| **T-test simple** | Si hay suficientes datos (n > 30) para una comparación estadística formal |
| **Juicio experto** | Para cambios cualitativos o cuando el contexto explica la variación |

> Regla práctica: si la mejora no supera la variabilidad natural del proceso (el rango de fluctuación habitual), no es una mejora real — es ruido.

### 4. Analizar causas del resultado

Independiente de si fue éxito o fracaso, entender *por qué*:

**Si fue exitoso:**
- ¿La hipótesis se confirmó como esperado?
- ¿Hubo factores adicionales que contribuyeron (que no estaban en el plan)?
- ¿El resultado es transferible al ámbito completo?

**Si fue parcial o fallido:**
- ¿Falló la hipótesis (causa raíz incorrecta)?
- ¿Falló la implementación (hipótesis correcta pero mal ejecutada)?
- ¿Cambiaron las condiciones externas durante el piloto?
- ¿Hay efectos colaterales no anticipados?

### 5. Formular la conclusión del piloto

La conclusión del Check debe ser una afirmación directa:

- *"La hipótesis fue confirmada. El índice compuesto redujo p95 de 2.1s a 0.6s (71% de mejora), superando el objetivo de 800ms."*
- *"La hipótesis fue refutada. El índice no mejoró la latencia; la causa raíz está en otro lugar."*
- *"Resultado mixto: la latencia mejoró (0.9s) pero no alcanzó el objetivo (0.8s). Se requiere ajuste."*

---

## Técnicas de análisis

| Técnica | Cuándo aplicar |
|---------|---------------|
| **Tabla antes/después** | Siempre — comparación directa de métricas |
| **Gráfico de tendencia** | Si los datos son temporales — ver si la mejora se sostiene |
| **Análisis de varianza** | Si hay múltiples grupos o condiciones en el piloto |
| **5 Whys (retrospectivo)** | Si el resultado fue inesperado — entender por qué |
| **Comparativa de distribución** | Si la variabilidad cambió además del promedio |

---

## Artefacto esperado

`{wp}/pdca-check.md` — Estructura mínima:

```markdown
## Comparativa objetivo vs resultado
| Métrica | Baseline | Objetivo | Resultado | Delta | ¿Alcanzado? |

## Evaluación de significancia
[¿La diferencia supera la variabilidad natural del proceso?]

## Análisis de causas del resultado
[Por qué se logró / no se logró — hipótesis confirmada o refutada]

## Factores no anticipados
[Qué salió diferente a lo esperado — positivo o negativo]

## Conclusión del piloto
[Afirmación directa: hipótesis confirmada / refutada / resultado mixto]

## Recomendación para Act
[Estandarizar / Nuevo ciclo con ajuste X / Revertir cambio]
```

---

## Red Flags — señales de Check mal ejecutado

- **"Mejoró" sin número** — toda conclusión del Check debe tener datos
- **Comparar contra el objetivo sin el baseline** — el baseline es lo que importa, no solo el objetivo
- **Ignorar regresiones en métricas de control** — si la mejora principal se logró pero algo más empeoró, no es éxito completo
- **Cambiar el objetivo después de ver los resultados** — el objetivo se define en Plan, no se ajusta en Check para que "parezca éxito"
- **Concluir sin datos suficientes** — si el piloto duró 2 horas en un proceso semanal, los datos no son representativos
- **Atribuir el resultado a la intervención sin descartar factores externos** — ¿cambió algo más en el entorno durante el piloto?

---

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:check
flow: pdca
```

## Siguiente paso

Cuando el análisis de resultados está completo con conclusión directa → `pdca:act`

---

## Limitaciones

- Para procesos con alta variabilidad natural, determinar significancia estadística requiere mayor rigor que la comparación simple de promedios
- Si el piloto fue contaminado por eventos externos (incidentes, cambios de infraestructura, estacionalidad), documentar la contaminación y considerar repetir el Do
- El Check no puede ser más confiable que la calidad de los datos recopilados en Do
