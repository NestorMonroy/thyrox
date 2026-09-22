# jobs-home-synthetic-tree

## El encargo

> los directorios kaupamex-api, kaupamex-ui, etc el unico que no es opcional
> es kaupamex-docs

## La premisa, si se corrigio al primer comando

Siete suites tomaban del HOST un clon opcional (`api`) y morian con
`KeyError` donde no existe. En cuatro, la afirmacion no depende de cual clon
sea: se usa uno del roster. En dos (`jobs_home`, `background_log_home`) la
afirmacion es sobre DOS clones distintos: se usa el arbol sintetico. En
`gitattributes` la premisa «el multi-repo declara cinco» se declara en la
propia suite.

Dos hallazgos del paso:
- `test_jobs_home` tenia un caso que se SALTABA en todo host sin
  `kaupamex-api/.env`: nunca media. Con el arbol sintetico se escribe la
  declaracion del consumidor y el caso mide.
- `test_manifest_language` se OMITIA en hosts sin roster. Al medir, su
  control positivo exigia deuda en el consumidor, y docs la pago (269
  manifiestos, 0 claves espanolas). Se reconstruye sobre un run REAL con una
  clave inyectada.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/annul-anchor.txt` | `jobs_home`: sin el ancla cae SOLO el caso antes saltado |
| `outputs/background-annul-per-clone.txt` | `background_log_home`: sin la rama por clon caen los cuatro que su docstring predice |
| `outputs/manifest-annul-detection.txt` | sin deteccion cae el caso inyectado y los cinco que tambien dependen de ella |

## Los resultados

*Metrica:* veredicto de cada suite y de su anulacion.
*Ciega a:* una fuga al host durante una anulacion: se observo
`/home/user/kaupamex-api/{scripts,build-logs}` creado a las 23:22:37, en la
ventana en que corrian a la vez esta anulacion y el carril Python completo.
La version verde no lo recrea, y el carril completo tampoco al terminar;
quien lo creo no quedo atribuido.
