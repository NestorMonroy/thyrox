#!/usr/bin/env python3
"""Control de `src/packages/shell/bin/shell.ts` — la puerta a `@thyrox/shell`.

No fabrica el texto de shell que analiza: lo LEE de guiones reales de este
mismo árbol (`src/**/*.sh`) y de líneas reales ya escritas en ellos (una
`bash -c '...'`, un `echo "..."` con `$VAR`). Un patrón sólo confirmado
contra texto que su propio autor escribió confirma su propio encuadre —
`metrica-decide-la-conclusion.md`, sub-patrón D— así que el corpus de este
control es del árbol, no de este archivo.

Dos controles van más allá de "no revienta": el de `quote` re-ejecuta el
resultado en un `bash` real y compara contra el literal original — no basta
con que el CLI no lance una excepción, tiene que citar de forma que bash
reproduzca el argumento sin expandir nada. Y el de `env` inyecta un secreto
real en el proceso e inspecciona el stdout byte a byte buscándolo: el
contrato de esta puerta es no imprimir NINGÚN valor, nunca.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent  # thyrox/
PKG = ROOT / "src/packages/shell"
CLI = PKG / "bin/shell.ts"

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def run(*args: str, input_text: str | None = None, env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bun", "run", str(CLI), *args],
        capture_output=True,
        text=True,
        input=input_text,
        cwd=str(PKG),
        env=env,
    )


def real_shell_scripts_with_heredoc(n: int = 3) -> list[pathlib.Path]:
    """Guiones reales de `src/` cuya PROPIA CLI (no un grep aparte, con su
    propio patrón divergente) confirma que contienen un heredoc léxico."""
    out: list[pathlib.Path] = []
    for p in sorted((ROOT / "src").rglob("*.sh")):
        if "node_modules" in p.parts:
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if "<<" not in text:
            continue
        r = run("heredoc", "--stdin", "--json", input_text=text)
        if r.returncode == 0:
            try:
                if json.loads(r.stdout).get("contieneLexico"):
                    out.append(p)
            except json.JSONDecodeError:
                pass
        if len(out) >= n:
            break
    return out


def real_line_containing(pattern: str, glob: str = "*.sh") -> str | None:
    """La primera línea real, de un `.sh` bajo `src/`, que contiene `pattern`."""
    for p in sorted((ROOT / "src").rglob(glob)):
        if "node_modules" in p.parts:
            continue
        try:
            for line in p.read_text(encoding="utf-8").splitlines():
                if pattern in line:
                    return line.strip()
        except (UnicodeDecodeError, OSError):
            continue
    return None


def main() -> int:
    # --- las cuatro puertas de análisis rehúsan SIN entrada, y sólo ahí -----
    for sub in ("heredoc", "quote", "prefix", "fig"):
        r = run(sub)
        check(f"«{sub}» sin argumentos rehúsa con 2", r.returncode == 2, r.stderr[:150])
        check(f"«{sub}» sin argumentos no imprime veredicto en stdout", r.stdout.strip() == "")

    # --- heredoc, contra guiones REALES del árbol ---------------------------
    scripts = real_shell_scripts_with_heredoc()
    check("hay al menos un guion real de src/ con heredoc léxico", len(scripts) > 0)
    algun_extraido = False
    for p in scripts:
        text = p.read_text(encoding="utf-8")
        r = run("heredoc", "--stdin", "--json", input_text=text)
        rel = p.relative_to(ROOT)
        check(f"heredoc --stdin sobre {rel} sale 0", r.returncode == 0, r.stderr[:150])
        try:
            data = json.loads(r.stdout)
        except json.JSONDecodeError as error:
            check(f"heredoc --json sobre {rel} es JSON válido", False, str(error))
            continue
        check(f"{rel}: contieneLexico=true (confirma el filtro con que se eligió)", data["contieneLexico"] is True)
        if data["extraidos"] > 0:
            algun_extraido = True
    check(
        "al menos un guion real produjo ≥1 heredoc EXTRAÍDO (no sólo léxico)",
        algun_extraido,
    )

    # --- quote: el resultado, ejecutado en bash de verdad, reproduce el literal
    reales = [
        real_line_containing("$"),  # una línea real con expansión de variable
        real_line_containing("bash -c '"),  # una línea real con comillas anidadas
    ]
    for texto in reales:
        check(f"se encontró una línea real que citar ({texto!r})", texto is not None)
        if texto is None:
            continue
        r = run("quote", texto)
        check(f"quote sale 0 para la línea real {texto!r}", r.returncode == 0, r.stderr[:150])
        quoted = r.stdout.rstrip("\n")
        eco = subprocess.run(["bash", "-c", f"echo {quoted}"], capture_output=True, text=True)
        check(
            f"bash reproduce, sin expandir nada, la línea real citada",
            eco.stdout.rstrip("\n") == texto,
            f"esperado {texto!r}, obtuvo {eco.stdout!r} (stderr: {eco.stderr[:150]!r})",
        )

    # --- prefix: sobre una línea real con "bash -c" -------------------------
    linea_bash_c = real_line_containing("bash -c")
    check("se encontró una línea real con 'bash -c'", linea_bash_c is not None)
    if linea_bash_c is not None:
        r = run("prefix", "bash -c", linea_bash_c)
        check("prefix sobre una línea real sale 0", r.returncode == 0, r.stderr[:150])
        check("prefix compone 'bash' y '-c' en la salida", "bash" in r.stdout and "-c" in r.stdout)

    # --- fig: un binario real vs una ruta relativa real del árbol -----------
    r = run("fig", "git")
    check("fig git sale 0", r.returncode == 0)
    ruta_real = "../session/bg.sh"
    check(
        f"la ruta real citada ({ruta_real}) existe de verdad en el árbol",
        (ROOT / "src/session/bg.sh").is_file(),
    )
    r = run("fig", ruta_real)
    check(
        f"fig rechaza una ruta real del árbol ({ruta_real}) por llevar '/'",
        "sin especificación" in r.stdout,
        r.stdout[:150],
    )

    # --- env: nunca imprime el VALOR de una variable, ni siquiera una real --
    entorno = dict(os.environ)
    entorno["THYROX_SHELL_CLI_TEST_SECRETO"] = "no-debe-salir-jamas-de-esta-puerta"
    r = run("env", "--json", env=entorno)
    check("env --json sale 0", r.returncode == 0, r.stderr[:150])
    check(
        "env NUNCA imprime el valor de una variable presente en el proceso",
        "no-debe-salir-jamas-de-esta-puerta" not in r.stdout,
        r.stdout[:200],
    )
    # --- stdin-peek: un archivo real y no vacío SÍ cuenta como productor ----
    real_file = ROOT / "README.md"
    check("README.md existe y no está vacío", real_file.is_file() and real_file.stat().st_size > 0)
    with real_file.open("rb") as fh:
        r = subprocess.run(
            ["bun", "run", str(CLI), "stdin-peek", "--timeout-ms", "500"],
            stdin=fh, capture_output=True, text=True, cwd=str(PKG),
        )
    check("stdin-peek sobre README.md real detecta un productor (exit 0)", r.returncode == 0, r.stdout + r.stderr)

    # --- --timeout-ms inválido rehúsa, con o sin entrada real de por medio --
    r = run("stdin-peek", "--timeout-ms", "0")
    check("stdin-peek --timeout-ms 0 rehúsa con 2", r.returncode == 2)

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) (alcance medido: {CLI.name})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
