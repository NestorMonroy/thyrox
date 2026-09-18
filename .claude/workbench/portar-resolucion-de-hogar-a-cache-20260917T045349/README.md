# Portar la resolucion de hogar a la familia `cache`

`TASK-THYROX-0055` (task_id 1228). Porta a `src/cache/paths.py::cache_dir` las
dos correcciones que `src/workbench/paths.py::workbench_dir` ya cerro
(#284/#286), mas una tercera alineacion declarada.

## Las dos correcciones portadas, medidas ANTES de tocar el modulo

```
DEFECTO 1 — el ancla del default
  cache_dir    : /home/user/kaupamex-docs/source/gestion/.claude/cache
  workbench_dir: /home/user/kaupamex-docs/.claude/workbench

DEFECTO 2 — un valor relativo declarado (THYROX_CACHE_DIR=banco)
  /home/user/thyrox          cache=banco  wb=banco
  /home/user/kaupamex-docs   cache=banco  wb=/home/user/kaupamex-docs/banco
  /home/user/kaupamex-db     cache=banco  wb=/home/user/kaupamex-db/banco
```

`wb=banco` para thyrox NO es un defecto: ahi `consumer_root` rehusa —el
proveedor tambien lleva `.claude/`— y la relativa se devuelve CRUDA. Esa
conducta se replica, y el caso 7 de la suite es su control.

## La tercera alineacion, declarada (`porte-completo-no-parcial.md`)

`record_fallback` NO es una de las dos correcciones que la tarea nombra: es una
tercera cosa que `workbench_dir` hace y esta familia no hacia. Se porta igual
—un default silencioso no se distingue de una declaracion, y `declarations.py`
existe para eso— y se declara aqui en vez de colarse en el diff.

## El default del PROVEEDOR: decidido, no heredado

Es la condicion de cierre que la tarea fija. `consumer_root` rehusa dentro de
thyrox, y esta familia NO puede rehusar: su docstring lo declara —un indice es
material reconstruible—. Se ancla en `thyrox_root()`, que es una DECISION
explicita. Lo prohibido era heredar el ancla del cwd, no tener default.

## Controles de anulacion — cada mitad cae SOLA

| Anulacion | Cae | Archivo |
|---|---|---|
| sin `resolve_home` | 5 (2 metodos + 3 subcasos de simetria) | `anulacion-a-sin-resolve-home.txt` |
| sin el ancla en `consumer_root` | 2 (default hondo y default del proveedor) | `anulacion-b-sin-ancla-en-consumer-root.txt` |
| sin `record_fallback` | 1 (el default anotado) | `anulacion-c-sin-record-fallback.txt` |

Ninguna se solapa con otra, y el modulo restaurado vuelve a 9/9. Antes del
arreglo: 3 casos en verde —poblacion, absoluta que SI colisiona, relativa cruda
sin raiz resoluble— y 6 en rojo. Esos tres verdes son los que impiden
sobre-afirmar: un mecanismo que compusiera SIEMPRE los haria caer.

## Un rojo del control que NO era del modulo

`test_the_three_families_compose_the_same_segment_alike` fallo en `docs` tras
el arreglo, y la causa era la POBLACION del caso, no el fix: `docs` declara su
clave por clon de `workbench`, asi que ahi la comparacion medía la precedencia
y no la composicion. Es el mismo primer veredicto rojo que
`tests/workbench/test_home_resolution.py` ya registra para `api` y `docs`.

## Archivos

- `rojo-antes-del-arreglo.txt` — la mitad ROJA, persistida al producirse
- `verde-tras-el-arreglo.txt` — 9/9
- `anulacion-{a,b,c}-*.txt` — los tres controles
- `subconjunto-derivado.txt` — `tests/cache/` mas los tres vecinos de `paths/`
(La copia de trabajo `paths.py.intacto` se usó para restaurar tras cada
anulación y no se versiona: su contenido es el del módulo commiteado.)

## El mismo defecto latente en la suite HERMANA (2026-09-17T05:03:30)

`H-THYROX-36` generalizo el rojo de arriba: `_sin_clave_por_clon` es POR
FAMILIA, y un caso que cruza familias heredandolo mide la PRECEDENCIA de la
otra en vez de su composicion. El hallazgo publicado afirmaba que la suite de
`cache` era la unica que cruzaba familias. Es falso, y se midio:
`tests/workbench/test_home_resolution.py::test_las_dos_familias_resuelven_igual`
llevaba el mismo defecto, latente.

Latente porque la poblacion coincidia por casualidad: los cinco clones miden
`rules_por_clon=False`, asi que el filtro de una sola familia bastaba. El verde
no distinguia «las dos componen igual» de «la otra familia no tiene con que
diferir» — el sub-patron D con esta suite como sujeto.

Medido ANTES de tocar el archivo, declarando `THYROX_RULES_DB`: cae
**exactamente** el subtest de `db` y sobreviven los otros cuatro. El mensaje
del fallo acusa al mecanismo de componer distinto cuando lo que difiere es que
la otra familia responde a otra clave.

Arreglo: el caso filtra por LAS DOS familias, con guarda `>= 2`. Sus dos
controles discriminan — con la clave declarada `db` sale del universo y sigue
verde; con dos de los tres fuera, la guarda rehusa en vez de afirmar sobre un
solo clon.

- `control-defecto-latente-suite-hermana.txt` — las dos mitades y el subconjunto
