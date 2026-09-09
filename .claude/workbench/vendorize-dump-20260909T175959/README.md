# vendorize-dump — el instrumento que ya existía

## El encargo

<!-- verbatim, sin parafrasear -->

> Ya tenemos los ultimos de claude-code-bin ?

y, tras ver lo que estaba construyendo:

> otro punto es que estas utilizando las implementaciones de que tenemos en
> packages o herramientas que tenemos en thyrox? para eso estan, tienes que
> revisar que tenemos para poder usar

## La premisa, corregida al primer comando del ejecutor

La respuesta a la pregunta era **no** —el corpus llegaba a 2.1.263 y el
ejecutable declara 2.1.266— y esa parte estaba bien medida. Lo que estaba mal
era **el camino**: porté a mano `vendorizar_volcado.sh` desde
`kaupamex-docs: .claude/eventos/persistencia-binario-20260828T061033/` sin
comprobar antes qué tenía thyrox.

Tenía esto, y lo tenía completo:

| Lo que escribí | Lo que ya existía | Cuál es mejor |
|---|---|---|
| versión por literal `N.N.N` más frecuente | `deriveVersion` sobre la sección `.bun` | **la que existía** — el payload no puede discrepar del código que se mide |
| `strings -n 4` a un `claude_strings.txt` | `writeCorpus` con `bunfs-root/` + `MANIFEST.tsv` | **la que existía** — 1827 módulos nombrados contra un volcado sin frontera |
| «¿está al día el corpus?» a ojo | `binary freshness` | **la que existía** — ya emitía la orden exacta |

```
$ bun src/packages/binary/bin/binary.ts freshness
el corpus llega a 2.1.263 y el ejecutable declara 2.1.266; extraer 2.1.266
```

El mecanismo ya respondía la pregunta del ejecutor **y** prescribía la acción.
El guion se retira; no se archiva como alternativa, porque tener dos caminos
para la misma decisión es la segunda fuente de verdad que este árbol prohíbe.

## Lo que SÍ sobrevive del pase

- **La build 2.1.266, extraída de verdad** — 1827 de 1827 entradas, con su
  `MANIFEST.tsv` y su README derivado de la medición.
- **La fila de `MEASURED`** en `binary/__tests__/bunfs.test.ts`, medida con
  `binary info` sobre la build viva. Su control **falló primero**, nombrando la
  build (`controls/measured-row-missing.out.txt`), que es lo que ese registro
  exige por escrito.
- **Los cuatro controles de anulación** de `controls/`, que miden mecanismos
  que sí quedan en el árbol: el reenvío de argumentos de `_thyrox_delegate`,
  la resolución de rutas de `resolve_home`, y el anclaje del sufijo ISO de
  `runsFor`.

Dos de ellos —`impossible-margin` y `version-already-archived`— miden el guion
retirado. Se conservan porque son la evidencia de que existió: borrarlos dejaría
este README afirmando un episodio sin nada que lo sostenga.

## Los errores del pase

Cuatro, y los cuatro los detectó el ejecutor, no una re-medición propia:

1. **No revisé qué había antes de construir.** `@thyrox/binary` (8 módulos, 4
   suites) y `src/corpus/list_corpus_builds.py` estaban en el árbol.
2. **Llevé el identificador del run en `/dev/shm`.** Un fresh clone no puede
   leerlo y el contenedor lo borra — el mismo defecto de directorio efímero que
   la directiva acababa de nombrar. Cerrado con `runsFor`/`latestRun`, que le
   dan al subsistema la mitad que le faltaba: sabía **acuñar** un identificador
   y no **encontrarlo**.
3. **Identificadores y nombres de archivo en español** en el guion y en los
   controles. Corregido en el mismo pase.
4. **`thyrox_safe_sed` existía y no lo usé** — cinco `sed -i` a pelo. Medido:
   0 consumidores fuera de su propio test. La biblioteca estaba; la costumbre no.

## Los resultados

*Métrica:* el corpus contra el ejecutable vivo (`binary freshness`), y las tres
cifras de la tabla de módulos (`binary info`) contra la fila de `MEASURED`.
*Ciega a:* si el payload declara una versión distinta de la del ejecutable que
lo contiene — no observado, y no habría con qué detectarlo desde dentro.

## El léxico, corregido después (directiva del ejecutor)

La palabra «banco» no es viable y este run la usaba. En español nombra a la vez
la institución financiera, el asiento, el cardumen y el banco de pruebas; su
traducción literal al inglés —`bank`— designa el sentido equivocado. El dominio
ya tiene sus dos términos, y los llevaba el propio código:

| Término | Qué nombra | Dónde ya estaba |
|---|---|---|
| `workbench` | el subsistema y la forma | `WORKBENCH_FORMS`, `checkWorkbench`, `.claude/workbench/` |
| `run` | UNA ejecución fechada `<slug>-<ISO>` | `runIdFor`, `runsFor`, `latestRun`, `runIdDate` |

Corregido: `src/lib/bank.sh` → `src/lib/workbench.sh` con su parámetro
`bank` → `run_dir`, la definición y el andamiaje de `src/workbench/manifest.ts`,
el texto que emite su gate, y la prosa de este run.

**`controls/no-iso-anchor.out.txt` NO se reescribe.** Es salida capturada de la
anulación: nombra los tests como se llamaban al correrla. Reescribir evidencia
fechada para que case con el árbol de hoy la destruye — el control valdría lo
mismo si lo hubiera escrito a mano.
