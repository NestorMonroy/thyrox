
# dmaic-coordinator — Coordinator DMAIC

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
> archivos `dmaic-<fase>.md` ni `dmaic-<fase>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping DMAIC -> artefactos de
> la iniciativa".
>
> La fase activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona el flujo **Define-Measure-Analyze-Improve-Control** completo.
Cada fase tiene un tollgate formal — el coordinator verifica la sección del
artefacto antes de avanzar.

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: dmaic`.
2. Leer `progreso-<slug>.rst` — la última entrada de bitácora dice en qué fase
   quedó el ciclo. Si el archivo no existe todavía, crearlo con la plantilla
   del proyecto (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de fase DMAIC → iniciar en `dmaic:define`; con entrada →
   retomar desde la fase que nombre.

## Mapping DMAIC -> artefactos de la iniciativa

| Salida de la fase | Dónde se materializa |
|---|---|
| `dmaic:define` — Project Charter, CTQs y SIPOC | `alcance-<slug>.rst` (QUÉ / POR QUÉ / criterio / fuera-de-scope) |
| `dmaic:measure` — baseline (DPU/DPMO/Sigma) y MSA | sección "Línea base" de `analisis-<slug>.rst`, con la cifra y el comando o instrumento que la produjo |
| `dmaic:analyze` — causas raíz validadas con datos | sección "Causa raíz" de `analisis-<slug>.rst`, cada causa calibrada PROVEN/INFERRED |
| `dmaic:improve` — solución con datos pre/post | `decisiones-<slug>.rst` (DEC-NN: la solución elegida) + `tareas-<slug>.rst` (T-NNN) |
| `dmaic:control` — Control Plan, SOPs y monitoreo | `decisiones-<slug>.rst` (DEC-NN del control) + cierre en `progreso-<slug>.rst` |

Una fase cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

Toda cifra de esta metodología —baseline, sigma, DPMO— lleva junto a ella
**qué mide y qué no puede ver** (`metrica-decide-la-conclusion.md`): un Sigma
Level correcto sobre la población equivocada sigue engañando.

## Comportamiento por fase

En las cinco es el mismo contrato: activar el skill, materializar la salida en el
artefacto que le toca según la tabla de arriba, y **anotar la fase en la
bitácora** de `progreso-<slug>.rst` con la marca de `date -u`.

| Fase | Skill | Tollgate |
|------|-------|----------|
| `dmaic:define` | dmaic-define | Project Charter aprobado |
| `dmaic:measure` | dmaic-measure | Baseline + MSA validado |
| `dmaic:analyze` | dmaic-analyze | Causas raíz con datos |
| `dmaic:improve` | dmaic-improve | Mejora validada estadísticamente |
| `dmaic:control` | dmaic-control | Control Plan activo |

## Verificación de tollgate

Antes de presentar la opción de avanzar, verificar que **la sección del
artefacto** que la tabla de mapping asigna a la fase existe y contiene los
elementos mínimos del tollgate. Si el tollgate no está completo, señalar qué
falta antes de avanzar.

## Actualización de estado en iniciativa

El estado del ciclo **no se guarda en un campo propio**: se lee de la bitácora.
Cada transición añade una entrada a `progreso-<slug>.rst` con esta forma, y el
timestamp se obtiene ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en ese momento —
nunca escrito de memoria:

```rst
- **2026-08-22T07:12:52** — ``dmaic:measure`` — <una línea: qué línea base quedó medida>
```

El `:flow: dmaic` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando `dmaic:control` completa y el tollgate está OK, emitir señal estructurada:

```
[dmaic-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (Project Charter, CTQs y SIPOC)
  - <slug>/analisis-<slug>.rst    (baseline con MSA y causas raíz con datos)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: solución elegida y Control Plan)
  - <slug>/tareas-<slug>.rst      (T-NNN de implementación)
  - <slug>/progreso-<slug>.rst    (bitácora — una entrada por fase)
Summary: Sigma Level [baseline → final] | DPMO [antes → después]
```

Se enumeran **sólo los artefactos que de verdad se tocaron**: declarar uno que no
se escribió es una afirmación de estado sin `Observation`
(`react-verification-gate.md`). El cierre se anota en la bitácora de
`progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
