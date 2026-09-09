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
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
TESTS = HERE.parent / "tests"
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
    else (HERE.parent, HERE.parent.parent / "hooks")

#: Estado de sesión, no registro del proyecto: qué mutación está EN VUELO en
#: este instante. Vive junto al resto de la telemetría local (gitignored), por
#: el mismo criterio con que #305 resolvió el ledger de ``esperar-trabajos``.
#: ``HERE`` es ``gates/`` desde la mudanza por clase, asi que el hogar de la
#: telemetria queda DOS saltos arriba. Se deriva con un bucle explicito y no
#: con una cadena de ``.parent``: el conteo a mano es lo que se olvida al
#: mudar, y aqui ya se olvido una vez —el guion creo un segundo
#: ``agent-results`` bajo ``scripts/``, fuera del ``.gitignore`` que protege al
#: canonico. Ver :ref:`h-docs-471`.
_CLAUDE = HERE
for _ in range(2):                      # gates/ -> scripts/ -> .claude/
    _CLAUDE = _CLAUDE.parent
LEDGER = pathlib.Path(os.environ.get(
    "SUITE_DISCRIMINA_LEDGER",
    _CLAUDE / "agent-results" / "mutantes-en-vuelo.json"))

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
    for s in sorted(TESTS.glob("test-*.sh")):
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


def ledger_read() -> list:
    try:
        return json.loads(LEDGER.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def ledger_write(entries: list) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n",
                      encoding="utf-8")


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
    entries = [e for e in ledger_read()
               if not (e.get("archivo") == str(path) and e.get("funcion") == fn_name)]
    entries.append({
        "archivo": str(path),
        "funcion": fn_name,
        "sentencia": statement,
        "desde": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
    })
    ledger_write(entries)


def ledger_close(path: pathlib.Path, fn_name: str) -> None:
    ledger_write([e for e in ledger_read()
                  if not (e.get("archivo") == str(path)
                          and e.get("funcion") == fn_name)])


def survivors() -> tuple[list, list, int]:
    """``(declarados, con_marca, archivos_medidos)`` — dos detectores, no uno.

    Ninguno cubre al otro, y por eso están los dos:

    - el **ledger** dice desde cuándo, pero no ve un mutante anterior a que
      existiera ni uno cuya anotación se perdiera;
    - el **barrido de la marca** ve el archivo sucio sin saber desde cuándo, y
      es el único que atrapa a un mutante que nadie anotó.

    Un cero de uno solo no es un cero de supervivientes.
    """
    declarados = ledger_read()
    con_marca, medidos = [], 0
    for root in ROOTS:
        for path in sorted(root.rglob("*.py")):
            if "tests" in path.parts:
                continue
            medidos += 1
            if INSERTADA.search(path.read_text(encoding="utf-8", errors="replace")):
                con_marca.append(path)
    return declarados, con_marca, medidos


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
    entries = ledger_read()
    vivas = [e for e in entries if pathlib.Path(e.get("archivo", "")).exists()]
    if len(vivas) != len(entries):
        ledger_write(vivas)
    return len(entries) - len(vivas)


def report_survivors() -> int:
    """Imprime el veredicto de ``survivors()``; devuelve el número de sucios."""
    podadas = ledger_prune_missing()
    declarados, con_marca, medidos = survivors()
    sucios = {str(p) for p in con_marca}
    anotados = {e.get("archivo") for e in declarados}

    print(f"check-suite-discrimina --verificar: {len(con_marca)} mutante(s) vivo(s) "
          f"(alcance medido: {medidos} archivos .py bajo "
          f"{', '.join(r.name for r in ROOTS)}; {len(declarados)} en el ledger)")

    for entry in declarados:
        estado = "VIVO" if entry.get("archivo") in sucios else "residual"
        print(f"  {estado:<8} {entry.get('archivo')} :: {entry.get('funcion')}() "
              f"-> {entry.get('sentencia')}  desde {entry.get('desde')}")
    for path in con_marca:
        if str(path) not in anotados:
            print(f"  VIVO     {path}  SIN anotación — anterior al ledger, "
                  f"o su entrada se perdió")
    if podadas:
        print(f"  (podadas {podadas} entrada(s) de archivos que ya no existen)")
    return len(con_marca)


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
    """``sin-cobertura`` · ``sin-discriminar`` · ``ok``, por las dos mutaciones.

    Cada restauración cierra su entrada del ledger **después** de escribir el
    archivo limpio, por la misma asimetría que ``ledger_open`` explica al revés:
    morir entre la restauración y el cierre deja una entrada de un archivo ya
    limpio, que ``--verificar`` nombra *residual*; cerrarla antes dejaría un
    mutante sin rastro.
    """
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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si alguna función queda sin discriminar")
    parser.add_argument("--solo", metavar="ARCHIVO",
                        help="medir sólo las funciones de este archivo")
    parser.add_argument("--verificar", action="store_true",
                        help="no mutar: sólo reportar mutantes vivos en el árbol")
    args = parser.parse_args()

    if args.verificar:
        return 1 if report_survivors() else 0

    found, files, functions = candidates()
    if args.solo:
        found = [c for c in found if c[0].name == args.solo]

    sin_discriminar, sin_cobertura, sin_suite, medidos = [], [], [], 0
    backup_dir = pathlib.Path(tempfile.mkdtemp(prefix="mutante-"))
    try:
        for path, fn_name, lineno, value, sites in found:
            suites = suites_naming(path)
            fila = (path.name, fn_name, lineno, value, sites,
                    [s.name for s in suites])
            if not suites:
                sin_suite.append(fila)
                continue
            medidos += 1
            veredicto = judge(path, fn_name, value, suites, backup_dir)
            if veredicto == "sin-discriminar":
                sin_discriminar.append(fila)
            elif veredicto == "sin-cobertura":
                sin_cobertura.append(fila)
    finally:
        shutil.rmtree(backup_dir, ignore_errors=True)

    print(f"check-suite-discrimina: {len(sin_discriminar)} sin discriminar, "
          f"{len(sin_cobertura) + len(sin_suite)} sin cobertura")
    for nombre, fn_name, lineno, value, sites, suites in sin_discriminar:
        print(f"  SIN DISCRIMINAR  {nombre}:{lineno} {fn_name}() -> {value} "
              f"({sites} retornos); corre bajo {', '.join(suites)} y sigue en verde")
    for nombre, fn_name, lineno, value, sites, suites in sin_cobertura:
        print(f"  SIN COBERTURA    {nombre}:{lineno} {fn_name}(); "
              f"{', '.join(suites)} la nombra pero no la ejecuta")
    for nombre, fn_name, lineno, value, sites, suites in sin_suite:
        print(f"  SIN SUITE        {nombre}:{lineno} {fn_name}()")
    print(f"  (alcance medido: {files} archivos .py, {functions} funciones, "
          f"{len(found)} con literal ambiguo, {medidos} mutada(s) dos veces)")

    # El instrumento se mide a sí mismo antes de devolver su veredicto: hasta
    # hoy nada comprobaba que el árbol quedara limpio, así que un mutante
    # sobreviviente salía con exit 0 y con la suite en verde.
    vivos = report_survivors()
    if vivos:
        return 1
    return 1 if (args.strict and sin_discriminar) else 0


if __name__ == "__main__":
    sys.exit(main())
