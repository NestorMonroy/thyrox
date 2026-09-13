# THYROX

El sistema de gestión de proyecto y agentes. Este árbol es el **producto**; el
THYROX anterior está en `_archived/` (DEC-02) y sólo se reintegra una pieza si
hace falta verla.

## La partición

Viene de la DEC-01, y su precedente medido es `claw-code`:

| Dónde | Qué |
|---|---|
| `src/` | el producto: mecanismos |
| `tests/` | su suite, en espejo |
| `.claude/` | el estado: lo que la sesión escribe y lee |
| `_archived/` | el THYROX anterior, congelado |

`src/` se organiza **por dominio**, no por lenguaje. Cada módulo declara en su
cabecera de dónde se portó y qué cambió respecto de su fuente.

## El lenguaje se elige por dominio, no de forma uniforme

No hay una medida única de «buena solución»: depende del contexto. Cada dominio
declara su lenguaje y la razón de su elección.

| Dominio | Lenguaje | Por qué |
|---|---|---|
| `src/paths/` | Python | sus consumidores son los gates, que se invocan con `python3` pelado. Y no puede depender de una librería de terceros: `python-dotenv` no está instalado en ningún intérprete alcanzable, así que una dependencia ahí convertiría a cada consumidor en un rehúse por precondición ausente. |
| `src/workbench/` | TypeScript | porta un mecanismo que ya existía en TS; reescribirlo en otro lenguaje crearía la segunda fuente de verdad que `calibration-verified-numbers.md` prohíbe. |
| `src/coordination/` | TypeScript | su único consumidor es `claims.ts`, que ya es TS. Un módulo en otro lenguaje no podría importarse desde ahí, así que la ubicación seguiría declarada dos veces — que es el defecto que este módulo cierra. |

Los ejes que la elección pondera, y ninguno domina siempre: rendimiento,
claridad, mantenibilidad, seguridad, escalabilidad, tiempo de desarrollo y
coste. Un mecanismo puede ser rápido y difícil de mantener; otro más lento y
mucho más simple de verificar.

## Convenciones

- **Los identificadores van en inglés** — nombres de archivo, clases,
  funciones, atributos y claves de manifiesto. Una clave de manifiesto es un
  atributo.
- **Los comentarios van en español**, sin coloquialismos, con los términos
  técnicos en inglés (`harness`, `scaffold`, `script`).
- **TDD**: la mitad roja se persiste al producirse. Un `N de N` en verde no
  discrimina «el mecanismo funciona» de «el test no pregunta», así que cada
  arreglo trae su **control de anulación**: se retira, y tienen que caer
  exactamente las aserciones que dependen de él.

## Portar cuando el hermano no existe

El grafo de los paquetes que faltan **no tiene hoja**: 19 paquetes ausentes,
41 pares mutuamente dependientes. Esperar a que el hermano exista es esperar
indefinidamente, así que la **inyección del colaborador ausente** no es una
preferencia — es el único método que corta la arista del ciclo, y queda
adoptada por medición.

Lo que la inyección **no** resuelve es a qué archivos aplica. Tres clases, y la
frontera es si el archivo tiene lógica propia que un test pueda ejercitar:

| Clase | Cómo se reconoce | Qué se hace |
|---|---|---|
| **lógica propia** | aritmética, precedencia, filtro, orden — hay algo que puede salir mal | se inyecta el colaborador ausente, se porta la lógica y **se testea** |
| **cableado puro** | el cuerpo del archivo **es** el wiring de dos hermanos; sin ellos no queda nada que ejercitar | porte verbatim con la ausencia **declarada archivo por archivo**, y **sin test** |
| **condición de compilación ausente** | depende de un macro que este entorno no tiene (`bun:bundle` → `Cannot find package 'bundle'`) | el gate se **omite**, no se sustituye |

**Por qué el cableado puro no lleva test, y no es pereza.** Inyectarle sus dos
hermanos daría una función que recibe todo y no hace nada: un control que no
puede fallar, que es exactamente lo que las Convenciones de arriba prohíben. Un
test ahí no mide el porte — mide que la inyección compila.

**Por qué el macro ausente se omite en vez de sustituirse.** Sustituirlo por un
valor fijo decide, en silencio y para siempre, la rama que el macro elegía en
tiempo de compilación. Precedentes medidos: `runtimeActivation.ts` y
`storage/sessionStoragePredicates.ts` quedaron permanentemente apagados por esa
vía antes de que la clase tuviera nombre.

La clase se declara **en el docstring del puerto**, junto a su procedencia: quien
lo lea tiene que poder saber por qué no hay test sin ir a buscar el criterio.

## Correr las suites

```bash
bash tests/run.sh          # las dos mitades, con su conteo por separado
bun test tests/            # sólo TypeScript
python3 tests/paths/test_reach.py
```

## Onboarding — un clon nuevo, como PROVIDER de los kaupamex-\*

Pregunta recurrente: alguien clona `thyrox` y los cinco `kaupamex-*`. ¿Cómo
sabe que todo lo necesario está instalado, cuáles son las herramientas
correctas, y cómo se configuran las constantes de sesión (`THYROX_WORKBENCH_*`,
`THYROX_JOBS_*`, …) si cada persona clona en una ruta distinta?

**La respuesta no es código nuevo — el mecanismo ya existe, completo.** Antes
de escribir nada se sube la escalera de 7 peldaños (¿hace falta? → ¿ya existe
en el repo? → ¿lo resuelve la stdlib? → ¿una feature nativa? → ¿una
dependencia ya instalada? → ¿una línea? → sólo entonces código) y se detiene
en el segundo peldaño: el mecanismo, los tres guiones y el contrato ya están
en el árbol.

### `src/packages/config/**` NO es este mecanismo

Es la corrección que hace falta antes de todo lo demás. `@thyrox/config` es la
capa de *settings* del harness — el esquema de `settings.json`, precedencia de
fuentes, operaciones de plugin, sync remoto (`cat
src/packages/config/package.json`) — **no** el descubrimiento de rutas entre
`thyrox` y sus consumidores. Ese mecanismo es **`src/paths/reach.py`** (con su
gemelo `src/paths/reach.ts`, casi sin consumidores todavía) más
**`src/workbench/paths.py`**, ya citados en «El alcance por variable» arriba.

### Las tres piezas, en el orden en que se usan

| # | Pieza | Qué hace | Cuándo |
|---|---|---|---|
| 1 | `bash src/session/write-env.sh` | **genera** el `.env` de este árbol por ascenso real (`THYROX_ROOT`, `THYROX_REACH_ROOT`, …) | una vez por clon, o tras mover el árbol |
| 2 | `python3 src/paths/declarations.py` | **inspecciona**: qué hogar está declarado (viene de env) y cuál cae al default derivado, por clon | para saber qué falta configurar |
| 3 | `python3 src/verify/check_env_contract_keys.py --strict` | **valida**: toda clave `THYROX_*` que el código lee está en `.env.example` | al tocar cualquier guion que lea una clave nueva |

Nada de esto se templa a mano. `write-env.sh` deriva `THYROX_ROOT` subiendo
directorios hasta encontrar `THYROX_LOCATOR` (`src/paths/reach.py`) — la ruta
absoluta de **esta** máquina nunca se escribe en el repo, se calcula en cada
clon.

### Las constantes del ejemplo, con su nombre correcto

Las seis constantes de la pregunta —`THYROX_WORKBENCH_DOCS`,
`THYROX_JOBS_DOCS`, `THYROX_WORKBENCH_API`, `THYROX_JOBS_API`,
`THYROX_WORKBENCH`, `THYROX_JOBS`— **ya existen en este árbol, con dos
correcciones de nombre**: las dos últimas llevan el sufijo `_DIR`
(`THYROX_WORKBENCH_DIR` / `THYROX_JOBS_DIR`) porque son las del PROVIDER, no
de un consumidor — es la única pareja que `write-env.sh` escribe, y **sólo**
cuando el destino es el propio `.env` de thyrox:

```bash
$ bash src/session/write-env.sh --out /tmp/prueba-api.env   # simula un consumidor
write-env: escrito /tmp/prueba-api.env (5 clave(s) declarada(s))
$ cat /tmp/prueba-api.env
THYROX_ROOT=/home/user/thyrox
THYROX_REACH_ROOT=/home/user
THYROX_LOCATOR=src/paths/reach.py
THYROX_LIB_REACH=src/lib/reach.sh
THYROX_LAYER_SIGNALS=src/task/layer_signals.tsv
```

Nótese que `THYROX_WORKBENCH_DIR`/`THYROX_JOBS_DIR` **no aparecen** — es
correcto: esas dos sólo tienen sentido en el `.env` del proveedor. Las
per-clon (`THYROX_WORKBENCH_API`, `THYROX_WORKBENCH_DOCS`, …) se declaran a
mano, una vez, en el `.env` de **thyrox** — no en el del consumidor — porque
es thyrox quien necesita saber dónde escribe el banco de cada consumidor que
sirve.

### Rutas relativas o absolutas — las dos son válidas, y el efecto difiere

Una clave `THYROX_WORKBENCH_DIR` (o cualquier hogar) declarada:

- **relativa** → compone POR CLON: cada consumidor obtiene
  `<su_raiz>/<segmento>`. Es la forma correcta cuando el mismo patrón vale
  para los cinco.
- **absoluta** → se devuelve TAL CUAL para todo clon que caiga a ella sin
  declaración propia — un único sitio compartido. Deliberado, no un bug: lo
  funda `resolve_home()` (`src/paths/reach.py`) en dos fuentes — la regla que
  el ejecutable de Anthropic declara verbatim para sus rutas de config
  (absoluta tal cual / `~` expandido / relativa a una raíz nombrada) y un
  defecto histórico medido (`THYROX_RULES_DIR=<db>/.claude/rules` imprimía
  la ruta de `db` en las cinco filas de `declarations.py` sin avisar). El
  test que lo ejercita (`test_home_resolution.py::
  test_una_absoluta_SI_colisiona_y_es_correcto`) prueba que el código lo
  hace; el docstring de `resolve_home()` es la evidencia de que es lo
  correcto — citar sólo el test habría sido tratar un `claim` como una
  `Observation` (sub-patrón D de `metrica-decide-la-conclusion.md`).

Así que no hace falta ninguna plantilla `/<change>/<change>/`: cada persona
declara su propia ruta absoluta en su propio `.env` (no versionado, ver
`THYROX_ENV_FILE` más abajo), y `write-env.sh` deriva el resto por ascenso
real sobre SU máquina.

### Checklist de un clon nuevo

```bash
cd thyrox && bash src/session/write-env.sh          # 1. genera .env base
set -a; source .env; set +a
python3 src/paths/declarations.py                    # 2. ¿qué falta declarar?
# declarar a mano en .env, si hace falta, las per-clon: THYROX_WORKBENCH_<CLON>,
# THYROX_JOBS_<CLON> (ver .env.example, sección «Hogares que el consumidor
# declara y thyrox NO inventa» para el resto de la familia)
python3 src/verify/check_env_contract_keys.py --strict   # 3. contrato cerrado
bash tests/run.sh                                     # 4. el árbol funciona
```

## El alcance por variable

Los gates de THYROX miden árboles que no son el suyo. Qué árbol se declara por
variable, con una cadena de precedencia de lo más específico a lo más derivado:

```bash
python3 src/paths/reach.py --list
eval "$(python3 src/paths/reach.py --env)"
```

## Citar una tarea propia y registrar un hallazgo

El `#NNN` que el cliente asigna a una tarjeta del board es efímero — reinicia
por sesión, y dentro de una misma sesión se renumera cuando la lista se
reconstruye (medido: 332 de 337 ids colisionan entre dos sesiones,
`src/task/task_ids.py`). Citarlo en un commit, un banco o un hallazgo fabrica
una referencia rota desde el primer momento. La forma que resuelve siempre a
la misma tarea es `TASK-THYROX-NNNN`, y se acuña — no se compone a mano:

```bash
python3 -m src.task.task_ids ingerir-board <session_id> <ordinal> --capa thyrox
python3 -m src.task.task_ids cita <session_id> <ordinal>   # verificar
python3 -m src.task.task_ids censo                          # conteo por capa
```

Un hallazgo —algo que el trabajo destapó y que alguien podría volver a asumir
sin medir— se registra aparte, indexado y buscable entre sesiones:

```bash
python3 -m src.agents.agent_store agregar-hallazgo \
  --finding-id H-DOCS-NNNN --submodule docs \
  --initiative actualizar-agentic-ai-thyrox \
  --summary "..." --content "..." \
  --source-ref "el archivo que es la fuente de verdad"
python3 -m src.agents.agent_store buscar-hallazgos --query "..."
```

El banco (`.claude/workbench/`) y el job (`.claude/jobs/`) documentan *cómo*
se ejecutó el trabajo; un hallazgo documenta *qué se aprendió*. No todo
trabajo produce uno.
