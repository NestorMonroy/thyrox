# python-reds-4

## Qué se lanzó

```
bash tests/run.sh --python-only
```

## Qué se preguntaba

Tras cerrar TASK-THYROX-0077 —el baseline de huérfanos que `census_scripts.py`
componía con la ruta anterior a la mudanza—, cuántas suites de Python quedan en
rojo.

## Qué se recogió

```
== 1 trabajos asentados ==
OK     python-reds-4
       |   (158 suite(s) de Python, 2 en rojo, 0 sin medir)
       | FALLA: 1 lengua(s) en rojo
       | __BG_EXIT__=1
```

Los dos rojos, por la línea que el propio corredor emite:

```
2065:-- ROJO tests/session/test_installed_hooks_resolve.py
3552:-- ROJO tests/verify/test_path_arithmetic.py
```

## Esta ejecución está CONTAMINADA, y la causa está medida

Arrancó a las **12:47:17** y el arreglo de `test_installed_hooks_resolve.py`
se commiteó **después** (`thyrox@d49ca0bc`). El corredor alcanzó esa suite
mientras la versión previa seguía en disco, y su propio traceback lo delata:

```
2047:  File ".../tests/session/test_installed_hooks_resolve.py", line 194,
       in test_the_two_older_assertions_cannot_see_the_topology
```

La línea **194** es la numeración **anterior** al arreglo; tras él esa
aserción vive en la **227**. Así que la cifra `2 en rojo` describe el árbol de
antes de `d49ca0bc`, no el de ahora.

El estado del árbol de hoy, medido por separado sobre las dos suites:
`test_installed_hooks_resolve.py` → `Ran 4 tests … OK`;
`test_user_wiring.py` → 74 ok, 0 fallas.

**La contaminación es explicable, no indeterminada** — por eso este run se
conserva en vez de descartarse: su cifra es válida para el árbol que midió, y
la línea del traceback es lo que permite fecharla.

*Metrica:* suites en rojo sobre el total que el corredor publica, leídas de su
propia línea de resumen.
*Ciega a:* el cambio que aterrizó mientras corría — un corredor que lee el
disco suite por suite no distingue «el árbol estaba así» de «el árbol cambió a
media ejecución». Lo que lo distingue aquí es el número de línea del traceback,
que es evidencia lateral, no una propiedad del instrumento.
