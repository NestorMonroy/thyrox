#!/usr/bin/env python3
"""¿La suite DISCRIMINA las ramas que dice medir? (#613, :ref:`h-docs-224`)

El defecto que este guion busca no es un rojo: es un **verde que no informa**.
Un guard que corta temprano deja sin ejercitar a todo caso cuyo valor esperado
coincida con el que el guard devuelve. La suite sigue verde y no lo denuncia,
así que nadie investiga el caso — y la lógica que ese caso existe para proteger
puede romperse entera sin señal. Es el sub-patrón D de
`metrica-decide-la-conclusion.md` aplicado a nuestra propia suite.

CÓMO LO MIDE. Un candidato por AST y **dos** mutaciones que lo juzgan:

1. **Candidato.** Una función donde un mismo literal es alcanzable desde MÁS DE
   UN sitio de retorno. Un caso que espera ese valor no puede distinguir cuál
   vía corrió — la condición necesaria del defecto, no la suficiente.

2. **Sabotaje** — la función se colapsa a ``raise SystemExit``. Si ninguna suite
   enrojece, **ninguna la ejecuta**: es un hueco de cobertura, no de
   discriminación.

3. **Colapso al literal** — sólo si el sabotaje enrojeció. Si esta vez ninguna
   suite enrojece, la suite **corre** la función y **no distingue** sus ramas.
   Ése es el defecto de :ref:`h-docs-224`.

Las dos mutaciones son necesarias porque un solo paso no separa «la suite mide
mal» de «la suite no mide». Con una sola cifra los dos casos publican lo mismo,
que es el propio defecto que el guion busca — aplicado al instrumento.

QUÉ NO PUEDE VER, y es la mitad que hay que leer antes de creerle un cero:

- **Guards en bash.** El recorrido es AST de Python; las suites y los hooks de
  shell quedan fuera.
- **Guards que devuelven un valor calculado**, no un literal — no hay qué
  comparar entre sitios de retorno.
- **El defecto sin literal repetido.** Un caso puede pasar por la vía
  equivocada sin que dos retornos compartan valor; esa forma no deja rastro
  sintáctico y este instrumento no la busca.
- **Un caller que atrape ``BaseException``** tragaría el sabotaje, y su función
  se reportaría como sin cobertura teniéndola.
- **Una función NO discriminada no es necesariamente un defecto.** Un ``main()``
  con varias salidas de éxito es ambiguo por construcción. El guion reporta; el
  veredicto es de quien lea.

El control positivo es ``reconciliar_store.py::_veredicto``, la función de
:ref:`h-docs-224`: tres retornos de ``('running', None)`` y una suite que sí
los discrimina desde que ese hallazgo cerró. Si el guion deja de verla, está
ciego — y su prueba lo comprueba en los dos sentidos.
"""
from __future__ import annotations

import argparse
import ast
import collections
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent

#: La raíz propia sale del marcador, no de `parents[N]`. Las tres aritméticas
#: que este archivo llevaba —`TESTS`, `ROOTS` y el hogar del ledger— se
#: escribieron cuando el guion vivía en `.claude/scripts/gates/`, y la mudanza a
#: `src/verify/` las dejó apuntando a directorios inexistentes SIN error:
#: `HERE.parent / "tests"` daba `src/tests` (no existe) y
#: `HERE.parent.parent / "hooks"` daba `<raíz>/hooks` (tampoco). Un gate que
#: comete el defecto que mide no puede publicar un veredicto creíble.
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()

#: El instrumento con el que este juez mide. El override por entorno existe
#: por la misma razon que el de `ROOTS`: un control que midiera las suites
#: reales no podria fabricar una suite YA ROJA sin ensuciarlas, y sin ella no
#: hay control que pueda fallar sobre el baseline.
TESTS = pathlib.Path(os.environ["SUITE_DISCRIMINA_TESTS"]) \
    if os.environ.get("SUITE_DISCRIMINA_TESTS") else ROOT / "tests"
SABOTAGE = "raise SystemExit(97)"
MARCA = "# MUTANTE"

#: Las raíces que el barrido de supervivientes recorre. El override por entorno
#: existe para que la prueba pueda montar un árbol sintético: un test que midiera
#: las raíces reales no podría fabricar un superviviente sin ensuciarlas, y sin
#: superviviente no hay control que pueda fallar.
#: Las raíces del universo. Desde la organización por clase (2026-08-27) este
#: guion vive en `scripts/gates/`, así que `HERE` dejó de ser la raíz de los
#: guiones: sería una **raíz muerta** que mide 22 de los 82 archivos y publica
#: su cero como si fuera del árbol. Se declara `scripts/` y `hooks/`, y el
#: recorrido de `candidates()` baja por los subdirectorios de clase.
#:
#: `tests/` queda FUERA por construcción: es el instrumento con el que este
#: juez mide, no el sujeto medido. Incluirlo preguntaría «¿qué suite cubre a
#: esta suite?», que no es la pregunta — y su respuesta siempre sería «ninguna».
ROOTS = tuple(pathlib.Path(p) for p in
              os.environ["SUITE_DISCRIMINA_ROOTS"].split(":")) \
    if os.environ.get("SUITE_DISCRIMINA_ROOTS") \
    else (ROOT / "src", ROOT / "src" / "hooks")

#: Estado de sesión, no registro del proyecto: qué mutación está EN VUELO en
#: este instante. Vive junto al resto de la telemetría local (gitignored), por
#: el mismo criterio con que #305 resolvió el ledger de ``esperar-trabajos``.
#: ``HERE`` es ``gates/`` desde la mudanza por clase, asi que el hogar de la
#: telemetria queda DOS saltos arriba. Se deriva con un bucle explicito y no
#: con una cadena de ``.parent``: el conteo a mano es lo que se olvida al
#: mudar, y aqui ya se olvido una vez —el guion creo un segundo
#: ``agent-results`` bajo ``scripts/``, fuera del ``.gitignore`` que protege al
#: canonico. Ver :ref:`h-docs-471`.
_CLAUDE = ROOT
LEDGER = pathlib.Path(os.environ.get(
    "SUITE_DISCRIMINA_LEDGER",
    _CLAUDE / "agent-results" / "mutantes-en-vuelo.jsonl"))

#: El nombre heredado. El ledger era un ARREGLO JSON reescrito entero en cada
#: cambio, y eso es dos defectos en el archivo que existe para sobrevivir a la
#: muerte del proceso: morir a mitad del `write_text` pierde las entradas
#: previas, y la forma contradice la directiva de THYROX (JSONL). Hoy se AÑADE
#: una linea por evento; el arreglo se sigue LEYENDO para no perder el ledger
#: de una sesion anterior, igual que `manifest.py` hace con `manifest.json`.
LEGACY_LEDGER_SUFFIX = ".json"

#: Los tres tipos de registro del ledger. `open`/`close` son el par en vuelo que
#: ya existia; `verdict` es el CURSOR, y sin el una ejecucion acotada volveria a
#: juzgar los mismos primeros N para siempre — la cota seria un juguete.
KIND_OPEN, KIND_CLOSE, KIND_VERDICT = "open", "close", "verdict"

#: La marca **insertada**, que no es la que este archivo define. La mutación
#: escribe ``<sangría><sentencia>  # MUTANTE``; una línea que sólo declare la
#: constante no termina en el marcador. Sin esa distinción el barrido se
#: reportaría a sí mismo y su cero dejaría de significar nada.
INSERTADA = re.compile(r"^\s+.*  " + re.escape(MARCA) + r"$", re.M)


def literals_of(node) -> list:
    """Los valores literales que este nodo de retorno puede producir.

    Recorre el ternario porque el retorno final de una función suele tener esa
    forma, y ahí es donde vive la mitad tardía del literal ambiguo: sin esta
    rama el instrumento no ve su propio control positivo.
    """
    if node is None:
        return []
    if isinstance(node, ast.Constant):
        return [repr(node.value)]
    if isinstance(node, ast.Tuple) and all(isinstance(e, ast.Constant) for e in node.elts):
        return [repr(tuple(e.value for e in node.elts))]
    if isinstance(node, ast.IfExp):
        return literals_of(node.body) + literals_of(node.orelse)
    return []


def ambiguous_literals(fn) -> dict:
    """Literal -> cuántos sitios de retorno lo producen, cuando son más de uno."""
    tally = collections.Counter()
    for sub in ast.walk(fn):
        if isinstance(sub, ast.Return):
            for value in literals_of(sub.value):
                tally[value] += 1
    return {v: n for v, n in tally.items() if n > 1}


def candidates():
    """(ruta, nombre, línea, literal, sitios) por cada función ambigua."""
    found, files, functions = [], 0, 0
    for root in ROOTS:
        for path in sorted(root.rglob("*.py")):
            if path.resolve() == pathlib.Path(__file__).resolve():
                continue
            if "tests" in path.parts:
                continue
            try:
                tree = ast.parse(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            files += 1
            for fn in [n for n in ast.walk(tree)
                       if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]:
                functions += 1
                for value, sites in ambiguous_literals(fn).items():
                    found.append((path, fn.name, fn.lineno, value, sites))
    return found, files, functions


def suites_naming(path: pathlib.Path) -> list:
    """Las suites cuyo texto nombra este archivo.

    Es una cota SUPERIOR de quién lo ejercita: una suite que sólo lo menciona
    —crear un archivo vacío con ese nombre, citarlo en un comentario— entra
    aquí igual. Por eso el veredicto no sale de esta lista sino del sabotaje,
    que sí distingue mención de ejecución.
    """
    propio = pathlib.Path(__file__).name
    suites = []
    # `rglob`, no `glob`: las suites viven en subdirectorios
    # (`tests/verify/`, `tests/session/`, `tests/hooks/`) y en la RAÍZ de
    # `tests/` no hay ninguna. Con el glob plano esta función devolvía la
    # lista vacía SIEMPRE, así que todo candidato caía en `sin_suite`, el
    # juez no se invocaba nunca y `--strict` no podía fallar por
    # construcción. Medido antes del arreglo: «159 sin cobertura,
    # 0 mutada(s) dos veces» — el titular decía hallazgo y el denominador
    # decía «no miré». Sub-patrón D con el propio gate como sujeto.
    for s in sorted(TESTS.rglob("test-*.sh")):
        texto = s.read_text(encoding="utf-8", errors="ignore")
        if path.name not in texto:
            continue
        # Una suite que invoca a ESTE guion no se corre: la recursion mutaria
        # los mismos archivos desde dentro y restauraria sobre un respaldo ya
        # mutado, apilando mutantes en el arbol. Medido: una sola corrida dejo
        # 9 lineas en check_rst_sintaxis.py y 96 en register_agent_session.py,
        # con `git status` limpio en el momento de capturarlo. Ver H-DOCS-241.
        if propio in texto:
            continue
        suites.append(s)
    return suites


#: Las claves que el ledger escribia en español. Una clave es un atributo, y los
#: atributos van en ingles (`identificadores-en-ingles.md`). El ESCRITOR emite
#: solo la forma inglesa; el LECTOR normaliza las dos, para no perder el ledger
#: que una sesion anterior dejo a medias. Es la misma forma permanente que
#: `workbench/manifest.py` adopto para el nombre del archivo.
LEGACY_KEYS = {
    "archivo": "file",
    "funcion": "function",
    "sentencia": "statement",
    "desde": "since",
}


#: El mapa inverso, para devolver un ledger heredado a su forma al podarlo.
ENGLISH_TO_LEGACY_KEYS = {value: key for key, value in LEGACY_KEYS.items()}


def normalize_keys(record: dict) -> dict:
    """Traduce las claves heredadas a su forma inglesa, sin tocar el resto."""
    return {LEGACY_KEYS.get(key, key): value for key, value in record.items()}


def denormalize_keys(record: dict) -> dict:
    """La vuelta: sólo para reescribir un ledger que YA era heredado."""
    return {ENGLISH_TO_LEGACY_KEYS.get(key, key): value
            for key, value in record.items()}


def ledger_records() -> list:
    """Todos los registros, en orden de escritura. Despacha por SUFIJO.

    ``.json`` declara un documento entero —el arreglo heredado, cuyos elementos
    no llevan ``kind`` y son mutaciones abiertas por construccion—; ``.jsonl``
    declara lineas. Un respaldo de documento dentro del lector de lineas
    reintroduciria la trampa de n=1: ``json.loads`` acepta un JSONL de una sola
    linea, asi que un lector que lo intentara pasaria sin ser lector de lineas.
    """
    try:
        raw = LEDGER.read_text(encoding="utf-8")
    except FileNotFoundError:
        return []
    if LEDGER.suffix == LEGACY_LEDGER_SUFFIX:
        try:
            entries = json.loads(raw) if raw.strip() else []
        except json.JSONDecodeError:
            return []
        return [normalize_keys(dict(e, kind=e.get("kind", KIND_OPEN)))
                for e in entries]
    records = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            records.append(normalize_keys(json.loads(line)))
        except json.JSONDecodeError:
            continue           # una linea truncada por la muerte del proceso
    return records


def ledger_append(record: dict) -> None:
    """Añade UN registro. El append es la mitad que hace seguro al ledger.

    El arreglo JSON se reescribia entero: morir a mitad de esa escritura perdia
    las entradas previas, que son justo el rastro que el ledger existe para
    conservar. Un ``append`` sobre un archivo abierto en modo ``a`` no puede
    pisar lo ya escrito — como mucho deja una ultima linea truncada, y
    ``ledger_records`` la descarta sin perder las anteriores.
    """
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with LEDGER.open("a", encoding="utf-8") as sink:
        sink.write(json.dumps(record, ensure_ascii=False) + "\n")


def ledger_rewrite(records: list) -> None:
    """Reescribe el ledger entero. SOLO para la poda, que no tiene otra forma.

    Conserva la FORMA que el archivo ya tenia. Podar un ledger heredado
    escribiendolo como lineas lo dejaria con nombre ``.json`` y contenido JSONL:
    su propio lector volveria a leerlo como arreglo, fallaria el parseo y
    devolveria la lista vacia — o sea, la poda habria BORRADO el ledger sin
    emitir un byte de aviso.
    """
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    if LEDGER.suffix == LEGACY_LEDGER_SUFFIX:
        # El arreglo heredado no lleva `kind` y sus claves van en español: se
        # escribe COMO ESTABA. Ascender las claves aqui dejaria un archivo con
        # nombre heredado y contenido nuevo — una tercera forma que nadie
        # declaro, y la promesa de esta funcion es justo la contraria.
        plain = [denormalize_keys({k: v for k, v in r.items() if k != "kind"})
                 for r in records]
        LEDGER.write_text(json.dumps(plain, indent=2, ensure_ascii=False) + "\n",
                          encoding="utf-8")
        return
    LEDGER.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records),
        encoding="utf-8")


def ledger_read() -> list:
    """Las mutaciones ABIERTAS: las que tienen ``open`` sin su ``close``.

    Se pliega por ``(file, function)`` quedandose con el ultimo registro de
    ese par. Un par cuyo ultimo evento es ``open`` sigue en vuelo; uno cuyo
    ultimo evento es ``close`` ya se restauro.
    """
    last: dict = {}
    for record in ledger_records():
        kind = record.get("kind", KIND_OPEN)
        if kind not in (KIND_OPEN, KIND_CLOSE):
            continue
        last[(record.get("file"), record.get("function"))] = record
    return [r for r in last.values() if r.get("kind", KIND_OPEN) == KIND_OPEN]


def fingerprint(path: pathlib.Path, suites: list) -> str:
    """La huella de un candidato: su fuente MAS la de cada suite que lo juzga.

    Anclar el cursor solo al sujeto dejaria al gate ciego a un cambio de SUITE,
    y el veredicto depende de las dos: ``sin-cobertura`` pasa a ``ok`` en cuanto
    una suite empieza a ejercer la funcion, sin que el sujeto cambie un byte.
    Un cursor que no lo viera publicaria un veredicto caducado como vigente —
    el sub-patron D con el propio cursor de sujeto.
    """
    digest = hashlib.sha256()
    for source in [path] + sorted(suites):
        try:
            digest.update(source.read_bytes())
        except OSError:
            digest.update(b"<ilegible>")
        digest.update(b"\0")
    return digest.hexdigest()


def judged_index() -> dict:
    """``(file, function, literal) -> fingerprint`` de lo ya juzgado.

    Es el CURSOR. Sin el, cada ejecucion acotada vuelve a juzgar los mismos
    primeros N y el barrido no progresa nunca.
    """
    index: dict = {}
    for record in ledger_records():
        if record.get("kind") != KIND_VERDICT:
            continue
        index[(record.get("file"), record.get("function"),
               record.get("literal"))] = record.get("fingerprint")
    return index


def ledger_open(path: pathlib.Path, fn_name: str, statement: str) -> None:
    """Anota la mutación **antes** de que aterrice en el disco.

    El orden no es cosmético. ``judge`` restaura desde un ``finally``, y un
    ``finally`` protege contra una excepción pero **no contra la muerte del
    proceso**: un SIGKILL, un timeout del harness o el reciclado del contenedor
    lo saltan, y el respaldo vive en un ``mkdtemp()`` que muere con él. Eso es
    lo que dejó un mutante vivo en ``register_agent_session.py``
    (:ref:`h-docs-307`), anulando en silencio la captura de causa de muerte.

    La asimetría es deliberada: si el proceso muere entre esta anotación y la
    escritura, sobra una entrada — ruido inofensivo que ``--verificar`` nombra
    como residual. Al revés faltaría el rastro, y el mutante quedaría ciego.
    """
    ledger_append({
        "kind": KIND_OPEN,
        "file": str(path),
        "function": fn_name,
        "statement": statement,
        "since": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
    })


def ledger_close(path: pathlib.Path, fn_name: str) -> None:
    ledger_append({
        "kind": KIND_CLOSE,
        "file": str(path),
        "function": fn_name,
        "since": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
    })


def ledger_verdict(path: pathlib.Path, fn_name: str, value: str,
                   mark: str, verdict: str) -> None:
    """Asienta el veredicto de un candidato YA restaurado. Es el cursor.

    Se llama **despues** de que ``judge`` devuelva, nunca antes: un veredicto
    escrito sobre un juicio interrumpido haria que la ejecucion siguiente
    saltara un candidato que nadie midio.
    """
    ledger_append({
        "kind": KIND_VERDICT,
        "file": str(path),
        "function": fn_name,
        "literal": value,
        "fingerprint": mark,
        "verdict": verdict,
        "since": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
    })


def survivors() -> tuple[list, list, int]:
    """``(declarados, con_marca, archivos_medidos)`` — dos detectores, no uno.

    Ninguno cubre al otro, y por eso están los dos:

    - el **ledger** dice desde cuándo, pero no ve un mutante anterior a que
      existiera ni uno cuya anotación se perdiera;
    - el **barrido de la marca** ve el archivo sucio sin saber desde cuándo, y
      es el único que atrapa a un mutante que nadie anotó.

    Un cero de uno solo no es un cero de supervivientes.
    """
    declared = ledger_read()
    marked, measured = [], 0
    for root in ROOTS:
        for path in sorted(root.rglob("*.py")):
            if "tests" in path.parts:
                continue
            measured += 1
            if INSERTADA.search(path.read_text(encoding="utf-8", errors="replace")):
                marked.append(path)
    return declared, marked, measured


def ledger_prune_missing() -> int:
    """Retira las entradas cuyo archivo ya no existe; devuelve cuántas.

    Es la única poda segura. Una entrada sobre un archivo **ausente** no puede
    ser un mutante vivo bajo ninguna lectura —no hay archivo que restaurar— y
    sin ella el ledger crece sin cota: cada mutación sobre un temporal deja su
    rastro cuando el directorio se borra al terminar.

    Una entrada sobre un archivo que **existe y está limpio** NO se poda: puede
    ser el rastro de alguien que restauró a mano sin cerrar, y ahí el residual
    es información.
    """
    records = ledger_records()
    alive = [r for r in records if pathlib.Path(r.get("file", "")).exists()]
    if len(alive) != len(records):
        ledger_rewrite(alive)
    # El conteo es de MUTACIONES podadas, no de registros: un par open+close del
    # mismo archivo ausente son dos registros y una sola entrada para quien lee
    # el reporte. Contar registros publicaria el doble sin que nada lo delatara.
    pruned = {(r.get("file"), r.get("function")) for r in records} \
        - {(r.get("file"), r.get("function")) for r in alive}
    return len(pruned)


def report_survivors() -> int:
    """Imprime el veredicto de ``survivors()``; devuelve el número de sucios."""
    pruned = ledger_prune_missing()
    declared, marked, measured = survivors()
    dirty = {str(p) for p in marked}
    noted = {e.get("file") for e in declared}

    print(f"check-suite-discrimina --verificar: {len(marked)} mutante(s) vivo(s) "
          f"(alcance medido: {measured} archivos .py bajo "
          f"{', '.join(r.name for r in ROOTS)}; {len(declared)} en el ledger)")

    for entry in declared:
        state = "VIVO" if entry.get("file") in dirty else "residual"
        print(f"  {state:<8} {entry.get('file')} :: {entry.get('function')}() "
              f"-> {entry.get('statement')}  desde {entry.get('since')}")
    for path in marked:
        if str(path) not in noted:
            print(f"  VIVO     {path}  SIN anotación — anterior al ledger, "
                  f"o su entrada se perdió")
    if pruned:
        print(f"  (podadas {pruned} entrada(s) de archivos que ya no existen)")
    return len(marked)


def mutate(path: pathlib.Path, fn_name: str, statement: str) -> bool:
    """Inserta ``statement`` como primera sentencia ejecutable de la función.

    Escribe en el sitio a propósito: la suite invoca la ruta real, así que una
    copia en otro directorio no mediría nada. El llamador restaura desde su
    respaldo pase lo que pase.
    """
    source = path.read_text(encoding="utf-8")
    # Un archivo que ya trae el marcador esta mutado: mutarlo otra vez apila, y
    # el respaldo del llamador ya salio de esa version. Se rehusa en vez de
    # empeorarlo — el cinturon del fallo que la recursion produjo (H-DOCS-241).
    if MARCA in source:
        raise RuntimeError(f"{path.name} ya contiene un mutante sin restaurar")
    tree = ast.parse(source)
    target = next((n for n in ast.walk(tree)
                   if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                   and n.name == fn_name), None)
    if target is None or not target.body:
        return False
    first = target.body[0]
    # Un docstring no es la primera sentencia ejecutable: la mutación va después.
    if (isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant)
            and isinstance(first.value.value, str) and len(target.body) > 1):
        first = target.body[1]
    lines = source.splitlines(keepends=True)
    indent = " " * first.col_offset
    lines.insert(first.lineno - 1, f"{indent}{statement}  {MARCA}\n")
    ledger_open(path, fn_name, statement)     # el rastro, ANTES que la escritura
    path.write_text("".join(lines), encoding="utf-8")
    return True


#: Veredicto del baseline por suite, medido una vez por ejecucion. Sin cache, el
#: baseline se re-mediria por cada candidata y el coste se multiplicaria por el
#: numero de funciones que esa suite cubre.
_BASELINE_CACHE: dict = {}


def has_green_baseline(suite) -> bool:
    """¿El baseline de esta suite es verde, o ya sale roja sin mutacion?

    Una suite que sale 1 SOBRE EL ARBOL LIMPIO devuelve rojo pase lo que pase:
    su rojo bajo mutacion no informa de la mutacion. Tratarla como control es el
    sub-patron D —un control que no puede fallar por la causa que dice medir— y
    es el defecto que este control cierra: `test-script-naming.sh` sale 1 en
    limpio, asi que las tres funciones de `classify_agents.py` se publicaban
    como `ok` sin que nadie las hubiera ejercido.
    """
    key = str(suite)
    if key not in _BASELINE_CACHE:
        try:
            done = subprocess.run(["bash", str(suite)], capture_output=True,
                                  text=True, timeout=180)
            # Un timeout en el baseline no decide: la suite se descarta,
            # igual que en `any_suite_red` un timeout no cuenta como rojo.
            _BASELINE_CACHE[key] = done.returncode == 0
        except subprocess.TimeoutExpired:
            _BASELINE_CACHE[key] = False
    return _BASELINE_CACHE[key]


def any_suite_red(suites) -> bool:
    for suite in suites:
        try:
            done = subprocess.run(["bash", str(suite)], capture_output=True,
                                  text=True, timeout=180)
        except subprocess.TimeoutExpired:
            continue          # un timeout no es un rojo: es una medición perdida
        if done.returncode != 0:
            return True
    return False


def judge(path, fn_name, value, suites, backup_dir) -> str:
    """``red-baseline`` · ``sin-cobertura`` · ``sin-discriminar`` · ``ok``.

    Cada restauración cierra su entrada del ledger **después** de escribir el
    archivo limpio, por la misma asimetría que ``ledger_open`` explica al revés:
    morir entre la restauración y el cierre deja una entrada de un archivo ya
    limpio, que ``--verificar`` nombra *residual*; cerrarla antes dejaría un
    mutante sin rastro.
    """
    suites = [s for s in suites if has_green_baseline(s)]
    if not suites:
        return "red-baseline"
    backup = backup_dir / f"{path.name}.{fn_name}.bak"
    shutil.copy2(path, backup)
    try:
        if not mutate(path, fn_name, SABOTAGE):
            return "ok"
        if not any_suite_red(suites):
            return "sin-cobertura"
    finally:
        shutil.copy2(backup, path)
        ledger_close(path, fn_name)
    try:
        if not mutate(path, fn_name, f"return {value}"):
            return "ok"
        return "ok" if any_suite_red(suites) else "sin-discriminar"
    finally:
        shutil.copy2(backup, path)
        ledger_close(path, fn_name)


#: El codigo con que un barrido TRUNCADO declara su corte. No es 0 ni 1: un
#: barrido que no recorrio su universo no sostiene ni un verde ni un rojo, y
#: publicar cualquiera de los dos seria el sub-patron D con el propio barrido
#: como sujeto. La forma la fija `bounded_scan.py`, que ya corta con 3.
EXIT_TRUNCATED = 3


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si alguna función queda sin discriminar")
    parser.add_argument("--solo", metavar="ARCHIVO",
                        help="medir sólo las funciones de este archivo")
    parser.add_argument("--verificar", action="store_true",
                        help="no mutar: sólo reportar mutantes vivos en el árbol")
    parser.add_argument("--limit", type=int, default=0, metavar="N",
                        help="juzga como maximo N candidatos y declara su corte "
                             "(0 = sin tope)")
    parser.add_argument("--budget", type=float, default=0.0, metavar="SEGUNDOS",
                        help="corta al agotar este presupuesto de reloj de pared "
                             "(0 = sin tope)")
    args = parser.parse_args()

    if args.verificar:
        return 1 if report_survivors() else 0

    found, files, functions = candidates()
    if args.solo:
        found = [c for c in found if c[0].name == args.solo]

    undiscriminated, uncovered, without_suite, red_baseline = [], [], [], []
    measured = 0
    judged = 0
    skipped = 0
    truncated = ""
    cursor = judged_index()
    deadline = time.monotonic() + args.budget if args.budget > 0 else None
    backup_dir = pathlib.Path(tempfile.mkdtemp(prefix="mutante-"))
    try:
        for path, fn_name, lineno, value, sites in found:
            # LA COTA SE COMPRUEBA AQUI, ENTRE CANDIDATOS. Nunca a mitad de
            # `judge()`: ahi el mutante ya esta escrito en el disco, y cortar
            # dejaria exactamente el huerfano que esta cota existe para evitar
            # (H-THYROX-33 — dos mutantes vivos el mismo dia, uno de ellos
            # `reach.py::env_file_path` devolviendo None incondicional).
            if args.limit and judged >= args.limit:
                truncated = "cota"
                break
            if deadline is not None and time.monotonic() >= deadline:
                truncated = "presupuesto"
                break

            suites = suites_naming(path)
            row = (path.name, fn_name, lineno, value, sites,
                   [s.name for s in suites])
            if not suites:
                without_suite.append(row)
                continue

            # El CURSOR: un candidato cuya huella no cambio ya se juzgo, y
            # re-juzgarlo haria que toda ejecucion acotada volviera a empezar
            # por el principio. La huella cubre el sujeto Y sus suites: el
            # veredicto depende de las dos.
            mark = fingerprint(path, suites)
            # `--solo` es una peticion EXPLICITA de medir ESE archivo, asi que el
            # cursor no la anula: saltarla en silencio porque una tanda anterior
            # ya la juzgo convertiria al gate en un mentiroso justo cuando se le
            # pregunta por algo concreto. Medido al introducir el cursor: el
            # control negativo del caso 6 paso de «3 BASELINE ROJO» a «0» en su
            # segunda corrida, sin que nada en su salida lo delatara.
            if not args.solo and cursor.get((str(path), fn_name, value)) == mark:
                skipped += 1
                continue

            verdict = judge(path, fn_name, value, suites, backup_dir)
            judged += 1
            # El veredicto se asienta DESPUES de que `judge` devuelva: el
            # archivo ya esta restaurado, asi que el cursor nunca salta un
            # candidato cuyo juicio se interrumpio.
            ledger_verdict(path, fn_name, value, mark, verdict)
            if verdict == "red-baseline":
                red_baseline.append(row)
                continue
            measured += 1
            if verdict == "sin-discriminar":
                undiscriminated.append(row)
            elif verdict == "sin-cobertura":
                uncovered.append(row)
    finally:
        shutil.rmtree(backup_dir, ignore_errors=True)

    print(f"check-suite-discrimina: {len(undiscriminated)} sin discriminar, "
          f"{len(uncovered) + len(without_suite)} sin cobertura, "
          f"{len(red_baseline)} con baseline rojo")
    for name, fn_name, lineno, value, sites, suites in undiscriminated:
        print(f"  SIN DISCRIMINAR  {name}:{lineno} {fn_name}() -> {value} "
              f"({sites} retornos); corre bajo {', '.join(suites)} y sigue en verde")
    for name, fn_name, lineno, value, sites, suites in uncovered:
        print(f"  SIN COBERTURA    {name}:{lineno} {fn_name}(); "
              f"{', '.join(suites)} la nombra pero no la ejecuta")
    for name, fn_name, lineno, value, sites, suites in without_suite:
        print(f"  SIN SUITE        {name}:{lineno} {fn_name}()")
    for name, fn_name, lineno, value, sites, suites in red_baseline:
        print(f"  BASELINE ROJO    {name}:{lineno} {fn_name}(); "
              f"{', '.join(suites)} ya sale roja SIN mutacion")
    print(f"  (alcance medido: {files} archivos .py, {functions} funciones, "
          f"{len(found)} con literal ambiguo, {measured} mutada(s) dos veces"
          + (f", {skipped} ya juzgada(s) sin cambio" if skipped else "") + ")")

    # El instrumento se mide a sí mismo antes de devolver su veredicto: hasta
    # hoy nada comprobaba que el árbol quedara limpio, así que un mutante
    # sobreviviente salía con exit 0 y con la suite en verde.
    alive = report_survivors()
    if alive:
        # Un mutante vivo pesa MAS que un corte: el arbol esta sucio y hay que
        # restaurarlo antes que nada. Por eso 1 gana a EXIT_TRUNCATED.
        return 1
    if truncated:
        # El denominador es el universo ENTERO, no el tramo: sin el, «juzgadas
        # 1» no distingue «quedan dos» de «era todo».
        pending = len(found) - judged - skipped - len(without_suite)
        if truncated == "cota":
            print(f"  cota alcanzada: {judged} de {len(found)} juzgada(s) en este "
                  f"tramo; quedan {pending} sin medir. El barrido NO es completo: "
                  f"vuelve a invocarlo para continuar donde quedo.")
        else:
            print(f"  presupuesto agotado tras {args.budget:g} s: {judged} de "
                  f"{len(found)} juzgada(s) en este tramo; quedan {pending} sin "
                  f"medir. El barrido NO es completo.")
        return EXIT_TRUNCATED
    return 1 if (args.strict and undiscriminated) else 0


if __name__ == "__main__":
    sys.exit(main())
