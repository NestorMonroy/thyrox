# roster-declared-tree-root

## El encargo

Parte del ciclo «thyrox con 0 errores»: `test_reach` seguia rojo con el prefijo
ya declarado.

## La premisa, si se corrigio al primer comando

Habia dos bases. `tree_root` compone las rutas bajo la raiz de los clones
DECLARADA (`THYROX_REACH_ROOT`), pero las derivaciones del roster usaban
`thyrox_root().parent`. En un host real coinciden; con la raiz declarada en
otro sitio, el roster salia de un arbol y las rutas de otro.

## Las piezas

| archivo | que hace |
|---|---|
| `src/paths/reach.py` | `_clones_parent`: `start` -> raiz declarada -> padre del proveedor, compartido por las dos derivaciones |
| `tests/paths/test_roster_declared_prefix.py` | caso nuevo: proveedor sin hermanos y raiz declarada con clones |
| `outputs/annul-declared-tree-root.txt` | sin la raiz declarada cae SOLO el caso nuevo |

## Los resultados

`test_reach` pasa de morir en la linea 122 a 46 de 46, tras cambiar su
expectativa de «cinco raices» por «una por clon del roster»: de los
consumidores solo `docs` es obligatorio. El carril Python completo
(`.claude/jobs/python-lane-2-20260922T232137/`) pasa de 50 a 19 rojas; dos de
ellas eran nuevas y se corrigen en los commits siguientes.

*Metrica:* el roster derivado bajo cada combinacion de raices.
*Ciega a:* `_clones_parent` no usa `tree_root` a proposito (su ascenso depende
del roster); un host que declare `KAUPAMEX_ROOT` y no `THYROX_REACH_ROOT` se
cubre por el orden de `TREE_ROOT_VARS`, sin caso propio.
