#!/usr/bin/env python3
"""Fusiona un ``agent_store.sqlite3`` en otro — union, nunca sobrescritura ciega.

Existe por :ref:`h-docs-1237`: convivian DOS stores versionados, los dos
escribiendose, y **ninguno era superconjunto del otro** (61 filas solo en uno,
3 solo en el otro). El ejecutor decidio el 2026-09-07 que el hogar es el del
PROVEEDOR —``thyrox/agent-results/``— *«por ser producer»*, y que no haya silos.

Retirar el otro sin fusionar habria perdido las 61. Por eso el retiro tiene una
precondicion, y este guion es esa precondicion.

La regla de fusion, por fila
------------------------------

Se decide por la clave primaria de cada tabla:

* **falta en el destino** -> se inserta.
* **esta en los dos y difiere** -> gana la de ``updated_at`` mayor. Si la tabla
  no tiene ``updated_at``, o los dos valores empatan, **NO se toca el destino**:
  ante un empate sin criterio, no cambiar es la unica accion reversible.
* **esta en los dos e identica** -> no se toca.

Es la semantica del driver ``sqlite-union`` que el ``.gitattributes`` del
consumidor ya declaraba para este archivo, aplicada entre dos rutas en vez de
entre dos lados de un merge.

Lo que NO hace, y es deliberado
---------------------------------

No borra el origen. Retirar es un acto separado, y se hace **despues** de leer
el informe que este guion emite: si el conteo del destino no crecio en lo que
el informe anuncia, la fusion no ocurrio y borrar destruiria datos.

Tampoco toca las tablas de sombra de FTS5 (``*_fts_data``, ``*_fts_idx``,
``*_fts_docsize``, ``*_fts_config``): son indice derivado, no dato. Se
reconstruyen con ``INSERT INTO <fts>(<fts>) VALUES('rebuild')`` y fusionarlas a
mano corromperia el indice.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Callable

#: `(pk, fila_destino, fila_origen) -> fila_que_queda`; puede lanzar `MergeRefused`.
Resolver = Callable[[tuple, dict, dict], dict]

#: Sufijos de las tablas de sombra de FTS5. Son indice derivado, no dato.
FTS_SHADOW = ("_data", "_idx", "_docsize", "_config")



#: Resolvedores por tabla — el registro, con la forma de `addHook`.
#:
#: La regla de resolucion vivia DENTRO de `merge_table`, asi que anadir una
#: regla por tabla exigia editar el motor. Es el mismo defecto que
#: `runHooks` tenia antes de su registro (:ref:`h-docs-1235`): el consumidor
#: no podia declarar su caso sin tocar codigo ajeno.
#:
#: Aqui el punto con nombre es **el nombre de la tabla**. El motor solo
#: invoca el punto; quien conoce la tabla registra contra el.
_RESOLVERS: dict[str, "Resolver"] = {}


class MergeRefused(Exception):
    """Un resolvedor rehusa la fila. La fusion entera se aborta, sin escribir.

    Rehusar NO es lo mismo que empatar. Un empate deja el destino como esta y
    sigue; un rehuse dice «esta fila no se puede decidir sin perder algo», y
    seguir seria decidir por omision.
    """


def register_resolver(table: str, resolver: "Resolver") -> None:
    """Declara quien decide un conflicto de fila en `table`.

    El resolvedor recibe `(pk, destino, origen)` y devuelve la fila que debe
    quedar —`destino` para no tocar nada— o lanza `MergeRefused`.
    """
    _RESOLVERS[table] = resolver


def resolver_for(table: str) -> "Resolver":
    """El resolvedor de `table`, o el defecto: gana el `updated_at` mayor."""
    return _RESOLVERS.get(table, newest_wins)


def newest_wins(pk: tuple, target_row: dict, origin_row: dict) -> dict:
    """El defecto. Sin `updated_at`, o ante un empate, gana el DESTINO.

    No cambiar es la unica accion reversible cuando no hay criterio.
    """
    if (origin_row.get("updated_at") or "") > (target_row.get("updated_at") or ""):
        return origin_row
    return target_row


def citation_is_stable(pk: tuple, target_row: dict, origin_row: dict) -> dict:
    """`tasks`: rehusa si la fusion deslizaria una cita durable a otro sujeto.

    Es la misma guarda que `snapshot-tareas` aplica con exit 4, y por la misma
    razon: una `citation_id` que pasa a nombrar otro sujeto rompe TODAS las
    citas ya publicadas que la usan. Ver :ref:`h-docs-1236`, donde tres citas
    fabricadas nombraban trabajo ajeno — un deslizamiento produce lo mismo, con
    la diferencia de que nadie lo escribio a mano.
    """
    cita_d, cita_o = target_row.get("citation_id"), origin_row.get("citation_id")
    if cita_d and cita_o and cita_d != cita_o:
        raise MergeRefused(
            "tasks%s: la cita cambiaria de %s a %s. Fusionar deslizaria el sujeto "
            "de una cita ya publicada." % (pk, cita_d, cita_o)
        )
    if cita_d and target_row.get("subject") != origin_row.get("subject") and cita_o == cita_d:
        raise MergeRefused(
            "tasks%s: %s nombraria otro sujeto (%r -> %r)."
            % (pk, cita_d, (target_row.get("subject") or "")[:40], (origin_row.get("subject") or "")[:40])
        )
    return newest_wins(pk, target_row, origin_row)


register_resolver("tasks", citation_is_stable)


def _real_tables(conn: sqlite3.Connection) -> list[str]:
    """Las tablas con dato propio: sin ``sqlite_*`` ni sombra de FTS5."""
    nombres = [
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite!_%' ESCAPE '!'"
        )
    ]
    fts = {
        r[0]
        for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE '%USING fts%'")
    }
    reales = []
    for n in nombres:
        if n in fts:
            continue
        if any(n.endswith(s) and n[: -len(s)] in fts for s in FTS_SHADOW):
            continue
        reales.append(n)
    return sorted(reales)


def _columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute('PRAGMA table_info("%s")' % table)]


def _primary_key(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute('PRAGMA table_info("%s")' % table) if r[5]]


def merge_table(origin: sqlite3.Connection, target: sqlite3.Connection, table: str) -> dict:
    """Fusiona una tabla. Devuelve el desglose por cubo, sin colapsarlos."""
    cols_o, cols_t = _columns(origin, table), _columns(target, table)
    comunes = [c for c in cols_o if c in cols_t]
    pk = _primary_key(target, table)
    if not pk:
        return {"tabla": table, "omitida": "sin clave primaria: no hay con que emparejar"}

    resolver = resolver_for(table)
    lista = ", ".join('"%s"' % c for c in comunes)
    destino = {
        tuple(r[c] for c in pk): dict(r)
        for r in target.execute('SELECT %s FROM "%s"' % (lista, table))
    }

    insertadas = actualizadas = iguales = destino_mas_nuevo = 0
    for r in origin.execute('SELECT %s FROM "%s"' % (lista, table)):
        fila = dict(r)
        clave = tuple(fila[c] for c in pk)
        actual = destino.get(clave)
        if actual is None:
            target.execute(
                'INSERT INTO "%s" (%s) VALUES (%s)' % (table, lista, ", ".join("?" * len(comunes))),
                [fila[c] for c in comunes],
            )
            insertadas += 1
            continue
        if actual == fila:
            iguales += 1
            continue
        gana = resolver(clave, actual, fila)
        if gana is actual or gana == actual:
            # El destino ya era el bueno. Se separa de `iguales` a proposito:
            # «identicas» y «difieren y gana el destino» son hechos distintos, y
            # un cubo que los mezcle no distingue «no habia nada que traer» de
            # «habia algo y se descarto».
            destino_mas_nuevo += 1
            continue
        set_ = ", ".join('"%s" = ?' % c for c in comunes if c not in pk)
        where = " AND ".join('"%s" = ?' % c for c in pk)
        target.execute(
            'UPDATE "%s" SET %s WHERE %s' % (table, set_, where),
            [gana[c] for c in comunes if c not in pk] + list(clave),
        )
        actualizadas += 1

    return {
        "tabla": table,
        "insertadas": insertadas,
        "actualizadas": actualizadas,
        "iguales": iguales,
        "destino_mas_nuevo": destino_mas_nuevo,
        "resolvedor": resolver.__name__,
        "columnas_ignoradas": sorted(set(cols_o) - set(cols_t)),
    }


def merge(origin_path: Path, target_path: Path, *, dry_run: bool = False) -> list[dict]:
    origin = sqlite3.connect("file:%s?mode=ro" % origin_path, uri=True)
    origin.row_factory = sqlite3.Row
    target = sqlite3.connect(target_path)
    target.row_factory = sqlite3.Row
    try:
        informe = []
        for t in _real_tables(target):
            if t not in _real_tables(origin):
                informe.append({"tabla": t, "omitida": "no existe en el origen"})
                continue
            informe.append(merge_table(origin, target, t))
        if dry_run:
            target.rollback()
        else:
            target.commit()
        return informe
    finally:
        origin.close()
        target.close()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("origen", type=Path)
    p.add_argument("destino", type=Path)
    p.add_argument("--dry-run", action="store_true",
                   help="mide sin escribir: el mismo recorrido, con rollback")
    a = p.parse_args(argv)
    for ruta in (a.origen, a.destino):
        if not ruta.is_file():
            print("ERROR: no existe %s" % ruta, file=sys.stderr)
            return 2
    informe = merge(a.origen, a.destino, dry_run=a.dry_run)
    modo = "SIMULACION (rollback)" if a.dry_run else "APLICADA"
    print("merge-stores %s: %s -> %s" % (modo, a.origen, a.destino))
    total = 0
    for f in informe:
        if "omitida" in f:
            print("  %-24s omitida: %s" % (f["tabla"], f["omitida"]))
            continue
        total += f["insertadas"] + f["actualizadas"]
        print("  %-24s +%-5d ~%-5d =%-6d destino_mas_nuevo=%-5d [%s]%s" % (
            f["tabla"], f["insertadas"], f["actualizadas"], f["iguales"],
            f["destino_mas_nuevo"], f["resolvedor"],
            "  columnas_ignoradas=%s" % f["columnas_ignoradas"] if f["columnas_ignoradas"] else ""))
    print("  filas cambiadas en el destino: %d" % total)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
