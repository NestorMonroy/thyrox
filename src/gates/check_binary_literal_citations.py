#!/usr/bin/env python3
"""check_binary_literal_citations.py — una regla que cita un literal del
ejecutable lo cita VERBATIM, no parafraseado.

Por que existe
--------------
H-DOCS-211 dejo en dos reglas de api la forma `min(16, CPUs-2)` donde el
ejecutable declara `Math.min(16,Math.max(2,r-2))`. La parafrasis pierde el
piso: con `nproc <= 3` predice un cap de 1 donde el real es 2. Aqui
coincidian por casualidad (`nproc` = 4 da 2 por ambas formas), y esa
coincidencia es lo que impidio verlo durante nueve dias.

Directiva del ejecutor 2026-08-28: *«si se escribe en prosa es dificil
recordar, es por eso que usamos los scripts»*. Este guion es esa forma:
el literal se RE-MIDE del ejecutable en cada pase y se compara contra lo
que la prosa cita.

Como decide, y por que puede fallar
-----------------------------------
Cada fila de LITERALS declara DOS patrones, no uno:

- `deteccion` — laxo, lo que una parafrasis TAMBIEN casaria. Es lo que
  hace que el control pueda fallar (sub-patron D de
  `metrica-decide-la-conclusion.md`): sin el, el gate solo veria las
  citas ya correctas y publicaria un verde que no discrimina.
- `extraccion` — el literal real, leido del ejecutable de ESTA sesion.

Una linea que casa `deteccion` y no contiene el literal extraido es
deriva. Una que casa las dos, esta al dia.

Precondicion declarada
----------------------
Sin ejecutable legible el guion REHUSA con exit 2 y NO emite conteo: un 0
ahi no distinguiria «ninguna regla derivo» de «no pude medir».
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

# El arbol y los clones se PIDEN, no se componen ni se enumeran.
#
# Antes: `DOCS_ROOT = HERE.parents[2]` con un `assert` detras, y los cinco
# clones escritos como literales. Las dos formas se rompieron con la mudanza:
# desde `thyrox/src/gates/` el `parents[2]` da `/home/user`, el `assert`
# revienta con Traceback, y el corredor lo lee como violacion de la regla en
# vez de como ruta rota. La lista literal es ademas lo que #170 nombra — un
# consumidor que escribe los cinco nombres en vez de pedirlos.
#
# `reach` los resuelve con las dos entradas de entorno que el proyecto ya
# fijo: el valor directo, y la ruta al `.env` que lo declara.
TREE_ROOT = reach.tree_root()
REPO_ROOTS = tuple(reach.roots().values())
BASELINE = HERE / "binary_literal_baseline.txt"

#: etiqueta -> (patron laxo en la prosa, patron de extraccion en el binario)
LITERALS = {
    "parallel_cap": (
        re.compile(r"min\(\s*16"),
        re.compile(r"Math\.min\(16,Math\.max\(2,[A-Za-z_$][A-Za-z0-9_$]*-2\)\)"),
    ),
}


def executable_strings() -> str:
    """Las cadenas del ejecutable vivo. Rehusa si no hay ejecutable."""
    binario = shutil.which("claude")
    if not binario:
        print("ERROR — no hay ejecutable `claude` en PATH. NO se emite un "
              "conteo: un 0 aqui seria un verde falso.", file=sys.stderr)
        raise SystemExit(2)
    ruta = Path(binario).resolve()
    try:
        salida = subprocess.run(["strings", "-n", "4", str(ruta)],
                                capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"ERROR — no pude leer las cadenas de {ruta}: {exc}. NO se "
              "emite un conteo.", file=sys.stderr)
        raise SystemExit(2)
    return salida.stdout


def rule_files() -> list[Path]:
    encontrados: list[Path] = []
    for raiz in REPO_ROOTS:
        reglas = raiz / ".claude" / "rules"
        if reglas.is_dir():
            encontrados.extend(sorted(reglas.glob("*.md")))
    return encontrados


def load_baseline() -> set[str]:
    if not BASELINE.exists():
        return set()
    return {l.strip() for l in BASELINE.read_text().splitlines()
            if l.strip() and not l.startswith("#")}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--strict", action="store_true",
                    help="exit 1 si hay deriva fuera del baseline")
    ap.add_argument("--write-baseline", action="store_true",
                    help="congela la deriva actual")
    args = ap.parse_args()

    cadenas = executable_strings()
    esperado: dict[str, str] = {}
    for etiqueta, (_, extraccion) in LITERALS.items():
        hallados = sorted(set(extraccion.findall(cadenas))) or \
                   sorted(set(m.group(0) for m in extraccion.finditer(cadenas)))
        if not hallados:
            print(f"ERROR — el literal `{etiqueta}` no aparece en el "
                  "ejecutable de esta sesion. Puede ser deriva de build; "
                  "NO se emite un conteo.", file=sys.stderr)
            return 2
        if len(hallados) > 1:
            print(f"ERROR — `{etiqueta}` casa {len(hallados)} formas "
                  f"distintas: {hallados}. Sin desempate no se emite un "
                  "conteo.", file=sys.stderr)
            return 2
        esperado[etiqueta] = hallados[0]

    baseline = load_baseline()
    archivos = rule_files()
    laxos = 0
    deriva: list[str] = []

    for f in archivos:
        rel = f.relative_to(TREE_ROOT).as_posix()
        for n, linea in enumerate(f.read_text(errors="replace").splitlines(), 1):
            for etiqueta, (deteccion, _) in LITERALS.items():
                if not deteccion.search(linea):
                    continue
                laxos += 1
                if esperado[etiqueta] in linea:
                    continue
                clave = f"{rel}::{etiqueta}"
                if clave in baseline:
                    continue
                deriva.append(f"  {rel}:{n}  `{etiqueta}` parafraseado — "
                              f"el ejecutable declara `{esperado[etiqueta]}`")

    if args.write_baseline:
        claves = sorted({d.split("  ")[1].split(":")[0] + "::" +
                         d.split("`")[1] for d in deriva})
        BASELINE.write_text(
            "# Deriva congelada de check_binary_literal_citations.py\n"
            "# Formato: <ruta relativa al arbol>::<etiqueta>\n" +
            "".join(k + "\n" for k in claves))
        print(f"baseline escrito: {len(claves)} entrada(s)")
        return 0

    for d in deriva:
        print(d)
    print(f"check-binary-literal-citations: {len(deriva)} cita(s) "
          f"parafraseada(s) (alcance medido: {len(archivos)} regla(s) en "
          f"{len(REPO_ROOTS)} repos; {laxos} linea(s) casan el patron laxo; "
          f"{len(LITERALS)} literal(es) declarado(s); {len(baseline)} en "
          "baseline)")
    return 1 if (deriva and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main())
