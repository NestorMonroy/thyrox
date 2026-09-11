#!/usr/bin/env python3
"""Control del cache de trabajo-ya-hecho de dos escalones — mitad ROJA.

Escrita ANTES de ``src/cache/work_cache.py`` (TDD). Mientras el modulo no
exista, la primera asercion falla y ese fallo es el resultado que se persiste.

Que se esta portando, y de donde
--------------------------------
``2.1.266: bunfs-root/chunk-q6ryma1y.js``. Los dos escalones, verbatim:

  escalon 1 (``Tn``)  ``l=t.filter((d)=>{let h=e.pathToId.get(d.path);
                       if(h===void 0)return!0;let u=e.docs.get(h);
                       return u.size!==d.size||u.mtimeMs!==d.mtimeMs})``
  escalon 2 (en ``gt``) ``if(D?.hash===R&&!e.unverified.has(E)){
                        e.docs.set(E,{...D,size:y.size,mtimeMs:y.mtimeMs}),
                        g++;continue}``
  al cargar (``Cn``)  ``t.unverified.add(n)`` por cada doc del disco.

El escalon 1 **no consulta** ``unverified`` y el 2 **si**. De ahi salen los
casos 4 y 5, que son el nucleo de este control: el ahorro entre procesos vive
en el escalon 1 y es fiel; el escalon 2 rehusa tras cargar de disco, tambien
fiel. No hay divergencia que declarar en ese eje.

Cobertura declarada del porte (``porte-completo-no-parcial.md``)
----------------------------------------------------------------
NO se porta el motor BM25 de la fuente: ``we`` (extraccion a terminos), el
mapa ``terms`` con su codificacion delta de postings, ``b`` (los campos) y los
accesos ``Y``/``te``. Es **divergencia de mecanismo declarada**, no omision:
nuestro documento extraido no es un documento BM25 sino el veredicto de un
gate, y los dos escalones son independientes de que documento sea — lo unico
que exigen es que sea serializable y que haya ``hash``/``size``/``mtime`` por
ruta. Por la misma razon no se porta ``pathToId`` ni el id entero de
documento: existen para el indice invertido, que aqui no hay.

Que haria FALLAR a este control (sub-patron D de
``metrica-decide-la-conclusion.md``) — cada caso declara su anulacion:

1. presencia: que el modulo no exponga alguno de los simbolos del porte.
2. escalon 1 entre procesos: que consultara ``unverified``; ahi el reuso tras
   cargar de disco seria 0 y esta asercion caeria.
3. escalon 1 discrimina: que ignorara el stat; ahi ``to_index`` saldria vacio
   con un archivo tocado y esta asercion caeria.
4. escalon 2 rehusa tras disco: que NO consultara ``unverified``; ahi
   ``rehashed_unchanged`` saldria 1 en vez de 0.
5. escalon 2 ataja en proceso: que el escalon 2 no existiera; ahi
   ``rehashed_unchanged`` saldria 0 y ``updated`` 1.
6. raiz ausente: que ``sync_index`` no tuviera el guard ``root_missing``; ahi
   el indice quedaria vaciado por un montaje caido.
7. persistencia: que ``persist`` no exigiera ``scan_completed``; ahi un
   barrido abortado se congelaria en disco como si fuera completo.
8. huella de config: que la huella se comparara por documento en vez de por
   indice; ahi un cambio de lexico dejaria mitad del indice vivo.

Publica su conteo de aserciones al correr — ``calibration-verified-numbers.md``
prohibe transcribirlo a prosa.
"""
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

#: El bootstrap de arriba es la UNICA aritmetica admitida (tarea #228).
THYROX = reach.thyrox_root()

PASS = FAIL = 0


def check(label, expected, actual):
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok   {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n       esperado: {expected!r}\n       obtenido: {actual!r}")


print("test_work_cache:")

# --------------------------------------------------------------------------
# 1. PRESENCIA — el quinto instrumento de `niveles-de-retencion.md`: el unico
#    que puede fallar por una AUSENCIA. Las piezas se enumeran aqui, antes de
#    que exista el modulo, para que su conteo sea `N de M` y no un binario.
# --------------------------------------------------------------------------
PIECES = (
    "FileStat", "IndexOptions", "DiffResult", "SyncLedger", "WorkIndex",
    "diff_against_index", "sync_index", "serialize", "deserialize",
    "has_changes", "persist", "load", "INDEX_FILE_NAME", "MAX_INDEX_BYTES",
)

try:
    from cache import work_cache  # noqa: E402
except ImportError as exc:
    work_cache = None
    print(f"  (el modulo aun no existe: {exc})")

present = [p for p in PIECES if work_cache is not None and hasattr(work_cache, p)]
check(f"las {len(PIECES)} piezas del porte estan presentes",
      len(PIECES), len(present))

if work_cache is None:
    print(f"test_work_cache: {PASS + FAIL} aserciones — {PASS} ok, {FAIL} falla(s)")
    sys.exit(1)


def stats_of(root):
    """El resultado de barrido que `gt` recibe de `An`, con stat real."""
    out = []
    for p in sorted(root.rglob("*.txt")):
        st = p.stat()
        out.append(work_cache.FileStat(path=str(p.relative_to(root)),
                                       size=st.st_size,
                                       mtime_ms=st.st_mtime * 1000))
    return tuple(out)


def extract(path, text):
    """El sustituto de `we`: aqui el «documento» es el veredicto del gate."""
    return {"path": path, "words": len(text.split())}


FINGERPRINT = "lexico-v1"

# --------------------------------------------------------------------------
# 2 y 3. EL ESCALON 1 — y su discriminacion.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    (root / "a.txt").write_text("uno dos tres\n")
    (root / "b.txt").write_text("cuatro cinco\n")

    index = work_cache.WorkIndex()
    first = work_cache.sync_index(index, root, stats_of(root), extract)
    check("primer barrido: dos documentos nuevos", 2, first.added)
    check("primer barrido: el barrido termino", True, first.scan_completed)

    # El viaje entre procesos: se serializa, se carga, y el escalon 1 tiene que
    # reconocer los dos por su stat SIN releerlos. Es el ahorro que un gate
    # necesita, y la fuente lo da por construccion: `Tn` no mira `unverified`.
    payload = work_cache.serialize(index, FINGERPRINT)
    reloaded = work_cache.deserialize(payload, FINGERPRINT)
    check("al cargar de disco, todo queda marcado sin verificar",
          2, len(reloaded.unverified))

    diff = work_cache.diff_against_index(reloaded, stats_of(root), (), (),
                                         lambda path: False)
    check("escalon 1 entre procesos: nada que reindexar", 0, len(diff.to_index))
    check("escalon 1 entre procesos: los dos cuentan como sin cambio",
          2, diff.unchanged_count)

    # Discriminacion: un archivo con otro stat SI entra, y solo ese.
    (root / "a.txt").write_text("uno dos tres cuatro\n")
    diff2 = work_cache.diff_against_index(reloaded, stats_of(root), (), (),
                                          lambda path: False)
    check("escalon 1 discrimina: entra solo el que cambio de stat",
          ["a.txt"], [f.path for f in diff2.to_index])

# --------------------------------------------------------------------------
# 4. EL ESCALON 2 REHUSA TRAS CARGAR DE DISCO — el caso del fork.
#    Mismo contenido (mismo hash), stat distinto, indice venido de disco.
#    La fuente rehusa el atajo: `!e.unverified.has(E)`.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    f = root / "a.txt"
    f.write_text("uno dos tres\n")

    index = work_cache.WorkIndex()
    work_cache.sync_index(index, root, stats_of(root), extract)
    reloaded = work_cache.deserialize(work_cache.serialize(index, FINGERPRINT),
                                      FINGERPRINT)

    # Tocar: el contenido no cambia, el stat si.
    import os
    os.utime(f, (0, 0))

    ledger = work_cache.sync_index(reloaded, root, stats_of(root), extract)
    check("escalon 2 tras disco: NO ataja (el doc esta sin verificar)",
          0, ledger.rehashed_unchanged)
    check("escalon 2 tras disco: re-extrae y cuenta como actualizado",
          1, ledger.updated)
    check("escalon 2 tras disco: y ya no queda sin verificar",
          0, len(reloaded.unverified))

# --------------------------------------------------------------------------
# 5. EL ESCALON 2 SI ATAJA DENTRO DEL PROCESO — indice fresco, no de disco.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    f = root / "a.txt"
    f.write_text("uno dos tres\n")

    index = work_cache.WorkIndex()
    work_cache.sync_index(index, root, stats_of(root), extract)
    import os
    os.utime(f, (0, 0))

    ledger = work_cache.sync_index(index, root, stats_of(root), extract)
    check("escalon 2 en proceso: ataja la extraccion",
          1, ledger.rehashed_unchanged)
    check("escalon 2 en proceso: no cuenta como actualizado", 0, ledger.updated)

# --------------------------------------------------------------------------
# 6. RAIZ AUSENTE CON INDICE POBLADO — `if(r.rootMissing&&e.docs.size>0)`.
#    Un montaje caido no vacia el indice.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    (root / "a.txt").write_text("uno dos tres\n")
    index = work_cache.WorkIndex()
    work_cache.sync_index(index, root, stats_of(root), extract)

    ledger = work_cache.sync_index(index, root / "no-existe", (), extract,
                                   root_missing=True)
    check("raiz ausente: el indice conserva sus documentos", 1, len(index.docs))
    check("raiz ausente: el ledger no declara barrido completo",
          False, ledger.scan_completed)

# --------------------------------------------------------------------------
# 7. NO SE PERSISTE UN BARRIDO INCOMPLETO — `if(!e.persistable||
#    !e.lastSync.scanCompleted)`.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    (root / "a.txt").write_text("uno dos tres\n")
    index = work_cache.WorkIndex()
    full = work_cache.sync_index(index, root, stats_of(root), extract)

    destino = root / work_cache.INDEX_FILE_NAME
    partial = work_cache.SyncLedger(added=1, scan_completed=False)
    check("barrido incompleto: no persiste",
          False, work_cache.persist(destino, index, partial, FINGERPRINT))
    check("barrido incompleto: no dejo archivo", False, destino.exists())
    check("barrido completo: si persiste",
          True, work_cache.persist(destino, index, full, FINGERPRINT))

    # 8. La huella de config rechaza el INDICE ENTERO, no un documento.
    otro = work_cache.load(destino, "lexico-v2")
    check("otra huella: el indice entero se rechaza", 0, len(otro.docs))
    mismo = work_cache.load(destino, FINGERPRINT)
    check("misma huella: el indice se reusa entero", 1, len(mismo.docs))

# --------------------------------------------------------------------------
# 9. `to_remove` — lo que desaparece del barrido sale del indice.
# --------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    (root / "a.txt").write_text("uno\n")
    (root / "b.txt").write_text("dos\n")
    index = work_cache.WorkIndex()
    work_cache.sync_index(index, root, stats_of(root), extract)
    (root / "b.txt").unlink()
    ledger = work_cache.sync_index(index, root, stats_of(root), extract)
    check("el archivo que desaparece sale del indice", 1, ledger.removed)
    check("y el otro sigue dentro", ["a.txt"], sorted(index.docs))

# --------------------------------------------------------------------------
# 10. `has_changes` — `Wn`: los saltos transitorios NO cuentan como cambio.
# --------------------------------------------------------------------------
check("has_changes: un salto transitorio no es un cambio", False,
      work_cache.has_changes(work_cache.SyncLedger(transient_skips=3,
                                                   scan_completed=True)))
check("has_changes: un alta si lo es", True,
      work_cache.has_changes(work_cache.SyncLedger(added=1,
                                                   scan_completed=True)))

print(f"test_work_cache: {PASS + FAIL} aserciones — {PASS} ok, {FAIL} falla(s)")
sys.exit(0 if FAIL == 0 else 1)
