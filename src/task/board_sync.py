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
#:
#: ``description`` entra el 2026-09-12 por un episodio medido: el board #364 se
#: corrigio con ``TaskUpdate`` porque su premisa mezclaba dos poblaciones, y
#: sincronizar llevo el sujeto nuevo dejando **la descripcion falsa intacta**.
#: La fila quedo diciendo dos cosas que se contradicen, y la falsa es la que
#: lleva el detalle que alguien leeria para trabajar. Ver :ref:`h-docs-1260`.
#:
#: Los tres comparten semantica a proposito: la tarjeta es la fuente, asi que
#: una descripcion vacia **vacia** la fila igual que un sujeto vacio lo haria.
#: Un caso especial para un solo campo seria la asimetria que luego se lee como
#: defecto. Medido sobre el board vivo al decidirlo: 363 de 363 tarjetas traen
#: texto, o sea que la poblacion del caso vacio es 0 — se declara, no se supone.
SYNCED_FIELDS = ("subject", "status", "description")

#: Los cubos en que cae cada tarjeta al reconciliar en bloque. Se declaran
#: como tupla y no se infieren del recorrido: un cubo que solo existe cuando
#: algo cae en el haria que un reporte sin esa clase se leyera como «esa clase
#: no ocurre», que es el sub-patron D de `metrica-decide-la-conclusion`.
RECONCILE_BUCKETS = ("same", "status_drift", "field_drift", "absent",
                     "ambiguous")

#: Las columnas que convergen en bloque. `subject` NO esta: es la llave del
#: pareo, y reescribirla borraria aquello con lo que se acaba de aparear.
#: Gobierna las TRES superficies —el SELECT, la comparacion y el SET del
#: UPDATE—; enumerarlas a mano en cada una fabricaria una segunda fuente de
#: verdad que nadie sincroniza, que es lo que `calibration-verified-numbers`
#: prohibe para una cifra y vale igual para una lista de columnas.
RECONCILED_FIELDS = ("status", "description")

#: El primer campo lleva cubo propio (`status_drift`); los demas caen en
#: `field_drift`. La particion es historica —el reconciliador nacio midiendo
#: solo el estado— y se conserva porque `RECONCILE_BUCKETS` ya se publica.
PRIMARY_RECONCILED_FIELD = RECONCILED_FIELDS[0]

#: Los cubos cuyas filas el reconciliador ESCRIBE. Los dos, no solo el
#: primero: una tarjeta cuya descripcion difiere se corrige igual que una
#: cuyo estado difiere. Gobierna el lote del UPDATE y el conteo que el
#: reporte publica; contarlos por separado en cada sitio fue lo que hizo que
#: el modo seco anunciara «1 fila» cuando la escritura tocaba 38.
DRIFT_BUCKETS = ("status_drift", "field_drift")

#: Las columnas que el SELECT del pareo trae, en orden. Las dos de los
#: extremos son identidad —con que fila se aparea y por que cita se escribe—;
#: las de en medio son las que convergen.
_MATCH_COLUMNS = ("task_id", "subject", *RECONCILED_FIELDS, "citation_id")


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
            "SELECT task_id, subject, status, description FROM tasks "
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
        task_id, subject_before, status_before, description_before = rows[0]
        before = {"subject": subject_before, "status": status_before,
                  "description": description_before}
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
            "UPDATE tasks SET subject = ?, status = ?, description = ?, "
            "       updated_at = ? "
            " WHERE session_id = ? AND citation_id = ?",
            (after["subject"], after["status"], after["description"], stamp,
             session_id, str(citation)))
        conn.commit()
    finally:
        conn.close()
    return {"citation": str(citation), "task_id": task_id,
            "board_ordinal": str(ordinal), "before": before, "after": after,
            "changed": changed, "updated_at": stamp}


def reconcile_status(store_path, session_id, *, board_dir=None,
                     apply_changes=False) -> dict:
    """Lleva al store el estado de TODAS las tarjetas, pareando por sujeto.

    Es la mitad en bloque de #184. ``sync_card`` cierra una tarjeta cuando
    quien llama declara su cita; esto recorre el board entero y no puede
    pedirle la cita a nadie, asi que la llave tiene que salir de los datos.

    **La llave es el sujeto, no el ordinal.** El ordinal del board se reusa:
    en la sesion viva el ordinal 184 del store nombra otro sujeto que la
    tarjeta 184. Parear por ordinal escribiria el estado de un trabajo sobre
    otro, que es el daño de :ref:`h-docs-1042`.

    **Convergen ``status`` y ``description``; el sujeto NO.** El sujeto es la
    llave: si cambio, la tarjeta no aparea y cae en ``absent``; escribirlo desde
    aqui seria reescribir la llave con la que se acaba de aparear. La
    descripcion no es llave, asi que puede converger sin ese daño.

    La descripcion entra el 2026-09-12 por una medicion sobre la sesion viva:
    pareando por sujeto, 320 parejas daban **0** con estado divergente y **37**
    con descripcion divergente. `sync_card` ya llevaba las tres columnas desde
    ``thyrox@a75b3300``, pero es POR TARJETA y solo cuando quien llama declara
    la cita; esto es lo unico que recorre el board entero, asi que una fila con
    la descripcion atrasada no convergia por ninguna via.

    Los cubos siguen particionando el universo, y cada nombre dice la verdad:
    ``status_drift`` es «el estado difiere» (la descripcion puede diferir
    tambien, y la entrada lo declara), ``field_drift`` es «el estado coincide y
    otra columna no», y ``same`` es «no hay nada que escribir en ninguna».

    Por defecto NO escribe. ``apply_changes`` es explicito porque cerrar una
    fila es irreversible sin historial, y un reporte que ademas escribe no
    deja elegir cuando.

    *Metrica:* cada ``<ordinal>.json`` del board contra las filas de ``tasks``
    de la misma ``session_id``, por igualdad exacta de ``subject``.
    *Ciega a:* un renombre — cambia el texto, asi que la tarjeta renombrada se
    lee como sujeto nuevo y su fila anterior queda sin pareja. Los dos casos
    caen en ``absent`` y ninguno se corrige aqui.
    """
    store_path = pathlib.Path(store_path)
    if not store_path.exists():
        raise BoardSyncError(
            f"no existe el store {store_path}. NO se reconcilia nada: sin las "
            f"filas destino un 0 se leeria como «no habia divergencia».")
    cards_dir = _resolve_board(session_id, board_dir)
    if not cards_dir.is_dir():
        raise BoardSyncError(
            f"no existe el board {cards_dir}. NO se reconcilia nada: sin las "
            f"tarjetas no hay estado nuevo que propagar.")

    cards = {}
    for card_path in sorted(cards_dir.glob("*.json")):
        try:
            cards[card_path.stem] = json.loads(card_path.read_text())
        except json.JSONDecodeError as err:
            raise BoardSyncError(
                f"la tarjeta {card_path} no es JSON valido ({err}). NO se "
                f"reconcilia nada: saltarla dejaria el lote sin forma de saber "
                f"cual falto.") from err

    conn = sqlite3.connect(store_path)
    try:
        by_subject = collections.defaultdict(list)
        for row in conn.execute(
                f"SELECT {', '.join(_MATCH_COLUMNS)} "
                f"  FROM tasks WHERE session_id = ?", (session_id,)):
            fila = dict(zip(_MATCH_COLUMNS, row))
            by_subject[fila["subject"]].append(fila)

        buckets = {name: [] for name in RECONCILE_BUCKETS}
        for ordinal, card in sorted(cards.items(), key=lambda kv: int(kv[0])):
            subject = card.get("subject")
            board = {name: card.get(name) for name in RECONCILED_FIELDS}
            matches = by_subject.get(subject, [])
            if len(matches) > 1:
                buckets["ambiguous"].append(
                    {"ordinal": ordinal, "subject": subject,
                     "citations": [m["citation_id"] for m in matches]})
            elif not matches:
                buckets["absent"].append(
                    {"ordinal": ordinal, "subject": subject,
                     "board_status": board.get("status")})
            else:
                fila = matches[0]
                # `None` y `""` son el mismo «sin texto» a efectos de
                # convergencia: una columna nula y una tarjeta sin la clave no
                # son una divergencia que escribir.
                drifted = [name for name in RECONCILED_FIELDS
                           if (fila[name] or "") != (board[name] or "")]
                if PRIMARY_RECONCILED_FIELD in drifted:
                    target = "status_drift"
                elif drifted:
                    target = "field_drift"
                else:
                    target = "same"
                entrada = {"ordinal": ordinal, "subject": subject,
                           "citation": fila["citation_id"],
                           "task_id": fila["task_id"], "drifted": drifted}
                for name in RECONCILED_FIELDS:
                    entrada[f"board_{name}"] = board[name]
                    entrada[f"store_{name}"] = fila[name]
                buckets[target].append(entrada)

        written = 0
        pendientes = [e for name in DRIFT_BUCKETS for e in buckets[name]]
        if apply_changes and pendientes:
            stamp = task_ids._now()
            for entry in pendientes:
                # Se escribe SOLO lo que difiere. Un UPDATE de las dos columnas
                # tocaria `description` en una fila cuya divergencia era de
                # estado, y con eso el conteo de escrituras dejaria de decir
                # que se corrigio.
                sets, valores = [], []
                for name in RECONCILED_FIELDS:
                    if name in entry["drifted"]:
                        sets.append(f"{name} = ?")
                        valores.append(entry[f"board_{name}"])
                conn.execute(
                    f"UPDATE tasks SET {', '.join(sets)}, updated_at = ? "
                    " WHERE session_id = ? AND citation_id = ?",
                    (*valores, stamp, session_id, entry["citation"]))
                written += 1
            conn.commit()
    finally:
        conn.close()
    return {"buckets": buckets, "total_cards": len(cards),
            "written": written, "applied": bool(apply_changes)}


def _cmd_reconcile_status(args: argparse.Namespace) -> int:
    result = reconcile_status(args.store, args.sesion, board_dir=args.board,
                              apply_changes=args.aplicar)
    buckets = result["buckets"]
    total = result["total_cards"]
    print(f"reconciliar-estados: sesion {args.sesion}")
    print(f"  universo: {total} tarjeta(s) del board")
    for name in RECONCILE_BUCKETS:
        print(f"  {name:14s} {len(buckets[name]):5d}")
    covered = sum(len(buckets[name]) for name in RECONCILE_BUCKETS)
    if covered != total:
        # El descuadre se publica, no se calla: si los cubos no cubren el
        # universo, el conteo de arriba no se puede leer.
        print(f"  ATENCION: los cubos suman {covered} y el universo es {total}")
    pendientes = [e for name in DRIFT_BUCKETS for e in buckets[name]]
    for entry in sorted(pendientes, key=lambda e: int(e["ordinal"])):
        # La flecha va del store al board: es la direccion de la escritura,
        # no el orden en que se leyeron las dos columnas.
        campos = ",".join(entry["drifted"])
        print(f"    #{entry['ordinal']:<5} {entry['citation']:<18} "
              f"{campos:<20} {entry['store_status']:>12} -> "
              f"{entry['board_status']:<12} {entry['subject'][:40]}")
    if result["applied"]:
        print(f"  escritas: {result['written']} fila(s)")
    else:
        print(f"  NO se escribio nada (faltó --aplicar); "
              f"{len(pendientes)} fila(s) quedarian al dia")
    return 0


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
    # El store se declara (THYROX_AGENT_STORE), no se deriva: ver task_ids.
    parser.add_argument("--store", default=None)
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

    p_rec = sub.add_parser(
        "reconciliar-estados",
        help="lleva al store el estado de TODAS las tarjetas, por sujeto (#184)")
    p_rec.add_argument("sesion")
    p_rec.add_argument("--board", default=None,
                       help="directorio de tarjetas (default: el de la sesion)")
    p_rec.add_argument("--aplicar", action="store_true",
                       help="escribe; sin el, solo reporta")
    p_rec.set_defaults(func=_cmd_reconcile_status)

    args = parser.parse_args(argv)
    args.store = str(task_ids.resolve_store(args.store))
    try:
        return args.func(args)
    except (BoardSyncError, task_ids.MappingError) as err:
        # A stderr y sin cifra en stdout: el rehuse no publica un conteo.
        print(f"REHUSA — {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
