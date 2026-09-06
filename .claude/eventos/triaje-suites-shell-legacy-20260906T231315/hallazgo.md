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

## Tercera medicion: OTRO no era una causa — era la ceguera del discriminador

La segunda medicion partio la clase B en RUTA (22) y OTRO (13) con un
discriminador que buscaba el **literal** `.claude/scripts`, la ruta previa al
traslado. Al portar la primera de las 13 —`test-esperar-marcador.sh`— resulto
que tambien moria por ruta: resuelve su sujeto con `dirname($BASH_SOURCE)/..`,
que desde `tests/legacy/` apunta a `tests/session/` y no a `src/session/`. No
nombra ninguna ruta vieja, asi que el discriminador no podia verla.

Re-medidas las 12 restantes por la FORMA en vez del literal, las doce anclan
por aritmetica de ruta:

| Forma | n | A donde resuelve desde `tests/legacy/` |
|---|---|---|
| `dirname($BASH_SOURCE)/../../..` | 10 | `/home/user` — el padre de los clones, no el repo |
| `dirname($BASH_SOURCE)/..` | 1 | `tests/` |
| `dirname($BASH_SOURCE)` sin ascenso | 1 | `tests/legacy/` |

`../../..` era la raiz del repo cuando estos guiones vivian en
`.claude/scripts/tests/`: tres niveles arriba. La mudanza a `tests/legacy/` los
dejo a dos, y la cuenta no se entero — **la aritmetica de ruta no sobrevive a
una mudanza; el ascenso con deteccion si**, que es lo que `paths.reach` hace y
por eso los portes lo usan.

Con eso, la clase B queda: **RUTA 34 · OTRO 0 · CUELGA 0** sobre las 37 rojas.
El reparto anterior —22/13— no describia dos causas: describia lo que un
instrumento podia ver y lo que no.

*Metrica:* presencia de `dirname("${BASH_SOURCE[0]}")` con su ascenso, por
suite, sobre las 12 clasificadas OTRO que quedaban.
*Ciega a:* una suite que ademas de la ruta tuviera un segundo defecto — el
porte de la primera cerro dos (la ruta, y un caso que decia medir una guarda
sin ejercerla), asi que «RUTA» acota la causa de la muerte, no el trabajo del
porte. El guion de esta medicion es `medir_ruta_por_aritmetica.sh` del evento
`porte-espera-de-marcador-20260906T232711`.
