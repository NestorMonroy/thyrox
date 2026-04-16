---
name: babok-requirements-analysis
description: "Use when modeling and specifying requirements in BABOK. babok:requirements-analysis — model requirements with use cases and user stories, apply INVEST, verify and validate requirements, define design options."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
disable-model-invocation: true
updated_at: 2026-04-16 00:00:00
---

# /babok-requirements-analysis — BABOK: Requirements Analysis & Design Definition

> *"The purpose of requirements analysis is not to produce a perfect document — it is to create a shared understanding between business and technology of what needs to be built and why. The document is the artifact; the understanding is the goal."*

Ejecuta la Knowledge Area **Requirements Analysis & Design Definition** de BABOK v3. Modela y especifica los requisitos usando use cases y user stories, aplica criterios INVEST, verifica y valida los requisitos, y define las opciones de diseño de la solución.

**THYROX Stage:** Stage 7 DESIGN/SPECIFY.

**Outputs clave:** Specified Requirements · Use Case Model · User Stories · Design Options.

---

## Pre-condición

Requiere necesidades articuladas de al menos una de:
- `{wp}/babok-elicitation.md` con stakeholder needs confirmados
- `{wp}/babok-strategy.md` con gap analysis y capacidades requeridas

---

## Cuándo usar este paso

- Cuando las necesidades del negocio están articuladas y deben convertirse en requisitos especificados
- Al modelar procesos de negocio y casos de uso del sistema
- Cuando se necesita verificar que los requisitos son completos, consistentes y no ambiguos

## Cuándo NO usar este paso

- Si las necesidades del negocio no están claras — ir primero a `babok:elicitation` o `babok:strategy`
- Si el trabajo es gestionar requisitos ya especificados — ir a `babok:requirements-lifecycle`

---

## Actividades

### 1. Modelado de requisitos

**Use Cases (para especificar funcionalidad del sistema):**

| Sección | Contenido |
|---------|-----------|
| **Nombre** | Verbo + objeto: "Procesar Solicitud de Crédito" |
| **Actor principal** | Quién inicia el UC |
| **Trigger** | Qué evento inicia el UC |
| **Precondiciones** | Estado del sistema antes de que el UC ejecute |
| **Flujo principal** | Pasos numerados del escenario nominal |
| **Flujos alternativos** | Variaciones del flujo principal que también son exitosas |
| **Flujos de excepción** | Qué pasa cuando algo falla o sale del flujo normal |
| **Postcondiciones** | Estado del sistema después del UC exitoso |
| **Reglas de negocio** | Reglas que aplican en el contexto de este UC |

**User Stories (para contextos ágiles):**

```
Como [rol del usuario],
quiero [capacidad / feature],
para [beneficio de negocio / objetivo].
```

**Criterios de aceptación (Given/When/Then):**

```
Dado [contexto / precondición],
cuando [acción del usuario],
entonces [resultado esperado del sistema].
```

### 2. INVEST criteria para User Stories

Verificar cada User Story contra los criterios INVEST:

| Criterio | Pregunta | Señal de problema |
|---------|---------|-----------------|
| **I — Independent** | ¿Puede implementarse sin depender de otra story? | Muchas stories que deben hacerse juntas |
| **N — Negotiable** | ¿El detalle de implementación es flexible? | Story que especifica tecnología o arquitectura |
| **V — Valuable** | ¿Entrega valor al usuario al completarse? | Story técnica sin valor de negocio visible |
| **E — Estimable** | ¿El equipo puede estimar el esfuerzo? | Story con demasiada ambigüedad o tamaño |
| **S — Small** | ¿Puede completarse en 1-3 días? | Story que tarda más de un sprint |
| **T — Testable** | ¿Puede verificarse si está completa? | Story sin criterios de aceptación |

### 3. Verificación vs Validación

Distinción fundamental en BABOK:

| Dimensión | Verificación | Validación |
|-----------|-------------|-----------|
| **Pregunta** | ¿El requisito está bien escrito? | ¿El requisito resuelve la necesidad real? |
| **Criterio** | Cumple estándares de calidad del documento | Cumple la necesidad del stakeholder |
| **Quién lo hace** | BA + revisores técnicos | Stakeholders del negocio |
| **Cuándo** | Al especificar el requisito | Al validar con los stakeholders |
| **Técnica** | Walkthrough · Inspección · Checklist IEEE 829 | Prototipo · UAT · Walkthrough con usuario |

**Checklist de verificación (calidad del requisito individual):**

| Criterio | Pregunta |
|---------|---------|
| **Completitud** | ¿Describe completamente la necesidad? ¿No hay información faltante? |
| **Consistencia** | ¿No contradice otros requisitos? |
| **No ambigüedad** | ¿Solo puede interpretarse de una forma? |
| **Verificabilidad** | ¿Puede probarse que fue implementado? |
| **Factibilidad** | ¿Es técnica y operacionalmente realizable? |
| **Trazabilidad** | ¿Puede rastrearse a una necesidad de negocio? |

### 4. Priorización con MoSCoW

Clasificar requisitos por prioridad con los stakeholders:

| Categoría | Criterio | Regla de asignación |
|-----------|---------|---------------------|
| **Must Have** | Sin esto el sistema no puede operar | ≤ 60% de los requisitos; si más, el scope es demasiado grande |
| **Should Have** | Importante pero hay workaround aceptable | 20-30% de los requisitos |
| **Could Have** | Deseable si hay tiempo y presupuesto | 10-20% de los requisitos |
| **Won't Have** | Fuera del alcance de esta versión | Documentar para versiones futuras |

### 5. Definición de opciones de diseño

El BA define opciones de diseño de alto nivel (qué, no cómo):

| Opción | Descripción | Ventajas | Desventajas | Restricciones |
|--------|-------------|---------|------------|---------------|
| Opción A | [descripción de la solución] | [lista] | [lista] | [restricciones que aplican] |
| Opción B | [descripción alternativa] | [lista] | [lista] | [restricciones] |

> **Nota BABOK:** El BA define opciones de diseño de alto nivel. El diseño detallado (arquitectura, tecnologías específicas, estructuras de datos) es responsabilidad del equipo técnico, no del BA.

---

## Routing Table

| Situación | Próxima KA recomendada |
|-----------|----------------------|
| Los requisitos especificados necesitan trazabilidad y gestión de cambios | `babok:requirements-lifecycle` |
| Se necesita información adicional para completar la especificación | `babok:elicitation` |
| La solución fue implementada y se necesita evaluar el valor entregado | `babok:solution-evaluation` |
| Los requisitos especificados requieren análisis estratégico adicional | `babok:strategy` |
| Hay una brecha en la especificación identificada en revisión | Nueva iteración de `babok:requirements-analysis` |

---

## Artefacto esperado

`{wp}/babok-requirements-analysis.md`

```yml
created_at: [timestamp]
project: [nombre]
work_package: [wp-id]
phase: babok:requirements-analysis
author: [nombre]
status: Borrador
```

```markdown
## Use Case Model
| Use Case | Actor | Trigger | Prioridad MoSCoW |

### UC-001: [Nombre]
**Flujo principal:**
1. [paso]
2. [paso]

**Flujos alternativos:**
- [alt-1]: ...

**Flujos de excepción:**
- [exc-1]: ...

## User Stories (si aplica contexto ágil)
| Story ID | Historia | Criterios de aceptación (Given/When/Then) | INVEST check | Prioridad |

## Verificación de requisitos
| Req ID | Completo | Consistente | No ambiguo | Verificable | Factible | Trazable |

## Validación con stakeholders
| Req ID | Validado por | Fecha | Observaciones |

## Priorización MoSCoW
| Categoría | # Requisitos | % del total |
| Must Have | | |
| Should Have | | |
| Could Have | | |
| Won't Have | | |

## Opciones de diseño de alto nivel
| Opción | Descripción | Pros | Contras |

## Routing — próxima KA
[Aplicar Routing Table]
```

---

## Red Flags — señales de Requirements Analysis mal ejecutado

- **User Stories que especifican la implementación** — "Como usuario quiero que el sistema use PostgreSQL con índices en la columna email" es un requisito técnico disfrazado de story; el BA debe capturar la necesidad de negocio, no la implementación
- **Must Have > 60% del total** — si más del 60% es Must Have, el scope es demasiado grande o el equipo no está priorizando realmente
- **Criterios de aceptación ausentes** — una User Story sin criterios de aceptación es irrechazable por definición; el equipo no sabe cuándo terminó
- **Verificación sin validación** — requisitos que pasan el checklist técnico (verificados) pero que los stakeholders no reconocen como sus necesidades (no validados) generan un sistema formalmente correcto pero inútil
- **Use Cases sin flujos de excepción** — modelar solo el happy path asegura que los casos de error no se especifican y se implementan incorrectamente

---

## Estado en now.md

**Al INICIAR este step:**
```yaml
methodology_step: babok:requirements-analysis
flow: babok
babok_ka: requirements_analysis_design
```

## Siguiente paso

Usar la **Routing Table** — la transición más frecuente es hacia `babok:requirements-lifecycle` para gestionar los requisitos especificados, o hacia `babok:solution-evaluation` cuando la solución ya está implementada.
