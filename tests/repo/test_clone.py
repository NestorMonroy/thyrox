#!/usr/bin/env python3
"""Control de ``src/repo/clone.py``.

Es la capa de la que dependen los otros tres modulos de ``src/repo``, asi que
un defecto aqui se propaga a los tres a la vez. Lo que tiene que poder fallar:

* **la deteccion**. Un directorio corriente y una ruta inexistente NO son
  clones, y decir que si lo son haria que los consumidores midieran la nada.
* **el silencio**. Un comando que git no puede responder devuelve ``None``, no
  una excepcion: los consumidores distinguen «no pude» de «no hay», y una
  excepcion los deja sin ese eje.
* **el ``.git`` que es un ARCHIVO**. En un submodulo `.git` no es directorio
  sino un archivo que apunta al modulo real. Componer `root/".git"` a mano
  funciona en un clon normal y falla ahi — por eso se resuelve preguntandole
  a git, y ese es el caso que separa las dos implementaciones.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/repo"))
import clone  # noqa: E402

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
    return subprocess.run(["git", *args], cwd=root, capture_output=True,
                          text=True, check=True).stdout.strip()


def seed(root: pathlib.Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    git(root, "init", "-q")
    git(root, "config", "user.email", "t@t")
    git(root, "config", "user.name", "t")
    (root / "a.txt").write_text("uno\n")
    git(root, "add", "a.txt")
    git(root, "commit", "-q", "-m", "uno")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        repo = base / "repo"
        seed(repo)

        plain = base / "plain"
        plain.mkdir()

        check("un clon se reconoce", clone.is_clone(repo))
        check("un directorio corriente NO es clon", not clone.is_clone(plain))
        check("una ruta inexistente NO es clon",
              not clone.is_clone(base / "no-existe"))

        check("un comando valido devuelve su salida",
              (clone.run(repo, "rev-parse", "HEAD") or "").strip() != "")
        check("un comando que git no puede responder devuelve None",
              clone.run(plain, "rev-parse", "HEAD") is None)
        check("y una ruta inexistente tampoco levanta excepcion",
              clone.run(base / "no-existe", "status") is None)

        check("git_dir resuelve en un clon normal",
              clone.git_dir(repo) == (repo / ".git").resolve(),
              str(clone.git_dir(repo)))

        # El caso que separa «preguntarle a git» de «componer la ruta».
        parent = base / "parent"
        seed(parent)
        git(parent, "-c", "protocol.file.allow=always", "submodule", "add", "-q",
            str(repo), "child")
        git(parent, "commit", "-q", "-m", "add child")
        child = parent / "child"

        check("en un submodulo, .git es un ARCHIVO, no un directorio",
              (child / ".git").is_file(), str(child / ".git"))
        resolved = clone.git_dir(child)
        check("y git_dir aun asi resuelve su modulo real",
              resolved is not None and resolved.is_dir()
              and resolved != child / ".git",
              str(resolved))
        check("el submodulo se reconoce como clon", clone.is_clone(child))

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: clone.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
