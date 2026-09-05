#!/usr/bin/env python3
"""Prueba de ``hooks.error_log`` — el registro de fallos de hook, parametrizado.

Es la mitad ROJA escrita ANTES del mecanismo (TDD). Su ejecución en rojo, y la
del control con la guarda anulada, quedan persistidas en
``kaupamex-docs: .claude/eventos/porte-hook-error-log-20260905T140623/rojo.txt``.

Qué se está portando, y por qué necesita parámetro

La fuente es ``kaupamex-docs: .claude/hooks/hook_error_log.py``. El paso 0 de
P3d (**#139**) la clasificó **A** —producto portable tal cual— midiendo su
propio texto: no contiene ninguna raíz absoluta de kaupamex. El veredicto era
correcto para lo que medía y falso para la mudanza, y ``H-DOCS-1080`` lo
corrigió con esta medición::

    $ python3 -c "import sys; sys.path.insert(0, '.claude/hooks');
      import hook_error_log as h; print(h.LOG_PATH); print(h.spool_path())"
    /home/user/kaupamex-docs/.claude/agent-results/errores-hooks.md
    /home/user/kaupamex-docs/.claude/agent-results/carrete-store.jsonl

Los dos salen de ``_RESULTS_DIR = Path(__file__).resolve().parent.parent /
"agent-results"``. Movido a THYROX escribiría en el árbol de THYROX, y el
drenador del carrete —que vive en kaupamex— dejaría de verlo. Su cierre de
dependencia está limpio; su **directorio de salida** es un parámetro. Es DEC-04
en su forma más pequeña: el mecanismo viaja, la ruta se inyecta.

Qué cubre cada bloque

1. **Con el directorio declarado, el mecanismo funciona igual que la fuente** —
   un comando que falla deja su entrada en ``<dir>/errores-hooks.md``.
2. **Sin declarar, el módulo REHÚSA** — no cae a un default derivado de
   ``Path(__file__)``. Es la mitad que la fuente no puede tener, porque ese
   default es su única forma de resolverlo.
3. **El control que discrimina** (sub-patrón D de
   ``metrica-decide-la-conclusion.md``): con el parámetro ausente,
   ``run_and_log`` no escribe en NINGUNA parte del árbol de THYROX **y** avisa
   por ``stderr``. Un default que escribiera en algún sitio sería un verde
   falso: el hook «registra» y nadie ve nunca ese rastro. Un rehúse mudo sería
   el otro verde falso: no distinguiría «no hubo fallos» de «no pude registrar».
4. **La precedencia es cadena** — proceso, después ``.env``; y cada bloque trae
   su gemelo con la fuente de mayor precedencia RETIRADA, exigiendo que el
   veredicto CAMBIE.
5. **Los símbolos de la fuente se portan todos** — ``run_and_log``,
   ``spool_path``, el tope del carrete, el puente ``main`` con sus tres códigos
   de salida (2 uso, 127 no se pudo lanzar, el del comando en cualquier otro
   caso). ``porte-completo-no-parcial.md``.

Uso:  python3 tests/hooks/test_error_log.py
"""

import contextlib
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
THYROX_ROOT = HERE.parents[2]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from hooks import error_log  # noqa: E402  (la ruta se compone arriba, a propósito)

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def check_raises(label: str, exc_type, fn) -> None:
    global PASS, FAIL
    try:
        fn()
    except exc_type:
        PASS += 1
        print(f"  ok    {label}")
        return
    except Exception as err:  # noqa: BLE001 — el tipo equivocado también es fallo
        FAIL += 1
        print(f"  FALLA {label}: alzó {type(err).__name__}, no {exc_type.__name__}")
        return
    FAIL += 1
    print(f"  FALLA {label}: no alzó nada")


def clean_env() -> None:
    """Retira toda variable del mecanismo — el suelo de cada bloque."""
    for key in list(os.environ):
        if key.startswith(("KAUPAMEX_", "THYROX_", "HOOK_")):
            del os.environ[key]


#: Un comando que falla de forma reproducible, sin depender de qué binarios
#: traiga la imagen. El intérprete que corre la prueba siempre está.
FAILING_CMD = [sys.executable, "-c", "import sys; sys.stderr.write('boom'); sys.exit(3)"]
SUCCEEDING_CMD = [sys.executable, "-c", "print('ok')"]
MISSING_BINARY = ["/no/existe/este/binario/nunca"]


print("\n1. Con el directorio declarado, el fallo deja su entrada")
with tempfile.TemporaryDirectory() as tmp:
    out_dir = pathlib.Path(tmp) / "agent-results"
    clean_env()
    os.environ["THYROX_RESULTS_DIR"] = str(out_dir)

    check("log_path cuelga del directorio declarado",
          out_dir / "errores-hooks.md", error_log.log_path())

    result = error_log.run_and_log("prueba", FAILING_CMD)
    check("devuelve el CompletedProcess aunque falle", 3, result.returncode)
    log_text = (out_dir / "errores-hooks.md").read_text(encoding="utf-8")
    check("el nombre del hook queda registrado", True, "prueba" in log_text)
    check("el detalle del stderr queda registrado", True, "boom" in log_text)
    check("el returncode queda registrado", True, "returncode: 3" in log_text)

    # Control: un comando que SALE BIEN no debe dejar entrada. Sin esto, un
    # registro que apendara siempre pasaría el bloque anterior igual.
    size_before = len(log_text)
    error_log.run_and_log("prueba", SUCCEEDING_CMD)
    check("control — un comando en verde no apenda nada",
          size_before, len((out_dir / "errores-hooks.md").read_text(encoding="utf-8")))


print("\n2. Sin declarar, REHÚSA — no cae a un default de Path(__file__)")
clean_env()
check_raises("results_dir rehúsa", error_log.ResultsDirError, error_log.results_dir)
check_raises("log_path rehúsa", error_log.ResultsDirError, error_log.log_path)
check_raises("spool_path rehúsa", error_log.ResultsDirError, error_log.spool_path)


print("\n3. El control que discrimina: sin parámetro no escribe, y AVISA")
# Las dos mitades importan. Si el módulo tuviera un default derivado de
# __file__, el hook «registraría» en el árbol de THYROX y nadie vería nunca ese
# rastro: verde falso. Si rehusara en silencio, «no hubo fallos» y «no pude
# registrar» se verían igual: el otro verde falso.
clean_env()
seen_before = {p for p in THYROX_ROOT.rglob("errores-hooks.md")}
warned = io.StringIO()
with contextlib.redirect_stderr(warned):
    result = error_log.run_and_log("sin-parametro", FAILING_CMD)
seen_after = {p for p in THYROX_ROOT.rglob("errores-hooks.md")}
check("no aparece ningún rastro en el árbol de THYROX", seen_before, seen_after)
check("el comando corrió igual — el hook no se rompe", 3, result.returncode)
check("avisa nombrando la variable ausente",
      True, "THYROX_RESULTS_DIR" in warned.getvalue())


print("\n4. La precedencia es cadena: proceso, después .env")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    from_process = base / "por-proceso"
    from_file = base / "por-archivo"
    env_file = base / ".env"
    env_file.write_text(f'THYROX_RESULTS_DIR="{from_file}"\n', encoding="utf-8")

    clean_env()
    os.environ["THYROX_ENV_FILE"] = str(env_file)
    os.environ["THYROX_RESULTS_DIR"] = str(from_process)
    check("el proceso gana", from_process, error_log.results_dir())

    # Control: retirada la del proceso, el veredicto DEBE cambiar al .env.
    del os.environ["THYROX_RESULTS_DIR"]
    check("control — sin la del proceso cae al .env", from_file, error_log.results_dir())

    # Y la grafía heredada queda de segunda, no de primera.
    clean_env()
    os.environ["KAUPAMEX_RESULTS_DIR"] = str(from_file)
    os.environ["THYROX_RESULTS_DIR"] = str(from_process)
    check("THYROX_RESULTS_DIR gana a la grafía heredada",
          from_process, error_log.results_dir())
    del os.environ["THYROX_RESULTS_DIR"]
    check("control — sin ella, la heredada resuelve",
          from_file, error_log.results_dir())


print("\n5. El carrete: su ruta, su forma y su tope")
with tempfile.TemporaryDirectory() as tmp:
    out_dir = pathlib.Path(tmp) / "agent-results"
    clean_env()
    os.environ["THYROX_RESULTS_DIR"] = str(out_dir)

    check("por defecto cuelga del directorio declarado",
          out_dir / "carrete-store.jsonl", error_log.spool_path())

    spool_file = pathlib.Path(tmp) / "otro-carrete.jsonl"
    os.environ["HOOK_SPOOL_PATH"] = str(spool_file)
    check("HOOK_SPOOL_PATH la redirige — la forma de la fuente se conserva",
          spool_file, error_log.spool_path())

    error_log.run_and_log("prueba", FAILING_CMD, spool=True)
    queued = json.loads(spool_file.read_text(encoding="utf-8").strip())
    check("el cmd se encola como LISTA, reproducible tal cual", FAILING_CMD, queued["cmd"])
    check("el nombre del hook viaja con el evento", "prueba", queued["hook"])
    check("nace con cero intentos", 0, queued["attempts"])

    def spooled_lines() -> int:
        return len([l for l in spool_file.read_text(encoding="utf-8").splitlines() if l.strip()])

    # El tope, ejercitado por entorno en vez de fabricando el volumen.
    os.environ["HOOK_SPOOL_MAX_ENTRIES"] = "1"
    error_log.run_and_log("prueba", FAILING_CMD, spool=True)
    check("con el tope alcanzado NO se encola un segundo evento", 1, spooled_lines())
    check("y el descarte queda en el registro de prosa",
          True, "carrete lleno" in (out_dir / "errores-hooks.md").read_text(encoding="utf-8"))

    # Control: subido el tope, el veredicto DEBE cambiar.
    os.environ["HOOK_SPOOL_MAX_ENTRIES"] = "50"
    error_log.run_and_log("prueba", FAILING_CMD, spool=True)
    check("control — con el tope alto sí encola", 2, spooled_lines())


print("\n6. run_and_log nunca lanza — devuelve None sólo si no pudo arrancar")
with tempfile.TemporaryDirectory() as tmp:
    out_dir = pathlib.Path(tmp) / "agent-results"
    clean_env()
    os.environ["THYROX_RESULTS_DIR"] = str(out_dir)
    check("un binario inexistente devuelve None", None,
          error_log.run_and_log("prueba", MISSING_BINARY))
    check("y deja su causa registrada", True,
          "prueba" in (out_dir / "errores-hooks.md").read_text(encoding="utf-8"))


print("\n7. El puente para hooks de shell y sus tres códigos de salida")
with tempfile.TemporaryDirectory() as tmp:
    clean_env()
    os.environ["THYROX_RESULTS_DIR"] = str(pathlib.Path(tmp) / "agent-results")

    def run_quietly(argv: list) -> int:
        """``main`` con su salida capturada — reemite stdout/stderr por diseño.

        La captura envuelve SÓLO la invocación, no el ``check``: envolver el
        ``check`` también dejaría el bloque sin ninguna línea impresa, y un
        bloque mudo se lee como un bloque que no corrió.
        """
        swallowed = io.StringIO()
        with contextlib.redirect_stdout(swallowed), contextlib.redirect_stderr(swallowed):
            return error_log.main(argv)

    check("sin separador -- devuelve 2", 2, run_quietly(["prueba", "algo"]))
    check("sin comando tras -- devuelve 2", 2, run_quietly(["prueba", "--"]))
    check("propaga el returncode del comando", 3,
          run_quietly(["prueba", "--", *FAILING_CMD]))
    check("127 cuando el proceso no pudo lanzarse", 127,
          run_quietly(["prueba", "--", *MISSING_BINARY]))


print("\n8. El CLI, invocado como lo haría un hook de shell")
with tempfile.TemporaryDirectory() as tmp:
    child_env = {**os.environ,
                 "THYROX_RESULTS_DIR": str(pathlib.Path(tmp) / "agent-results")}
    finished = subprocess.run(
        [sys.executable, str(THYROX_ROOT / "src" / "hooks" / "error_log.py"),
         "desde-shell", "--", *SUCCEEDING_CMD],
        capture_output=True, text=True, env=child_env,
    )
    check("reemite el stdout del comando", "ok", finished.stdout.strip())
    check("y sale con su código", 0, finished.returncode)

clean_env()
print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
