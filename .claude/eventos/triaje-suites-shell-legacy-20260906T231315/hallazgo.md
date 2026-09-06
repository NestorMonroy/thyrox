# Triaje de las 88 suites de shell en tests/legacy

Medido 2026-09-06. `tests/run.sh` las alcanza desde que descubre las tres
lenguas; antes ninguna se invocaba, asi que su rojo no era visible.

    verdes 4 · rojas 84 de 88

## El instrumento fallo primero, y el fallo es el hallazgo

La primera clasificacion busco cada sujeto SOLO en `thyrox/src` y declaro
**cinco sujetos muertos**. Los cinco estan vivos: viven en
`kaupamex-docs/.claude/hooks/`. Es el sub-patron C de
`metrica-decide-la-conclusion.md` cometido con el instrumento recien escrito
para triar: medir un arbol y concluir sobre la existencia.

Corregido el universo a `thyrox/src` mas el `.claude/` de los cinco
consumidores, `E_sujeto_no_hallado` queda en **0**: ninguna de las 88 prueba
un sujeto muerto.

## Las cuatro clases

| Clase | n | Que es | Que se hace |
|---|---|---|---|
| **A** | 42 | el sujeto vive en `thyrox/src` y alguna suite de Python lo **menciona** | candidato a redundante — exige juicio por archivo |
| **B** | 39 | el sujeto vive en `thyrox/src` y **ninguna** suite de Python lo toca | portar: hoy no hay cobertura ninguna |
| **C** | 5 | el sujeto es un **hook del consumidor**, no de thyrox | decision: thyrox no deberia alojar la prueba de un hook ajeno |
| **D** | 2 | no invoca ningun `.py`/`.sh` externo | leer una por una |

*Metrica:* basenames `.py`/`.sh` que cada suite invoca, buscados por nombre en
`thyrox/src` y en el `.claude/` de los cinco consumidores; y mencion de ese
basename en alguna `tests/**/test_*.py`.
*Ciega a:* **la clase A es debil por construccion** — «una suite de Python
menciona el sujeto» no es «cubre su conducta». Mide el significante. Por eso A
es una lista de candidatos y no un veredicto de borrado.
Ciega tambien al sujeto invocado por una ruta construida en variables, que
ningun basename literal delata.

## Por que estaban rojas

75 de 88 citan `.claude/scripts/…`, la ruta previa al traslado a thyrox. No es
que el sujeto desaparezca: es que la suite lo busca donde ya no esta. Misma
causa que `tests/legacy/test-parallel.sh`, retirada en `thyrox@da5bebb0`.

## Lo que este triaje NO cierra

El veredicto por archivo de las clases A, C y D. La clase B es trabajo
mecanico con criterio ya fijado (portar a Python, con su control de anulacion);
las otras tres son juicio.

## Segunda medicion: la clase B se parte en dos causas

De las 39 de clase B, 37 estaban rojas. Diagnosticadas con `timeout 20`:

| Causa | n | Que es |
|---|---|---|
| **RUTA** | 22 | muere por ruta: el sujeto esta donde el guion ya no busca |
| **OTRO** | 13 | falla por otra cosa — cada una exige diagnostico propio |
| CUELGA | 0 | ninguna agota el timeout |

Las 22 de RUTA son porte mecanico con criterio ya fijado. Las 13 de OTRO
son donde se esconde el defecto real: el primer porte de esa clase
(`censo_contraparte`) destapo que el mecanismo llevaba dentro un parametro
del consumidor —la declaracion de contraparte, compuesta como archivo
hermano— y por eso murio al mudarse. No era la ruta del test: era la del
sujeto.

*Metrica:* codigo de salida y salida combinada de cada suite bajo `timeout 20`,
clasificada por presencia de un literal de archivo ausente.
*Ciega a:* una suite que muera por ruta SIN emitir el literal —p. ej. la que
compone la ruta y luego falla un `grep` sobre vacio—; esas caen en OTRO y el
diagnostico individual las devuelve.

## Portadas hasta ahora

| Suite | Porte | Que destapo |
|---|---|---|
| `test-parallel.sh` | `tests/session/test_parallel.py` | el zombie que `kill -0` reporta vivo; el marcador exige shell exterior |
| `test-reference-root-resolution.sh` | `tests/gates/test_reference_root_resolution.py` | H-DOCS-1133: el gate mide evidencia congelada |
| `test-censo-contraparte.sh` | `tests/corpus/test_censo_contraparte.py` | el censo llevaba dentro un parametro del consumidor |
