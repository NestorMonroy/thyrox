# `_references/claude-code-bin/` — el corpus extraído, **una carpeta por build**

Cada extracción del ejecutable de Claude Code vive bajo el número de versión que
**el propio payload declara**. Una versión nueva no pisa a la anterior: se pone
al lado.

## Qué builds hay y qué trae cada una — se publica, no se transcribe

Un diagrama fijo en este README ya envejeció dos veces: describía seis
builds cuando el directorio tenía ocho, y a `2.1.258` la llamaba "SÓLO
claude_strings.txt" cuando esa build ya traía `MANIFEST.tsv` y `bunfs-root/`
(le faltaba únicamente `src/`, no todo). Es la forma que
`calibration-verified-numbers.md` prohíbe en su corolario "una cifra que vive
en código NO se transcribe a prosa": el árbol crece con cada extracción, así
que cualquier tabla fijada aquí envejece antes de que alguien la vuelva a
leer. **El arreglo no es corregir la tabla** — eso trata el síntoma y
garantiza la reincidencia (H-DOCS-139) — sino nombrar el comando que la
publica:

```bash
python3 src/corpus/list_corpus_builds.py
```

Enumera los directorios con forma de versión bajo esta carpeta y, para cada
uno, cuáles de los cinco marcadores conocidos existen (`bunfs-root/`, `src/`,
`MANIFEST.tsv`, `claude_strings.txt`, `README.md`) — un sufijo
(`2.1.246-nombrado`) cuenta como vista derivada de su versión base, no como
build aparte. La salida trae su denominador (`N builds bajo <ruta> — …`), no
un conteo suelto.

*Métrica:* existencia de los cinco marcadores conocidos en cada directorio con
forma `X.Y.Z`. *Ciega a:* si el contenido del marcador es fiel a esa versión
(la fidelidad la garantiza el guard de re-extracción, otro instrumento) y a un
marcador que el guion no conozca. Test con control de anulación:
`python3 tests/corpus/test_list_corpus_builds.py`.

**Ninguna build "sólo tiene el volcado" por casualidad.** Cuando una carpeta
trae únicamente `claude_strings.txt` (+ `README.md`), su propio `README.md`
lo declara en la primera línea, para que nadie la lea como extraída (el caso
histórico fue `2.1.250`/`2.1.251`, vendorizadas para cerrar la deriva que la
tarea #932 midió — el ejecutable vivo iba cuatro versiones por delante del
corpus).

El sufijo `-nombrado` marca un corpus **derivado**: los mismos módulos con 5609
identificadores manglados sustituidos por el nombre que el propio bundle filtraba
en un literal. El renombrado es **por binding**, no por nombre: dos declaraciones
de `B` en un archivo son dos cosas distintas, y sólo se renombra la que el
literal señala. Se reproduce en un comando desde el corpus y su mapa, los dos
versionados; se guarda porque el valor está en poder greppearlo con los nombres
legibles, que es para lo que se recuperaron.

## Por qué por versión y no en el sitio

Hasta el 2026-08-26 el corpus era un solo directorio y el extractor escribía
encima. Al re-extraer 2.1.246 sobre 2.1.241 la carpeta anterior se destruyó, y
su único rastro quedó en el historial de git — donde nadie lo va a buscar.

Directiva del ejecutor que lo corrige: *"lo que sí queremos es que el código
extraído se guarde en GitHub, como se está haciendo en `tools/**`, para que no
'parche' lo que tenemos"*.

El costo en repositorio es bajo y está medido: los blobs de 2.1.241 ya estaban
en el historial, así que restaurarlos no añade objetos nuevos. Ningún archivo
supera los 10 MB, muy por debajo del aviso de 50 MB de GitHub.

## Lo que compra tener dos versiones a la vez

El diff entre builds pasa a ser una operación normal en vez de una arqueología.
Ejemplo medido el mismo día, con el instrumento de
`.claude/eventos/recuperar-nombres-del-binario-20260826T173157/`:

| Corpus | archivos `.js` | helpers de exportación de la app |
|---|---|---|
| 2.1.241 | 143 | `F`, `c`, `U` |
| 2.1.246 | 1544 | `y`, `js` |

La intersección es **vacía**: el nombre manglado de una misma función cambia
entre builds. Eso no se puede afirmar con un corpus que sólo guarda el último —
y es justo lo que decide que un extractor derive la forma en vez de codificar el
nombre.

La diferencia de 143 a 1544 archivos **no** es que el producto creciera diez
veces: la extracción de 2.1.241 sacó once módulos del sistema virtual de Bun y la
de 2.1.246 sacó los 1576 que la tabla declara. Es la misma medición mejorada, y
tenerlas juntas es lo que permite decirlo.

## Cómo se produce una versión nueva

```bash
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/extraer_modulos_del_binario.py --dry-run
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/extraer_modulos_del_binario.py
```

El extractor **deriva la versión del payload** (`// Version: X.Y.Z`) y escribe en
`_references/claude-code-bin/<versión>/`. Si esa carpeta ya existe **se niega**, con
código 2 y sin escribir nada:

```
ERROR — _references/claude-code-bin/2.1.246 ya existe. Esa versión ya está extraída y
NO se pisa. Si de verdad hay que rehacerla (extracción corrupta, no una versión
nueva), pasar --rehacer.
```

Ése es el guard que hace la política ejecutable en vez de escrita: sin él, la
regla de no pisar depende de que alguien se acuerde.

## Qué hay dentro de cada versión

| Ruta | Qué es |
|---|---|
| `bunfs-root/` | los módulos tal como el binario los nombra, bajo `/$bunfs/root/` — el `$` no se escribe en disco |
| `src/` | el árbol de fuentes reconstruido |
| `MANIFEST.tsv` | `archivo · bytes · tipo medido · SHA-256` de cada módulo |
| `README.md` | qué se extrajo en esa versión y con qué |

El SHA-256 por archivo es lo que hace la extracción **verificable**: cualquiera
puede repetirla sobre el mismo ejecutable y comparar, sin confiar en el guion.

## El código extraído no sale de este árbol

Se versiona aquí y se lee aquí. **No se envía a ningún servicio externo** — ni
para renombrar identificadores, ni para resumir, ni para clasificar. La
recuperación de nombres se hace con los literales que el propio bundle filtra;
ver el evento citado arriba.
