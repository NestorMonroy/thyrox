---
name: pdca-act
description: "Use when deciding whether to standardize or adjust a PDCA improvement. pdca:act — standardize and scale if successful, or adjust and plan next cycle if not. Document lessons learned."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-act — PDCA: Act

> *"Standardize what works, or you'll lose the gain. Every successful improvement that isn't standardized will regress."*

Ejecuta el paso **Act** del ciclo PDCA. Decide estandarizar y escalar, o ajustar y repetir. En ambos casos, documenta lo aprendido.

---

## Cuándo usar este paso

- Cuando Check ha producido un veredicto claro (éxito / parcial / falla) con datos
- Para cerrar el ciclo actual y determinar el siguiente paso
- Para que la mejora sobreviva más allá del piloto

## Cuándo NO usar este paso

- Sin Check completado — Act sin datos es una decisión ciega
- Si el Check identificó contaminación externa que invalida los datos — repetir Do primero

---

## Decisión basada en el Check

### Árbol de decisión

```
Check resultado
├── Objetivo alcanzado o superado
│   ├── Sin regresiones en métricas de control → ESTANDARIZAR + ESCALAR
│   └── Con regresión en métricas de control → AJUSTAR primero, luego estandarizar
├── Mejora parcial (mejoró pero no alcanzó meta)
│   ├── La hipótesis era correcta, implementación incompleta → NUEVO CICLO con plan ajustado
│   └── La hipótesis era parcialmente correcta → NUEVO CICLO con hipótesis refinada
└── Sin mejora o regresión
    ├── Hipótesis incorrecta → NUEVO CICLO con análisis de Plan
    └── Implementación incorrecta → NUEVO CICLO con Do mejorado
```

---

## Actividades — si ESTANDARIZAR

### 1. Actualizar SOPs / procedimientos

Los cambios implementados en el piloto deben quedar documentados como el nuevo estándar:

| Qué actualizar | Cómo |
|---------------|------|
| Runbooks / SOPs | Incorporar los pasos nuevos, eliminar los obsoletos |
| Documentación técnica | README, wikis, configuración de referencia |
| Checklist de operaciones | Si el proceso tiene pasos manuales |
| Configuración de sistema | Variables de entorno, parámetros, archivos de configuración |

### 2. Poka-yoke — error-proofing del nuevo estándar

Antes de escalar, preguntar: *¿Cómo evito que alguien revierta este cambio sin darse cuenta?*

| Técnica | Ejemplo |
|---------|---------|
| **Constraint de sistema** | Hacer imposible el comportamiento anterior (ej: constraint de BD, type check) |
| **Automatización** | El nuevo proceso corre automáticamente, no requiere acción manual |
| **Alerta de regresión** | Monitor que avisa si la métrica vuelve al estado anterior |
| **Documentación prominente** | Comentario o aviso en el código/config que explica por qué no revertir |

### 3. Escalar al ámbito completo

El piloto corrió en un subconjunto. Para escalar:

| Paso | Verificar |
|------|-----------|
| Rollout plan | ¿Cómo se despliega al resto? ¿Gradual o todo a la vez? |
| Comunicación | ¿Quién necesita saber del cambio? |
| Training | ¿Alguien necesita aprender el nuevo proceso? |
| Monitoreo post-rollout | ¿Qué métricas vigilar los primeros días? |

### 4. Establecer nuevo baseline

Después de escalar, el resultado del ciclo se convierte en el nuevo baseline. Documentar:
- Nueva métrica baseline (valor, fecha)
- Si se define un nuevo objetivo de mejora → iniciar nuevo `pdca:plan`

---

## Actividades — si NUEVO CICLO

### 1. Analizar qué ajustar

| Tipo de falla | Qué cambiar en el próximo Plan |
|---------------|-------------------------------|
| Hipótesis incorrecta | Revisar el análisis de causa raíz; ¿qué nos llevó a la hipótesis errónea? |
| Implementación incompleta | Identificar por qué Do no ejecutó el plan completo |
| Objetivo no realista | Ajustar la meta al alcance demostrado por los datos |
| Condiciones externas | Aislar mejor el piloto o esperar condiciones más estables |

### 2. Documentar el aprendizaje para el próximo ciclo

La lección del ciclo fallido es insumo para el próximo Plan. Documentar:
- *"La hipótesis era X pero los datos mostraron Y — la causa real parece ser Z"*
- *"La implementación se detuvo en el paso N por razón R — el próximo ciclo debe contemplar R"*

---

## Lecciones aprendidas — siempre, independiente del resultado

Documentar al final de cada ciclo:

| Dimensión | Pregunta |
|-----------|----------|
| **Proceso** | ¿Qué funcionó bien en el ciclo Plan-Do-Check? ¿Qué fue difícil? |
| **Técnica** | ¿Las herramientas y técnicas elegidas fueron las correctas? |
| **Hipótesis** | ¿La hipótesis fue buena? ¿Cómo mejorar el análisis inicial? |
| **Datos** | ¿Los datos recopilados en Do fueron suficientes para concluir en Check? |
| **Comunicación** | ¿Los stakeholders estuvieron informados y alineados? |

---

## Artefacto esperado

`{wp}/pdca-act.md` — Estructura mínima:

```markdown
## Decisión
[Estandarizar / Nuevo ciclo con ajuste X / Revertir cambio]

## Si Estandarizar:
### Cambios al estándar
- SOP/doc actualizado: [qué cambió]
- Poka-yoke aplicado: [qué mecanismo previene regresión]
- Plan de rollout: [cómo se escala]
- Nuevo baseline: [métrica = valor (fecha)]

## Si Nuevo ciclo:
### Ajuste al Plan
- Lo que falló: [hipótesis / implementación / condiciones]
- Hipótesis ajustada: [nueva hipótesis para el próximo ciclo]
- Cambios al próximo Plan: [qué será diferente]

## Lecciones aprendidas del ciclo
| Dimensión | Lección |
```

---

## Red Flags — señales de Act mal ejecutado

- **Estandarizar sin documentar** — si nadie escribe el nuevo estándar, en 3 meses el equipo habrá regresado al método anterior
- **Escalar sin poka-yoke** — sin mecanismo de protección, cualquier cambio posterior puede revertir la mejora accidentalmente
- **"Nuevo ciclo" sin lección** — repetir el ciclo sin entender por qué falló el anterior es solo más tiempo desperdiciado
- **Cerrar el WP con "parcialmente exitoso" sin definir qué sigue** — ambigüedad en Act produce entropía; siempre concluir con una acción clara
- **Ajustar el objetivo para que "parezca éxito"** — es una trampa; si no alcanzó la meta, decirlo directamente y explicar qué se aprendió
- **No comunicar el resultado a stakeholders** — el ciclo PDCA tiene valor de aprendizaje organizacional, no solo técnico

---

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:act
flow: pdca
```

## Siguiente paso

Si ciclo exitoso + estandarizado → cerrar WP o iniciar nuevo objetivo (`pdca:plan`)
Si ciclo requiere ajuste → `pdca:plan` con hipótesis ajustada y lecciones incorporadas

---

## Limitaciones

- Act no puede compensar un Check sin datos; si los datos de Do son pobres, la decisión de Act será débil
- La estandarización es responsabilidad del equipo dueño del proceso — este skill guía qué documentar, pero el ownership de los cambios debe ser claro
- Para cambios que afectan múltiples equipos, el rollout requiere coordinación fuera del scope de este skill
