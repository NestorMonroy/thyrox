# roster-declared-prefix

## El encargo

Parte del ciclo «thyrox con 0 errores», sobre las suites que siguen rojas por
`ReachRootError` despues de `store-import-without-roster`.

## La premisa, si se corrigio al primer comando

Las suites rojas no son una sola clase. Unas miden el CONSUMIDOR REAL (censos,
colisiones de ids, catalogo de errores) y una fixture sintetica las dejaria
sin sujeto; otras solo componen rutas de `api`/`docs` y si necesitan el arbol
sintetico. Para las primeras, el host SI tiene su consumidor: lo que fallaba
era la derivacion.

`derive_reach_roots` aplicaba la mayoria de dos hermanos aunque
`THYROX_CLONE_PREFIX` estuviera declarada. Ademas de dejar sin roster a un host
de un solo consumidor, con mas hermanos de otro prefijo devolvia el roster de
ESE prefijo mientras las rutas se componian con el declarado: medido, el caso
`foo-a/b/c` + `kaupamex-api/docs` con `kaupamex-` declarado daba `('a', 'b', 'c')`.

## Las piezas

| archivo | que hace |
|---|---|
| `src/paths/reach.py` | `derive_reach_roots` usa el prefijo declarado antes que la mayoria |
| `tests/paths/test_roster_declared_prefix.py` | 3 aserciones sobre la fixture de varios clones |
| `outputs/annul-declared-prefix.txt` | sin el prefijo declarado caen SOLO los dos casos que dependen de el |
| `.env` (del proveedor) | declara `THYROX_CLONE_PREFIX=kaupamex-`; `write-env --force` la conserva |

## Los resultados

*Metrica:* el roster que `reach.reach_roots()` devuelve en arboles sinteticos.
*Ciega a:* hosts donde el prefijo declarado no coincide con ningun hermano:
ahi el roster sale vacio y `reach_roots` rehusa, que es el desenlace correcto
pero no esta cubierto por un caso propio.
