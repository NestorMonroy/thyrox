# TASK-THYROX-0261 — el consumidor de `user_wiring` se resuelve, no se escribe a mano

Banco del ítem, abierto en su worktree del pool. Fuente de la tarea:
`.claude/workbench/task-census-20260930T064202/impl/TASK-THYROX-0261/prompt.md`;
decisión que gobierna: `.claude/workbench/decisiones-ejecutor-siete-tareas-20260930T044345/README.md`
(«explícito → por reach/contexto si es único → REHÚSA; ningún consumidor
hardcodeado; ninguna variable nueva que pueda divergir de `reach`»).

## Cómo lo hace la referencia (2.1.283, sólo lectura)

Corpus: `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/`.
Cada fila salió de un `rg -n -o` sobre ese directorio; el número tras el
chunk es la línea del archivo minificado.

| Símbolo / literal | Dónde | Qué hace | Decisión |
|---|---|---|---|
| `function Ho(){return n().host.launchOptions.projectConfigRoot()}` | `chunk-nvht7ckf.js:11` | la raíz de proyecto DECLARADA por el lanzador (`replaceProjectConfigRoot` la fija); `null` si nadie la declaró | portado como peldaño 1 (`consumer=`/`--consumer`) y 2 (`THYROX_CONSUMER`, que ya es la declaración de `reach`) |
| `function Er(){return p()?.projectRoot??vs(n()).projectRoot}` | `chunk-nvht7ckf.js:11` | la raíz de la SESIÓN: la del contexto de ejecución, y si no la del proyecto de la sesión | portado como peldaño 3, el contexto |
| `function vs(e){let{project:t}=e;if(t===null)throw new IA;return t}` · `class IA extends Error{name="NoProjectDirectoryError";constructor(){super("This session has no working directory.")}}` | `chunk-nvht7ckf.js:11` | sin proyecto en la sesión NO se inventa uno: se lanza | portado como peldaño 4, `WiringRefused` con `REHUSA — …` y exit 2 en las dos ramas de `main` |
| `function F(e,t){…if(o===void 0&&r===void 0&&i===void 0)return null;if(o===void 0\|\|r===void 0\|\|i===void 0)throw new IA;…}` | `chunk-nvht7ckf.js:11` | un proyecto a MEDIAS (alguna de `originalCwd`/`projectRoot`/`cwd` sin valor) también lanza | mismo criterio: un roster ambiguo es un contexto a medias y rehúsa |
| `project:{originalCwd:n,projectRoot:n,cwd:n}` | `chunk-37t0cm26.js:25` | el proyecto de una sesión ES su cwd de arranque | **divergencia declarada**: aquí el cwd del lanzador remoto es `/home/user`, el PADRE de los clones, que lleva `.claude/` y no es consumidor. Por eso el contexto no toma el cwd verbatim: toma el clon del roster de `reach` que CONTIENE el cwd, y si ninguno, el único clon declarado |
| `CLAUDE_PROJECT_DIR:Ho()??Er()` | `chunk-csayct82.js:184` (entorno de un hook) · `chunk-cfm9hr15.js:12`, `chunk-s31bcshf.js:15`, `chunk-cnp2ghvr.js:11` | la cadena declarado→sesión, aplicada donde el hook la consume | es la misma cadena que `resolve_consumer` |
| `Bt=Et??h.projectRoot` con `Et=Oe===void 0?Ho():null` | `chunk-csayct82.js:1907` | al ejecutar un hook, la raíz declarada gana a la de la sesión | igual: el explícito gana a la variable, y la variable al contexto |
| `loaded without ${Zn} allowed-tools … naming CLAUDE_PROJECT_DIR, because this session has no working directory` | `chunk-csayct82.js:2546` | sin directorio de trabajo, los permisos que lo nombran se DESCARTAN y se avisa; no se resuelven contra otra cosa | misma doctrina que el rehúso: no componer rutas sobre un consumidor adivinado |

*Métrica:* ocurrencias del símbolo o literal en el volcado, con su chunk y
línea, leídas con `rg -n -o` y ventanas de 100–400 caracteres.
*Ciega a:* el flujo completo de `launchOptions` (quién llama a
`replaceProjectConfigRoot` y cuándo); a si `p()` en `Er()` es el contexto de
un subagente o de un fork; y a cualquier resolución que ocurra en el servidor
y no en el ejecutable. Se midió la FORMA de la cadena, no todos sus
invocadores.

## Lo que se portó, y lo que se declaró divergente

```text
consumer= / --consumer          -> se usa tal cual                       (Ho: declarado)
THYROX_CONSUMER (reach)         -> reach.consumer_root(), con sus clausulas estrictas
contexto: clon que CONTIENE cwd -> se usa                                (Er: la sesion)
contexto: UNICO clon declarado  -> se usa                                (sin par en la referencia)
ambiguo / sin roster            -> WiringRefused, nombra THYROX_CONSUMER y --consumer  (IA)
```

El peldaño «único clon declarado» no tiene par en la referencia porque allí
la unicidad es estructural (una sesión, un proyecto). Aquí el roster de
`reach` puede tener uno o cinco clones; con uno, no hay nada que adivinar.

**Qué significa «invocador» cuando el cwd es `/home/user`.** Medido en este
contenedor: `reach.tree_root()` = `/home/user`, `reach.reach()` =
`{'docs': /home/user/kaupamex-docs}`, y `/home/user/.claude/` existe. El
ascenso por marcador de `reach.consumer_root()` desde `/home/user` devolvería
`/home/user`. En `resolve_consumer` ese directorio no es candidato porque el
roster no lo lista: con un solo clon se resuelve a ese clon (misma conducta
que el literal retirado en este despliegue), y con varios rehúsa.

## Mitad roja medida antes de escribir (2026-09-30)

- `grep -n kaupamex-docs src/session/user_wiring.py` → la línea 100 componía
  `base.parent / "kaupamex-docs"`.
- `sed -n '/^def main/,$p' src/session/user_wiring.py | grep -c consumer` → 0.
- `git grep -n THYROX_CONSUMER -- src/session/user_wiring.py` → 0.
- `instalar-hooks-sesion-multirepo.sh` caía a `reach.root("docs")`: un clon
  escrito a mano, y su heredoc importaba `user_wiring` sin `PYTHONPATH`
  (corría aquí sólo porque el pool lo exporta).
- La primera ejecución de la sección 19 murió en
  `AttributeError: module 'user_wiring' has no attribute 'CONSUMER_ROOT_VAR'`.

## Suite y controles de anulación

`PYTHONDONTWRITEBYTECODE=1 timeout 300 python3 tests/session/test_user_wiring.py`

| Corrida | Resultado |
|---|---|
| baseline, antes de tocar nada | 93 ok, 2 fallos (caso 1b «sin PYTHONPATH»: `bin/tool_use_preflight` y `bin/compact_context` rehúsan sin `.venv` en el worktree) |
| con la sección 19 (19, 19-bis, 19-ter, 19-quater) | 122 ok, los mismos 2 fallos de entorno |

Suites vecinas que consumen `declared_wiring`: `tests/session/test_session_restart.py`
85 ok / 0 fallos antes y después; `tests/session/test_installed_hooks_resolve.py`
1 rojo previo (su tabla `INTERPRETERS` no conoce `bash`, y los comandos ya
eran `bash bin/…` en el baseline del caso 18); `tests/hooks/test_task_lifecycle.py`
16/17, rojo previo (busca `task_lifecycle.py` en comandos que son
`bash bin/task_lifecycle`). Ninguno de los dos rojos nombra el consumidor.

Anulación en la suite (19-bis): `is_sole_candidate` → `bool(candidates)`
hace caer 19.5 y sólo 19.5; 19.3, 19.4 y 19.6 sobreviven. Las anulaciones a
nivel de fuente de las otras tres ramas se registran abajo al medirlas.

*Métrica:* aserciones `ok`/`FALLO` impresas por la suite.
*Ciega a:* el caso 1b, que no puede medir sin `uv sync` en el worktree; y a
un despliegue con cinco clones reales, donde el rehúso por ambigüedad se
midió sólo con un roster fabricado por `THYROX_REACH_ROOTS`.

## Linters (pre-commit)

`THYROX_LINT_BIN_DIR=/home/user/thyrox/.venv/bin bash bin/check_lint_zero <4 archivos>`
→ shellcheck 0, ruff 0, pyright 0. `check_identifier_language.py` con el
intérprete del árbol principal → OK en los tres `.py` (los locales en
español que quedan en `user_wiring.py`/`test_user_wiring.py` están en la
deuda heredada del baseline; se tradujeron los de las funciones tocadas).

## Anulaciones a nivel de fuente (medidas, archivo restaurado byte a byte tras cada una)

Cada una borra las dos líneas de una rama de `resolve_consumer`/`contextual_consumer`
con `sed`, corre la suite entera y restaura desde una copia (`cmp` limpio).
El rehúso es una excepción, así que la primera aserción que depende de la
rama retirada no marca `FALLO`: la suite aborta ahí con `WiringRefused`.

| Rama retirada | Primera aserción que cae | Aserciones `ok` antes del corte | Verde de referencia |
|---|---|---|---|
| `if declared: return Path(declared)` | 19.1 (`FALLO`: devuelve el clon de `THYROX_CONSUMER`), y aborta en 19.8 (línea 903) | 101 | 122 ok |
| `if env_value(CONSUMER_ROOT_VAR): return consumer_root()` | aborta en 19.2 (línea 870) | 94 | 122 ok |
| `if containing is not None: return containing` | aborta en 19.3 (línea 874) | 95 | 122 ok |
| `is_sole_candidate` → `bool(candidates)` (19-bis, en la suite) | 19.5 y sólo 19.5; 19.3, 19.4 y 19.6 sobreviven | — | — |

En las tres corridas los únicos `FALLO` anteriores al corte son los dos del
caso 1b, los mismos del baseline: ninguna aserción ajena a la rama cambia.

*Métrica:* líneas `ok`/`FALLO`/`Traceback` de cada corrida, y la línea de la
prueba en el traceback.
*Ciega a:* lo que hay después del corte en cada corrida (19-ter y 19-quater
no llegan a ejecutarse con la rama retirada).
