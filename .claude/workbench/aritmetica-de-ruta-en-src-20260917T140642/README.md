# aritmetica-de-ruta-en-src

## Qué se pregunta

`check_path_arithmetic` marcaba **dos** sitios en `src/`, y los dos llevaban
escrita al lado una razón que los declaraba admisibles:

```
src/hooks/detect_rst_validation.py:31
    #: El gate real. ``parents[1]`` es ``src/`` — un salto dentro de la
    #: distribución, que es lo único que la aritmética de ruta admite.

src/session/generate_bin.py:189
    """La raíz de thyrox: dos niveles arriba de este archivo (``src/session/``)."""
```

La pregunta es si esa razón se sostiene contra el discriminador del gate, que
**no** es «¿cuántos niveles salta?» sino «¿falla con RUIDO al mover el
archivo?». La forma admitida es la que alimenta un `sys.path.insert`: si el
archivo se mueve, el `import` que sigue revienta con `ModuleNotFoundError`.

## Qué se midió

Ninguno de los dos falla con ruido, y el de `detect_rst_validation` lo dice en
su propio docstring sin sacar la conclusión:

> *el defecto era **mudo** porque el aviso sólo CITA el comando sin ejecutarlo*

Ésa es la clase entera. El detector compone `GATE_PATH`, lo interpola en un
texto y lo publica; nadie lo ejecuta. Movido el archivo un nivel, el aviso
seguiría saliendo, citando un comando que no existe — y el consumidor que lo
copiara recibiría un `No such file or directory` atribuido a otra cosa.

`generate_bin.repository_root()` es el mismo fallo con más superficie:
reimplementa a mano lo que `reach.thyrox_root()` resuelve por variable
declarada o por ascenso al marcador. Movido el archivo, el generador
compondría su plan contra otro árbol y publicaría un `bin/` vacío **sin
reventar**.

## El arreglo, y su control

Los dos pasan a `reach.thyrox_root()`, con el bootstrap
`sys.path.insert(0, str(... .parent.parent / "paths"))` que el gate admite por
construcción y que es la forma que sus cuatro hermanos de `src/session/` ya
usan.

| Estado | `^ src/` | total |
|---|---|---|
| antes | 2 | 35 |
| después | **0** | 33 |
| sólo `generate_bin` revertido | 1 (`generate_bin.py:199`) | 34 |
| sólo `detect_rst_validation` revertido | 1 (`detect_rst_validation.py:38`) | 34 |

**Anulación quirúrgica en los dos sentidos**: revertir uno devuelve
exactamente ese sitio y ninguno más. Sin el segundo control, el primero no
probaría que el gate distingue los dos arreglos en vez de reaccionar a
cualquier edición del árbol.

**Y la conducta se midió aparte de la forma**, porque el gate es ciego a
ella: cargado el detector como lo carga su despachador
(`spec_from_file_location`, que **traga la excepción** y lo deja inerte),
`GATE_PATH` resuelve a `/home/user/thyrox/src/verify/check_rst_sintaxis.py`
y el archivo existe; `generate_bin --check` sigue publicando
`bin/ al día: 172 entrypoint(s)`.

## La entrada rancia del baseline

El baseline declaraba **dos** entradas y el gate congelaba **una**. La
diferencia es `tests/legacy/test_error_catalog.py:49`: el archivo lo retiró
el reparto de `tests/legacy`, así que la entrada describía deuda de un sujeto
muerto, con seis líneas de comentario explicando la razón de un archivo que ya
no está. Se retira. No cambia ningún veredicto —el gate ya no la contaba—;
cambia que el baseline deje de mentir sobre lo que congela.

*Métrica:* líneas `^  src/` de la salida del gate, y su conteo total.
*Ciega a:* si la ruta resuelta cae dentro del árbol; y a los 26 de `tests/`
más los 7 de `.claude/workbench/`, que este banco no toca —
**TASK-THYROX-0087** y **#425** respectivamente.
