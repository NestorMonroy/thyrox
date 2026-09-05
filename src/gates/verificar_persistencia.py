#!/usr/bin/env python3
"""Verifica contra el DISCO lo que un agente dice haber persistido.

Es la segunda mitad de `niveles-de-retencion.md`. La primera vive inlineada en
los guiones de `.claude/workflows/` (`assertLevel3`) y sólo alcanza a exigir que
el resultado **declare** una ruta: el runtime del canal no tiene filesystem, así
que un guion no puede comprobar nada. Este script sí lee el disco, y por eso es
lo único que puede promover un trabajo de nivel 3 a nivel 2.

Independiente significa **de otro instrumento que el testimonio del agente**: se
mide el archivo, no el resumen que lo describe. Un guion que leyera el
transcript del propio agente mediría al sujeto consigo mismo.

    python3 .claude/scripts/gates/verificar_persistencia.py <ruta> [<ruta>...]
    python3 .claude/scripts/gates/verificar_persistencia.py <ruta> --agente <id> --promover
    python3 .claude/scripts/gates/verificar_persistencia.py <ruta> --desde 2026-08-19T12:00:00

Salidas:
    0  todas las rutas pasan  (con --promover: se escribió retention_level = 2)
    1  alguna ruta falla      (nunca se promueve nada)
    2  error de uso
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

# Un `.rst` de análisis por debajo de esto es una cáscara, no un entregable. No
# es una cifra del proyecto: es el umbral del instrumento, y se declara aquí
# porque el que lo lea tiene que poder discutirlo.
MIN_BYTES_RST = 400
MIN_BYTES = 1


def _git(repo: Path, *args: str) -> str:
    try:
        return subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True, timeout=30,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return ""


def _repo_of(path: Path) -> Path | None:
    """El repo git que contiene la ruta, o None si no hay ninguno."""
    for parent in [path if path.is_dir() else path.parent, *path.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def verify(path_str: str, since: dt.datetime | None) -> tuple[bool, list[str]]:
    """Devuelve (pasa, motivos). Cada motivo es una comprobación de disco."""
    notes: list[str] = []
    path = Path(path_str).expanduser()

    if not path.is_absolute():
        notes.append(f"ruta relativa, no resoluble sin base: {path_str}")
        return False, notes

    if not path.exists():
        notes.append("NO EXISTE en disco")
        return False, notes

    if path.is_dir():
        files = [p for p in path.rglob("*") if p.is_file()]
        if not files:
            notes.append("es un directorio VACÍO")
            return False, notes
        notes.append(f"directorio con {len(files)} archivos")
        repo = _repo_of(path)
    else:
        size = path.stat().st_size
        floor = MIN_BYTES_RST if path.suffix == ".rst" else MIN_BYTES
        if size < floor:
            notes.append(f"{size} bytes — por debajo del piso de {floor}")
            return False, notes
        notes.append(f"{size} bytes")

        if path.suffix == ".rst" and ".. meta::" not in path.read_text(
                encoding="utf-8", errors="replace"):
            notes.append("`.rst` sin bloque `.. meta::`")
            return False, notes

        repo = _repo_of(path)

    if repo is None:
        notes.append("fuera de todo repo git — no es durable")
        return False, notes

    rel = path.relative_to(repo)
    seguido = _git(repo, "ls-files", "--error-unmatch", str(rel)).strip()
    sin_seguir = _git(repo, "status", "--porcelain", "-uall", "--", str(rel)).strip()
    if not seguido and not sin_seguir:
        notes.append(f"git de {repo.name} no lo ve: ni seguido ni en el working tree")
        return False, notes
    notes.append(f"git {repo.name}: {'seguido' if seguido else 'en el working tree'}")

    if since is not None:
        mtime = dt.datetime.fromtimestamp(path.stat().st_mtime, tz=dt.timezone.utc)
        if mtime < since:
            notes.append(f"mtime {mtime:%Y-%m-%dT%H:%M:%S} anterior a {since:%Y-%m-%dT%H:%M:%S}"
                         " — preexistente, no lo escribió este trabajo")
            return False, notes
        notes.append(f"mtime {mtime:%Y-%m-%dT%H:%M:%S}")

    return True, notes


def promote(store: Path, agent_id: str) -> str:
    """Escribe retention_level = 2. Sólo se llama con todas las rutas en verde."""
    if not store.exists():
        return f"store ausente en {store}"
    conn = sqlite3.connect(store)
    try:
        cur = conn.execute(
            "update agent_sessions set retention_level = 2 where agent_id = ?", (agent_id,))
        conn.commit()
        if not cur.rowcount:
            return f"ningún agente con agent_id={agent_id}"
        return f"retention_level = 2 escrito para {agent_id}"
    finally:
        conn.close()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("rutas", nargs="+", help="rutas absolutas que el trabajo dice haber escrito")
    p.add_argument("--agente", help="agent_id a promover a nivel 2 si todo pasa")
    p.add_argument("--promover", action="store_true",
                   help="escribe retention_level = 2 (requiere --agente)")
    p.add_argument("--desde", metavar="ISO",
                   help="exige mtime posterior a este instante (ISO 8601 UTC)")
    p.add_argument("--store", default=os.environ.get("AGENT_STORE"),
                   help="ruta del agent_store.sqlite3 (por omisión, junto a este script)")
    a = p.parse_args(argv)

    if a.promover and not a.agente:
        print("--promover exige --agente", file=sys.stderr)
        return 2

    since = None
    if a.desde:
        try:
            since = dt.datetime.fromisoformat(a.desde)
            if since.tzinfo is None:
                since = since.replace(tzinfo=dt.timezone.utc)
        except ValueError:
            print(f"--desde no es ISO 8601: {a.desde}", file=sys.stderr)
            return 2

    fallan = 0
    for ruta in a.rutas:
        ok, notes = verify(ruta, since)
        marca = "OK  " if ok else "FALLA"
        print(f"{marca} {ruta}")
        for n in notes:
            print(f"      · {n}")
        fallan += (not ok)

    total = len(a.rutas)
    print(f"\n{total - fallan}/{total} rutas verificadas contra el disco")

    if fallan:
        print("NO se promueve nada: el trabajo se queda en nivel 3 (o 4 si nada existe).")
        return 1

    if a.promover:
        store = Path(a.store) if a.store else (
            Path(__file__).resolve().parents[2] / "agent-results" / "agent_store.sqlite3")
        print(promote(store, a.agente))
    elif a.agente:
        print(f"Sin --promover: {a.agente} sigue en su nivel actual. "
              "La promoción es una escritura deliberada, no un efecto de verificar.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
