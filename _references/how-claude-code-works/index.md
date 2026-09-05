# `how-claude-code-works` — análisis de terceros, integrado por slices

Creado: 2026-08-07T22:32:50
Origen: directiva del ejecutor 2026-08-07 — *"lo vas a poner en el scratchpad y
lo vas a analizar … debido a que es algo que queremos registrar y guardar en
memoria, porque scratchpad es algo efímero, lo vamos a integrar usando la
metodología Learning by doing, de poco a poco en `.claude/references/`"*.

Análisis completo del corpus:
`docs: gestion/pm/docs/iniciativas/integrar-referencia-how-claude-code-works/`.

## Qué es — y qué NO es

**Repositorio:** `github.com/Windy3f3f3f3f/how-claude-code-works` · **MIT** ·
© 2025 Windy3f3f3f3f. **21 capítulos, 2 101 481 B ≈ 525 370 tokens**, en dos
idiomas (raíz en chino, `en/` en inglés).

Su propio descargo, verbatim (`README_EN.md`):

> *"This project is an **educational architecture analysis** … All content is
> independent research and reasoning — it does **not** represent Anthropic's
> official design and makes **no guarantee** of alignment with Claude Code's
> real internal implementation."*

Es **ingeniería inversa de un tercero**, no documentación oficial. Eso no lo
descalifica —cubre mecanismo interno que la doc oficial no describe— pero fija
su rango.

## Orden de autoridad — NO negociable

Mismo criterio con que `referencia-odoo-gobierna-las-decisiones.md` ordena sus
fuentes: cuando dos fuentes discrepan, **gobierna la de mayor rango**.

| # | Fuente | Rango |
|---|---|---|
| **0** | **Lo observado en este turno** (`Observation` real) | **gobierna sobre todo lo demás** — ver abajo |
| 1 | **La descripción del tool en la sesión activa** | contrato declarado — gobierna sobre 2 y 3 |
| 2 | `ccdoc:` — `.claude/references/claude-code/` (doc oficial capturada) | oficial, con fecha de captura |
| 3 | `hccw:` — **este repositorio** | RE de terceros; se cita cuando 1 y 2 no cubren |
| 4 | memoria del modelo | **no es fuente** (`react-verification-gate` §1-bis) |

**El rango 0 se añadió el 2026-08-14, medido, no por prudencia.** La tabla
decía que la descripción del tool *"gobierna siempre"*. Una sonda de ida y
vuelta con un subagente encontró **dos puntos donde la descripción de
`SendMessage` es contradicha por la observación**: declara que el mensaje
llega envuelto en `<cross-session-message from="...">` y llegó como
`<agent-message from="general-purpose">`; y prescribe responder copiando
`from` → `to`, que **falla** (`No agent named 'general-purpose' is
reachable`). Direccionar por `agentId` sí funciona.

Una descripción es el contrato que el proveedor **declara**; una `Observation`
es lo que el sistema **hace**. Cuando discrepan gobierna lo segundo, y la
discrepancia se registra — es la misma jerarquía que
`react-verification-gate.md` ya impone para todo lo demás; lo que faltaba era
aplicarla a la tabla que ordena las fuentes. Medición completa en
[H-DOCS-152](../../../source/gestion/pm/docs/iniciativas/integrar-referencia-how-claude-code-works/hallazgos/hallazgo-H-DOCS-152-la-mensajeria-entre-pares-existe-y-nunca-se-uso.rst).

**Precedente que lo estableció:** el documento de procedimiento del ejecutor
citaba `19-dynamic-workflows.md` (este repo) para cuatro afirmaciones sobre
`Workflow`. Las cuatro están **verbatim en la descripción del tool** de la
sesión — rango 1. La cautela de "corroborar antes de depender" se retiró para
ésas, y el ordenamiento quedó fijado. Ver
`analisis-verificacion-procedimiento-por-rondas.rst`.

## El corte metodológico — medido, y decide cómo se integra

**Sólo los capítulos 17–21 declaran su método** con un apéndice *"how we know
this (the reverse-engineering method, reproducible)"* y citas verbatim. Los
16 primeros, no.

| Bloque | Apéndice de método | Citas verbatim | Cómo se integra |
|---|---|---|---|
| **17–21** | **5 de 5** | 4–18 por capítulo | **citable** con su tier de evidencia |
| **01–16** | **0 de 16** | 0–1 | **sólo como hipótesis**; no funda decisiones |

*Métrica:* `grep -ci "how we know this"` y `grep -ci "verbatim\|elision"` sobre
`en/docs/*.md`. *Ciega a:* un método declarado con otra redacción — se buscaron
cuatro variantes más (`reverse.engineer`, `reproducible`, `source snapshot`,
`verification method`) y sólo aparecen en 03 (1 hit) y 16 (4), de pasada.

El autor separa sus propios tiers dentro de 17–21 —*"nailed down by source …
inference-tier from the event names, not source … an unreachable blind spot"*—
que es la misma disciplina que nuestro PROVEN / INFERRED / SPECULATIVE. Al
citar, **se conserva el tier que el autor declara**; no se promueve una
inferencia suya a hecho nuestro.

## Versiones pinneadas — el eje de frescura

El corpus mide **dos versiones distintas** del producto, y lo dice:

- **v2.1.88** — el *snapshot* de fuente TypeScript que lee.
- **2.1.202** — el binario del que extrae *strings*.

Ninguna es necesariamente la del runtime de esta sesión. Toda cita anota **de
qué capítulo y qué versión** viene, igual que una cita de la referencia Odoo
anota el commit de `odoo-tools`.

## Coste: cero tokens de piso

`.claude/references/` es **on-demand** — no se carga en cada sesión, a
diferencia de `.claude/rules/` (I-009). Lo que se integre aquí **no toca** el
piso de 126 283 tokens que `h-docs-104` midió. Se lee con `Read`/`grep` cuando
hace falta.

## Cómo se cita — alias `hccw:`

```
hccw: 17-autonomy-goal-loop.md:§17.2   →  .claude/references/how-claude-code-works/17-autonomy-goal-loop.md
```

Se integra la versión **inglesa** (`en/docs/`). Excepción medida: el capítulo
14 (*system prompt design*) es el mayor del corpus con **223 402 B** y **no
está traducido** — su equivalente en inglés tiene **576 B** y dice
*"full English translation is still pending"*. Si algún día se integra, se
integra el chino.

## Qué hay integrado (se actualiza con cada slice)

| Slice | Capítulo | Por qué entró | Fecha |
|---|---|---|---|
| 1 | `17-autonomy-goal-loop.md` | consumidor abierto: tarea **#198** (`/goal`, el cuarto mecanismo de cierre del bucle, sin uso) — y trae los **prompts verbatim** de `/goal` y `/loop` | 2026-08-07 |
| 2 | `16-observability.md` | consumidor abierto: tarea **#285** (la cifra de coste de la UI, sin composición documentada). §16.5 da el mecanismo: suma corriente **por modelo**, persistida y restaurada en `resume` | 2026-08-13 |
| 3 | `15-task-system.md` | consumidor abierto: la corrección de `snapshot-tasks.sh` ([H-DOCS-137](../../../source/gestion/pm/docs/iniciativas/evaluar-agent-sdk-orquestacion/hallazgos/hallazgo-H-DOCS-137-el-registro-de-tareas-dependia-de-dos-posicionales.rst)). §11.2 dio las tres hipótesis que el binario confirmó — `.highwatermark`, la prioridad de `taskListId` con variable de entorno, y un archivo por tarea + `.lock` de directorio | 2026-08-13 |
| 4 | `21-background-fleet.md` | rango 1 del triaje, confirmado. Consumidor abierto: `bash-background-tasks.md` — sus secciones de reconciliación tras resume y de cards fantasma, más ERR-12. §21.4 trae el diseño que nos falta (roster, adopción de huérfanos, `_vanished` vs `_stalled`); §21.1, el tercer eje sobre `/loop` y Workflow. **Su inferencia sobre `_respawn_unconfirmed_bail` resultó falsa** — ver abajo | 2026-08-13 |
| 5 | `20-agent-teams.md` | consumidor abierto: la divergencia de rama que destapó el merge de `develop` ([H-API-572](../../../source/gestion/pm/api/iniciativas/completar-familia-base/hallazgos/hallazgo-H-API-572-el-merge-trajo-archivos-a-una-ruta-que-esta-rama-habia-renombrado.rst)). §20.7 trae **verbatim** la forma de concurrencia optimista (*re-read, reconcile, publish again*) y §20.6 el par que nos falta: el conflicto no sólo se **resuelve**, se **notifica** | 2026-08-14 |

### Cómo se cita el slice 4 — y el error que casi lo descarta

**Se cita con su versión, siempre.** El capítulo declara medir `2.1.202`;
nosotros corremos `2.1.42`, y sus mecanismos dan **0 hits** en nuestro binario
(`tengu_bg_`, `/bg`, `claude agents`, `bgSupervisor`). Eso fija exactamente una
prohibición: **no se puede afirmar que nuestro CLI hace lo que el capítulo
describe**. No prohíbe nada más.

El capítulo entra por lo que **expresa**, no por lo que nuestro binario
implementa — la misma relación que tenemos con Odoo, que gobierna sin
ejecutarse. Y entra con su ceguera declarada por el propio autor: *"los nombres
se leen verbatim de las cadenas, sólido; pero bajo qué condiciones dispara cada
evento… no tiene una sola línea de fuente que lo respalde"*. Rango 3 bien
etiquetado.

**El error que lo precedió está registrado en** [H-DOCS-138](../../../source/gestion/pm/docs/iniciativas/integrar-referencia-how-claude-code-works/hallazgos/hallazgo-H-DOCS-138-medi-cadenas-para-decidir-sobre-contenido-abstracto.rst): se
greppearon esos mecanismos contra `cli.js` y con el cero se respondió que el
capítulo no servía. La cifra era correcta y la conclusión falsa —una idea
abstracta no tiene cadena que greppear— y el argumento usado (*"nuestro binario
no lo tiene"*) es palabra por palabra *"no corremos Odoo"*. Quedó como
sub-patrón **C** de `metrica-decide-la-conclusion.md`.

Corolario para los 17 capítulos que faltan: **medir literales sirve para saber
qué NO afirmar de nuestro árbol; no sirve para decidir si un capítulo aporta.**
Eso se decide leyéndolo.

**El slice 3 corrige el triaje, y el triaje ya lo había avisado.** `15` estaba
en el grupo *"ya cubierto por la doc oficial"* (40–62 archivos nuestros tocan
el tema). Medido para la pregunta concreta del task store —`claude/tasks`,
`TaskCreate`, `teamName`, `TaskList`— la cuenta por capítulo es **15 → 25
hits**, `20-agent-teams` → 8, el resto ≤ 2. Es un factor de 3 sobre el
siguiente.

No es un fallo de la regla: el propio triaje declara su ceguera —*"Ciega a: la
**profundidad** … Sirve para ordenar candidatos, **no** para declarar un
capítulo redundante"*— y por eso ningún capítulo se descartó con esa cifra
sola. La lectura correcta es que **el orden del triaje se re-mide contra la
pregunta que se tiene delante**, no se hereda.

### Cómo se cita el slice 5 — se adapta la FORMA, no el mecanismo

El capítulo describe equipos de **agentes** (sesiones de Claude que se hablan
con `SendMessage`, comparten task list y memoria). Eso no participa de un merge
de git entre dos personas, así que para **H-API-572** sólo transfiere la forma,
no el mecanismo.

> **Corregido 2026-08-14 (H-DOCS-152).** Este párrafo decía además *"Nosotros
> no corremos eso: `SendMessage`, `TeamCreate` y el `<cross-session-message>`"*.
> **Falso, y sin medir.** `SendMessage` está viva en la sesión, con la frase del
> capítulo verbatim en su descripción; `ListAgents` también; y la task list
> compartida es la que ya usamos. Lo único ausente es `TeamCreate`. La sonda que
> lo midió encontró además que la descripción de `SendMessage` **se contradice
> con la observación** en dos puntos — de ahí el rango 0 de la tabla de arriba.
> Adopción: tarea **#327**.

Lo que sí transfiere es la **forma de resolver una escritura concurrente**, y
el capítulo la da verbatim (§20.7, strings de 2.1.202):

> *"conflict: another session published a newer version of this artifact.
> Re-read the current content (WebFetch the URL), reconcile your edits, then
> publish again."*

Concurrencia optimista: al chocar **no se bifurca ni se sobreescribe** — se
relee, se reconcilia y se vuelve a publicar. Es el argumento a favor del merge
frente al cherry-pick, escrito por un sistema que resolvió el mismo problema.
Y §20.6 añade la mitad que nos faltaba: sus eventos son `_mem_conflict_recovered`
**y** `_conflict_notice_delivered` — el conflicto se resuelve *y se notifica*.
Un conflicto resuelto en silencio no enseña nada al que lo provocó.

**Este slice es también su propia lección sobre durabilidad.** El capítulo no
estaba disponible cuando se necesitó, y no por triaje: el scratchpad donde
vivía el corpus **se recicló**. Es la misma forma que `build-logs.md` registra
para los `.log` y que `referencia-odoo-gobierna-las-decisiones.md` registra
para el árbol Odoo —*"se perdió porque vivía en un scratchpad temporal; por eso
se movió a un repositorio"*—. De ahí la disciplina de esta carpeta: lo que se
va a citar, se versiona primero.

**Nada más está integrado.** Los otros 16 capítulos siguen sólo en el
scratchpad, que es efímero: si se necesita uno, se integra como slice nuevo
con su justificación de consumidor, no "por si acaso". El triaje medido de los
21 está en el análisis de la iniciativa.

### Lo que el slice 2 enseñó sobre el orden de autoridad

La comparación contra `ccdoc:` que la iniciativa exige por slice **no es un
trámite**. En el slice 2, el capítulo de rango 3 apuntaba a un símbolo que no
podemos leer (`cost-tracker.ts:291`), y fue `ccdoc: cost-tracking.md` —rango
2— el que traía la corrección: *"all messages in that turn share the same ID,
so deduplicate by ID to avoid double-counting"*. Nuestro instrumento no lo
hacía y contaba cada turno ~2 veces (H-DOCS-136).

Es decir: el capítulo de RE **sirvió para saber dónde mirar**, no como fuente
del arreglo. Ése es exactamente el papel que la tabla de autoridad le asigna.
