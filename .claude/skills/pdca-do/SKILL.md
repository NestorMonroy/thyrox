---
name: pdca-do
description: "Use when executing a PDCA improvement plan. pdca:do — implement the plan at small scale (pilot), collect data during execution, and document observations and deviations."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-do — PDCA: Do

> *"Small, reversible steps. Verify each change before the next. Never change multiple variables simultaneously."*

Ejecuta el paso **Do** del ciclo PDCA. Implementa el plan a escala controlada (piloto) y recopila datos con disciplina.

---

## Cuándo usar este paso

- Cuando el Plan está completo con baseline, objetivo SMART e hipótesis formulada
- Para ejecutar la intervención planificada en ámbito limitado
- Para recopilar los datos que el Check va a analizar

## Cuándo NO usar este paso

- Sin Plan aprobado con baseline — Do sin baseline invalida el Check
- Sin rollback plan definido — si la intervención puede dañar producción, definir primero cómo revertir
- Sin criterio de parada — si los resultados empeoran significativamente, ¿cuándo detener el piloto?

---

## Actividades

### 1. Diseñar el piloto

Un buen piloto es pequeño, controlado y representativo. Definir antes de empezar:

| Dimensión | Decisión necesaria |
|-----------|-------------------|
| **Scope** | ¿En qué subconjunto del proceso/sistema? (1 servidor, 1 región, 1 equipo) |
| **Duración** | ¿Cuánto tiempo necesito para que los datos sean representativos? |
| **Métricas** | ¿Exactamente las mismas que el baseline — ni más ni menos |
| **Rollback** | ¿Qué condición dispara revertir? ¿Cómo se revierte? |
| **Aislamiento** | ¿Hay variables externas que podrían contaminar los resultados? |

**Regla de aislamiento:** Cambiar una sola variable a la vez. Si el Plan tiene múltiples acciones, implementarlas secuencialmente y medir después de cada una, no todas juntas.

### 2. Capturar el baseline del piloto

Antes de hacer cualquier cambio, recopilar las métricas en el estado actual del ámbito del piloto. Este sub-baseline permite comparar directamente en Check, independiente del baseline global del Plan.

### 3. Implementar el plan

Seguir el plan de acción definido en `pdca:plan`. Durante la implementación:

- Documentar cada acción con timestamp
- Registrar el estado antes → después de cada cambio
- Capturar cualquier desviación del plan y su causa

**Principio Kaizen aplicado:**
```
Primera vez → hacer que funcione (implementar la mejora básica)
Segunda iteración → hacer que sea claro (documentar y comunicar)
Tercera iteración → hacer que sea eficiente (optimizar si los datos lo justifican)
No intentar los tres a la vez.
```

### 4. Recopilar datos durante la ejecución

El plan de recolección de datos debe estar definido *antes* de ejecutar:

| ¿Qué medir? | ¿Cómo? | ¿Con qué frecuencia? | ¿Quién? |
|-------------|--------|---------------------|---------|
| Métrica principal (del objetivo SMART) | Herramienta/fuente | Continuo / por hora / diario | Nombre |
| Métricas secundarias de control | | | |
| Efectos colaterales no deseados | | | |

> Medir los mismos indicadores que en el baseline. Si se miden cosas distintas, el Check no puede comparar.

### 5. Documentar observaciones y desviaciones

| Categoría | Qué registrar |
|-----------|---------------|
| **Según lo esperado** | Comportamientos que confirmaron la hipótesis |
| **Diferente a lo esperado** | Sorpresas positivas o negativas |
| **Desviaciones del plan** | Qué no se pudo hacer como estaba planificado y por qué |
| **Señales de riesgo** | Indicadores que sugieren que la mejora podría estar causando daño |

---

## Criterios de parada del piloto

Definir antes de empezar cuándo detener anticipadamente:

- Degradación > X% en métrica principal → detener y revertir
- Error crítico imprevisto en producción → detener y revertir
- Duración máxima sin señal positiva → detener y documentar

---

## Artefacto esperado

`{wp}/pdca-do.md` — Estructura mínima:

```markdown
## Diseño del piloto
- Scope: [qué subconjunto]
- Duración: [inicio → fin]
- Rollback: [condición + procedimiento]

## Baseline del piloto
- [Métrica]: [valor antes de cambio] (medido el [fecha])

## Registro de implementación
| Timestamp | Acción | Estado antes | Estado después | Observación |

## Datos recopilados
| Período | [Métrica principal] | [Métrica control] |

## Desviaciones del plan
| Acción planificada | Lo que ocurrió | Causa |

## Observaciones generales
[Qué fue inesperado, positivo o negativo]
```

---

## Red Flags — señales de Do mal ejecutado

- **Múltiples cambios simultáneos** — si mejora (o empeora), no sabrás cuál fue la causa
- **Sin baseline del piloto** — el Check tendrá que comparar contra el baseline global, que puede no ser comparable si las condiciones del entorno cambiaron
- **Medir diferente en Do que en Plan** — invalida la comparación en Check
- **Piloto en 100% del sistema** — ya no es piloto, es implementación total; si falla, el impacto es máximo
- **Sin rollback plan** — implementar sin saber cómo revertir es imprudente, especialmente en sistemas críticos
- **Comprimir el tiempo del piloto** por presión de deadline — los datos apresurados dan señales falsas

---

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:do
flow: pdca
```

## Siguiente paso

Cuando el piloto está completo y los datos están recopilados → `pdca:check`

---

## Limitaciones

- Este skill guía la ejecución del piloto; el juicio de cuándo un piloto es "suficientemente representativo" requiere conocimiento del dominio
- Para procesos con alta variabilidad estacional, la duración del piloto debe cubrir al menos un ciclo completo del patrón
- Si el piloto no puede aislarse del proceso productivo, documentar cuidadosamente las condiciones externas que podrían contaminar los datos
