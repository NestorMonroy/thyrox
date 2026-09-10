#!/usr/bin/env python3
"""Control de ``src/repo/citations.py``.

Lo que tiene que poder fallar, y por eso son los dos casos centrales:

* la **separación viva / evidencia**. Si todo contara como vivo, un barrido
  nunca llegaria a cero y acabaria reescribiendo hallazgos — destruyendo la
  memoria episodica que la evidencia fechada existe para guardar. Si todo
  contara como evidencia, ``--verify`` daria verde con consumidores rotos.
* la **rehusa**. Un directorio que no es clon no produce «0 citas»: produce
  codigo 2. Un cero ahi no distinguiria «no hay» de «no mire».
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/repo"))
import citations  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def git(root: pathlib.Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, capture_output=True, check=True)


def main() -> int:
    # --- la clasificacion, sobre rutas reales del arbol --------------------
    for relative, expected in [
        ("source/gestion/pm/docs/iniciativas/x/hallazgos/hallazgo-H-DOCS-1.rst", True),
        ("source/gestion/pm/docs/audits/registro.rst", True),
        ("source/gestion/pm/docs/lecciones-aprendidas/l.rst", True),
        ("source/gestion/pm/docs/iniciativas/x/progreso-x.rst", True),
        ("source/gestion/pm/docs/iniciativas/x/analisis-x.rst", True),
        (".claude/eventos/banco-20260101T000000/nota.md", True),
        ("_archived/.claude/scripts/viejo.sh", True),
        ("source/normativa/estandares/catalogo-de-scripts.rst", False),
        (".claude/rules/git.md", False),
        ("src/verify/registry.py", False),
        (".githooks/pre-commit", False),
    ]:
        check(f"{'evidencia' if expected else 'viva     '}  {relative[:58]}",
              citations.is_evidence(relative) is expected)

    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)

        # --- un clon sintetico con las dos clases de cita -------------------
        clone = base / "clon"
        (clone / "src/verify").mkdir(parents=True)
        (clone / "source/gestion/pm/docs/iniciativas/x/hallazgos").mkdir(parents=True)
        (clone / "src/verify/consumer.py").write_text("import viejo_nombre\n")
        (clone / "source/gestion/pm/docs/iniciativas/x/hallazgos/hallazgo-H-1.rst"
         ).write_text("el defecto vivia en viejo_nombre\n")
        git(clone, "init", "-q")
        git(clone, "add", "-A")
        git(clone, "-c", "user.email=t@t", "-c", "user.name=t",
            "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed")

        census = citations.citers("viejo_nombre", roots={"clon": clone})
        check("cuenta 1 cita viva", census["live"] == 1, str(census))
        check("y 1 en evidencia", census["evidence"] == 1, str(census))
        check("y declara su denominador", census["clones"] == 1)
        check("el informe marca cual reapuntar",
              any("REAPUNTAR" in l for l in citations.report(census)))

        # --- ANULACION: si la clasificacion no discriminara ----------------
        # Con is_evidence devolviendo siempre False, la cita del hallazgo
        # contaria como viva y --verify nunca llegaria a cero. Tiene que caer
        # EXACTAMENTE la asercion de evidencia, ni una mas.
        original = citations.is_evidence
        citations.is_evidence = lambda relative: False
        try:
            roto = citations.citers("viejo_nombre", roots={"clon": clone})
        finally:
            citations.is_evidence = original
        check("anulada la clasificacion, la evidencia se cuenta como viva",
              roto["live"] == 2 and roto["evidence"] == 0, str(roto))
        check("y restaurada, vuelve a discriminar",
              citations.citers("viejo_nombre", roots={"clon": clone})["live"] == 1)

        # --- la rehusa ------------------------------------------------------
        no_clon = base / "no-es-clon"; no_clon.mkdir()
        try:
            citations.citers("x", roots={"no-clon": no_clon})
            check("un directorio sin .git rehusa", False, "no lanzo")
        except citations.CitationError as error:
            check("un directorio sin .git rehusa", True)
            check("y dice que no emite conteo", "NO se emite" in str(error))
        try:
            citations.citers("x", roots={})
            check("sin ningun clon alcanzable, rehusa", False, "no lanzo")
        except citations.CitationError as error:
            check("sin ningun clon alcanzable, rehusa", True)
            check("y lo llama verde falso", "verde falso" in str(error))

        # --- --verify por conducta -----------------------------------------
        script = str(ROOT / "src/repo/citations.py")
        r = subprocess.run([sys.executable, script, "no-existe-en-ningun-sitio",
                            "--verify"], capture_output=True, text=True)
        check("--verify sale 0 sin citas vivas", r.returncode == 0, r.stdout[-120:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: citations.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
