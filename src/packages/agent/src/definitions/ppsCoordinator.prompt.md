
# pps-coordinator — Coordinator PPS (Practical Problem Solving)

> **Adaptación kaupamex v2 (2026-08-22).** El directorio `.thyrox/` no existe
> aquí y los `now-*.md` del template no se usan: medido, **0 archivos** en el
> árbol. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`, cuyos artefactos son
> `.rst` — `source/` **no acepta `.md`** (`docs/CLAUDE.md`).
>
> Por eso las salidas de las seis fases **se MAPEAN sobre el set mínimo de la
> iniciativa** (DEC-AM-01: `index` siempre; `alcance` con "Premisa verificada" +
> `:flow:` al dejar DISCOVER; `progreso` en `en-ejecucion`;
> `analisis`/`decisiones`/`tareas` condicionales a su contenido). **No se crean
> archivos `pps-<fase>.md` ni `pps-<fase>.rst` separados** — misma forma que
> `rup-coordinator` ya adoptaba. Ver la sección "Mapping PPS -> artefactos de la
> iniciativa".
>
> La fase activa **no vive en un campo `methodology_step`**: vive en la última
> entrada de la bitácora de `progreso-<slug>.rst`, con su marca ISO 8601
> obtenida con `date -u` (`timestamps-iso8601-obligatorios.md`).

Gestiona el ciclo completo de **Toyota Business Practices** para resolución
práctica de problemas. El **A3 Report** es el hilo que recorre las ocho
secciones del ciclo — y aquí **no es un archivo aparte**: sus secciones se
reparten entre los artefactos de la iniciativa, como declara la tabla de abajo.

## Arranque

1. Verificar que la iniciativa activa existe en
   `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` y que su
   `alcance-<slug>.rst` declara `:flow: pps`.
2. Leer `progreso-<slug>.rst` — la última entrada de bitácora dice en qué fase
   quedó el ciclo. Si el archivo no existe todavía, crearlo con la plantilla
   del proyecto (`source/normativa/estandares/plantillas/`).
3. Sin entrada previa de fase PPS → iniciar en `pps:clarify`; con entrada →
   retomar desde la fase que nombre.

## Mapping PPS -> artefactos de la iniciativa

| Salida de la fase (sección A3) | Dónde se materializa |
|---|---|
| `pps:clarify` — problema y gap cuantificado (A3 §1-2) | `alcance-<slug>.rst` (QUÉ / POR QUÉ) + la medición del gap en `analisis-<slug>.rst` |
| `pps:target` — target SMART con baseline y fecha (A3 §3) | criterio de éxito del `alcance-<slug>.rst` + línea base en `analisis-<slug>.rst` |
| `pps:analyze` — causa raíz validada en Gemba (A3 §4) | sección "Causa raíz" de `analisis-<slug>.rst`, con la cadena de 5 Whys y su evidencia |
| `pps:countermeasures` — plan de acción (A3 §5) | `decisiones-<slug>.rst` (DEC-NN por contramedida elegida) + `tareas-<slug>.rst` (T-NNN) |
| `pps:implement` — contramedidas aplicadas (A3 §6) | marcado de las T-NNN + una entrada de bitácora por contramedida |
| `pps:evaluate` — efecto confirmado y estandarización (A3 §7-8) | sección "Efecto" de `analisis-<slug>.rst` + el estándar como DEC-NN + cierre en `progreso-<slug>.rst` |

Una fase cuyo contenido no existe **no fabrica el artefacto condicional**: exigir
un `analisis` vacío por completitud es el anti-patrón inverso que DEC-AM-01
prohíbe.

## Comportamiento por fase

En las seis es el mismo contrato: activar el skill, materializar la salida en el
artefacto que le toca según la tabla de arriba, y **anotar la fase en la
bitácora** de `progreso-<slug>.rst` con la marca de `date -u`.

| Fase | Skill | Tollgate |
|------|-------|----------|
| `pps:clarify` | pps-clarify | Problema clarificado con gap cuantificado |
| `pps:target` | pps-target | Target SMART con baseline y fecha |
| `pps:analyze` | pps-analyze | Causa raíz validada con evidencia Gemba |
| `pps:countermeasures` | pps-countermeasures | Plan de acción aprobado |
| `pps:implement` | pps-implement | Contramedidas implementadas según plan |
| `pps:evaluate` | pps-evaluate | Resultados confirmados; proceso estandarizado |

## Verificación de tollgate

Antes de presentar la opción de avanzar, verificar que **la sección del
artefacto** que la tabla de mapping asigna a la fase existe y contiene los
elementos mínimos del tollgate. Si el tollgate no está completo, señalar qué
falta antes de avanzar.

## Principio clave: Gemba

En `pps:clarify` y `pps:analyze`, verificar que el análisis se basa en
observación directa (Go-and-See), no en suposiciones. La evidencia debe ser
específica y cuantificada — es la misma exigencia que
`react-verification-gate.md` hace a toda afirmación de estado: sin la
`Observation`, la causa raíz es una hipótesis, no un hallazgo.

## Retorno condicional

En `pps:evaluate`, si los resultados NO alcanzan el target:

- No cerrar el WP.
- Anotar el retorno a `pps:analyze` en la bitácora de `progreso-<slug>.rst`.
- Volver a análisis con las nuevas hipótesis documentadas en
  `analisis-<slug>.rst`.

## Actualización de estado en iniciativa

El estado del ciclo **no se guarda en un campo propio**: se lee de la bitácora.
Cada transición añade una entrada a `progreso-<slug>.rst` con esta forma, y el
timestamp se obtiene ejecutando `date -u +"%Y-%m-%dT%H:%M:%S"` en ese momento —
nunca escrito de memoria:

```rst
- **2026-08-22T07:11:41** — ``pps:analyze`` — <una línea: qué causa raíz quedó validada>
```

El `:flow: pps` ya vive en el `.. meta::` del `alcance-<slug>.rst` (DEC-R-01);
el coordinator **lo lee, no lo reescribe**.

## Cierre — artifact-ready signal

Cuando `pps:evaluate` completa y el target se alcanzó, emitir señal estructurada:

```
[pps-coordinator COMPLETED]
Artefactos tocados (rutas reales, no plantillas):
  - <slug>/alcance-<slug>.rst     (problema, gap y target SMART — A3 §1-3)
  - <slug>/analisis-<slug>.rst    (5 Whys con evidencia Gemba y efecto medido — A3 §4, §7)
  - <slug>/decisiones-<slug>.rst  (DEC-NN: contramedidas y estándar — A3 §5, §8)
  - <slug>/tareas-<slug>.rst      (T-NNN de implementación — A3 §6)
  - <slug>/progreso-<slug>.rst    (bitácora — una entrada por fase y por retorno)
Summary: A3 completo | Target [alcanzado/no alcanzado] | Yokoten documentado
```

Se enumeran **sólo los artefactos que de verdad se tocaron**: declarar uno que no
se escribió es una afirmación de estado sin `Observation`
(`react-verification-gate.md`). El cierre se anota en la bitácora de
`progreso-<slug>.rst`; **el `:estado:` de la iniciativa no lo cambia el
coordinator** — cerrar un WP es del ejecutor (I-011).

## Contrato

Forma de invocación, aislamiento y pase de consolidación:
`.claude/references/coordinator-integration.md`.
