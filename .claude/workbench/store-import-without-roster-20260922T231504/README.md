# store-import-without-roster

## El encargo

Parte del ciclo «thyrox con 0 errores»: 39 de 50 suites Python rojas fallaban
con `ReachRootError` en un host con un solo consumidor (H-THYROX-155).

## La premisa, si se corrigio al primer comando

11 de las 39 entraban por una sola linea: `agent_store.py:127`,
`VALID_REPOS = reach_roots.REACH_ROOTS`, leida AL IMPORTAR. Contradice el
contrato de `reach_roots` («se resuelve al leerlo, no al importar»), y el
store por defecto es el hogar de thyrox, que no necesita roster.

## Las piezas

| archivo | que hace |
|---|---|
| `src/agents/agent_store.py` | `valid_repos()` resuelve el roster al nombrar `--repo`; sin `choices` en argparse |
| `tests/agents/test_store_import_without_roster.py` | 4 aserciones en un proveedor sintetico sin hermanos |
| `outputs/annul-lazy-roster.txt` | con la lectura al importar cae SOLO el caso de importacion |

## Los resultados

Subconjunto derivado (`grep -rlE agent_store tests/`, 54 suites) por
`run-task-pool --memfree 2G`: 43 salen 0. De las Python que la primera
ejecucion completa tenia en rojo, 10 pasan ahora: 9 por este arreglo y
`test_pre_commit_hook` por la activacion de `core.hooksPath`. Siguen rojas 6
que necesitan un arbol real de varios clones.

*Metrica:* EXIT de cada suite del subconjunto contra su veredicto en
`.claude/jobs/python-lane-20260922T224159/`.
*Ciega a:* las suites shell del subconjunto, que no tienen veredicto previo
porque el carril shell aun no se ha medido.
