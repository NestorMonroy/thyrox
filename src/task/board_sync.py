#!/usr/bin/env python3
"""El board del cliente y el store, en los dos sentidos.

Cierra el par #159 / #184, que es **una sola pieza** con dos mitades: la cita
durable se acuñaba a posteriori, y el renombre o el cierre que ``TaskUpdate``
hace en la tarjeta no llegaba al store.

La causa medida, y es comun a las dos
--------------------------------------
``snapshot-tareas`` REHUSA con exit 4 sobre la sesion viva —*«102 id(s) de cita
cambiarian de sujeto»*— y el hook que lo invoca traga el fallo, porque su
contrato es no bloquear la herramienta que acaba de correr. Consecuencia: nada
del board llega al store. Medido sobre 220 tarjetas: 105 coinciden en sujeto y
estado, **102 tienen sujeto distinto**, 9 difieren solo en estado y 4 no tienen
fila para su ordinal (los cuatro cubos suman 220).

*Metrica:* tarjeta ``<ordinal>.json`` comparada con la fila
``(session_id, task_id=<ordinal>)``, por texto exacto de ``subject`` y
``status``.
*Ciega a:* un sujeto que exista en el store bajo **otro** ordinal —el caso
normal tras una renumeracion— y a un reencuadre del titulo, que se lee como
sujeto distinto sin serlo.

La guarda de ``snapshot-tareas`` es correcta y NO se toca aqui: protege la cita
de deslizarse a otro sujeto. Desbloquear el volcado es decision de alcance del
ejecutor, con su sucesor propio (tarea **#113**).

Que aporta cada mitad
---------------------
**#159 — acuñar al crear.** El acuñado ya existia: ``ingest_board`` escribe el
``citation_id`` en el mismo ``INSERT`` que trae el sujeto de la tarjeta. Lo que
faltaba era el **disparo**. Este modulo lo acota a la tarjeta **recien creada**
y a nada mas: bajo un hook ``TaskCreate|TaskUpdate``, acuñar tambien en el
update convertiria cada renombre en fila nueva con cita nueva — el duplicado
que ``task_ids duplicados`` existe para detectar, y la ceguera que
``ingest_board`` ya declara (compara por texto exacto).

**#184 — propagar el renombre y el cierre.** La tarjeta pide emparejar «por
``citation_id``, no por texto», y eso exige un enlace board → fila que **no
existe**: ``ingest_board`` devuelve el ordinal del board y no lo persiste;
``metadata_json`` no puede alojarlo porque el upsert de ``snapshot-tareas`` lo
pisa (``metadata_json = excluded.metadata_json``); y una columna nueva es una
migracion del store. Por eso el enlace lo **declara quien llama**
(``--cita TASK-X-NNNN``). Con la cita declarada el emparejamiento SI es por
``citation_id`` —que es lo que la tarjeta pide— y el sujeto queda como dato a
escribir, nunca como llave.

Lo que este modulo NO cierra
-----------------------------
La forma del payload de ``PostToolUse``, que es lo que permitiria derivar el
ordinal en vez de recibirlo. Medido: ``tool_response`` y ``tool_name`` dan
**0 hits** en los hooks del consumidor, y el hook de volcado declara verbatim
*«stdin: JSON del payload (no se usa)»*. Sin fixture ni consumidor, derivar el
ordinal del payload seria inventarse su forma. **DESCONOCIDO declarado**;
condicion de cierre: que exista un hook o un fixture que lea el payload de
``TaskCreate`` y del que se pueda leer donde viaja el id. Su hogar es la tarea
**#103** (DEC-TASK-03, etapas 5-6: hooks y multi-agente).
"""

from __future__ import annotations

import argparse
import collections
import json
import pathlib
import sqlite3
import sys

# El acuñado y el hogar del board viven en `task_ids`, que es su fuente unica.
# `sys.path` a nivel de modulo —no lazy— porque las suites cargan este archivo
# con `spec_from_file_location`, via por la que su directorio no queda en la
# ruta de busqueda. Mismo criterio que `closure_graph.py` documenta.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import task_ids  # noqa: E402

#: El hogar del board se declara UNA vez, en ``task_ids``. Aqui se reexporta y
#: no se vuelve a declarar: dos constantes con el mismo proposito son dos
#: fuentes de verdad que nadie sincroniza.
BOARD_ROOT_VAR = task_ids.BOARD_ROOT_VAR
board_dir = task_ids.board_dir

#: Los eventos del cliente que CREAN una tarjeta. Es una tupla y no una cadena
#: porque el acotamiento es el mecanismo entero de #159: fuera de esta lista no
#: se acuña, y por tanto un renombre no puede fabricar una fila nueva.
CREATION_EVENTS = ("TaskCreate",)

#: Los campos de la tarjeta que una sincronizacion escribe. NO incluye
#: ``citation_id`` ni ``task_id``: eso es identidad, y reescribirla es el daño
#: que este modulo existe para evitar.
SYNCED_FIELDS = ("subject", "status")


class BoardSyncError(RuntimeError):
    """No se puede saber a que fila pertenece la tarjeta.

    Es un tipo propio para que el CLI pueda distinguir «rehuso porque no puedo
    medir» de cualquier otro fallo, y salir con 2 **sin publicar cifra**: un 0
    ahi no distinguiria «no habia nada que sincronizar» de «no supe donde
    escribirlo», que es el sub-patron D de ``metrica-decide-la-conclusion``.
    """


#: El resultado de un intento de acuñado. Lleva `acted` y `reason` y no una
#: lista a secas porque una lista vacia no discrimina: «el evento no era una
#: creacion» y «no habia nada nuevo que acuñar» son conductas distintas con la
#: misma cifra.
MintResult = collections.namedtuple("MintResult", "acted reason minted")


def _resolve_board(session_id: str, declared) -> pathlib.Path:
    return pathlib.Path(declared) if declared else board_dir(session_id)


def mint_created_card(store_path, session_id, ordinal, *, board_dir=None,
                      layer=None, tool_name=CREATION_EVENTS[0]) -> MintResult:
    """Acuña la cita de la tarjeta **recien creada**, y de ninguna otra.

    El acotamiento por evento es el mecanismo, no una comodidad: el hook que
    consume esto dispara sobre ``TaskCreate|TaskUpdate``, y sin el filtro cada
    renombre insertaria una fila mas con una cita mas para el mismo trabajo.
    """
    if tool_name not in CREATION_EVENTS:
        return MintResult(
            acted=False,
            reason=(f"no aplica: el evento es {tool_name} y la cita se acuña al "
                    f"CREAR. Acuñar en un renombre daria al mismo trabajo una "
                    f"fila y una cita mas."),
            minted=[])
    minted = task_ids.ingest_board(
        store_path, _resolve_board(session_id, board_dir), session_id,
        [str(ordinal)], layer=layer)
    return MintResult(
        acted=True,
        reason="evento de creacion: la cita se acuña en el mismo INSERT",
        minted=minted)


def sync_card(store_path, session_id, ordinal, citation, *, board_dir=None) -> dict:
    """Lleva a la fila que la CITA nombra el sujeto y el estado de la tarjeta.

    El ordinal identifica la tarjeta en el board; la cita identifica la fila en
    el store. No son lo mismo y por eso van separados: en la sesion viva, el
    ordinal 184 del store nombra otro sujeto con otra cita que la tarjeta 184.

    Devuelve el diff antes/despues. Un ``OK`` a secas no permitiria auditar que
    se escribio, que es justo lo que un cambio de estado necesita.
    """
    store_path = pathlib.Path(store_path)
    if not store_path.exists():
        raise BoardSyncError(
            f"no existe el store {store_path}. NO se sincroniza nada: sin la "
            f"fila destino no hay donde escribir, y un 0 aqui se leeria como "
            f"«no habia cambios».")
    if not task_ids.ID_RE.match(str(citation)):
        raise BoardSyncError(
            f"la cita {citation!r} esta fuera de la forma canonica "
            f"TASK-<CAPA>-NNNN. NO se sincroniza nada: una llave mal formada "
            f"no puede resolver a una fila.")
    card = _resolve_board(session_id, board_dir) / f"{ordinal}.json"
    if not card.is_file():
        raise BoardSyncError(
            f"falta la tarjeta {card}. NO se sincroniza nada: sin ella no hay "
            f"estado nuevo que propagar.")
    data = json.loads(card.read_text())

    conn = sqlite3.connect(store_path)
    try:
        rows = conn.execute(
            "SELECT task_id, subject, status FROM tasks "
            " WHERE session_id = ? AND citation_id = ?",
            (session_id, str(citation))).fetchall()
        if not rows:
            raise BoardSyncError(
                f"la cita {citation} no tiene fila en la sesion {session_id}. "
                f"NO se sincroniza nada: escribir en «la fila mas parecida» es "
                f"exactamente el deslizamiento que la guarda del store impide.")
        if len(rows) > 1:
            raise BoardSyncError(
                f"la cita {citation} nombra {len(rows)} filas en la sesion "
                f"{session_id}. NO se sincroniza nada: con la llave duplicada "
                f"no se puede saber cual es el sujeto vivo.")
        task_id, subject_before, status_before = rows[0]
        before = {"subject": subject_before, "status": status_before}
        after = dict(before)
        for field in SYNCED_FIELDS:
            if field in data:
                after[field] = data[field]
        changed = [f for f in SYNCED_FIELDS if before[f] != after[f]]
        # El sello sale de `task_ids`, que es donde su formato se declara: este
        # modulo es su hermano en el mismo paquete, y una segunda copia del
        # formato driftearia sin que nada lo delate.
        stamp = task_ids._now()
        conn.execute(
            "UPDATE tasks SET subject = ?, status = ?, updated_at = ? "
            " WHERE session_id = ? AND citation_id = ?",
            (after["subject"], after["status"], stamp,
             session_id, str(citation)))
        conn.commit()
    finally:
        conn.close()
    return {"citation": str(citation), "task_id": task_id,
            "board_ordinal": str(ordinal), "before": before, "after": after,
            "changed": changed, "updated_at": stamp}


def _cmd_mint_card(args: argparse.Namespace) -> int:
    result = mint_created_card(args.store, args.sesion, args.ordinal,
                               board_dir=args.board, layer=args.capa,
                               tool_name=args.evento)
    if not result.acted:
        print(f"acunar-tarjeta: {result.reason}")
        return 0
    print(f"acunar-tarjeta: {len(result.minted)} cita(s) acuñada(s) "
          f"(alcance medido: 1 tarjeta pedida)")
    for board_id, store_id, citation, subject in result.minted:
        print(f"  board #{board_id:<5} -> store #{store_id:<6} {citation}"
              f"  {subject[:52]}")
    return 0


def _cmd_sync_board(args: argparse.Namespace) -> int:
    res = sync_card(args.store, args.sesion, args.ordinal, args.cita,
                    board_dir=args.board)
    print(f"sincronizar-board: {res['citation']} (store #{res['task_id']}, "
          f"board #{res['board_ordinal']})")
    for field in SYNCED_FIELDS:
        mark = "*" if field in res["changed"] else " "
        print(f" {mark} {field}:")
        print(f"     antes:   {res['before'][field]}")
        print(f"     despues: {res['after'][field]}")
    if not res["changed"]:
        print("  sin cambios: la fila ya decia lo que la tarjeta dice")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--store", default=str(task_ids.DEFAULT_STORE_PATH))
    sub = parser.add_subparsers(dest="comando", required=True)

    p_mint = sub.add_parser(
        "acunar-tarjeta",
        help="acuña la cita de UNA tarjeta recien creada (#159)")
    p_mint.add_argument("sesion")
    p_mint.add_argument("ordinal")
    p_mint.add_argument("--capa", default=None,
                        choices=list(task_ids.LAYERS) + [task_ids.UNKNOWN_LAYER],
                        help="capa declarada; sin ella la fila nace en «gen»")
    p_mint.add_argument("--board", default=None,
                        help="directorio de tarjetas (default: el de la sesion)")
    p_mint.add_argument("--evento", default=CREATION_EVENTS[0],
                        help="el tool del cliente que disparo; sin uno de "
                             f"{list(CREATION_EVENTS)} no se acuña")
    p_mint.set_defaults(func=_cmd_mint_card)

    p_sync = sub.add_parser(
        "sincronizar-board",
        help="lleva al store el renombre y el cierre de UNA tarjeta (#184)")
    p_sync.add_argument("sesion")
    p_sync.add_argument("ordinal")
    p_sync.add_argument("--cita", required=True,
                        help="la fila destino, por su TASK-<CAPA>-NNNN")
    p_sync.add_argument("--board", default=None,
                        help="directorio de tarjetas (default: el de la sesion)")
    p_sync.set_defaults(func=_cmd_sync_board)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (BoardSyncError, task_ids.MappingError) as err:
        # A stderr y sin cifra en stdout: el rehuse no publica un conteo.
        print(f"REHUSA — {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
