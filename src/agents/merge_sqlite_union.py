#!/usr/bin/env python3
"""merge_sqlite_union.py — driver de merge de union para una base SQLite versionada.

``agent_store.sqlite3`` es binario y esta versionado, y dos sesiones que corren
a la vez le anaden filas distintas. Sin driver, git husmea el archivo como
binario, avisa ``Cannot merge binary files`` y deja conflicto: el arbol se queda
con **nuestro** lado y las filas del otro desaparecen sin que nadie las nombre.

Medido en un laboratorio de tres commits (base + una fila por rama), con
``* text=auto`` y sin driver::

    CONFLICT (content): Merge conflict in store.sqlite3
    filas: ['a', 'base']          # la fila 'b' del otro lado no esta

Este driver hace la union: cada tabla recibe las filas del otro lado que su
clave primaria todavia no tenga.

Uso — git lo invoca con los tres estados del archivo::

    merge_sqlite_union.py <ancestro> <nuestro> <suyo>

``<nuestro>`` es a la vez entrada y **destino**: git toma de ahi el resultado.
El ancestro no se usa para decidir (la union no lo necesita) y se recibe porque
el contrato de ``merge.<driver>.driver`` lo entrega.

Se instala en el clon con ``bash scripts/install-hooks.sh`` — la definicion vive
en ``.git/config``, que no se versiona, y el atributo ``merge=`` que lo invoca
en ``.gitattributes``, que si. Sin la mitad de ``.git/config`` git no falla:
vuelve al comportamiento binario de arriba, que es seguro y con perdida.

## Que decide, y que NO decide

Decide **la union de filas nuevas**. Ante una clave primaria que los dos lados
modificaron, conserva la nuestra y lo **informa por stderr** con su conteo: una
union silenciosa sobre filas divergentes seria el mismo defecto que el conflicto
binario, sin el aviso. La politica de esa colision —quien gana, o si debe
conflictuar— es una decision de producto y vive en la tarea **#436**; este
guion es el mecanismo que esa decision necesita para poder aplicarse.

Aborta (exit 1, git marca conflicto) cuando la union no esta definida:

- una tabla existe en los dos lados con **columnas distintas** — hubo un cambio
  de esquema, y mezclar filas entre esquemas divergentes corrompe;
- una tabla no tiene clave primaria — sin ella ``INSERT OR IGNORE`` no puede
  distinguir una fila repetida de una nueva, y la union duplicaria.

*Metrica:* filas insertadas y filas omitidas por clave ya presente.
*Ciega a:* si las filas omitidas eran iguales o divergentes — para eso hace
falta comparar contenido, que es lo que #436 debe decidir.
"""

import sqlite3
import sys

#: Tablas que SQLite gestiona por su cuenta; unirlas corromperia el archivo.
TABLAS_INTERNAS_PREFIJO = "sqlite_"

#: Sufijos de las tablas sombra que FTS5 crea junto a cada tabla virtual.
#: No se unen fila a fila: son el indice, y se regeneran con 'rebuild'.
SUFIJOS_SOMBRA_FTS = ("_data", "_idx", "_docsize", "_config", "_content")


def tablas_virtuales(conexion, esquema):
    """Las tablas virtuales del esquema — FTS5 y compania.

    El store real declara ``findings_fts``, y sin esta distincion el driver la
    trataba como tabla normal: no tiene clave primaria, asi que abortaba el
    merge entero. Medido al probar contra el esquema de verdad, no supuesto.
    """
    filas = conexion.execute(
        f"SELECT name, sql FROM {esquema}.sqlite_master WHERE type = 'table'"
    ).fetchall()
    return [n for n, sql in filas if (sql or "").lstrip().upper().startswith("CREATE VIRTUAL")]


def tablas(conexion, esquema):
    """Las tablas que SI se unen fila a fila."""
    filas = conexion.execute(
        f"SELECT name FROM {esquema}.sqlite_master WHERE type = 'table'"
    ).fetchall()
    virtuales = set(tablas_virtuales(conexion, esquema))
    sombras = {f"{v}{sufijo}" for v in virtuales for sufijo in SUFIJOS_SOMBRA_FTS}
    return [n for (n,) in filas
            if not n.startswith(TABLAS_INTERNAS_PREFIJO)
            and n not in virtuales
            and n not in sombras]


def columnas(conexion, esquema, tabla):
    return [fila[1] for fila in conexion.execute(f'PRAGMA {esquema}.table_info("{tabla}")')]


def tiene_clave_primaria(conexion, esquema, tabla):
    return any(fila[5] for fila in conexion.execute(f'PRAGMA {esquema}.table_info("{tabla}")'))


def unir(destino, origen):
    """Une ``origen`` dentro de ``destino``. Devuelve (insertadas, omitidas)."""
    conexion = sqlite3.connect(destino)
    conexion.execute("ATTACH DATABASE ? AS suyo", (origen,))

    nuestras = set(tablas(conexion, "main"))
    suyas = tablas(conexion, "suyo")

    insertadas = omitidas = 0
    for tabla in suyas:
        if tabla not in nuestras:
            # Tabla que solo el otro lado tiene: se crea con su propio DDL.
            (ddl,) = conexion.execute(
                "SELECT sql FROM suyo.sqlite_master WHERE type='table' AND name=?",
                (tabla,),
            ).fetchone()
            conexion.execute(ddl)
        elif columnas(conexion, "main", tabla) != columnas(conexion, "suyo", tabla):
            conexion.close()
            raise SystemExit(
                f"merge_sqlite_union: la tabla {tabla!r} tiene columnas distintas en "
                f"cada lado — hubo cambio de esquema y la union no esta definida. "
                f"Se deja el conflicto para que lo resuelva una persona."
            )

        if not tiene_clave_primaria(conexion, "suyo", tabla):
            conexion.close()
            raise SystemExit(
                f"merge_sqlite_union: la tabla {tabla!r} no declara clave primaria — "
                f"sin ella la union no distingue fila repetida de fila nueva."
            )

        antes = conexion.execute(f'SELECT count(*) FROM main."{tabla}"').fetchone()[0]
        candidatas = conexion.execute(f'SELECT count(*) FROM suyo."{tabla}"').fetchone()[0]
        conexion.execute(f'INSERT OR IGNORE INTO main."{tabla}" SELECT * FROM suyo."{tabla}"')
        despues = conexion.execute(f'SELECT count(*) FROM main."{tabla}"').fetchone()[0]

        insertadas += despues - antes
        omitidas += candidatas - (despues - antes)

    # El indice de texto se REGENERA, no se une: sus tablas sombra son
    # estructura interna de FTS5 y copiarlas fila a fila la corrompe.
    for virtual in tablas_virtuales(conexion, "main"):
        conexion.execute(f'INSERT INTO main."{virtual}"("{virtual}") VALUES (\'rebuild\')')

    conexion.commit()
    conexion.close()
    return insertadas, omitidas


def main(argv):
    if len(argv) != 4:
        raise SystemExit(f"uso: {argv[0]} <ancestro> <nuestro> <suyo>")

    _ancestro, nuestro, suyo = argv[1:4]
    insertadas, omitidas = unir(nuestro, suyo)

    print(f"merge_sqlite_union: {insertadas} fila(s) unidas", file=sys.stderr)
    if omitidas:
        # No es ruido: es la mitad que el driver NO decide (ver #436).
        print(f"merge_sqlite_union: {omitidas} fila(s) del otro lado omitidas por "
              f"clave ya presente — se conservo la nuestra", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
