```yml
type: Referencia — Integración de Coordinators
category: Cross-phase
version: 2.0.0
purpose: Contrato de invocación, ciclo de vida y destino de las salidas de los coordinators THYROX
updated_at: 2026-08-22 07:15:34
owner: thyrox (cross-phase)
```

# Coordinator Integration — Contrato y Ciclo de Vida

---

## Contrato de invocación

> **Corregido 2026-08-22T05:31:59 (:ref:`h-docs-309`).** Los tres canales que
> esta sección declaraba estaban **medidos como muertos**, y con ellos los doce
> coordinadores: ninguno consta despachado nunca. Cada fila de abajo lleva su
> medición.

| Canal | Estado medido | Forma correcta |
|---|---|---|
| Mención explícita | el binario **sí** la implementa, con **otro prefijo** | **`@agent-<nombre>`** — p. ej. `@agent-dmaic-coordinator` |
| Herramienta `Agent` | vía canónica, siempre disponible | `Agent(subagent_type="dmaic-coordinator", …)` |
| Comando `/thyrox:dmaic` | **0 comandos** con nombre de metodología (hay 27, todos de stage o utilidad) | no existe; se invoca por las dos de arriba |
| `routing-rules.yml` | **0 archivos** en el árbol y **0** cadenas en el ejecutable | **no existe el mecanismo**; el despacho es explícito |

La forma de la mención sale del propio ejecutable, no de memoria:

```js
let te = ne.find((re) => re.attachment.type === "agent_mention");
if (te) { let re = `@agent-${te.attachment.agentType}`, …
          N("tengu_subagent_at_mention", { is_subagent_only: de, is_prefix: oe }) }
```

*Métrica:* cadenas del ejecutable 2.1.235 (`@agent-` 2, `tengu_subagent_at_mention` 1,
`routing-rules` 0) y archivos del árbol.
*Ciega a:* un canal que el cliente resuelva sin literal propio. El cero de
`routing-rules` acota lo que se puede afirmar del binario, no lo que exista fuera.

Al activarse, el coordinator:

1. Lee el `:flow:` declarado en el `alcance-<slug>.rst` de la iniciativa activa
   — es la metodología que gobierna (DEC-R-01), y es greppeable.
2. Lee la última entrada de la bitácora de `progreso-<slug>.rst` para saber en
   qué paso quedó; si no hay ninguna, arranca en el primer paso de su namespace.
3. Escribe **en el clon principal** — no declara `isolation` (ver la sección
   homónima; era el punto 3 de esta lista y decía lo contrario que la sección
   que ya lo medía).
4. Emite las salidas de su primer paso y espera confirmación para avanzar.

**El estado NO vive en `now.md`.** Ese archivo pertenece a `.thyrox/context/`,
que **no se importó** en kaupamex por decisión (`.claude/CLAUDE.md`): medido,
0 archivos `now.md` en el árbol. Su papel lo cumplen los artefactos `.rst` de
la iniciativa.

---

## Dónde vive cada campo de estado en kaupamex

La tabla de la izquierda es el vocabulario de THYROX genérico; la de la derecha,
su hogar real aquí. **Ningún coordinator escribe un archivo de estado propio**:
el estado ya vive en los artefactos de la iniciativa, versionados y citables.

| Campo THYROX | Hogar en kaupamex | Quién lo escribe |
|---|---|---|
| `flow` | `:flow:` del bloque `.. meta::` de `alcance-<slug>.rst` (DEC-R-01) | quien abre la iniciativa, una vez |
| `methodology_step` | última entrada con sello temporal de la bitácora de `progreso-<slug>.rst` | el coordinator, al transitar |
| `coordinators` | esa misma bitácora, nombrando al coordinator y su paso | el coordinator, al arrancar y al cerrar |
| salidas producidas | **según su TIPO** — ver la sección siguiente | el coordinator |

Entrada de bitácora, que es todo el registro que hace falta:

```rst
2026-08-22T05:31:59 — dmaic-coordinator · dmaic:analyze
   Emitida la sección "Causa raíz" de ``analisis-<slug>.rst``.
   Siguiente paso: ``dmaic:improve``. Espera confirmación del ejecutor (gate).
```

El sello temporal sale de `date -u +"%Y-%m-%dT%H:%M:%S"`, nunca de memoria
(`timestamps-iso8601-obligatorios.md`).

---

## Dónde aterriza cada salida — el TIPO decide el hogar

> **Añadido 2026-08-22 (v2.0.0), por directiva del ejecutor:** *"El
> work-package equivalente es una dirección correcta, no necesariamente todos
> van a `iniciativas/<slug>/`; tendrías que analizar el tipo de documento y el
> mapeo correcto en el que iría dentro de `source/**`"*.
>
> La corrección anterior (:ref:`h-docs-311`) arregló el **formato** —de `.md` a
> artefacto `.rst`— y dejó intacto un supuesto más profundo: que **todo** lo que
> produce un coordinator es artefacto de iniciativa. No lo es. Un SOP, un caso
> de uso, una vista de arquitectura y una lección **sobreviven a la iniciativa**
> y tienen hogar propio y canónico en `source/**`.

### El discriminador

**¿El documento sobrevive a la iniciativa que lo produjo?**

- **No** — es el rastro de razonamiento de *este pase*: encuadre, medición,
  decisión, tareas, bitácora → **artefacto de iniciativa**.
- **Sí** — es canon del producto, y alguien lo buscará dentro de un año sin
  saber qué iniciativa lo produjo → **su raíz de dominio**, y la iniciativa lo
  **cruza** con `:ref:`, no lo duplica.

El segundo caso no es una excepción rara: la Clausula 4 del principio rector
declara **ocho capas** arquitectónicas, y seis de ellas están fuera de
`gestion/pm/`. Un coordinator que escriba todo en su iniciativa deja esas seis
vacías, que es exactamente la deuda documental que esa Clausula existe para
impedir.

### El mapa vive en el canon, no aquí

**`source/normativa/estandares/metodologia/clasificacion-documental-por-tipo.rst`**
lleva la tabla completa tipo → hogar, con sus raíces verificadas y los tres
casos que el mapa **no** resuelve. Ese documento **sobrevive a la iniciativa que
lo produjo**, así que por su propia regla 1 se escribe una vez y este contrato
lo **cruza**: repetirlo aquí fabricaría la segunda fuente de verdad que esa
regla prohíbe.

Su iniciativa:
`source/gestion/pm/docs/iniciativas/automatizar-gestion-y-control-de-documentos/`.

Lo que un coordinator necesita retener sin abrir el canon son sólo dos filas —
las que gobiernan el 90 % de sus salidas:

- el rastro del pase (encuadre, medición, decisión, tareas, bitácora, hallazgo)
  → los artefactos de la iniciativa;
- el canon del producto (SOP, BPMN, requisito, ADR, lección, matriz) → su raíz
  de dominio en `source/**`, cruzada con `:ref:`.

Para cualquier otra, el canon.

### Tres reglas que se derivan del mapa

1. **Un documento de dominio se escribe UNA vez, en su raíz.** La iniciativa lo
   cruza con `:ref:`. Copiarlo a `<slug>/` fabrica una segunda fuente de verdad
   que nadie sincroniza.
2. **Un artefacto condicional no se fabrica vacío.** Si el paso no produjo
   análisis, no hay `analisis-<slug>.rst` — DEC-AM-01 lo dice, y exigirlo "por
   completitud" es el anti-patrón inverso de la Clausula 5.
3. **El cierre enumera rutas reales, de las dos clases.** La señal
   `artifact-ready` lista lo que se tocó en la iniciativa **y** lo que se tocó
   en `source/**`; declarar uno que no se escribió es una afirmación de estado
   sin `Observation` (`react-verification-gate.md`).

---

## Ciclo de vida de un coordinator

```
activate
  → lee el :flow: del alcance y la última entrada del progreso
  → anota su arranque en la bitácora del progreso
  → escribe en el clon principal: NO declara isolation (ver la sección abajo)

steps (loop)
  → ejecuta el paso actual
  → materializa la salida en el hogar que su TIPO le asigna
  → anota el paso siguiente en la bitácora
  → espera confirmación humana (gate) si aplica

artifact-ready signal
  → el coordinator emite su señal al completar todos sus steps
  → el orquestador puede activar otro coordinator o seguir con los stages
  → anota el cierre en la bitácora, nombrando las rutas reales que tocó

cierre
  → sus salidas ya están en source/**: son candidatas normales a commit
  → el :estado: de la iniciativa NO lo cambia el coordinator — es del ejecutor (I-011)
```

---

## `isolation: worktree` — cuándo se declara, y qué debe el orquestador si se declara

**Ningún coordinator lo declara.** Medido: 0 de 27 agentes del árbol. Esta
sección decía lo contrario —*«cada coordinator corre en un worktree»*— y era
cierta hasta que H-DOCS-311 midió lo que eso costaba.

### El criterio: mutación en paralelo con conflicto real

La autoridad es el propio tool `Agent`, verbatim:

> `opts.isolation: 'worktree'` runs the agent in a fresh git worktree —
> **EXPENSIVE** (~200-500ms setup + disk per agent), **use ONLY when agents
> mutate files in parallel and would otherwise conflict**

Dos condiciones, y hacen falta **las dos**:

| Condición | Un coordinator | Una tanda de porters |
|---|---|---|
| ¿mutan **en paralelo**? | no — se despacha de a uno por iniciativa | sí — N agentes a la vez |
| ¿**chocarían** sin aislamiento? | no — escribe un `.rst` en su iniciativa | sí — el mismo árbol de `src/` |

Un coordinator falla las dos. Declararlo ahí es pagar el coste sin comprar
nada, y comprar además el defecto de la sección siguiente.

### Si un agente SÍ lo declara: su salida NO llega sola

Con `isolation: worktree`, lo que el agente escribe aterriza en
`.claude/worktrees/agent-<id>/` — **no** en el clon donde vive la iniciativa.
Medido en H-DOCS-311: 0 archivos nuevos en la ruta de destino, y el propio
worktree los dejó `??` porque su rama no sigue esa ruta.

Por tanto el orquestador **debe** un pase de consolidación, y es parte del
trabajo, no una cortesía:

1. leer el worktree y **comparar** lo escrito contra el original —el resumen
   del agente no basta (`niveles-de-retencion.md`, 3 → 2);
2. escribir en `source/**`, **en el hogar que el tipo del documento le asigna**
   (ver la sección del mapa), que es donde el proyecto declara que vive la
   salida de un agente (`registro-reportes-agentes.md`);
3. validar (`check_rst_sintaxis.py` + `check_rst_convenciones.py`) y commitear;
4. retirar el worktree **y su rama** (`git worktree remove` deja la rama viva).

**Lo que NO se hace: ignorar el directorio.** Un worktree poblado al final del
turno es *trabajo sin recoger*, no ruido. Añadirlo a `.gitignore` fue el primer
remedio de H-DOCS-311 y el ejecutor lo rechazó: esconde la anomalía sin
recuperar nada. Ver también #752 — el stop-gate ya **sí** ve lo untracked, pero
el pase de consolidación sigue siendo del orquestador.

### Cómo se verifica

```bash
python3 .claude/scripts/gates/check_agent_isolation.py --strict
bash .claude/scripts/tests/test-coordinator-sin-worktree.sh
```

---

## Comportamientos no-lineales

### BABOK — No-secuencial
Las 6 knowledge areas de BABOK v3 no tienen orden fijo. El coordinator selecciona
la más relevante según el contexto, o presenta las 6 para que el usuario elija.

```
Knowledge areas (cualquier orden):
  ba:planning              → Business Analysis Planning
  ba:elicitation           → Elicitation & Collaboration
  ba:requirements-lifecycle → Requirements Lifecycle Management
  ba:strategy              → Strategy Analysis
  ba:requirements-analysis → Requirements Analysis & Design Definition
  ba:solution-evaluation   → Solution Evaluation
```

### RM — State machine con retornos condicionales
```
elicitation → analysis → specification → validation → management
                ↑                              |
                └─── si gaps en análisis ──────┘ (validation→analysis si falla)
                                               |
                                    change requests → re-elicitation
```

### PPS — State machine con retornos condicionales
```
clarify → analyze → target → countermeasures → implement → evaluate
                                                               |
                            ←── si target no alcanzado ────────┘ (evaluate→analyze)
```

### RUP — Iterativo con milestones formales
```
inception   → [milestone LCO: Life Cycle Objectives]
elaboration → [milestone LCA: Life Cycle Architecture]
construction → [milestone IOC: Initial Operational Capability]
transition  → [milestone PD: Product Release]

Cada fase puede tener múltiples iteraciones antes de alcanzar su milestone.
```

### SP — Ciclo estratégico
```
context → analysis → gaps → formulate → plan → execute → monitor → adjust
                        ↑                                             |
                        └──────────────── sp:adjust → sp:analysis ────┘
```

---

## Ejemplo paso a paso con dmaic-coordinator

```
1. Usuario: "Necesito reducir defectos en el proceso de facturación"

2. El ejecutor lo despacha — NO hay routing automático (0 en el binario):
   @agent-dmaic-coordinator
   …o bien: Agent(subagent_type="dmaic-coordinator", …)

3. El coordinator lee el :flow: del alcance y anota su arranque en la
   bitácora de progreso-<slug>.rst:

   2026-08-22T05:31:59 — dmaic-coordinator · dmaic:define
      Arranque. Sin entrada previa: primer paso del namespace.

4. dmaic:define   → escribe el charter en alcance-<slug>.rst
                    Gate: confirmar el alcance antes de medir

5. dmaic:measure  → línea base y MSA en la sección "Línea base" de
                    analisis-<slug>.rst

6. dmaic:analyze  → causas raíz en la sección "Causa raíz" del mismo analisis

7. dmaic:improve  → la solución elegida como DEC-NN en decisiones-<slug>.rst
                    y sus T-NNN en tareas-<slug>.rst

8. dmaic:control  → el Control Plan como DEC-NN, y el SOP resultante en
                    source/normativa/procedimientos/ — sobrevive a la
                    iniciativa, así que NO vive en <slug>/
                    → Emite artifact-ready signal

9. Cierre: la bitácora nombra las rutas reales de las dos clases.
   El :estado: de la iniciativa lo cambia el ejecutor, no el coordinator.
```

El paso 8 es el que ilustra el mapa: cuatro pasos escriben en la iniciativa y
uno escribe además en una raíz de dominio, porque un procedimiento operativo
sigue siendo válido cuando el ciclo DMAIC ya cerró.

---

## Tabla de destinos por coordinator

> **Reemplaza a la "Tabla de artefactos por coordinator" (v1.0.0)**, que listaba
> `<flow>-<paso>.md` para los once. Era el origen de la propagación que
> :ref:`h-docs-311` registró: cada coordinator la copiaba, y `source/` no acepta
> `.md`.

Ninguno emite archivos propios. Cada uno declara su mapeo paso→hogar en su
propio `.claude/agents/<flow>-coordinator.md`, sección "Mapping … -> artefactos
de la iniciativa". Los destinos de dominio que cada metodología suele tocar,
además de los artefactos de iniciativa:

| Coordinator | Raíces de dominio que además toca |
|---|---|
| `dmaic-coordinator` | `normativa/procedimientos/` (Control Plan, SOP) · `quality/` |
| `lean-coordinator` | `normativa/procedimientos/` (SOP, visual management) · `lecciones-aprendidas/` (Yokoten) |
| `pps-coordinator` | `normativa/procedimientos/` (estándar) · `lecciones-aprendidas/` (Yokoten) |
| `bpa-coordinator` | `arquitectura-tecnica/process-view/` (BPMN As-Is/To-Be) · `normativa/procedimientos/` |
| `ba-coordinator` | `requisitos/**` (UC, FR, historias) · `matrices/` (trazabilidad) |
| `rm-coordinator` | `requisitos/**` (SRS, historias) · `matrices/` (trazabilidad) |
| `rup-coordinator` | `requisitos/casos-uso/` · `arquitectura-tecnica/**` (vistas 4+1) |
| `cp-coordinator` | — (el argumento vive en `decisiones`; el impacto en `analisis`) |
| `sp-coordinator` | — (BSC y roadmap viven en la iniciativa) |
| `pm-coordinator` | `risks-technical-debt/` (registro de riesgos) · `lecciones-aprendidas/` |
| `pdca-coordinator` | — (ciclo corto; su estándar puede subir a `normativa/` si perdura) |

La columna vacía **no** significa "no toca `source/**`": significa que sus
salidas caben en los artefactos de la iniciativa, que también viven en
`source/`. Y no es una lista cerrada — si un paso produce un documento cuyo
tipo aparece en el mapa de arriba, va a su raíz aunque esta fila no lo prevea.
