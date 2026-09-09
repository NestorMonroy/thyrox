#!/usr/bin/env python3
"""Control de `check_pathspec_commit.py` — el defecto se REPRODUCE, no se finge.

Y reproducirlo CORRIGIO la premisa. La ficha decia «el archivo se publica
vacio»; el caso 1-bis lo intenta y mide 12 bytes, asi que en git 2.43.0 eso no
ocurre. El defecto real es el caso 2: `add -N` mas un commit SIN pathspec deja
la ruta declarada y sin publicar. Sin la reproduccion, el gate habria medido
un fenomeno que este git no produce y habria publicado 0 para siempre.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228).
RAIZ = reach.thyrox_root()
GATE = RAIZ / "src" / "verify" / "check_pathspec_commit.py"

ok = fallos = 0


def check(label: str, esperado, obtenido) -> None:
    global ok, fallos
    if esperado == obtenido:
        ok += 1
        print(f"  ok    {label}")
    else:
        fallos += 1
        print(f"  FALLO {label}: esperaba {esperado!r}, obtuve {obtenido!r}")


def git(repo: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), *args],
                          capture_output=True, text=True)


def repo_nuevo(base: pathlib.Path) -> pathlib.Path:
    repo = base / "r"
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "semilla.txt").write_text("semilla\n")
    git(repo, "add", "semilla.txt")
    git(repo, "commit", "-q", "-m", "seed")
    return repo


def correr(repo: pathlib.Path, *args: str) -> tuple[int, str]:
    done = subprocess.run([sys.executable, str(GATE), str(repo), *args],
                          capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


print("== 1. un commit normal no se marca ==")
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    (repo / "bueno.txt").write_text("contenido de verdad\n")
    git(repo, "add", "bueno.txt")
    git(repo, "commit", "-q", "-m", "Add bueno")
    code, out = correr(repo)
    check("sale 0", 0, code)
    check("y publica 0 rutas sin publicar", True, "0 ruta(s) declarada(s) y no publicada(s)" in out)

print("== 1-bis. la premisa de la ficha NO se reproduce, y se mide ==")
# `add -N` mas `commit -- <ruta>` publica el CONTENIDO: un commit por pathspec
# lee el arbol de trabajo. Si algun dia dejara de hacerlo, este caso cae y
# avisa de que la premisa cambio.
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    (repo / "por_pathspec.txt").write_text("contenido de verdad\n")
    git(repo, "add", "-N", "por_pathspec.txt")
    git(repo, "commit", "-q", "-m", "Publish by pathspec", "--", "por_pathspec.txt")
    tam = git(repo, "cat-file", "-s", "HEAD:por_pathspec.txt").stdout.strip()
    check("el blob NO sale vacio — la premisa de ERR-31 no aplica aqui", "20", tam)
    code, out = correr(repo)
    check("y el gate no marca nada", 0, code)

print("== 2. CONTROL: el defecto REAL — declarada y no publicada ==")
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    (repo / "otro.txt").write_text("algo que si se commitea\n")
    git(repo, "add", "otro.txt")
    (repo / "declarada.txt").write_text("esto NO llega al commit\n")
    git(repo, "add", "-N", "declarada.txt")       # solo la INTENCION
    git(repo, "commit", "-q", "-m", "Commit sin pathspec")
    # Precondicion: el commit tuvo exito y la ruta NO entro.
    check("precondicion — la ruta no esta en HEAD", 128,
          git(repo, "cat-file", "-s", "HEAD:declarada.txt").returncode)
    check("precondicion — la otra SI entro", 0,
          git(repo, "cat-file", "-s", "HEAD:otro.txt").returncode)
    code, out = correr(repo)
    check("sale 1", 1, code)
    check("nombra la ruta", True, "declarada.txt" in out)
    check("y publica su tamano en disco", True, "24 bytes en disco" in out)

print("== 3. un archivo genuinamente vacio NO es el defecto ==")
# Vacio y COMMITEADO no es este defecto. Sin este caso el gate marcaria todo
# `touch` mas commit, que es el falso positivo que entrena a ignorar un gate.
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    (repo / "de-verdad-vacio.txt").write_text("")
    git(repo, "add", "de-verdad-vacio.txt")
    git(repo, "commit", "-q", "-m", "Add empty on purpose")
    code, out = correr(repo)
    check("sale 0 — un archivo vacio commiteado esta publicado", 0, code)

print("== 4. sin repo REHUSA, no publica un 0 ==")
with tempfile.TemporaryDirectory() as d:
    code, out = correr(pathlib.Path(d))
    check("exit 2", 2, code)
    check("y NO emite conteo", False, "archivo(s) publicado(s)" in out)

print("== 5. un commit que no resuelve REHUSA ==")
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    code, out = correr(repo, "--commit", "no-existe-este-ref")
    check("exit 2", 2, code)
    check("y lo dice", True, "no resuelve" in out)

print("== 6. --quiet publica el conteo y conserva el codigo ==")
with tempfile.TemporaryDirectory() as d:
    repo = repo_nuevo(pathlib.Path(d))
    (repo / "x.txt").write_text("con contenido\n")
    git(repo, "add", "-N", "x.txt")
    (repo / "y.txt").write_text("otra\n")
    git(repo, "add", "y.txt")
    git(repo, "commit", "-q", "-m", "Commit sin pathspec")
    code, out = correr(repo, "--quiet")
    check("exit 1", 1, code)
    check("y la salida es el conteo pelado", "1", out.strip())

print()
print(f"{ok} ok, {fallos} fallos")
raise SystemExit(1 if fallos else 0)
