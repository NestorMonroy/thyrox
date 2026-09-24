#!/usr/bin/env python3
"""Control de `session.transcripts` — el hogar de los transcripts, DECLARADO.

El defecto que este archivo existe para no repetir se midio el 2026-09-23
sobre la sesion viva: `model_catalog.session_transcript_default` y
`session_restart.transcript_for` hacen el MISMO hallazgo —``*/<sid>.jsonl``
bajo el directorio de proyectos del cliente— con dos desempates distintos, y
sobre esta sesion **discrepaban**::

    model_catalog  : …/-home-user-EANE-Emprendimiento/<sid>.jsonl   5 581 100 B
    session_restart: …/-home-user/<sid>.jsonl                      45 277 263 B

El primero ordena por RUTA y toma el ultimo; el segundo por TAMAÑO. No es una
preferencia de estilo: el de model_catalog leia el 12% de la sesion y publicaba
sus cifras de tokens y de cache sobre esa fraccion, sin denominador que lo
delatara.

Y el hogar mismo tenia seis grafias en el arbol —`expanduser`, `Path.home()`,
dos literales `/root/…` (uno con el slug del proyecto incrustado) y una
bandera—, ninguna declarada. Este modulo lo vuelve una sola, de la familia
`THYROX_<FAMILIA>`, como ya hacen workbench, jobs, rules, reach y cache.

Que haria FALLAR a cada caso (sub-patron D): cada uno declara su anulacion en
su propio docstring.
"""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "src"))

from session import transcripts  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def _write(path: pathlib.Path, bytes_: int) -> pathlib.Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("x" * bytes_, encoding="utf-8")
    return path


def test_home_is_declared(base: pathlib.Path) -> None:
    """La declaracion manda sobre el compuesto, y se lee al LLAMAR.

    Anulacion: resolver al importar —una constante de modulo— haria que un
    consumidor que declare la variable despues del `import` no la viera, que es
    el defecto que las cinco familias hermanas ya cerraron.
    """
    declared = base / "hogar-declarado"
    declared.mkdir()
    previous = os.environ.get(transcripts.TRANSCRIPTS_DIR_VAR)
    os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = str(declared)
    try:
        check("el hogar declarado gana",
              transcripts.transcripts_dir() == declared.resolve(),
              str(transcripts.transcripts_dir()))
    finally:
        if previous is None:
            os.environ.pop(transcripts.TRANSCRIPTS_DIR_VAR, None)
        else:
            os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = previous


def test_without_declaration_it_is_composed_and_noted(base: pathlib.Path) -> None:
    """Sin declaracion hay default, y queda ANOTADO como tal.

    No se rehusa —un transcript es material del cliente, no del arbol, y
    rehusar dejaria mudos a los cinco consumidores— pero tampoco se compone en
    silencio: `record_fallback` deja dicho que nadie lo declaro.

    Anulacion: retirar la anotacion. El hogar seguiria resolviendo y nadie
    podria distinguir «lo declare» de «se lo invento».
    """
    from paths import declarations

    previous = os.environ.pop(transcripts.TRANSCRIPTS_DIR_VAR, None)
    try:
        composite = transcripts.transcripts_dir()
        check("el compuesto cuelga del hogar del usuario",
              composite == (pathlib.Path.home() / ".claude" / "projects"),
              str(composite))
        annotated = {f.key for f in declarations.fallbacks()}
        check("y queda anotado que nadie lo declaro",
              transcripts.TRANSCRIPTS_DIR_VAR in annotated,
              str(sorted(annotated)))
    finally:
        if previous is not None:
            os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = previous


def test_a_session_can_have_SEVERAL_transcripts(base: pathlib.Path) -> None:
    """El hallazgo devuelve TODOS, no uno: medido, esta sesion tiene dos.

    El cliente nombra el directorio de proyecto por el cwd. Al cambiar el cwd
    —aqui, entre dos grafias del mismo arbol— reslugifica y abre un segundo
    archivo con el MISMO id de sesion. Un mecanismo que devuelva uno solo no
    puede decir que descarto.

    Anulacion: devolver `Path | None`. El caso cae porque no habria plural que
    contar.
    """
    home = base / "proyectos-plural"
    sid = "sesion-con-dos"
    large = _write(home / "-home-user" / f"{sid}.jsonl", 4000)
    small = _write(home / "-home-user-Mayusculas" / f"{sid}.jsonl", 100)

    found = transcripts.transcripts_for(sid, home=home)
    check("halla los dos", len(found) == 2, str(found))
    check("y el primero es el mayor", found[0] == large, str(found[0]))
    check("el menor no se pierde, queda listado",
          small in found, str(found))


def test_tie_break_is_a_single_one(base: pathlib.Path) -> None:
    """`transcript_for` es el primero de `transcripts_for`, no otro criterio.

    Es la asercion que impide que vuelva a haber dos desempates: si alguien
    reintroduce un `sorted(...)[-1]` en un consumidor, este caso no lo ve, pero
    el de abajo —que mide a los dos consumidores reales— si.
    """
    home = base / "proyectos-desempate"
    sid = "sesion-desempate"
    _write(home / "-aaa" / f"{sid}.jsonl", 10)
    large = _write(home / "-zzz" / f"{sid}.jsonl", 9000)

    chosen = transcripts.transcript_for(sid, home=home)
    check("elige el mayor, no el primero ni el ultimo por ruta",
          chosen == large, str(chosen))
    check("y coincide con la cabeza del plural",
          chosen == transcripts.transcripts_for(sid, home=home)[0])


def test_without_transcript_no_path_is_composed(base: pathlib.Path) -> None:
    """Sin archivo se devuelve None y una tupla vacia — nunca una ruta inventada.

    Anulacion: componer `hogar/<sid>.jsonl`. El llamador recibiria una ruta que
    parece valida, la abriria, y el fallo apareceria lejos de su causa.
    """
    home = base / "proyectos-vacios"
    home.mkdir()
    check("el plural es vacio", transcripts.transcripts_for("nadie", home=home) == ())
    check("y el singular es None",
          transcripts.transcript_for("nadie", home=home) is None)
    check("un id vacio tampoco compone nada",
          transcripts.transcript_for("", home=home) is None)


def test_both_real_consumers_agree() -> None:
    """Los DOS consumidores del arbol resuelven por el mismo mecanismo.

    Es el caso central: mide a `model_catalog.session_transcript_default` y a
    `session_restart.transcript_for` sobre el mismo hogar sintetico y exige que
    den el MISMO archivo. Antes del arreglo daban archivos distintos sobre la
    sesion viva, uno de ellos el 12% del otro.

    Anulacion: devolver a cualquiera de los dos su implementacion propia. El
    caso cae, que es justo lo que no hacia hasta hoy.
    """
    from agents import model_catalog
    from session import session_restart

    with tempfile.TemporaryDirectory() as tmp:
        home = pathlib.Path(tmp)
        sid = "sesion-comun"
        _write(home / "-aaa" / f"{sid}.jsonl", 10)
        large = _write(home / "-zzz" / f"{sid}.jsonl", 9000)

        previous_dir = os.environ.get(transcripts.TRANSCRIPTS_DIR_VAR)
        previous_sid = os.environ.get("CLAUDE_CODE_SESSION_ID")
        os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = str(home)
        os.environ["CLAUDE_CODE_SESSION_ID"] = sid
        try:
            one = model_catalog.session_transcript_default()
            other = session_restart.transcript_for(sid)
            check("model_catalog elige el mayor", one == large, str(one))
            check("session_restart elige el mismo", other == large, str(other))
            # `uno == otro` a secas pasa con None == None: el verde no
            # discriminaria entre «resuelven igual» y «no resuelve
            # ninguno». Se exige ademas que hayan resuelto.
            check("y los dos coinciden sobre un archivo real",
                  one is not None and one == other, f"{one} vs {other}")
        finally:
            for key, value in ((transcripts.TRANSCRIPTS_DIR_VAR, previous_dir),
                                 ("CLAUDE_CODE_SESSION_ID", previous_sid)):
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value


def _docstring_lines(source: str) -> set[int]:
    """Los numeros de linea que ocupa un docstring, para no medir prosa.

    Un modulo que EXPLIQUE la grafia retirada no la esta usando. Sin esta
    separacion el censo caeria sobre su propia documentacion, que es la forma
    mas barata de volver inutil un control: obligar a no escribir lo que paso.
    """
    import ast  # noqa: PLC0415

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return set()
    occupied: set[int] = set()
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef,
                                 ast.AsyncFunctionDef)):
            continue
        body = getattr(node, "body", None)
        if not body:
            continue
        first = body[0]
        if (isinstance(first, ast.Expr)
                and isinstance(first.value, ast.Constant)
                and isinstance(first.value.value, str)):
            occupied.update(range(first.lineno,
                                  (first.end_lineno or first.lineno) + 1))
    return occupied


def test_no_module_composes_home_on_its_own() -> None:
    """Censo sobre el INDICE de git: una sola grafia del hogar en `src/`.

    Es el control que impide la recaida. Los casos sinteticos de arriba seguiran
    verdes si alguien vuelve a escribir `Path.home() / ".claude" / "projects"`
    en un modulo nuevo; este no, porque mide el arbol entero en vez de un
    fixture.

    El corpus es el indice de git y no un recorrido del disco: asi no cuenta
    `_references/`, ni `node_modules/`, ni lo que quedo sin versionar.

    *Ciego a:* una composicion repartida en dos lineas, y a la que pase por una
    variable intermedia. Mide la forma, no la intencion.
    """
    import re  # noqa: PLC0415
    import subprocess  # noqa: PLC0415

    listing = subprocess.run(
        ("git", "-C", str(ROOT), "ls-files", "--", "src/*.py", "src/**/*.py"),
        capture_output=True, text=True, timeout=60)
    files = [line for line in listing.stdout.splitlines() if line]
    check("el censo tiene corpus", len(files) > 100, str(len(files)))

    # La forma prohibida: componer el directorio de proyectos del cliente.
    form = re.compile(
        r"""(Path\.home\(\)|expanduser|/root/)[^\n]*['"/.]claude['"/\s,)]*"""
        r"""[^\n]*projects""")
    owners = {"src/session/transcripts.py"}
    culprits = []
    for relative in files:
        if relative in owners:
            continue
        text = (ROOT / relative).read_text(encoding="utf-8", errors="replace")
        # La PROSA no es codigo. Dos modulos documentan el defecto que este
        # caso persigue —uno cita las rutas que desaparecieron con el
        # contenedor, el otro explica que grafia retiro— y contarlas seria
        # medir el texto en vez del mecanismo.
        prose = _docstring_lines(text)
        for number, line in enumerate(text.splitlines(), 1):
            if number in prose or line.strip().startswith("#"):
                continue
            if form.search(line):
                culprits.append(f"{relative}:{number}")

    check("ningun modulo compone el hogar de transcripts por su cuenta",
          not culprits, f"{len(culprits)}: {culprits[:6]}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        test_home_is_declared(base)
        test_without_declaration_it_is_composed_and_noted(base)
        test_a_session_can_have_SEVERAL_transcripts(base)
        test_tie_break_is_a_single_one(base)
        test_without_transcript_no_path_is_composed(base)
    test_both_real_consumers_agree()
    test_no_module_composes_home_on_its_own()
    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: session/transcripts.py y sus dos consumidores)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
