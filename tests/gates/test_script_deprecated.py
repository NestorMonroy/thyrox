#!/usr/bin/env python3
"""Prueba de ``gates.script_deprecated`` — la declaración de deprecación completa.

Es la mitad ROJA escrita ANTES del módulo (TDD).

**Qué exige el gate, y por qué las DOS mitades juntas.** Un script deprecado
declara su motivo en la cabecera y aplica su guard en el cuerpo. Cada mitad sin
la otra es inútil: una cabecera sin guard es una declaración que nadie hace
cumplir —el script sigue corriendo en silencio—; un guard sin cabecera es un
rechazo que nadie puede explicar.

Qué cubre cada bloque:

1. **Un script que no declara NADA no es asunto del gate** — su cero no dice
   «no queda deuda», dice «ninguna declaración está a medias». Marcar el
   silencio como infracción convertiría al gate en un juicio sobre qué merece
   deprecarse, que es lo que no puede decidir.
2. **Cada mitad ausente se nombra por separado** — un motivo genérico obliga a
   abrir el archivo para saber qué falta.
3. **Las dos grafías de la cabecera** — ``DEPRECATED`` y ``OBSOLETE``, porque el
   árbol tiene las dos y el gate mide lo que hay, no lo que preferiría.
4. **El guard mismo no se mide** — ``deprecated.sh`` y ``deprecated.py`` SON el
   mecanismo; medirlos daría un infractor permanente que nadie puede arreglar.
5. **Sin raíces resueltas REHÚSA sin cifra** — un conteo sobre un conjunto
   incompleto es el verde que no discrimina.
6. **Los controles pueden fallar** — cada infracción trae su gemelo completo, y
   se exige que el veredicto CAMBIE.

Uso:  python3 tests/gates/test_script_deprecated.py
"""

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
THYROX_ROOT = HERE.parents[2]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from gates import script_deprecated as gate  # noqa: E402

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


HEADER = ("# DEPRECATED: 2026-09-05 — su medición era ciega a cuatro clones\n"
          "# SUCESOR: gates/script_deprecated.py\n"
          "# HALLAZGO: H-DOCS-1045\n")
GUARD = "deprecated_guard\n"
COMPLETE = HEADER + GUARD


# ── 1. El veredicto sobre un texto ────────────────────────────────────────
print("\n== review ==")

check("un script que no declara nada NO es asunto del gate",
      [], gate.review("#!/usr/bin/env bash\necho hola\n"))
check("la declaración completa no tiene motivos",
      [], gate.review(COMPLETE))
check("cabecera sin guard: falta el guard",
      ["falta la llamada a `deprecated_guard`"], gate.review(HEADER))
check("guard sin cabecera: faltan las tres claves",
      3, len(gate.review(GUARD)))
check("y cada clave ausente se NOMBRA por separado",
      True, all(k in " ".join(gate.review(GUARD))
                for k in ("DEPRECATED", "SUCESOR", "HALLAZGO")))
check("OBSOLETE vale igual que DEPRECATED",
      [], gate.review(COMPLETE.replace("# DEPRECATED:", "# OBSOLETE:")))
check("una clave vacía no cuenta como declarada",
      True, "DEPRECATED" in " ".join(gate.review(COMPLETE.replace(
          "# DEPRECATED: 2026-09-05 — su medición era ciega a cuatro clones",
          "# DEPRECATED:"))))
check("la cabecera fuera de inicio de línea no cuenta",
      True, "DEPRECATED" in " ".join(gate.review(
          "echo '# DEPRECATED: x'\n# SUCESOR: y\n# HALLAZGO: z\n" + GUARD)))


# ── 2. Los controles que DISCRIMINAN ──────────────────────────────────────
print("\n== controles de anulación ==")

check("retirar el guard de una declaración completa cambia el veredicto",
      (0, 1), (len(gate.review(COMPLETE)), len(gate.review(HEADER))))
check("retirar una clave de la cabecera cambia el veredicto",
      (0, 1), (len(gate.review(COMPLETE)),
               len(gate.review(COMPLETE.replace("# HALLAZGO: H-DOCS-1045\n", "")))))


# ── 3. El recorrido de una raíz ───────────────────────────────────────────
print("\n== scan ==")


def seed(root: pathlib.Path, rel: str, text: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    seed(root, ".claude/scripts/sano.sh", "echo hola\n")
    seed(root, ".claude/scripts/a-medias.sh", HEADER)
    seed(root, ".claude/hooks/completo.py", COMPLETE)
    seed(root, "scripts/otro.py", GUARD)
    seed(root, ".claude/scripts/deprecated.sh", HEADER)      # es el guard
    seed(root, ".claude/scripts/node_modules/x.sh", HEADER)  # excluido
    seed(root, "src/fuera.sh", HEADER)                       # fuera de las raíces

    offenders, total = gate.scan(root)
    check("mide las tres raíces y ninguna más", 4, total)
    check("y encuentra los dos incompletos", 2, len(offenders))
    check("el guard NO se mide a sí mismo",
          True, all("deprecated.sh" not in str(f) for f, _ in offenders))
    check("node_modules queda excluido",
          True, all("node_modules" not in str(f) for f, _ in offenders))

    # Control: completar los dos incompletos tiene que vaciar la lista.
    seed(root, ".claude/scripts/a-medias.sh", COMPLETE)
    seed(root, "scripts/otro.py", COMPLETE)
    check("completar los dos cambia el veredicto",
          (2, 0), (len(offenders), len(gate.scan(root)[0])))


# ── 4. El CLI: denominador, desglose y rehúse ─────────────────────────────
print("\n== main ==")

MODULE = THYROX_ROOT / "src" / "gates" / "script_deprecated.py"


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(MODULE), *args],
                          capture_output=True, text=True)


with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp) / "una-raiz"
    seed(root, ".claude/scripts/sano.sh", "echo hola\n")

    ok = run(str(root))
    check("una raíz nombrada sale 0", 0, ok.returncode)
    check("y el desglose por raíz va AUNQUE el total sea cero",
          True, "una-raiz:0/1" in ok.stdout)
    check("el conteo publica cuántas raíces y cuántos scripts",
          True, "1 raíz/raíces" in ok.stdout)

    seed(root, ".claude/scripts/a-medias.sh", HEADER)
    roto = run(str(root), "--strict")
    check("--strict con un infractor sale 1", 1, roto.returncode)
    check("y sin --strict sigue saliendo 0", 0, run(str(root)).returncode)
    check("--quiet publica sólo el conteo",
          "1", run(str(root), "--quiet").stdout.strip())

# El rehúse: sin árbol resoluble no se emite cifra.
with tempfile.TemporaryDirectory() as tmp:
    sin_arbol = run()
    env_roto = subprocess.run(
        [sys.executable, str(MODULE)],
        capture_output=True, text=True,
        env={"PATH": "/usr/bin:/bin", "THYROX_REACH_ROOT": str(pathlib.Path(tmp) / "vacio")},
    )
    check("con un árbol sin clones REHÚSA con código propio",
          2, env_roto.returncode)
    check("y NO emite ninguna cifra por stdout",
          "", env_roto.stdout.strip())

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
