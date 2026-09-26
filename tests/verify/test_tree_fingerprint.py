"""La huella del árbol que una suite mide.

Una suite larga mide un árbol que puede cambiar mientras corre: una edición
del orquestador, un commit de otro escritor, el mutante que otra suite deja
a medias. Su veredicto entonces no es atribuible a ningún estado. La huella
se toma al empezar y al terminar; si difieren, el veredicto se declara «no
atribuible» en vez de publicarse como rojo o verde.

Contrato:
  - misma huella para el mismo estado;
  - cambia si cambia HEAD, un archivo versionado o uno nuevo sin versionar
    dentro del alcance (src, tests, bin);
  - NO cambia por lo que la propia medición escribe fuera del alcance
    (.claude/jobs) ni por lo ignorado;
  - ciega, declarado: una edición deshecha antes del final.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from verify import tree_fingerprint as tf

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false",
                    *args], cwd=repo, check=True, capture_output=True)


with tempfile.TemporaryDirectory() as raw:
    repo = Path(raw)
    git(repo, "init", "-q")
    (repo / "src").mkdir(); (repo / "tests").mkdir(); (repo / ".claude/jobs").mkdir(parents=True)
    (repo / "src/a.py").write_text("a = 1\n")
    (repo / ".gitignore").write_text("*.pyc\n")
    git(repo, "add", "."); git(repo, "commit", "-q", "-m", "seed")
    base = tf.fingerprint(repo)

    print("== 1. el mismo estado da la misma huella ==")
    check("dos tomas iguales", base, tf.fingerprint(repo))

    print("== 2. un archivo versionado editado la cambia ==")
    (repo / "src/a.py").write_text("a = 2\n")
    edited = tf.fingerprint(repo)
    check("cambia", True, edited != base)
    print("== 3. y dos ediciones distintas dan huellas distintas ==")
    (repo / "src/a.py").write_text("a = 3\n")
    check("no basta con saber que está sucio", True, tf.fingerprint(repo) != edited)
    (repo / "src/a.py").write_text("a = 1\n")
    check("deshecha, vuelve a la base (ciega a lo deshecho, declarado)", base, tf.fingerprint(repo))

    print("== 4. un archivo nuevo dentro del alcance la cambia ==")
    (repo / "tests/test_nuevo.py").write_text("x\n")
    check("cambia", True, tf.fingerprint(repo) != base)
    (repo / "tests/test_nuevo.py").unlink()

    print("== 5. lo que la medición escribe fuera del alcance NO la cambia ==")
    (repo / ".claude/jobs/salida.log").write_text("log de la propia suite\n")
    check(".claude/jobs no cuenta", base, tf.fingerprint(repo))
    (repo / "src/a.pyc").write_text("bytecode")
    check("lo ignorado no cuenta", base, tf.fingerprint(repo))

    print("== 6. un commit de otro escritor la cambia ==")
    (repo / "src/b.py").write_text("b = 1\n")
    git(repo, "add", "src/b.py"); git(repo, "commit", "-q", "-m", "otro")
    check("HEAD movido: cambia", True, tf.fingerprint(repo) != base)

    print("== 7. fuera de un repo git, rehúsa en vez de dar una huella ==")
    with tempfile.TemporaryDirectory() as outside:
        try:
            outcome = tf.fingerprint(Path(outside))
        except tf.NotARepository:
            outcome = "rehúsa"
        check("rehúsa", "rehúsa", outcome)

print(f"\ntest_tree_fingerprint: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
