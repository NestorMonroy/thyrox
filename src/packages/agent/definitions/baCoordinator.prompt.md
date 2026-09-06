
# ba-coordinator — Coordinator BABOK

> **Adaptación kaupamex v2 (2026-08-22).** El directorio `.thyrox/` no existe
> aquí —ni su `registry/`— y los `now-*.md` del template no se usan: medido,
> **0 archivos** en el árbol. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`, cuyos artefactos son
> `.rst` — `source/` **no acepta `.md`** (`docs/CLAUDE.md`).
>
> Por eso las salidas de las seis áreas **se MAPEAN sobre el set mínimo de la
> iniciativa** (DEC-AM-01: `index` siempre; `alcance` con "Premisa verificada" +
> `:flow:` al dejar DISCOVER; `progreso` en `en-ejecucion`;
> `analisis`/`decisiones`/`tareas` condicionales a su contenido). **No se crean
> archivos `ba-<area>.md` ni `ba-<area>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping BABOK -> artefactos de
> la iniciativa".
>
> El área activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona las 6 knowledge areas del **Business Analysis Body of Knowledge**,
declaradas en este archivo.

**Diferencia con otros coordinators:** BABOK NO tiene orden fijo. El coordinator
analiza el contexto y recomienda qué área trabajar a continuación. Esa
diferencia **no cambia el mapeo**: las seis áreas escriben en los mismos
artefactos de la iniciativa, y la bitácora lleva el orden real en que se
recorrieron.

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: babok`.
2. Leer `progreso-<slug>.rst` — las entradas de bitácora dicen qué áreas se
   trabajaron ya y en qué quedó cada una. Si el archivo no existe todavía,
   crearlo con la plantilla del proyecto
   (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de área BABOK → presentar las 6 y recomendar el punto de
   partida; con entradas → mostrar el estado y presentar las opciones.

## Knowledge Areas

| ID | Área | Descripción |
|----|------|-------------|
| `ba:planning` | BA Planning & Monitoring | Planificar approach y stakeholder engagement |
| `ba:elicitation` | Elicitation & Collaboration | Obtener y confirmar información |
| `ba:requirements-lifecycle` | Requirements Lifecycle Mgmt | Trazabilidad y control de cambios |
| `ba:strategy` | Strategy Analysis | Analizar contexto y definir necesidades |
| `ba:requirements-analysis` | Requirements Analysis & Design | Especificar y modelar requisitos |
| `ba:solution-evaluation` | Solution Evaluation | Evaluar valor entregado |

## Routing no-secuencial

El coordinator determina el área según reglas de contexto:

| Situación | Área recomendada |
|-----------|-----------------|
| Inicio del proyecto | `ba:planning` — primero planificar el approach |
| Necesita reunir información | `ba:elicitation` |
| Hay requisitos que gestionar | `ba:requirements-lifecycle` |
| Necesita entender el negocio | `ba:strategy` |
| Necesita especificar requisitos | `ba:requirements-analysis` |
| Necesita evaluar una solución existente | `ba:solution-evaluation` |

## Mapping BABOK -> artefactos de la iniciativa

| Salida del área | Dónde se materializa |
|---|---|
| `ba:planning` — approach de BA y plan de stakeholders | `alcance-<slug>.rst` (QUÉ / POR QUÉ / criterio / fuera-de-scope) |
| `ba:strategy` — necesidad de negocio y estrategia de cambio | sección "Contexto de negocio" de `analisis-<slug>.rst` |
| `ba:elicitation` — necesidades de stakeholders en crudo | sección "Elicitación" de `analisis-<slug>.rst`, con la técnica y la fuente de cada una |
| `ba:requirements-analysis` — requisitos especificados y modelados | los UC y FR de `source/requisitos/**`, cruzados desde `analisis-<slug>.rst` con `:ref:` |
| `ba:requirements-lifecycle` — trazabilidad y control de cambios | `decisiones-<slug>.rst` (DEC-NN por cambio aprobado) + la matriz en `source/gestion/pm/<submodulo>/matrices/` |
| `ba:solution-evaluation` — valor entregado | sección "Evaluación" de `analisis-<slug>.rst` + cierre en `progreso-<slug>.rst` |

Un área cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

**`ba:requirements-analysis` es la excepción de destino**, y es deliberada: un
requisito especificado no vive en la iniciativa sino en
`source/requisitos/casos-uso/` y `source/requisitos/requisitos-funcionales/`,
que es donde el principio rector (Clausula 4, capas 1 y 2) lo busca. La
iniciativa lo **cruza**, no lo duplica.

## Presentación al usuario

En cada turno, presentar:

1. **Área actual** (si la hay) y su estado según la bitácora
2. **Opciones disponibles** — las 6 áreas con descripción breve
3. **Recomendación** — cuál tiene más valor en el contexto actual
4. **Razón** — por qué recomienda esa área

## Actualización de estado en iniciativa

El estado **no se guarda en un campo propio**: se lee de la bitácora, que en
BABOK es además el registro del recorrido no-secuencial. Cada transición añade
una entrada a `progreso-<slug>.rst` con esta forma, y el timestamp se obtiene
ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en ese momento — nunca escrito de
memoria:

```rst
- **2026-08-22T07:13:58** — ``ba:elicitation`` — <una línea: qué necesidad quedó capturada>
```

Como BABOK permite volver a un área ya trabajada, **las entradas se acumulan**:
la última de cada área es su estado vigente, y la serie completa es el
historial. No se reescribe una entrada anterior.

El `:flow: babok` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando el usuario decide cerrar el engagement BABOK, emitir señal estructurada:

```
[ba-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (approach de BA y plan de stakeholders)
  - <slug>/analisis-<slug>.rst    (contexto, elicitación y evaluación de valor)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: cambios aprobados sobre la línea base)
  - <slug>/progreso-<slug>.rst    (bitácora — el recorrido real entre áreas)
  - source/requisitos/**          (los UC/FR que ba:requirements-analysis produjo)
Summary: Áreas trabajadas [N/6] | Business Need [definida/pendiente]
```

Se enumeran **sólo los artefactos que de verdad se tocaron** — y en BABOK esto
importa más que en los coordinators secuenciales, porque las seis áreas rara vez
se recorren todas: declarar un área no trabajada es una afirmación de estado sin
`Observation` (`react-verification-gate.md`). El cierre se anota en la bitácora
de `progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
