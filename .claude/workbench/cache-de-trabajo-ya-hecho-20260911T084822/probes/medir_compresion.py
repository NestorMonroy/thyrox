"""Mide si el indice del cache conviene comprimido, y con que compresor.

Tres mediciones, porque la pregunta tiene tres mitades que no se responden con
el mismo instrumento:

  1. el compresor  — cuanto encoge y cuanto cuesta, sobre un indice REAL
  2. el ahorro     — cuanto tarda leer los archivos que el escalon 1 evita abrir
  3. git           — cuanto crece el packfile con el indice plano vs comprimido

La tercera es la decisiva: la pregunta nacio de un bloqueo de git, no de disco.
"""
from __future__ import annotations

import bz2
import gzip
import hashlib
import json
import lzma
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

RAIZ = pathlib.Path(__file__).resolve()
ARBOL = pathlib.Path("/home/user/thyrox/src")


def build_index() -> dict:
    """Un indice real: un documento por archivo, con la forma que el porte usa."""
    docs = {}
    for p in sorted(ARBOL.rglob("*.py")):
        st = p.stat()
        docs[str(p)] = {
            "size": st.st_size,
            "mtime_ms": int(st.st_mtime * 1000),
            "hash": hashlib.sha256(p.read_bytes()).hexdigest()[:16],
        }
    return {"version": 10, "fingerprint": "x" * 16, "docs": docs}


def ms(fn, veces=5) -> float:
    t0 = time.perf_counter()
    for _ in range(veces):
        fn()
    return (time.perf_counter() - t0) * 1000 / veces


def main() -> int:
    idx = build_index()
    raw = json.dumps(idx, separators=(",", ":")).encode()
    n = len(idx["docs"])

    print(f"indice real sobre {ARBOL} — {n} documentos, {len(raw)} B en texto plano")
    print()
    print("1. EL COMPRESOR — sobre el indice real")
    print(f"{'metodo':<14}{'bytes':>8}{'ratio':>8}{'comprimir':>12}{'descomprimir':>14}")
    print(f"{'ninguno':<14}{len(raw):>8}{1.00:>8.2f}{'—':>12}{'—':>14}")

    metodos = [
        ("gzip", lambda b: gzip.compress(b), gzip.decompress),
        ("gzip -9", lambda b: gzip.compress(b, 9), gzip.decompress),
        ("bz2", lambda b: bz2.compress(b), bz2.decompress),
        ("xz/lzma", lambda b: lzma.compress(b), lzma.decompress),
    ]
    for nombre, comp, desc in metodos:
        blob = comp(raw)
        t_c = ms(lambda: comp(raw))
        t_d = ms(lambda: desc(blob))
        print(f"{nombre:<14}{len(blob):>8}{len(blob)/len(raw):>8.2f}"
              f"{t_c:>11.1f}ms{t_d:>13.1f}ms")

    print()
    print("2. EL AHORRO — lo que el escalon 1 evita")
    rutas = [pathlib.Path(p) for p in idx["docs"]]
    t_leer = ms(lambda: [p.read_bytes() for p in rutas], veces=3)
    print(f"leer los {n} archivos que el escalon 1 no abre: {t_leer:.1f} ms")

    print()
    print("3. GIT — 20 commits, 5 de los documentos cambian en cada uno")
    resultados = {}
    for modo in ("plano", "gzip"):
        tmp = tempfile.mkdtemp()
        try:
            subprocess.run(["git", "init", "-q", tmp], check=True)
            env = dict(os.environ,
                       GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t",
                       GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t")
            claves = list(idx["docs"])
            for i in range(20):
                for k in claves[i * 5:(i + 1) * 5]:
                    idx["docs"][k]["mtime_ms"] += 1000
                    idx["docs"][k]["hash"] = hashlib.sha256(
                        f"{k}{i}".encode()).hexdigest()[:16]
                blob = json.dumps(idx, separators=(",", ":")).encode()
                if modo == "gzip":
                    blob = gzip.compress(blob)
                destino = pathlib.Path(tmp) / ".work-index.json"
                destino.write_bytes(blob)
                subprocess.run(["git", "-C", tmp, "add", ".work-index.json"],
                               check=True, env=env)
                subprocess.run(["git", "-C", tmp, "commit", "-q", "-m", f"c{i}"],
                               check=True, env=env)
            subprocess.run(["git", "-C", tmp, "gc", "--aggressive",
                            "--prune=now", "-q"], check=True, env=env)
            en_arbol = destino.stat().st_size
            dot_git = sum(f.stat().st_size
                          for f in (pathlib.Path(tmp) / ".git").rglob("*")
                          if f.is_file())
            resultados[modo] = (en_arbol, dot_git)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    print(f"{'indice':<14}{'en el arbol':>14}{'.git entero':>14}")
    for modo, (a, g) in resultados.items():
        print(f"{modo:<14}{a:>14}{g:>14}")
    factor = resultados["gzip"][1] / resultados["plano"][1]
    print()
    print(f"git con el indice comprimido ocupa {factor:.2f}x lo que con el plano")
    return 0


if __name__ == "__main__":
    sys.exit(main())
