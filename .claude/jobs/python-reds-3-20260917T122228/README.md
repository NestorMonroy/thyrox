# python-reds-3

## Qué se lanzó

```
bash tests/run.sh --python-only
```

Lanzado con `bin/thyrox-bg start python-reds-3 --grace 0`, registrado en el
ledger con `bg.sh register` y recogido por `bin/wait-jobs wait`. Exit 1, 595 s.

## Qué se preguntaba

Tras los tres tramos del triaje —`test_agents_module_paths`,
`test_unwrap_rst` y `test_config_precedence`—, **¿cuántas suites de Python
del corredor siguen en rojo?**

La medición a mano no sirve como respuesta: verifiqué nueve suites una por
una, y nueve no es el denominador. El corredor descubre su propio universo, y
sólo él puede publicar el cociente.

## Qué se recogió

```
== alcance ==
  Python: 158 suite(s), 3 en rojo, 0 sin medir

-- ROJO tests/corpus/test_censar_scripts.py
-- ROJO tests/session/test_installed_hooks_resolve.py
-- ROJO tests/verify/test_path_arithmetic.py
```

**3 de 158**, contra las diez con las que el pase abrió. Las tres ya tienen
sucesor registrado: **TASK-THYROX-0077**, **TASK-THYROX-0076** y
**TASK-THYROX-0075** respectivamente.

`test_path_arithmetic` **no es un defecto de producto**: su baseline declara
2 rutas y el árbol tiene 35, de las cuales 9 son copias pristine de bancos de
evidencia. El universo del gate ante una copia pristine está sin decidir, así
que **no se reescribe el baseline** — hacerlo congelaría un veredicto que
nadie tomó.

*Métrica:* suites de Python que el corredor marca `-- ROJO`, sobre el total
que descubre por sí mismo.

*Ciega a:* la mitad de TypeScript y la de shell del corredor —18 suites de
shell siguen en rojo y sin triar—; y a si un rojo es defecto del sujeto o
premisa rancia, que exige abrir cada uno (es la clase que **TASK-THYROX-0081**
nombra).

## Peligro medido al declarar este manifiesto

`manifest.manifest_line()` emite **un registro sin salto de línea final** —lo
dice su propio docstring— y son sus llamadores quienes añaden el `\n`. Los dos
escritores del árbol lo hacen (`job_runs.py:211` y `:284`); un append a mano
que lo olvide **concatena su registro al anterior** y deja el manifiesto
ilegible: `read_manifest_file` muere con `JSONDecodeError`, no publica un cero
falso. Ocurrió aquí y se reparó recomponiendo los tres registros con
`raw_decode`.
