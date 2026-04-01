```yml
Tipo: Análisis Phase 1
Work package: 2026-04-01-00-00-00-skill-activation-failure
Fecha: 2026-04-01
```

# Análisis: Por qué el SKILL no se activa (ni con Sonnet 4.6)

## Problema

Incluso usando Sonnet 4.6 en el propio repositorio THYROX, el modelo no siguió
la metodología de 7 fases al recibir la tarea: "revisa el flujo del SKILL y 
determina el motivo por el cual no se sigue en otro modelo".

Fue directamente a responder sin Phase 1, sin work package, sin análisis documentado.

---

## Hallazgo 1: Brecha entre "disponible" e "invocado"

El SKILL requiere ser invocado explícitamente via el `Skill` tool (`/pm-thyrox`).
Sin invocación, el modelo NO lo sigue — solo lo lee si se le pide.

CLAUDE.md dice:
> "Todo trabajo pasa por el SKILL — incluso un bug fix usa fases 1,2,6,7"

Pero NO dice:
> "Usa el Skill tool para invocar pm-thyrox antes de trabajar"

El modelo interpreta "consultar el SKILL" como "leer SKILL.md si es necesario",
no como "invocar el Skill tool que activa la metodología".

**Raíz**: CLAUDE.md asume que el modelo sabe que "seguir el SKILL" = invocar el Skill tool.
Eso es implícito y no ocurre automáticamente.

---

## Hallazgo 2: El frontmatter YAML del SKILL es un trigger descriptor, no instrucción

El SKILL.md empieza con:
```yml
description: "Framework de gestión de proyectos... Usar este skill cuando..."
```

Esto es metadata para que el sistema sepa cuándo sugerir el skill al usuario.
NO es una instrucción que el modelo ejecute automáticamente.
El modelo necesita que el usuario escriba `/pm-thyrox` o que CLAUDE.md diga
explícitamente "invoca el Skill tool al inicio de cada tarea".

---

## Hallazgo 3: examples.md está desactualizado — fases con nombres distintos

El archivo `references/examples.md` usa nomenclatura diferente al SKILL actual:
- examples.md: Phase 1=PLAN, Phase 3=DECOMPOSE, Phase 4=EXECUTE, Phase 5=TRACK
- SKILL.md actual: Phase 1=ANALYZE, Phase 2=SOLUTION_STRATEGY, Phase 3=PLAN...

Esto crea confusión: si un modelo lee examples.md como referencia, aprende
un flujo diferente al real. Inconsistencia de documentación.

---

## Hallazgo 4: CLAUDE.md no tiene instrucción de auto-invocación

El "Flujo de sesión" en CLAUDE.md dice:
1. Inicio — Leer focus.md + now.md
2. Contexto — Identificar fase actual del SKILL
3. Trabajar — Seguir la fase
4. Cierre — Actualizar focus.md + now.md

No hay instrucción tipo:
> "Al recibir cualquier tarea, PRIMERO invocar: Skill tool → pm-thyrox"

El modelo lee CLAUDE.md, ve "identificar fase actual", y si no hay fase activa,
responde directamente en lugar de iniciar Phase 1.

---

## Hallazgo 5: El SKILL funciona bien SOLO cuando el usuario lo invoca

Cuando el usuario escribe `/pm-thyrox` o pide explícitamente "usa la metodología",
el Skill tool se activa y el modelo sigue las 7 fases.

Sin esa invocación explícita, el modelo usa su comportamiento default:
responder directamente a la pregunta.

---

## Resumen de causas raíz

| # | Causa | Dónde está el gap |
|---|-------|-------------------|
| 1 | CLAUDE.md no instruye invocar el Skill tool | CLAUDE.md flujo de sesión |
| 2 | El modelo no auto-invoca tools sin instrucción explícita | Comportamiento del modelo |
| 3 | "Consultar el SKILL" ≠ "Invocar el Skill tool" | Ambigüedad semántica |
| 4 | examples.md tiene nomenclatura de fases desactualizada | references/examples.md |
| 5 | Sin /pm-thyrox explícito, el skill es invisible para el flujo | Mecanismo de activación |

---

## Causa raíz principal

**El SKILL está diseñado para ser invocado por el usuario (`/pm-thyrox`),
pero CLAUDE.md lo presenta como si el modelo lo siguiera automáticamente.**

Son dos modelos de activación incompatibles:
- **Actual**: Skill tool invocado por usuario (push model)  
- **Esperado en CLAUDE.md**: Modelo lo activa solo (pull model)

Ninguno de los dos está implementado correctamente porque CLAUDE.md
no tiene la instrucción de auto-invocación.
