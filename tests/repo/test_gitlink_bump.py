#!/usr/bin/env python3
"""Control de ``src/repo/gitlink_bump.py``.

``gitlink-bump-gate.md`` dice que la leccion escrita no previene la
reincidencia y que solo un gate ejecutable lo hace. Esa regla **no tenia
gate**: sus unicas apariciones en el arbol del proveedor eran citas de esa
misma frase en comentarios de otros mecanismos.

Lo que tiene que poder fallar:

* **las tres salidas, no dos**. El superproyecto esta ausente por decision del
  ejecutor, asi que hoy el gate siempre toma la tercera. Un guion que saliera
  0 sin nada que verificar seria el sub-patron D: un verde que no distingue
  «el gitlink coincide» de «no hay gitlink que mirar».
* **la divergencia**. Es el defecto que L-004 registro DOS veces: el submodulo
  pusheado y el superproyecto apuntando al commit anterior.
* **la coincidencia**. Sin este caso el gate podria estar siempre en rojo y
  nadie lo notaria.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/repo"))
import gitlink_bump  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def git(root: pathlib.Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=root, capture_output=True,
                          text=True, check=True)
    return done.stdout.strip()


def seed_pair(tmp: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path]:
    """Un superproyecto con un submodulo real, ambos con un commit."""
    child = tmp / "child"
    child.mkdir()
    git(child, "init", "-q")
    git(child, "config", "user.email", "t@t")
    git(child, "config", "user.name", "t")
    (child / "a.txt").write_text("uno\n")
    git(child, "add", "a.txt")
    git(child, "commit", "-q", "-m", "uno")

    parent = tmp / "parent"
    parent.mkdir()
    git(parent, "init", "-q")
    git(parent, "config", "user.email", "t@t")
    git(parent, "config", "user.name", "t")
    git(parent, "-c", "protocol.file.allow=always", "submodule", "add", "-q",
        str(child), "child")
    git(parent, "commit", "-q", "-m", "add child")
    return parent, child


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        parent, child = seed_pair(pathlib.Path(tmp))

        verdict = gitlink_bump.inspect(parent, "child")
        check("recien añadido, el gitlink coincide",
              verdict.status is gitlink_bump.Status.MATCHES, str(verdict))
        check("la coincidencia sale 0", verdict.exit_code == 0)

        # El defecto de L-004, forma 1: el submodulo avanza en el arbol del
        # padre y el gitlink se queda. Es la que `git status` ya reporta.
        work = parent / "child"
        (work / "a.txt").write_text("dos\n")
        git(work, "config", "user.email", "t@t")
        git(work, "config", "user.name", "t")
        git(work, "add", "a.txt")
        git(work, "commit", "-q", "-m", "dos")
        tip = git(work, "rev-parse", "HEAD")

        drifted = gitlink_bump.inspect(parent, "child")
        check("el submodulo avanzado produce DIVERGENCIA",
              drifted.status is gitlink_bump.Status.DRIFTED, str(drifted))
        check("la divergencia sale 1", drifted.exit_code == 1)
        check("nombra el tip que el gitlink deberia llevar",
              drifted.submodule_head == tip,
              f"{drifted.submodule_head} != {tip}")
        check("nombra el hash que el gitlink lleva hoy",
              drifted.recorded_head and drifted.recorded_head != tip)

        # Forma 2, la que produce el FALSO VERDE: en kaupamex el trabajo no
        # pasa por el arbol del padre sino por el clon hermano
        # (`/home/user/kaupamex-docs`). Si ese clon avanzo y el padre no, el
        # arbol del padre coincide consigo mismo y el gate diria COINCIDE
        # midiendo el sujeto equivocado. Por eso la referencia se puede
        # declarar con `source`.
        git(work, "reset", "-q", "--hard", "HEAD~1")
        aligned = gitlink_bump.inspect(parent, "child")
        check("con el arbol del padre realineado, el gate ve coincidencia",
              aligned.status is gitlink_bump.Status.MATCHES, str(aligned))

        (child / "a.txt").write_text("tres\n")
        git(child, "add", "a.txt")
        git(child, "commit", "-q", "-m", "tres")
        sibling_tip = git(child, "rev-parse", "HEAD")

        sibling = gitlink_bump.inspect(parent, "child", source=child)
        check("el clon hermano avanzado tambien es DIVERGENCIA",
              sibling.status is gitlink_bump.Status.DRIFTED, str(sibling))
        check("la referencia declarada es la que se cita",
              sibling.submodule_head == sibling_tip,
              f"{sibling.submodule_head} != {sibling_tip}")

        # El caso simetrico, y el unico que aisla la mitad nueva: la
        # REFERENCIA coincide con el gitlink y el arbol del padre NO. Mirar
        # solo la referencia lo leeria como coincidencia.
        git(child, "reset", "-q", "--hard", "HEAD~1")   # hermano de vuelta al gitlink
        (work / "a.txt").write_text("cuatro\n")
        git(work, "add", "a.txt")
        git(work, "commit", "-q", "-m", "cuatro")

        crossed = gitlink_bump.inspect(parent, "child", source=child)
        check("la referencia coincide y aun asi hay DIVERGENCIA",
              crossed.status is gitlink_bump.Status.DRIFTED, str(crossed))
        check("porque el arbol del padre es el que diverge",
              crossed.submodule_head == crossed.recorded_head
              and crossed.worktree_head != crossed.recorded_head,
              str(crossed))
        git(work, "reset", "-q", "--hard", "HEAD~1")

        no_clone = gitlink_bump.inspect(parent, "child",
                                        source=pathlib.Path(tmp) / "nada")
        check("una referencia que no es clon es AUSENTE, no verde",
              no_clone.status is gitlink_bump.Status.NO_SUPERPROJECT,
              str(no_clone))

        # El estado real de esta sesion: no hay superproyecto.
        absent = gitlink_bump.inspect(pathlib.Path(tmp) / "no-existe", "child")
        check("sin superproyecto el veredicto es AUSENTE, no verde",
              absent.status is gitlink_bump.Status.NO_SUPERPROJECT, str(absent))
        check("la ausencia sale 2, ni 0 ni 1", absent.exit_code == 2)

        script = str(ROOT / "src/repo/gitlink_bump.py")
        r = subprocess.run([sys.executable, script, "child",
                            "--root", str(pathlib.Path(tmp) / "no-existe")],
                           capture_output=True, text=True)
        check("la ausencia NO se declara publicada",
              "publicado" not in r.stdout.lower(), r.stdout[-120:])
        check("la ausencia nombra su razon", "ausente" in (r.stdout + r.stderr).lower(),
              (r.stdout + r.stderr)[-160:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: gitlink_bump.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
