#!/usr/bin/env python3
"""Prueba de ``gates.hook_script_token`` — la forma del comando de un hook.

Es la mitad ROJA escrita ANTES del módulo (TDD). El import falla mientras
``src/gates/hook_script_token.py`` no exista.

**Qué mide el gate, y por qué es un gate y no un check.** El control de
existencia de un hook localiza su script tomando *el primer token del comando
que sea una ruta*. Esa premisa vale para la forma dominante y **falla en
silencio** en cuatro formas más: en ellas el control no falla — mide otra cosa,
o no mide nada, y su silencio se lee como «el hook está bien». Este gate mide
**la premisa**, no el hook: es el sub-patrón D de
``metrica-decide-la-conclusion.md`` convertido en instrumento.

Qué cubre cada bloque:

1. **Las cinco formas se distinguen** — una por una, con el comando real que
   la produce. Colapsar dos formas en una devolvería el silencio que el gate
   existe para romper.
2. **``-c`` gana sobre todo** — la ruta dentro de una cadena la interpreta otro
   proceso, así que ni siquiera se intenta clasificar el resto.
3. **Cero comandos NO es un aprobado** — si el gate no encuentra ningún
   ``settings*.json``, su «0 opacos» no mide nada, y tiene que decirlo.
4. **Los controles pueden fallar** — cada forma opaca trae su gemelo sano, y se
   exige que la clasificación CAMBIE. Un ``simple`` que no cambia al meterle un
   separador no está mirando los separadores.

Uso:  python3 tests/gates/test_hook_script_token.py
"""

import json
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
THYROX_ROOT = HERE.parents[2]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from gates import hook_script_token as gate  # noqa: E402

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


def shape(command: str) -> str:
    return gate.classify(command)[0]


# ── 1. Las cinco formas ───────────────────────────────────────────────────
print("\n== classify ==")

check("la forma dominante es simple",
      "simple", shape("bash .claude/hooks/x.sh"))
check("y devuelve el script como detalle",
      ".claude/hooks/x.sh", gate.classify("bash .claude/hooks/x.sh")[1])
check("sin ningún token de ruta: sin_ruta",
      "sin_ruta", shape("python3 -m paquete"))
check("dos segmentos con ruta: varios_scripts",
      "varios_scripts", shape("bash a/x.sh && bash b/y.sh"))
check("una tubería también parte segmentos",
      "varios_scripts", shape("cat a/x.json | bash b/y.sh"))
check("con -c la ruta viaja en una cadena: ruta_en_cadena",
      "ruta_en_cadena", shape("bash -c 'bash .claude/hooks/x.sh'"))
check("la ruta tras una bandera es su valor, no el script",
      "ruta_tras_opcion", shape("herramienta --base .claude/hooks"))
check("un comando que shlex no separa: no_parseable",
      "no_parseable", shape("bash 'sin cerrar"))


# ── 2. Los controles que DISCRIMINAN ──────────────────────────────────────
# Cada uno parte de la forma sana y le mete UNA causa. Si la clasificación no
# cambia, el gate no está mirando esa causa.
print("\n== controles de anulación ==")

BASE = "bash .claude/hooks/x.sh"
check("añadir un segundo script cambia la forma",
      ("simple", "varios_scripts"), (shape(BASE), shape(BASE + " && bash b/y.sh")))
check("envolver en -c cambia la forma",
      ("simple", "ruta_en_cadena"), (shape(BASE), shape(f"bash -c '{BASE}'")))
check("quitarle la ruta cambia la forma",
      ("simple", "sin_ruta"), (shape(BASE), shape("bash -m modulo")))
check("anteponerle una bandera cambia la forma",
      ("simple", "ruta_tras_opcion"),
      (shape(BASE), shape("bash --base .claude/hooks/x.sh")))


# ── 3. La lectura de los settings de los clones ───────────────────────────
print("\n== declared_commands ==")


def seed(root: pathlib.Path, repo: str, name: str, payload) -> None:
    d = root / f"kaupamex-{repo}" / ".claude"
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(json.dumps(payload), encoding="utf-8")


HOOKS = {"hooks": {"Stop": [{"hooks": [{"command": "bash .claude/hooks/x.sh"},
                                       {"command": "python3 -m paquete"}]}]}}

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    seed(root, "api", "settings.json", HOOKS)
    seed(root, "docs", "settings.local.json", HOOKS)

    declared = list(gate.declared_commands(root))
    check("lee los dos nombres de settings, en los dos clones",
          4, len(declared))
    check("y trae el evento con cada comando",
          {"Stop"}, {evento for _, evento, _ in declared})

    # Un JSON inválido no puede caerse en silencio: es un settings que nadie mide.
    seed(root, "ui", "settings.json", HOOKS)
    (root / "kaupamex-ui" / ".claude" / "settings.json").write_text("{ roto", encoding="utf-8")
    con_roto = list(gate.declared_commands(root))
    check("un settings ilegible se REPORTA, con evento None",
          1, sum(1 for _, evento, _ in con_roto if evento is None))


# ── 4. El CLI: el cero que NO es aprobado ─────────────────────────────────
print("\n== main ==")

MODULE = THYROX_ROOT / "src" / "gates" / "hook_script_token.py"


def run(root: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(MODULE), "--tree-root", str(root), *args],
        capture_output=True, text=True,
    )


with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    seed(root, "api", "settings.json",
         {"hooks": {"Stop": [{"hooks": [{"command": "bash .claude/hooks/x.sh"}]}]}})

    sano = run(root)
    check("un solo comando sano sale 0", 0, sano.returncode)
    check("y publica su DENOMINADOR",
          True, "alcance medido: 1 comandos declarados" in sano.stdout)

    seed(root, "db", "settings.json",
         {"hooks": {"Stop": [{"hooks": [{"command": "python3 -m paquete"}]}]}})
    opaco = run(root, "--strict")
    check("--strict con una forma opaca sale 1", 1, opaco.returncode)
    check("y nombra la forma", True, "sin_ruta" in opaco.stdout)

with tempfile.TemporaryDirectory() as tmp:
    vacio = pathlib.Path(tmp)
    cero = run(vacio)
    check("cero comandos NO se publica como aprobado en silencio",
          True, "ADVERTENCIA" in cero.stdout)
    check("y con --strict el cero sin medir sale 1",
          1, run(vacio, "--strict").returncode)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
