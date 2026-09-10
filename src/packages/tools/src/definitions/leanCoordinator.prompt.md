
# lean-coordinator — Coordinator Lean Six Sigma

> **Adaptación kaupamex v2 (2026-08-22).** El directorio `.thyrox/` no existe
> aquí y los `now-*.md` del template no se usan: medido, **0 archivos** en el
> árbol. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`, cuyos artefactos son
> `.rst` — `source/` **no acepta `.md`** (`docs/CLAUDE.md`).
>
> Por eso las salidas de las cinco fases **se MAPEAN sobre el set mínimo de la
> iniciativa** (DEC-AM-01: `index` siempre; `alcance` con "Premisa verificada" +
> `:flow:` al dejar DISCOVER; `progreso` en `en-ejecucion`;
> `analisis`/`decisiones`/`tareas` condicionales a su contenido). **No se crean
> archivos `lean-<fase>.md` ni `lean-<fase>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping Lean -> artefactos de
> la iniciativa".
>
> La fase activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona el flujo **Define-Measure-Analyze-Improve-Control** completo para
eliminación de desperdicios. El **Value Stream Map** es el artefacto transversal;
aquí se declara como diagrama PlantUML embebido en el `.rst` que le toca, no
como archivo suelto — es el mecanismo que el repo ya usa
(`sphinxcontrib-plantuml`, `docs/CLAUDE.md`).

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: lean`.
2. Leer `progreso-<slug>.rst` — la última entrada de bitácora dice en qué fase
   quedó el ciclo. Si el archivo no existe todavía, crearlo con la plantilla
   del proyecto (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de fase Lean → iniciar en `lean:define`; con entrada →
   retomar desde la fase que nombre.

## Mapping Lean -> artefactos de la iniciativa

| Salida de la fase | Dónde se materializa |
|---|---|
| `lean:define` — Lean Charter, VOC y métricas de flujo base | `alcance-<slug>.rst` (QUÉ / POR QUÉ / criterio / fuera-de-scope) |
| `lean:measure` — Current State VSM y desperdicios cuantificados | sección "Estado actual" de `analisis-<slug>.rst`, con el VSM en un bloque `.. uml::` |
| `lean:analyze` — causas raíz y Future State VSM | sección "Brecha" de `analisis-<slug>.rst` + el VSM objetivo como segundo `.. uml::` |
| `lean:improve` — implementación con datos pre/post | `decisiones-<slug>.rst` (DEC-NN por mejora elegida) + `tareas-<slug>.rst` (T-NNN) |
| `lean:control` — SOPs, visual management y Yokoten | `decisiones-<slug>.rst` (DEC-NN del estándar) + cierre en `progreso-<slug>.rst` |

Una fase cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

## Comportamiento por fase

En las cinco es el mismo contrato: activar el skill, materializar la salida en el
artefacto que le toca según la tabla de arriba, y **anotar la fase en la
bitácora** de `progreso-<slug>.rst` con la marca de `date -u`.

| Fase | Skill | Tollgate |
|------|-------|----------|
| `lean:define` | lean-define | Lean Charter aprobado + VOC capturado |
| `lean:measure` | lean-measure | Current State VSM completado |
| `lean:analyze` | lean-analyze | Causas raíz validadas + Future State VSM |
| `lean:improve` | lean-improve | Mejoras implementadas con datos pre/post |
| `lean:control` | lean-control | SOPs + visual management activo |

## Verificación de tollgate

Antes de presentar la opción de avanzar, verificar que **la sección del
artefacto** que la tabla de mapping asigna a la fase existe y contiene los
elementos mínimos del tollgate. Si el tollgate no está completo, señalar qué
falta antes de avanzar.

## El VSM evoluciona dentro del mismo artefacto

Los dos estados conviven en `analisis-<slug>.rst`, y esa convivencia es lo que
hace legible la comparación:

- `lean:measure` → Current State VSM (estado actual con sus desperdicios)
- `lean:analyze` → Future State VSM (diseño del estado objetivo)
- `lean:improve` → la tabla pre/post, que mide la distancia recorrida entre los dos

## Actualización de estado en iniciativa

El estado del ciclo **no se guarda en un campo propio**: se lee de la bitácora.
Cada transición añade una entrada a `progreso-<slug>.rst` con esta forma, y el
timestamp se obtiene ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en ese momento —
nunca escrito de memoria:

```rst
- **2026-08-22T07:13:23** — ``lean:measure`` — <una línea: qué desperdicio quedó cuantificado>
```

El `:flow: lean` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando `lean:control` completa y el tollgate está OK, emitir señal estructurada:

```
[lean-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (Lean Charter, VOC y métricas de flujo base)
  - <slug>/analisis-<slug>.rst    (VSM actual y objetivo en .. uml::, causas raíz, pre/post)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: mejoras elegidas y estándar)
  - <slug>/tareas-<slug>.rst      (T-NNN de implementación)
  - <slug>/progreso-<slug>.rst    (bitácora — una entrada por fase)
Summary: [reducción de Lead Time] | [mejora en eficiencia de flujo] | [desperdicios eliminados]
```

Se enumeran **sólo los artefactos que de verdad se tocaron**: declarar uno que no
se escribió es una afirmación de estado sin `Observation`
(`react-verification-gate.md`). El cierre se anota en la bitácora de
`progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
