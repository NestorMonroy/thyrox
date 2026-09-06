
# sp-coordinator — Coordinator Strategic Planning

> **Adaptación kaupamex v2 (2026-08-22).** El directorio `.thyrox/` no existe
> aquí y los `now-*.md` del template no se usan: medido, **0 archivos** en el
> árbol. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`, cuyos artefactos son
> `.rst` — `source/` **no acepta `.md`** (`docs/CLAUDE.md`).
>
> Por eso las salidas de las ocho fases **se MAPEAN sobre el set mínimo de la
> iniciativa** (DEC-AM-01: `index` siempre; `alcance` con "Premisa verificada" +
> `:flow:` al dejar DISCOVER; `progreso` en `en-ejecucion`;
> `analisis`/`decisiones`/`tareas` condicionales a su contenido). **No se crean
> archivos `sp-<fase>.md` ni `sp-<fase>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping SP -> artefactos de la
> iniciativa".
>
> La fase activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona el ciclo completo de **planificación estratégica** de 8 fases.
Soporta múltiples ciclos estratégicos mediante retorno `sp:adjust → sp:analysis`.

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: sp`.
2. Leer `progreso-<slug>.rst` — la última entrada de bitácora dice en qué fase
   quedó el ciclo. Si el archivo no existe todavía, crearlo con la plantilla
   del proyecto (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de fase SP → iniciar en `sp:context`; con entrada →
   retomar desde la fase que nombre.

## Mapping SP -> artefactos de la iniciativa

| Salida de la fase | Dónde se materializa |
|---|---|
| `sp:context` — mandato, stakeholders y frontera del ejercicio | `alcance-<slug>.rst` (QUÉ / POR QUÉ / criterio / fuera-de-scope) |
| `sp:analysis` — PESTEL, SWOT y Five Forces | sección de análisis externo e interno de `analisis-<slug>.rst` |
| `sp:gaps` — brechas estratégicas cuantificadas | sección "Brecha" de `analisis-<slug>.rst` + entrada de bitácora |
| `sp:formulate` — estrategia elegida y Strategy Map | `decisiones-<slug>.rst` (DEC-NN con alternativas evaluadas) |
| `sp:plan` — Balanced Scorecard y Roadmap | `tareas-<slug>.rst` (T-NNN por iniciativa estratégica) + líneas base de KPI en `analisis-<slug>.rst` |
| `sp:execute` — avance de las iniciativas | marcado de las T-NNN + una entrada de bitácora por hito |
| `sp:monitor` — Strategy Review y BSC actualizado | entradas de bitácora en `progreso-<slug>.rst` con la lectura de cada KPI |
| `sp:adjust` — ajustes o apertura de ciclo nuevo | `decisiones-<slug>.rst` (DEC-NN) + cierre del ciclo en `progreso-<slug>.rst` |

Una fase cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

## Comportamiento por fase

En las ocho es el mismo contrato: activar el skill, materializar la salida en el
artefacto que le toca según la tabla de arriba, y **anotar la fase en la
bitácora** de `progreso-<slug>.rst` con la marca de `date -u`.

| Fase | Skill | Tollgate |
|------|-------|----------|
| `sp:context` | sp-context | Mandato y stakeholders definidos |
| `sp:analysis` | sp-analysis | PESTEL + SWOT + Five Forces completados |
| `sp:gaps` | sp-gaps | Brechas estratégicas cuantificadas |
| `sp:formulate` | sp-formulate | Estrategia seleccionada + Strategy Map |
| `sp:plan` | sp-plan | Strategic Plan + BSC + Roadmap aprobados |
| `sp:execute` | sp-execute | Iniciativas en ejecución; hitos alcanzados |
| `sp:monitor` | sp-monitor | Revisión estratégica completada |
| `sp:adjust` | sp-adjust | Ajustes implementados o nuevo ciclo iniciado |

## Verificación de tollgate

Antes de presentar la opción de avanzar, verificar que **la sección del
artefacto** que la tabla de mapping asigna a la fase existe y contiene los
elementos mínimos del tollgate. Si el tollgate no está completo, señalar qué
falta antes de avanzar.

## Ciclo estratégico

En `sp:adjust`, el coordinator debe preguntar explícitamente:

- **Opción A:** cierre del ciclo estratégico (ir a Stage 11 TRACK/EVALUATE)
- **Opción B:** iniciar nuevo ciclo (retornar a `sp:analysis` con contexto actualizado)

Si Opción B, anotar el retorno en la bitácora de `progreso-<slug>.rst`. El
historial de ciclos **no va a un archivo aparte**: son las entradas de bitácora
ya fechadas, que llevan el ciclo en su texto (`sp:analysis (ciclo 2)`).

## Actualización de estado en iniciativa

El estado del ciclo **no se guarda en un campo propio**: se lee de la bitácora.
Cada transición añade una entrada a `progreso-<slug>.rst` con esta forma, y el
timestamp se obtiene ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en ese momento —
nunca escrito de memoria:

```rst
- **2026-08-22T07:10:29** — ``sp:formulate`` — <una línea: qué estrategia quedó elegida>
```

El `:flow: sp` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando el ciclo estratégico cierra (`sp:adjust` → Opción A), emitir señal
estructurada:

```
[sp-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (mandato, stakeholders y frontera)
  - <slug>/analisis-<slug>.rst    (PESTEL/SWOT/Five Forces + sección "Brecha" + líneas base de KPI)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: estrategia elegida y ajustes)
  - <slug>/tareas-<slug>.rst      (T-NNN por iniciativa estratégica)
  - <slug>/progreso-<slug>.rst    (bitácora — una entrada por fase y por ciclo)
Summary: [N] ciclos estratégicos | KPIs [X/Y alcanzados] | Iniciativas [Z completadas]
```

Se enumeran **sólo los artefactos que de verdad se tocaron**: declarar uno que no
se escribió es una afirmación de estado sin `Observation`
(`react-verification-gate.md`). El cierre del ciclo se anota en la bitácora de
`progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
