
# cp-coordinator — Coordinator Consulting Process

> **Adaptación kaupamex v2 (2026-08-22).** El directorio `.thyrox/` no existe
> aquí y los `now-*.md` del template no se usan: medido, **0 archivos** en el
> árbol. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`, cuyos artefactos son
> `.rst` — `source/` **no acepta `.md`** (`docs/CLAUDE.md`).
>
> Por eso las salidas de las siete fases **se MAPEAN sobre el set mínimo de la
> iniciativa** (DEC-AM-01: `index` siempre; `alcance` con "Premisa verificada" +
> `:flow:` al dejar DISCOVER; `progreso` en `en-ejecucion`;
> `analisis`/`decisiones`/`tareas` condicionales a su contenido). **No se crean
> archivos `cp-<fase>.md` ni `cp-<fase>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping CP -> artefactos de la
> iniciativa".
>
> La fase activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona el flujo completo de un **engagement de consultoría estructurada** en 7 fases.
El **Recommendation Deck** (Pyramid Principle) es el artefacto de comunicación central.

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: cp`.
2. Leer `progreso-<slug>.rst` — la última entrada de bitácora dice en qué fase
   quedó el engagement. Si el archivo no existe todavía, crearlo con la
   plantilla del proyecto (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de fase CP → iniciar en `cp:initiation`; con entrada →
   retomar desde la fase que nombre.

## Mapping CP -> artefactos de la iniciativa

| Salida de la fase | Dónde se materializa |
|---|---|
| `cp:initiation` — Engagement Charter: pregunta, frontera y criterio de éxito | `alcance-<slug>.rst` (QUÉ / POR QUÉ / criterio / fuera-de-scope) |
| `cp:diagnosis` — Issue Tree y datos recopilados | sección de diagnóstico de `analisis-<slug>.rst`, con el Issue Tree como lista anidada |
| `cp:structure` — Key Findings validados | sección "Hallazgos" de `analisis-<slug>.rst`, cada uno calibrado PROVEN/INFERRED |
| `cp:recommend` — Storyline y Storyboard | `decisiones-<slug>.rst` (DEC-NN: la recomendación con sus alternativas descartadas) |
| `cp:plan` — Recommendation Deck e Implementation Roadmap | `tareas-<slug>.rst` (T-NNN del roadmap); el argumento SCQA queda en `decisiones-<slug>.rst` |
| `cp:implement` — quick wins e iniciativas en marcha | marcado de las T-NNN + una entrada de bitácora por hito |
| `cp:evaluate` — impacto medido y transferencia de conocimiento | sección de impacto en `analisis-<slug>.rst` + cierre en `progreso-<slug>.rst` |

Una fase cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

**El "Deck" no es un archivo de presentación**: es el argumento, y su hogar es el
`decisiones-<slug>.rst`. Un `.pptx` en `source/` no existe — `source/` sólo
acepta `.rst`.

## Comportamiento por fase

En las siete es el mismo contrato: activar el skill, materializar la salida en el
artefacto que le toca según la tabla de arriba, y **anotar la fase en la
bitácora** de `progreso-<slug>.rst` con la marca de `date -u`.

| Fase | Skill | Tollgate |
|------|-------|----------|
| `cp:initiation` | cp-initiation | Engagement Charter aprobado |
| `cp:diagnosis` | cp-diagnosis | Issue Tree + datos recopilados |
| `cp:structure` | cp-structure | Key Findings validados |
| `cp:recommend` | cp-recommend | Storyline + Storyboard aprobados |
| `cp:plan` | cp-plan | Recommendation Deck + Implementation Roadmap |
| `cp:implement` | cp-implement | Iniciativas en ejecución; quick wins demostrados |
| `cp:evaluate` | cp-evaluate | Impacto medido; conocimiento transferido |

## Verificación de tollgate

Antes de presentar la opción de avanzar, verificar que **la sección del
artefacto** que la tabla de mapping asigna a la fase existe y contiene los
elementos mínimos del tollgate. Si el tollgate no está completo, señalar qué
falta antes de avanzar.

## Principios clave del consulting approach

- **MECE:** cada Issue Tree debe ser Mutually Exclusive, Collectively Exhaustive
- **Hypothesis-driven:** siempre partir de una hipótesis, no explorar sin dirección
- **Pyramid Principle:** las recomendaciones siguen estructura SCQA (Situation-Complication-Question-Answer)
- **So What test:** cada hallazgo debe pasar el test: ¿qué implica esto para el cliente?

## Checkpoint de sponsor

En `cp:recommend` (al definir el storyboard), el coordinator debe verificar que
se ha realizado un checkpoint con el sponsor ejecutivo antes de continuar a
`cp:plan`, y anotarlo en la bitácora con su fecha.

## Actualización de estado en iniciativa

El estado del engagement **no se guarda en un campo propio**: se lee de la
bitácora. Cada transición añade una entrada a `progreso-<slug>.rst` con esta
forma, y el timestamp se obtiene ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en
ese momento — nunca escrito de memoria:

```rst
- **2026-08-22T07:11:05** — ``cp:structure`` — <una línea: qué hallazgo quedó validado>
```

El `:flow: cp` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando `cp:evaluate` completa y el engagement cierra, emitir señal estructurada:

```
[cp-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (Engagement Charter: pregunta, frontera y criterio)
  - <slug>/analisis-<slug>.rst    (Issue Tree, Key Findings y medición de impacto)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: recomendación SCQA con alternativas)
  - <slug>/tareas-<slug>.rst      (T-NNN del Implementation Roadmap)
  - <slug>/progreso-<slug>.rst    (bitácora — una entrada por fase)
Summary: Impacto [vs KPIs acordados] | Knowledge Transfer [completado/pendiente]
```

Se enumeran **sólo los artefactos que de verdad se tocaron**: declarar uno que no
se escribió es una afirmación de estado sin `Observation`
(`react-verification-gate.md`). El cierre se anota en la bitácora de
`progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
