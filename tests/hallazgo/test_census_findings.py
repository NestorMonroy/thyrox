#!/usr/bin/env python3
"""Pruebas de src/hallazgo/census_findings.py — el censo del corpus de hallazgos.

El defecto que cierra, medido en
`.claude/workbench/censo-del-corpus-de-hallazgos-*`: la regla
`hallazgos-documentacion-obligatoria.md` transcribe once cifras que son
propiedad de un corpus que crece, y siete de ellas ya no describen el arbol.
`calibration-verified-numbers.md` lo prohibe por su corolario —*una cifra que
vive en codigo NO se transcribe a prosa*— y manda que la prosa nombre el
comando. Este modulo es ese comando.

Su exigencia central es la ABSTRACCION: el censo es del PROVEEDOR y lo consumen
N consumidores, asi que no puede llevar dentro ninguna lista cerrada de
prefijos ni de raices. El prefijo se deriva del nombre del archivo y la raiz de
su ruta; un consumidor con un prefijo que este arbol nunca vio tiene que
aparecer igual. Ese es el control que discrimina: sin la derivacion, el caso
del prefijo inventado cae y ningun otro.
"""
from __future__ import annotations

import pathlib
import shutil
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "src"))

from hallazgo import census_findings  # noqa: E402

OK = 0
FAILED = 0


def check(label, expected, got):
    global OK, FAILED
    if expected == got:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}")
        print(f"        esperado={expected!r} obtenido={got!r}")


def write(path: pathlib.Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def finding(submodule: str, lines: int = 3) -> str:
    cuerpo = "\n".join(f"linea {i}" for i in range(lines - 2))
    return f".. meta::\n   :submodulo: {submodule}\n{cuerpo}\n"


def build_corpus(root: pathlib.Path) -> None:
    """Un corpus sintetico con las cinco formas que el censo tiene que separar."""
    pm = root / "source" / "gestion" / "pm"

    # 1. Coherente: prefijo == :submodulo: == raiz de la ruta.
    write(pm / "api/iniciativas/uno/hallazgos/hallazgo-H-API-1-coherente.rst",
          finding("api", lines=10))
    write(pm / "api/iniciativas/uno/hallazgos/hallazgo-H-API-2-coherente.rst",
          finding("api", lines=20))

    # 2. Un prefijo que este arbol NUNCA vio. Si el censo llevara lista cerrada,
    #    desapareceria en silencio — que es el sub-patron D con el censo como
    #    sujeto: su total seguiria pareciendo sano.
    write(pm / "zzz/iniciativas/dos/hallazgos/hallazgo-H-ZZZ-1-prefijo-inedito.rst",
          finding("zzz", lines=30))

    # 3. Incoherente: la ruta dice thyrox y las otras dos declaraciones docs.
    write(pm / "thyrox/iniciativas/tres/hallazgos/hallazgo-H-DOCS-9-incoherente.rst",
          finding("docs", lines=40))

    # 4. Monolito: `hallazgos-*.rst` FUERA de un directorio `hallazgos/`.
    write(pm / "api/audits/hallazgos-un-monolito.rst", "x" * 5000)
    write(pm / "docs/audits/hallazgos-otro-monolito.rst", "y" * 100)

    # 5. Hallazgo suelto: `hallazgo-*.rst` fuera de un directorio `hallazgos/`.
    write(pm / "docs/audits/hallazgo-H-E2E-1-suelto.rst", finding("docs"))


def main() -> int:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="censo-hallazgos-"))
    try:
        build_corpus(tmp)
        pm = tmp / "source" / "gestion" / "pm"
        data = census_findings.census(pm)

        print("== 1. el universo son los hallazgos bajo un `hallazgos/` ==")
        check("total cuenta los 4 de un hallazgos/, no los sueltos", 4, data["total"])
        check("el suelto se cuenta aparte, no se pierde", 1, len(data["outside_dir"]))

        print()
        print("== 2. el prefijo se DERIVA del nombre, sin lista cerrada ==")
        check("el prefijo inedito aparece", 1, data["by_prefix"].get("ZZZ"))
        check("y los conocidos tambien", 2, data["by_prefix"].get("API"))
        check("DOCS cuenta por su PREFIJO, no por su carpeta", 1, data["by_prefix"].get("DOCS"))

        print()
        print("== 3. la raiz se DERIVA de la ruta, no del prefijo ==")
        check("la raiz de la ruta es thyrox aunque el prefijo diga DOCS",
              1, data["by_root"].get("thyrox"))
        check("y la raiz inedita aparece", 1, data["by_root"].get("zzz"))

        print()
        print("== 4. la triple declaracion, con su denominador ==")
        check("coherentes", 3, data["coherent"])
        check("incoherentes", 1, len(data["incoherent"]))
        check("y el incoherente se NOMBRA, no solo se cuenta",
              True, any("H-DOCS-9" in str(p) for p, *_ in data["incoherent"]))

        print()
        print("== 5. la mediana de lineas por hallazgo ==")
        # 10, 20, 30, 40 -> la mediana baja de un n par es 20 (indice n//2 - 1
        # no se usa: se toma el elemento superior, igual que el gate hermano).
        check("mediana sobre los 4 medidos", 30, data["median_lines"])

        print()
        print("== 6. los monolitos, por tamano descendente ==")
        check("dos monolitos", 2, len(data["monoliths"]))
        check("el mayor primero", True,
              data["monoliths"][0][1] > data["monoliths"][1][1])
        check("y su nombre es el real", True,
              "hallazgos-un-monolito.rst" in str(data["monoliths"][0][0]))

        print()
        print("== 7. el render publica el DENOMINADOR, no un conteo pelado ==")
        texto = census_findings.render(data)
        check("el total aparece", True, "4" in texto)
        check("la coherencia va con su denominador", True, "3 de 4" in texto)
        check("y el prefijo inedito llega al texto", True, "ZZZ" in texto)

        print()
        print("== 8. un corpus vacio NO publica un cero mudo ==")
        vacio = pathlib.Path(tempfile.mkdtemp(prefix="censo-vacio-"))
        try:
            d2 = census_findings.census(vacio)
            check("total 0", 0, d2["total"])
            check("y la mediana declara que no hay poblacion", None, d2["median_lines"])
        finally:
            shutil.rmtree(vacio, ignore_errors=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print()
    print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
    return 0 if FAILED == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
