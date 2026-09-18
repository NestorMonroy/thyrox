#!/usr/bin/env python3
"""Un censo NO puede crear el store que dice medir.

Mitad ROJA. Medido por conducta con ``bin/assert_no_writes`` sobre el store
real, antes de escribir una linea de este archivo::

    $ bash bin/assert_no_writes -- bash bin/agent_store censo-tablas
    assert_no_writes: 6 escritura(s) intentada(s)
      mkdir        /home/user/thyrox/agent-results
      openat       .../agent_store.sqlite3      O_RDWR|O_CREAT|...
      openat       .../agent_store.sqlite3-shm  O_RDWR|O_CREAT|...
      openat       .../agent_store.sqlite3-wal  O_RDWR|O_CREAT|...
      unlink       .../agent_store.sqlite3-shm
      unlink       .../agent_store.sqlite3-wal

Un CENSO —el instrumento cuyo trabajo declarado es leer— crea el hogar, crea
el archivo, corre el DDL y las migraciones, y al cerrar borra el WAL. Tres
consecuencias, y ninguna es cosmetica:

1. **Vuelve a abrir el grifo de la cascara.** TASK-THYROX-0153 y 0156 cerraron
   la creacion de un store vacio por la via de la RUTA; esta es la misma
   creacion por la via del MODO. Medir desde un consumidor sin store le
   fabrica uno.
2. **Ensucia el arbol en cada lectura**, que es lo que el gate ``Stop`` lee
   como trabajo sin publicar (TASK-THYROX-0151).
3. **Un instrumento que muta lo que mide no puede certificar nada.** Es el
   sub-patron D de ``metrica-decide-la-conclusion.md`` aplicado al medidor.

La correccion es ``connect_readonly``: ``file:...?mode=ro`` con ``uri=True``,
sin ``mkdir``, sin DDL, sin migraciones, y que REHUSA cuando el store no
existe en vez de crearlo. Los tres desenlaces —leyo / rehuso / no existe—
son los que ``check_veredicto_de_gate.py`` exige.

*Metrica:* intencion de escritura vista por el nucleo (``assert_no_writes``) y
conducta de la conexion ante un SELECT, un INSERT y un archivo ausente.
*Ciega a:* las dos aperturas de ``-shm``/``-wal``, que SQLite exige para leer
una base en modo WAL aunque la conexion sea ``mode=ro``. Medido: con
``mode=ro`` caen 4 de las 6 escrituras; esas dos NO caen, y no son mutacion
del contenido. ``immutable=1`` las quitaria y afirmaria que nadie mas escribe
el archivo, que aqui es falso: el hook y el reconciliador escriben.

CONTROL DE ANULACION, medido y no supuesto: delegando ``connect_readonly``
en ``connect`` caen **8 de las 9** aserciones —las tres del caso 1, la del 3 y
las cuatro del 4—, y sobrevive exactamente una: la del caso 2, porque una
conexion de escritura tambien sabe hacer SELECT. Sin las otras ocho el verde
no distinguiria «abre en solo lectura» de «abre y ademas escribe». Bajo la
anulacion el censo imprime nueve tablas recien creadas sobre un directorio que
no existia, que es el defecto en su forma mas legible.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import sqlite3
import sys
import tempfile
from pathlib import Path

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

HERE = reach.thyrox_root()
sys.path.insert(0, str(HERE / "src"))

spec = importlib.util.spec_from_file_location(
    "agent_store", HERE / "src" / "agents" / "agent_store.py")
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)

    print("== 1. store ausente: REHUSA, y no fabrica nada ==")
    ausente = raiz / "sin-store" / "agent-results"
    try:
        store.connect_readonly(ausente)
        check("rehusa con StoreNotFound", "StoreNotFound", "no levanto nada")
    except store.StoreNotFound:
        check("rehusa con StoreNotFound", "StoreNotFound", "StoreNotFound")
    except Exception as error:  # noqa: BLE001 — el tipo es el sujeto del caso
        check("rehusa con StoreNotFound", "StoreNotFound", type(error).__name__)
    check("no creo el directorio", False, ausente.exists())
    check("no creo el padre", False, ausente.parent.exists())

    print("== 2. store presente: sabe leer ==")
    vivo = raiz / "vivo" / "agent-results"
    conn = store.connect(vivo)
    conn.execute(
        "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, "
        "status, started_at, updated_at) VALUES "
        "('a-1', 'general-purpose', 's-1', 'completed', '2026-01-01', '2026-01-01')")
    conn.commit()
    conn.close()

    solo_lectura = store.connect_readonly(vivo)
    check("cuenta las filas que hay", 1,
          solo_lectura.execute("SELECT COUNT(*) FROM agent_sessions").fetchone()[0])

    print("== 3. la conexion RECHAZA escribir ==")
    try:
        solo_lectura.execute(
            "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, "
            "status, started_at, updated_at) VALUES "
            "('a-2', 'x', 's-1', 'completed', '2026-01-01', '2026-01-01')")
        solo_lectura.commit()
        check("SQLite rechaza el INSERT", "OperationalError", "el INSERT paso")
    except sqlite3.OperationalError:
        check("SQLite rechaza el INSERT", "OperationalError", "OperationalError")
    solo_lectura.close()

    print("== 4. el censo enrutado: rehusa sobre un store ausente ==")
    # ``--claude-dir`` es argumento DEL SUBCOMANDO, no global: invocarlo antes
    # hace que argparse rechace la linea y salga 2 por su cuenta. Ese 2 y el
    # del rehuse son el MISMO numero, asi que el caso no discriminaria — por
    # eso ademas se lee el mensaje, que argparse no sabe escribir.
    otro = raiz / "censo-sin-store"
    codigo, salida_error = None, io.StringIO()
    try:
        with contextlib.redirect_stderr(salida_error):
            store.main(["censo-tablas", "--claude-dir", str(otro)])
    except SystemExit as salida:
        codigo = salida.code
    check("exit 2 — no midio, no publica conteo", 2, codigo)
    check("el mensaje nombra el store ausente", True,
          "el store no existe" in salida_error.getvalue())
    check("el censo no fabrico el store", False,
          (otro / "agent-results" / store.DB_FILENAME).exists())
    check("el censo no fabrico ni el hogar", False,
          (otro / "agent-results").exists())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
