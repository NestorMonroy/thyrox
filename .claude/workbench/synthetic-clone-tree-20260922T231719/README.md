# synthetic-clone-tree

## El encargo

> Si necesitas implementar varios cwd implementalos, en TDD

## La premisa, si se corrigio al primer comando

Las suites que componen rutas de `api` o `docs` tomaban el roster del HOST.
Con un solo consumidor, `reach_roots` rehusa por la regla de mayoria y la
suite sale roja sin medir (H-THYROX-155). Declarar `THYROX_REACH_ROOTS` en
cada suite saltaria la derivacion que deberian ejercer.

Al construir la fixture aparecio una segunda base: `reach.tree_root` no lee
`THYROX_ROOT`; toma `THYROX_REACH_ROOT` o asciende desde el archivo del
modulo, mientras el roster se deriva de `thyrox_root().parent`. En un host
real coinciden; en un arbol sintetico no. La fixture declara la raiz del
arbol, igual que `tests/paths/test_reach.py`, y el roster sigue derivandose.

## Las piezas

| archivo | que hace |
|---|---|
| `src/testing/clone_tree.py` | `synthetic_clone_tree(clones, prefix)`: construye los clones y el proveedor, aisla y restaura `THYROX_*`/`KAUPAMEX_*` |
| `tests/testing/test_clone_tree.py` | 7 aserciones |
| `outputs/annul-declare-instead-of-build.txt` | si la fixture declara el roster en vez de construir, caen SOLO las dos que dependen de la derivacion |

## Los resultados

*Metrica:* el roster que `reach.reach_roots()` deriva y la ruta que
`reach.root()` compone dentro del bloque.
*Ciega a:* suites shell, que no importan la fixture; y a procesos hijos que
lean un `.env` por ruta explicita en vez de por `THYROX_ENV_FILE`.
