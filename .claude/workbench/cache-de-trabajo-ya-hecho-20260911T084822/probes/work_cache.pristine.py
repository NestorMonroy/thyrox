"""El cache de trabajo-ya-hecho, en dos escalones.

Porte de ``2.1.266: bunfs-root/chunk-q6ryma1y.js`` — los simbolos ``Tn``
(escalon 1), ``gt`` (barrido con el escalon 2 dentro), ``kn``/``Cn``
(serializacion), ``bt``/``Et`` (persistencia), ``Wn`` (¿hubo cambio?), ``Pe``
y ``et`` (alta y baja de documento), mas las constantes ``yt``, ``Oe`` y ``N``.

Los dos escalones, y por que son dos
------------------------------------
El **escalon 1** compara ``size`` y ``mtime`` contra el indice y decide que
archivos ni siquiera se abren. El **escalon 2** abre los que pasaron, les
calcula el hash y, si coincide con el que el indice guarda, se salta la
EXTRACCION — que es la parte cara.

La asimetria entre ellos no es un detalle: el escalon 1 **no consulta**
``unverified`` y el escalon 2 **si** (``!e.unverified.has(E)``). Como
``Cn`` marca sin verificar cada documento que viene del disco, un indice
recien cargado ahorra la LECTURA de todo lo que no cambio de stat, y aun asi
vuelve a extraer lo que si cambio. Ese reparto es lo que hace util el cache
entre procesos, y esta portado tal cual.

Cobertura del porte (``porte-completo-no-parcial.md``)
------------------------------------------------------
Lo que NO viaja, con su razon y su desenlace declarado:

- **El motor BM25** (``we``, ``terms``, ``b``, ``Y``, ``te``, ``Ee``, ``fn``,
  ``ue``) y con el ``pathToId`` y el id entero de documento. **Divergencia de
  mecanismo**: aqui el «documento extraido» es el veredicto de un gate, no un
  documento de indice invertido, asi que ``docs`` se indexa por RUTA y la capa
  de postings no tiene contraparte. Los dos escalones son independientes de
  que documento sea: solo exigen ``hash``/``size``/``mtime`` por ruta.
- **``An``, el recorrido del arbol.** El consumidor declara su propia
  enumeracion —cada gate ya sabe que raices recorre— y pasarla como argumento
  es lo que hace que el cache sirva a un gate y no solo a un motor de busqueda.
  Lo que ``An`` producia y aqui se recibe: ``files``, ``skipped``,
  ``skipped_subtrees``, ``cap_dropped`` y ``root_missing``. **Sucesor
  registrado: TASK-DOCS-0534.**

Todo lo demas —incluida la guarda de borrado por realpath, que es la que
impide que un recorrido fallido vacie el indice— esta portado.
"""
from __future__ import annotations

import errno
import hashlib
import json
import pathlib
import stat
from dataclasses import dataclass, field, replace
from typing import Callable, Iterable, Mapping

#: Version del formato del indice — ``yt=10`` en la fuente. Viaja en el sello
#: junto a la huella del consumidor; una discrepancia rechaza el indice ENTERO.
SCHEMA_VERSION = 10

#: ``Oe=67108864``. Por encima de esto el indice no se escribe: un archivo de
#: estado mas grande que su propio corpus no ahorra nada.
MAX_INDEX_BYTES = 67108864

#: La fuente lo llama ``.bm25-index.json``, que nombra su motor. El nuestro
#: nombra su proposito, porque el motor no viaja (ver la cobertura del porte).
INDEX_FILE_NAME = ".work-index.json"

#: ``Pn`` — el error dice que la ruta NO esta: es estructural, y justifica dar
#: de baja. Verbatim: ``ENOENT``, ``ENOTDIR``, ``ELOOP``, ``ENAMETOOLONG``.
STRUCTURAL_ERRNOS = frozenset(
    e for e in (getattr(errno, n, None)
                for n in ("ENOENT", "ENOTDIR", "ELOOP", "ENAMETOOLONG"))
    if e is not None)

#: ``vn`` — el error dice que no se puede mirar, no que no exista.
PERMISSION_ERRNOS = frozenset(
    e for e in (getattr(errno, n, None) for n in ("EACCES", "EPERM"))
    if e is not None)

#: ``ut`` — lo que la fuente convierte en su centinela ``fe``: existe y no es
#: un archivo regular legible. ``ENOTREG`` es de la fuente y no de POSIX, asi
#: que se resuelve por nombre y se omite si el sistema no lo declara.
NOT_REGULAR_ERRNOS = frozenset(
    e for e in (getattr(errno, n, None) for n in ("ENOTREG", "ELOOP", "EFBIG"))
    if e is not None)


def classify_error(exc: OSError) -> str:
    """``A(e)`` — estructural, de permiso, u otro. Solo la primera da de baja."""
    if exc.errno in STRUCTURAL_ERRNOS:
        return "structural"
    if exc.errno in PERMISSION_ERRNOS:
        return "permission"
    return "other"


@dataclass(frozen=True)
class IndexOptions:
    """``N={excludeBasenames:["MEMORY.md"],maxFiles:2000,maxFileBytes:1048576}``."""

    exclude_basenames: frozenset[str] = frozenset({"MEMORY.md"})
    max_files: int = 2000
    max_file_bytes: int = 1048576


DEFAULT_OPTIONS = IndexOptions()


@dataclass(frozen=True)
class FileStat:
    """Lo que el escalon 1 necesita de un archivo: su ruta y su stat."""

    path: str
    size: int
    mtime_ms: float


@dataclass(frozen=True)
class DiffResult:
    """La salida de ``Tn``: que reindexar, que dar de baja, y cuanto se salvo."""

    to_index: tuple[FileStat, ...] = ()
    to_remove: tuple[str, ...] = ()
    unchanged_count: int = 0


@dataclass(frozen=True)
class SyncLedger:
    """Las siete cifras que ``gt`` devuelve. Sin ellas el ahorro no es medible."""

    added: int = 0
    updated: int = 0
    removed: int = 0
    unchanged: int = 0
    rehashed_unchanged: int = 0
    transient_skips: int = 0
    scan_completed: bool = False


@dataclass
class WorkIndex:
    """El indice: un documento por ruta, mas el conjunto sin verificar.

    ``unverified`` es la mitad que hace correcto el cache entre procesos. Un
    documento cargado de disco lleva un hash que NADIE ha comprobado contra el
    archivo de hoy, asi que el escalon 2 no puede confiar en el; el escalon 1
    si, porque compara stat contra stat y el stat lo acaba de leer.
    """

    docs: dict[str, dict] = field(default_factory=dict)
    unverified: set[str] = field(default_factory=set)


def is_excluded(path: str, options: IndexOptions = DEFAULT_OPTIONS) -> bool:
    """``De(y,n)`` — excluido por configuracion, por su nombre de archivo."""
    return pathlib.PurePosixPath(path).name in options.exclude_basenames


def content_hash(text: str) -> str:
    """``ht(v)`` — la huella del contenido que el escalon 2 compara."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def put_document(index: WorkIndex, path: str, document, *, hash: str,
                 size: int, mtime_ms: float) -> None:
    """``Pe`` — alta de documento, dando de baja el anterior si lo habia.

    Esa baja previa es la que limpia la marca de sin-verificar (``et`` hace
    ``e.unverified.delete(t)``), y por eso un documento re-extraido deja de
    estar sin verificar sin que nadie lo borre a mano.
    """
    if path in index.docs:
        drop_document(index, path)
    index.docs[path] = {"path": path, "hash": hash, "size": size,
                        "mtime_ms": mtime_ms, "document": document}


def drop_document(index: WorkIndex, path: str) -> bool:
    """``k``/``et`` — baja de documento. Devuelve si habia algo que dar de baja."""
    if path not in index.docs:
        return False
    del index.docs[path]
    index.unverified.discard(path)
    return True


def diff_against_index(index: WorkIndex, files: Iterable[FileStat],
                       skipped: Iterable[str] = (),
                       skipped_subtrees: Iterable[str] = (),
                       is_forced: Callable[[str], bool] | None = None,
                       ) -> DiffResult:
    """EL ESCALON 1 — ``Tn``, verbatim en su forma.

    Decide sin abrir un solo archivo. Y **no mira ``unverified``**: esa
    omision es el porte, no un descuido — es lo que deja que un indice recien
    cargado de disco ahorre la lectura de todo lo que no cambio de stat.
    """
    files = tuple(files)
    present = {f.path for f in files}
    skipped = set(skipped)
    prefixes = tuple(f"{s}/" for s in skipped_subtrees)
    forced = is_forced or (lambda _path: False)

    def under_skipped_subtree(path: str) -> bool:
        return any(path.startswith(p) for p in prefixes)

    to_remove = tuple(
        path for path in index.docs
        if forced(path) is True
        or (path not in present and path not in skipped
            and not under_skipped_subtree(path))
    )

    def changed(f: FileStat) -> bool:
        doc = index.docs.get(f.path)
        if doc is None:
            return True
        return doc["size"] != f.size or doc["mtime_ms"] != f.mtime_ms

    to_index = tuple(f for f in files if changed(f))
    return DiffResult(to_index=to_index, to_remove=to_remove,
                      unchanged_count=len(files) - len(to_index))


def sync_index(index: WorkIndex, root: pathlib.Path,
               files: Iterable[FileStat],
               extract: Callable[[str, str], object],
               *,
               skipped: Iterable[str] = (),
               skipped_subtrees: Iterable[str] = (),
               cap_dropped: Iterable[str] = (),
               root_missing: bool = False,
               options: IndexOptions = DEFAULT_OPTIONS,
               is_aborted: Callable[[], bool] | None = None,
               ) -> SyncLedger:
    """``gt`` — el barrido, con el ESCALON 2 dentro.

    El orden de las guardas es el de la fuente y cada una tiene su razon:
    abortado, recorrido imposible, y **raiz ausente con indice poblado**. Esta
    ultima es la que impide que un montaje caido vacie un indice bueno: la
    ausencia de archivos y la imposibilidad de verlos se parecen desde aqui, y
    solo una de las dos justifica dar de baja.
    """
    root = pathlib.Path(root)
    skipped = set(skipped)
    skipped_subtrees = set(skipped_subtrees)
    cap_dropped = set(cap_dropped)
    aborted = is_aborted or (lambda: False)

    # `s` de la fuente: el ledger cero, con `unchanged` ya poblado. Las tres
    # guardas lo devuelven tal cual, y por eso ninguna declara barrido completo.
    zero = SyncLedger(unchanged=len(index.docs))
    if aborted():
        return zero
    if root_missing and index.docs:
        return zero

    diff = diff_against_index(index, files, skipped, skipped_subtrees,
                              lambda path: is_excluded(path, options))

    # La guarda de borrado, en los dos cubos de la fuente. Una baja es
    # INCONDICIONAL si el archivo esta excluido por configuracion o lo solto el
    # tope del recorrido: ahi la ausencia no prueba nada porque nadie lo miro.
    # Es CONFIRMADA si `ft` dice que la ruta ya no es un archivo indexable.
    # Y una ruta que sigue siendo un archivo bueno NO cae en ningun cubo: el
    # que mintio fue el recorrido, y esa baja se cuenta como salto transitorio.
    unconditional, confirmed_gone = [], []
    for path in diff.to_remove:
        if is_excluded(path, options) or path in cap_dropped:
            unconditional.append(path)
        elif _should_drop(root / path, options.max_file_bytes):
            confirmed_gone.append(path)
    # Y ante una sola baja confirmada se exige resolver la raiz: si la raiz no
    # se puede resolver, «el archivo no esta» deja de ser evidencia de nada.
    if not confirmed_gone or _root_resolves(root):
        to_delete = [*unconditional, *confirmed_gone]
    else:
        to_delete = unconditional
    deferred_removals = len(diff.to_remove) - len(to_delete)

    removed = sum(1 for path in to_delete if drop_document(index, path))

    added = updated = rehashed_unchanged = 0
    removed_on_read = transient = 0
    interrupted = False

    for f in diff.to_index:
        if aborted():
            interrupted = True
            break
        outcome, payload = _read(root / f.path, options.max_file_bytes)
        if outcome == "transient":
            transient += 1
            continue
        if outcome == "not-regular":
            if drop_document(index, f.path):
                removed_on_read += 1
            continue
        if outcome == "structural":
            # `pt` — la re-comprobacion. Un error estructural al leer no basta
            # para dar de baja: se confirma que la ruta ya no es indexable Y
            # que la raiz se resuelve. Si cualquiera de las dos falla, es salto.
            if not (_should_drop(root / f.path, options.max_file_bytes)
                    and _root_resolves(root)):
                transient += 1
            elif drop_document(index, f.path):
                removed_on_read += 1
            continue
        if len(payload.encode("utf-8")) > options.max_file_bytes:
            if drop_document(index, f.path):
                removed_on_read += 1
            continue

        digest = content_hash(payload)
        doc = index.docs.get(f.path)
        # EL ESCALON 2 — y su unica condicion extra: que el documento no venga
        # sin verificar. Un hash cargado de disco no prueba nada del archivo.
        if doc is not None and doc["hash"] == digest \
                and f.path not in index.unverified:
            index.docs[f.path] = {**doc, "size": f.size, "mtime_ms": f.mtime_ms}
            rehashed_unchanged += 1
            continue
        existed = doc is not None
        put_document(index, f.path, extract(f.path, payload),
                     hash=digest, size=f.size, mtime_ms=f.mtime_ms)
        if existed:
            updated += 1
        else:
            added += 1

    return SyncLedger(
        added=added,
        updated=updated,
        removed=removed + removed_on_read,
        unchanged=diff.unchanged_count,
        rehashed_unchanged=rehashed_unchanged,
        transient_skips=(transient + deferred_removals
                         + len(skipped) + len(skipped_subtrees)),
        scan_completed=not interrupted,
    )


def has_changes(ledger: SyncLedger) -> bool:
    """``Wn`` — un salto transitorio NO es un cambio: no cambio el indice."""
    return (ledger.added > 0 or ledger.updated > 0 or ledger.removed > 0
            or ledger.rehashed_unchanged > 0)


def serialize(index: WorkIndex, fingerprint: str) -> str:
    """``kn`` — el indice a texto, con su sello de version y huella."""
    return json.dumps({
        "schema": SCHEMA_VERSION,
        "fingerprint": fingerprint,
        "docs": [index.docs[path] for path in sorted(index.docs)],
    }, ensure_ascii=False, sort_keys=True)


def deserialize(payload: str | bytes, fingerprint: str) -> WorkIndex:
    """``Cn`` — y la marca de sin-verificar sobre TODO lo que venga del disco.

    La huella se compara contra el INDICE, no contra cada documento: un cambio
    de configuracion del consumidor invalida el trabajo entero, y medio indice
    vivo bajo una configuracion nueva es peor que ninguno.
    """
    index = WorkIndex()
    try:
        data = json.loads(payload)
    except (ValueError, TypeError):
        return index
    if not isinstance(data, Mapping):
        return index
    if data.get("schema") != SCHEMA_VERSION:
        return index
    if data.get("fingerprint") != fingerprint:
        return index
    for doc in data.get("docs", ()):
        path = doc.get("path")
        if not isinstance(path, str):
            continue
        index.docs[path] = dict(doc)
        index.unverified.add(path)
    return index


def persist(destination: pathlib.Path, index: WorkIndex, ledger: SyncLedger,
            fingerprint: str) -> bool:
    """``Et`` — ``if(!e.persistable||!e.lastSync.scanCompleted)`` no escribe.

    Un barrido abortado congelaria en disco un indice que dice ser completo, y
    el proximo proceso lo creeria: el escalon 1 daria por «sin cambio» lo que
    nunca se llego a mirar. La guarda es la que separa ambas cosas.
    """
    if not ledger.scan_completed:
        return False
    payload = serialize(index, fingerprint)
    if len(payload.encode("utf-8")) > MAX_INDEX_BYTES:
        return False
    destination = pathlib.Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    tmp = destination.with_name(destination.name + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    tmp.replace(destination)
    return True


def load(source: pathlib.Path, fingerprint: str) -> WorkIndex:
    """``bt`` — leer el indice. Ausente, ilegible o de otra huella: vacio."""
    source = pathlib.Path(source)
    try:
        payload = source.read_text(encoding="utf-8")
    except OSError:
        return WorkIndex()
    return deserialize(payload, fingerprint)


def _root_resolves(root: pathlib.Path) -> bool:
    """``ne(t)`` — ¿la raiz se puede resolver ahora mismo?"""
    try:
        root.resolve(strict=True)
        return True
    except OSError:
        return False


def _should_drop(path: pathlib.Path, max_bytes: int | None) -> bool:
    """``ft`` — ¿esta ruta DEBE salir del indice?

    La polaridad es la de la fuente y no la intuitiva: devuelve verdadero
    cuando la ruta ya no es un archivo regular indexable —no existe, no es
    archivo, o no cabe— y falso cuando sigue siendo un archivo bueno. Un fallo
    de `lstat` solo cuenta si es ESTRUCTURAL: un `EACCES` dice que no se puede
    mirar, no que no este, y dar de baja por eso seria perder trabajo bueno.
    """
    try:
        st = path.lstat()
    except OSError as exc:
        return classify_error(exc) == "structural"
    return (not stat.S_ISREG(st.st_mode)
            or (max_bytes is not None and st.st_size > max_bytes))


def _read(path: pathlib.Path, max_bytes: int) -> tuple[str, str]:
    """``lt`` con los centinelas de la fuente, cada uno con otra conducta.

    `not-regular` (``ut``: ``ENOTREG``/``ELOOP``/``EFBIG``) da de baja;
    `structural` manda a la re-comprobacion de ``pt``; y todo lo demas
    —permiso incluido— es transitorio: el archivo esta y hoy no se deja leer.
    """
    try:
        st = path.lstat()
        if not stat.S_ISREG(st.st_mode):
            return "not-regular", ""
        if st.st_size > max_bytes:
            return "not-regular", ""
        return "ok", path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return "not-regular", ""
    except OSError as exc:
        if exc.errno in NOT_REGULAR_ERRNOS:
            return "not-regular", ""
        if classify_error(exc) == "structural":
            return "structural", ""
        return "transient", ""
