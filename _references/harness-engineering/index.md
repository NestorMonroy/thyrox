# `heng` — Harness Engineering, desde el código de Claude Code

Creado: 2026-08-20T21:54:36
Actualizado: 2026-08-21T01:53:40
Procedencia y derechos: [PROVENANCE.md](PROVENANCE.md) — **MIT**, atribución
obligatoria. Versión medida por el libro: **v2.1.88 → v2.1.100**.

## Qué es y por qué está aquí

**37 capítulos** —30 numerados más siete variantes `b`/`c`— y **siete
apéndices**, que reconstruyen los subsistemas de Claude Code —registro de
herramientas, bucle del agente, prompts, compactación, caché, permisos, hooks,
skills, memoria— **a nivel de código**, y destilan de ahí patrones de ingeniería
reusables. No es documentación de producto: es ingeniería inversa con
trazabilidad a archivo y línea.

> **Corregido 2026-08-21.** Esta línea decía «48 capítulos». Eran los 48
> archivos `.md` de `book/` —39 `ch*.md` + 7 apéndices + `SUMMARY.md` +
> `preface.md`— bajo el rótulo «capítulos»: dos magnitudes con un solo nombre,
> que es el sub-patrón **A** de `metrica-decide-la-conclusion.md`. La cifra que
> gobierna es la que `SUMMARY.md` enlaza. Dos de los 39 archivos
> (`part7/ch24.md`, 9 líneas; `part6/ch23b.md`, 1 línea) son restos de una
> numeración anterior y no están enlazados; su contenido vive en
> `part7/ch25.md` y `part6/ch24.md`.
>
> ```bash
> grep -oE 'ch[0-9]+[a-z]?\.md' book/SUMMARY.md | sort -u | wc -l   # capítulos
> grep -oE 'appendix/[a-z0-9-]+\.md' book/SUMMARY.md | sort -u | wc -l
> ```

### `docs/book-outline.md` NO es el temario vigente

El esquema del libro que el árbol trae en `docs/book-outline.md` (en chino)
declara **29 capítulos y cuatro apéndices**: es una edición anterior. Le faltan
**ocho capítulos y tres apéndices** frente a `book/SUMMARY.md`, y —como muestra
la tabla de abajo— los ausentes son justo los que más deuda nuestra tocan.
Leerlo como índice deja fuera `20b`, `22b`, `6b`, `18b`, `17b`, `4b`, `20c`,
`30` y los apéndices E, F y G.

**El temario vigente es `book/SUMMARY.md`.** El esquema sirve como resumen de
los 29 que sí lista, no como mapa del corpus.

Entra al corpus porque cubre, con mecanismo, tres cosas que este proyecto tiene
abiertas y describe **por conducta observada**, no por causa: por qué un hook
añadido a media sesión no dispara, qué debería guardar una capa de memoria entre
sesiones, y qué distingue un scaffold de un harness.

**Coste de piso: cero.** `.claude/references/` es *on-demand* — no se carga en
cada sesión, a diferencia de `.claude/rules/` (I-009).

## Cómo se cita — alias `heng:`

```
heng: part7/ch25.md:47              →  .claude/references/harness-engineering/book/part7/ch25.md
heng: part5/ch18.md (v2.1.88)       →  cita con versión: obligatoria si afirma algo del binario
heng: scripts/extract-signals.sh
```

## Los seis principios del capítulo 25 — y qué dicen de nosotros

`heng: part7/ch25.md` destila seis principios con traza a código. Tres nos
confirman, dos nos corrigen y uno nos contradice de frente. Se listan con su
lectura para este proyecto porque un corpus que sólo se resume no se usa.

| # | Principio | Qué implica aquí |
|---|---|---|
| 1 | **Prompts as Control Plane** | *"Use code to handle structural constraints (permissions, token budgets), use prompts to handle behavioral constraints (style, strategy, preferences)"*. Su anti-patrón es **nuestro riesgo**: *"writing detectors and interceptors for every undesirable model behavior, ultimately producing a massive rules engine that can never keep up"*. Ver la salvedad de abajo. |
| 2 | Cache-Aware Design | El gasto lo domina el prefijo que se relee — es lo mismo que `model-selection-subagents.md` midió por su lado (`cache_read` 97.8 %). Aquí viene con el mecanismo: `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, y la lista de agentes movida del prompt al `system-reminder` porque costaba el 10.2 % del `cache_creation` global. |
| 3 | **Fail Closed, Open Explicitly** | `isConcurrencySafe` por defecto `false`, y **el `catch` también devuelve `false`**. Es exactamente el criterio del sub-patrón D de `metrica-decide-la-conclusion.md`, y el reverso de nuestro `${VAR:-0}` que lee «no pude medir» como PASS. |
| 4 | A/B Test Everything | Gating por `USER_TYPE === 'ant'` con el comentario `un-gate once validated on external via A/B`. Nuestro equivalente es el **baseline congelado**: la deuda no bloquea, lo nuevo sí. |
| 5 | **Observe Before You Fix** | *"Before attempting to fix a problem, first establish observability infrastructure to understand the full picture"*. Anti-patrón: *"Fix by intuition"*. Es la respuesta al orden en que construimos: 38 gates declarados sobre una telemetría con cobertura parcial. |
| 6 | Latch for Stability | *"state thrashing is more harmful than a suboptimal state"*, con su cifra: 1 279 sesiones con 50+ fallos consecutivos de auto-compactación, ~250 K llamadas al día desperdiciadas, cerrado con un cortacircuitos de 3. |

### La salvedad del principio 1 — no colapsar dos cosas distintas

El anti-patrón *«massive rules engine»* habla de **detectores de conducta del
modelo**: interceptar cada cosa indeseable que el modelo hace. La mayoría de
nuestros gates **no** son eso: miden **propiedades de un artefacto** —una cifra
transcrita, un hallazgo sin sucesor, un identificador en español, un `.py` con
guion medio—. Eso es constraint estructural, que es justo lo que el principio
manda poner en código.

Pero **no todos**. Los que verifican conducta —«¿documentaste el hallazgo?»,
«¿esperaste el trabajo?»— sí caen del lado que el libro señala. La distinción es
el criterio de la auditoría **#39**, y este corpus le da la vara.

## Mapa de lectura por deuda abierta

Los capítulos que responden a algo que ya está registrado aquí. Se leen **un
slice por vez** (tarea **#649**), como `hccw` (#241) y `hbooks` (#636).

| Capítulo | Qué aporta | Nuestra deuda |
|---|---|---|
| `part5/ch18.md` §18.6 | **el mecanismo del snapshot de hooks**: `captureHooksConfigSnapshot()` corre **una vez al arranque**; sólo `/hooks` llama a `updateHooksConfigSnapshot()`, que además hace `resetSettingsCache()` porque el watcher puede no haber disparado | las cuatro copias del caveat *«el watcher sólo recarga `settings.json` si existía al arranque»*, que describen la conducta y no la causa |
| `part5/ch18.md` §18.6 | `getHooksFromAllowedSources()` filtra por política: `disableAllHooks`, `allowManagedHooksOnly`, `strictPluginOnlyCustomization` — puede devolver **configuración vacía sin error** | H-DOCS-198 (los hooks de `docs` no disparan en sesión multi-repo) y **#602** (25 hooks citados que no existen) |
| `part5/ch18.md` §18.7 | la clave de deduplicación está **namespaced por origen**; `callback`/`function` no deduplican | por qué un mismo comando en `user`/`project`/`local` se funde en uno |
| `part5/ch18.md` §18.9 | jerarquía y fusión de fuentes de hook | el caso multi-repo, otra vez |
| `part6/ch24.md` | arquitectura de memoria entre sesiones en cinco capas: índice `MEMORY.md`, extracción automática, resumen rodante, persistencia JSONL, memoria de subagente con tres alcances | nuestro `agent_store.sqlite3` — qué guarda una capa de memoria madura frente a lo que la nuestra guarda |
| `part6/ch24.md` §24.6 | Auto-Dream: consolidación con **gating de cuatro capas** y cerrojo por PID | **#635** (mecanismo de retiro de memoria vieja) |
| `part7/ch29.md` | ingeniería de observabilidad, de `logEvent` a telemetría de producción | el eje del principio 5 aplicado a nuestro store |
| `part6/ch20.md`, `ch20b.md` | *spawning* de agentes, teams y colaboración multi-proceso | `bash-background-tasks.md` y los tres caps medidos en H-DOCS-211 |
| `part3/ch09.md`–`ch12.md` | compactación automática, preservación de estado de archivo tras compactar, micro-compactación | **#643** (cablear el hook `PreCompact`) |
| `part6/ch22.md`, `ch22b.md` | sistema de skills y de plugins | **#223** (triage de las 103 reglas en tres vías: sin `paths` / con `paths` / skill) |

### Los cinco que el esquema no listaba

Salieron al comparar `docs/book-outline.md` contra `book/SUMMARY.md`
(2026-08-21). Ninguno estaba en el mapa de arriba porque el esquema —la única
vista de conjunto que se había leído— no los declara.

| Capítulo | Qué aporta | Nuestra deuda |
|---|---|---|
| `part6/ch20b.md` | **teams y colaboración multi-proceso**: el ciclo completo de un equipo de agentes, con sus herramientas de tarea y su protocolo | **#327 / H-DOCS-152** — medimos **por conducta** que un subagente no tiene superficie de coordinación (`ToolSearch` no encuentra `TaskList`/`TaskGet`/`TaskCreate`/`TaskUpdate` dentro de él) y que el `owner` del tablero no lo consume el agente que nombra. Aquí está el mecanismo que explica esa asimetría |
| `part6/ch22b.md` | **sistema de plugins**: empaquetado, `marketplace`, y qué puede declarar un plugin | **#272** (cablear un servidor LSP vía `.lsp.json` — hoy con la precondición **sin medir**) y la tercera vía de **#223** |
| `part2/ch06b.md` | **capa de comunicación con la API**: reintento, streaming y degradación | `long-running-commands.md` describe el *SSE liveness timeout* por **conducta observada** —el stream cae a los ~5 min sin mensajes— y de ahí derivó R-1…R-5. Este capítulo trae la causa, y con ella se puede juzgar si nuestros patrones siguen aplicando |
| `part5/ch18b.md` | **sandbox**: aislamiento multi-plataforma, de Seatbelt a Bubblewrap | **#178** (cableamos el *deny* de pytest en subagentes) y **#233** (read-only por fase vía `agentType`) — los dos resuelven por política lo que aquí se resuelve por aislamiento |
| `part5/ch17b.md` | **defensa ante inyección de prompt**: de la sanitización Unicode a la defensa en profundidad | la sección *permission laundering* de `bash-background-tasks.md`, y **#480** (campo marcado SECRETO en docstring vs. restricción real) |

Y un apéndice, que responde de frente la pregunta del eje de versión:

| Apéndice | Qué aporta | Nuestra deuda |
|---|---|---|
| `appendix/e-version-evolution.md` | **bitácora de evolución entre versiones** | el sub-patrón **C** aplicado a este corpus: qué de lo que el libro afirma sigue vivo. Complementa a `docs/version-diffs/`, que sólo cubre .88↔.91/.92/.100 |
| `docs/reverse-engineering-guide.md` | la metodología con que el autor mide el binario | nuestro `strings` + `grep`, que hacemos a mano |
| `scripts/extract-signals.sh` | **el instrumento**: extracción de señales del paquete | idem — vale contrastar su cobertura con la nuestra |
| `docs/version-diffs/` | deltas medidos entre v2.1.88, .91, .92 y .100 | qué cambia entre versiones cercanas, que es la pregunta que el sub-patrón C obliga a hacerse antes de citar |

## Lo que este corpus NO autoriza

Afirmar que **nuestro** binario hace lo que el libro describe de v2.1.88. La
versión etiqueta la cita; toda afirmación sobre el ejecutable en curso se
re-mide. Ver la sección del eje de versión en [PROVENANCE.md](PROVENANCE.md).

La distancia **no es una cifra que se transcriba aquí**: el binario se actualiza
y la prosa no se entera (corolario de `calibration-verified-numbers.md`). Se
consulta con el comando:

```bash
claude --version        # la versión que gobierna esta sesión
```

Esta línea decía «2.1.236» y quedó atrás en un día — al escribir esta corrección
el binario declaraba **2.1.238**, y el libro sigue midiendo v2.1.88. Es la razón
exacta por la que la cifra vive en el comando y no en el texto.
