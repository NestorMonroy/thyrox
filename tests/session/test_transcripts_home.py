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

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
sys.path.insert(0, str(RAIZ / "src"))

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


def _escribir(path: pathlib.Path, bytes_: int) -> pathlib.Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("x" * bytes_, encoding="utf-8")
    return path


def test_el_hogar_se_declara(base: pathlib.Path) -> None:
    """La declaracion manda sobre el compuesto, y se lee al LLAMAR.

    Anulacion: resolver al importar —una constante de modulo— haria que un
    consumidor que declare la variable despues del `import` no la viera, que es
    el defecto que las cinco familias hermanas ya cerraron.
    """
    declarado = base / "hogar-declarado"
    declarado.mkdir()
    previo = os.environ.get(transcripts.TRANSCRIPTS_DIR_VAR)
    os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = str(declarado)
    try:
        check("el hogar declarado gana",
              transcripts.transcripts_dir() == declarado.resolve(),
              str(transcripts.transcripts_dir()))
    finally:
        if previo is None:
            os.environ.pop(transcripts.TRANSCRIPTS_DIR_VAR, None)
        else:
            os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = previo


def test_sin_declaracion_se_compone_y_se_anota(base: pathlib.Path) -> None:
    """Sin declaracion hay default, y queda ANOTADO como tal.

    No se rehusa —un transcript es material del cliente, no del arbol, y
    rehusar dejaria mudos a los cinco consumidores— pero tampoco se compone en
    silencio: `record_fallback` deja dicho que nadie lo declaro.

    Anulacion: retirar la anotacion. El hogar seguiria resolviendo y nadie
    podria distinguir «lo declare» de «se lo invento».
    """
    from paths import declarations

    previo = os.environ.pop(transcripts.TRANSCRIPTS_DIR_VAR, None)
    try:
        compuesto = transcripts.transcripts_dir()
        check("el compuesto cuelga del hogar del usuario",
              compuesto == (pathlib.Path.home() / ".claude" / "projects"),
              str(compuesto))
        anotadas = {f.key for f in declarations.fallbacks()}
        check("y queda anotado que nadie lo declaro",
              transcripts.TRANSCRIPTS_DIR_VAR in anotadas,
              str(sorted(anotadas)))
    finally:
        if previo is not None:
            os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = previo


def test_una_sesion_puede_tener_VARIOS_transcripts(base: pathlib.Path) -> None:
    """El hallazgo devuelve TODOS, no uno: medido, esta sesion tiene dos.

    El cliente nombra el directorio de proyecto por el cwd. Al cambiar el cwd
    —aqui, entre dos grafias del mismo arbol— reslugifica y abre un segundo
    archivo con el MISMO id de sesion. Un mecanismo que devuelva uno solo no
    puede decir que descarto.

    Anulacion: devolver `Path | None`. El caso cae porque no habria plural que
    contar.
    """
    hogar = base / "proyectos-plural"
    sid = "sesion-con-dos"
    grande = _escribir(hogar / "-home-user" / f"{sid}.jsonl", 4000)
    chico = _escribir(hogar / "-home-user-Mayusculas" / f"{sid}.jsonl", 100)

    hallados = transcripts.transcripts_for(sid, home=hogar)
    check("halla los dos", len(hallados) == 2, str(hallados))
    check("y el primero es el mayor", hallados[0] == grande, str(hallados[0]))
    check("el menor no se pierde, queda listado",
          chico in hallados, str(hallados))


def test_el_desempate_es_uno_solo(base: pathlib.Path) -> None:
    """`transcript_for` es el primero de `transcripts_for`, no otro criterio.

    Es la asercion que impide que vuelva a haber dos desempates: si alguien
    reintroduce un `sorted(...)[-1]` en un consumidor, este caso no lo ve, pero
    el de abajo —que mide a los dos consumidores reales— si.
    """
    hogar = base / "proyectos-desempate"
    sid = "sesion-desempate"
    _escribir(hogar / "-aaa" / f"{sid}.jsonl", 10)
    grande = _escribir(hogar / "-zzz" / f"{sid}.jsonl", 9000)

    elegido = transcripts.transcript_for(sid, home=hogar)
    check("elige el mayor, no el primero ni el ultimo por ruta",
          elegido == grande, str(elegido))
    check("y coincide con la cabeza del plural",
          elegido == transcripts.transcripts_for(sid, home=hogar)[0])


def test_sin_transcript_no_compone_una_ruta(base: pathlib.Path) -> None:
    """Sin archivo se devuelve None y una tupla vacia — nunca una ruta inventada.

    Anulacion: componer `hogar/<sid>.jsonl`. El llamador recibiria una ruta que
    parece valida, la abriria, y el fallo apareceria lejos de su causa.
    """
    hogar = base / "proyectos-vacios"
    hogar.mkdir()
    check("el plural es vacio", transcripts.transcripts_for("nadie", home=hogar) == ())
    check("y el singular es None",
          transcripts.transcript_for("nadie", home=hogar) is None)
    check("un id vacio tampoco compone nada",
          transcripts.transcript_for("", home=hogar) is None)


def test_los_dos_consumidores_reales_coinciden() -> None:
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
        hogar = pathlib.Path(tmp)
        sid = "sesion-comun"
        _escribir(hogar / "-aaa" / f"{sid}.jsonl", 10)
        grande = _escribir(hogar / "-zzz" / f"{sid}.jsonl", 9000)

        previo_dir = os.environ.get(transcripts.TRANSCRIPTS_DIR_VAR)
        previo_sid = os.environ.get("CLAUDE_CODE_SESSION_ID")
        os.environ[transcripts.TRANSCRIPTS_DIR_VAR] = str(hogar)
        os.environ["CLAUDE_CODE_SESSION_ID"] = sid
        try:
            uno = model_catalog.session_transcript_default()
            otro = session_restart.transcript_for(sid)
            check("model_catalog elige el mayor", uno == grande, str(uno))
            check("session_restart elige el mismo", otro == grande, str(otro))
            # `uno == otro` a secas pasa con None == None: el verde no
            # discriminaria entre «resuelven igual» y «no resuelve
            # ninguno». Se exige ademas que hayan resuelto.
            check("y los dos coinciden sobre un archivo real",
                  uno is not None and uno == otro, f"{uno} vs {otro}")
        finally:
            for clave, valor in ((transcripts.TRANSCRIPTS_DIR_VAR, previo_dir),
                                 ("CLAUDE_CODE_SESSION_ID", previo_sid)):
                if valor is None:
                    os.environ.pop(clave, None)
                else:
                    os.environ[clave] = valor


def _docstring_lines(source: str) -> set[int]:
    """Los numeros de linea que ocupa un docstring, para no medir prosa.

    Un modulo que EXPLIQUE la grafia retirada no la esta usando. Sin esta
    separacion el censo caeria sobre su propia documentacion, que es la forma
    mas barata de volver inutil un control: obligar a no escribir lo que paso.
    """
    import ast  # noqa: PLC0415

    try:
        arbol = ast.parse(source)
    except SyntaxError:
        return set()
    ocupadas: set[int] = set()
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.Module, ast.ClassDef, ast.FunctionDef,
                                 ast.AsyncFunctionDef)):
            continue
        cuerpo = getattr(nodo, "body", None)
        if not cuerpo:
            continue
        primero = cuerpo[0]
        if (isinstance(primero, ast.Expr)
                and isinstance(primero.value, ast.Constant)
                and isinstance(primero.value.value, str)):
            ocupadas.update(range(primero.lineno,
                                  (primero.end_lineno or primero.lineno) + 1))
    return ocupadas


def test_ningun_modulo_compone_el_hogar_por_su_cuenta() -> None:
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

    listado = subprocess.run(
        ("git", "-C", str(RAIZ), "ls-files", "--", "src/*.py", "src/**/*.py"),
        capture_output=True, text=True, timeout=60)
    archivos = [linea for linea in listado.stdout.splitlines() if linea]
    check("el censo tiene corpus", len(archivos) > 100, str(len(archivos)))

    # La forma prohibida: componer el directorio de proyectos del cliente.
    forma = re.compile(
        r"""(Path\.home\(\)|expanduser|/root/)[^\n]*['"/.]claude['"/\s,)]*"""
        r"""[^\n]*projects""")
    duenos = {"src/session/transcripts.py"}
    culpables = []
    for relativo in archivos:
        if relativo in duenos:
            continue
        texto = (RAIZ / relativo).read_text(encoding="utf-8", errors="replace")
        # La PROSA no es codigo. Dos modulos documentan el defecto que este
        # caso persigue —uno cita las rutas que desaparecieron con el
        # contenedor, el otro explica que grafia retiro— y contarlas seria
        # medir el texto en vez del mecanismo.
        prosa = _docstring_lines(texto)
        for numero, linea in enumerate(texto.splitlines(), 1):
            if numero in prosa or linea.strip().startswith("#"):
                continue
            if forma.search(linea):
                culpables.append(f"{relativo}:{numero}")

    check("ningun modulo compone el hogar de transcripts por su cuenta",
          not culpables, f"{len(culpables)}: {culpables[:6]}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        test_el_hogar_se_declara(base)
        test_sin_declaracion_se_compone_y_se_anota(base)
        test_una_sesion_puede_tener_VARIOS_transcripts(base)
        test_el_desempate_es_uno_solo(base)
        test_sin_transcript_no_compone_una_ruta(base)
    test_los_dos_consumidores_reales_coinciden()
    test_ningun_modulo_compone_el_hogar_por_su_cuenta()
    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: session/transcripts.py y sus dos consumidores)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
