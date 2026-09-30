# python-reds-5

## Qué se lanzó

```
bash tests/run.sh --python-only
```

## Qué se preguntaba

Con el arreglo de **TASK-THYROX-0076** ya en disco (`thyrox@d49ca0bc`), cuántas
suites de Python quedan en rojo — la cifra limpia que `python-reds-4` no pudo
dar por haber corrido a caballo de ese commit.

## Qué se recogió

```
   (158 suite(s) de Python, 1 en rojo, 0 sin medir)
   == alcance ==
     Python: 158 suite(s), 1 en rojo, 0 sin medir
   FALLA: 1 lengua(s) en rojo
   __BG_EXIT__=1
```

El único rojo, por la línea que el corredor emite:

```
3532:-- ROJO tests/verify/test_path_arithmetic.py
```

## La trayectoria de la mitad Python

| Ejecución | Suites | En rojo |
|---|---|---|
| `python-reds-20260917T110108` | — | **10** |
| `python-reds-3-20260917T122228` | 158 | **3** |
| `python-reds-4-20260917T124717` | 158 | 2 — **contaminada**, ver su README |
| **`python-reds-5`** | **158** | **1** |

## El rojo que queda está en rojo POR DECISIÓN

`test_path_arithmetic` mide contra un baseline que declara **2** rutas mientras
el árbol tiene **35**, y de ésas **9** son copias pristine de banco de evidencia
— archivos que existen para preservar el estado anterior de un módulo, no para
ser medidos como código vivo.

**No se corre `--write-baseline`:** congelar hoy fijaría un veredicto que nadie
tomó sobre si una copia pristine entra en el universo del gate. Esa decisión es
**TASK-THYROX-0075**.

*Metrica:* suites en rojo sobre el total, de la línea de resumen del corredor.
*Ciega a:* si el rojo restante es del sujeto o de su premisa — el corredor
publica la suite, no la causa. Aquí se sabe aparte, por el triaje de arriba; en
general no lo distingue, que es justo la clase que TASK-THYROX-0081 abre.
