# policy-source-selector

## El encargo

<!-- verbatim, sin parafrasear -->

> si, la implementacion de MADLAD, considera usar clean-code revisa las reglas, de igual manera los nombres de archivos, clases, funciones firmas de funciones e identificadores son en ingles, los comentarios pueden ir en español pero sin coloquialismos, en donde los términos técnicos se quedan en ingles

El «si» acepta registrar el Qwen 2.5 7B Q4_K_M del volumen de Ollama como
divergencia declarada respecto a los shards oficiales.

## La premisa, si se corrigio al primer comando

«El catálogo está vacío» era falso. `bin/local-models-catalog list` muestra
`thyrox-library--qwen2.5-7b-instruct:q4_k_m-ollama-845dbda0ea48` declarado el
2026-10-01 (`source: ollama`, `repository: library/qwen2.5-7b-instruct`,
sha256 `2bada8a7…`). `recommendExecution` calculaba la causa del bloqueo
DESPUÉS de filtrar por la política, y con cero entradas permitidas decía
«catálogo local vacío». Además el selector de la política comparaba sólo el
repositorio: `library/…` de Ollama no se distinguía de una organización
homónima de Hugging Face.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/tests.ts` | las cuatro pruebas añadidas a `recommendExecution.test.ts` |
| `probes/impl.py` | `source` opcional en `LocalModelSelector`, `selectorMatches`, y la causa `la política no permite ninguna de las N entrada(s)` |
| `probes/annul.py` | anula cada guarda por separado y registra qué cae |

## Los resultados

| Paso | Resultado | Evidencia |
|---|---|---|
| rojo | 3 fallan; pasa la de compatibilidad (selector sin fuente) | `outputs/red.txt` |
| verde | 16/16; `tsc` sin errores en los archivos tocados | `outputs/green.txt` |
| regresión | `test-headless-pool-model-policy.sh` 12 ok, `test-headless-pool-local-model-e2e.sh` 8 ok | `outputs/regress-*.txt` |

| Anulación | Cae |
|---|---|
| quitar la comparación de fuente | sólo «un selector con fuente admite…» |
| `excludesWholeCatalog` → `false` | sólo «si la política excluye todo el catálogo…» |
| quitar la validación de la fuente | sólo «una fuente desconocida se rehúsa…» |

Subconjunto derivado con
`git grep -l "model-policy\|executionPolicy\|agent-recommend.*--policy" -- tests src/packages`.

*Metrica:* pruebas que caen en rojo, en verde y bajo cada anulación.
*Ciega a:* el modelo real: ninguna prueba carga Qwen; la cualificación es otro paso.
