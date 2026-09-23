#!/usr/bin/env python3
"""Ejecuta un control de anulación y deja su evidencia en el banco.

Un control de anulación retira la causa de un arreglo y comprueba que caen
EXACTAMENTE las aserciones que dependen de ella. Hasta este mecanismo se hacía
a mano —``cp archivo cache/x.orig``, editar, correr la suite, ``cp`` de
vuelta— y tres cosas salían mal por construcción (episodio 2026-09-23):

1. la copia de partida vivía fuera del banco y terminó borrada;
2. el parche de la anulación no quedaba escrito: el banco lo describía en
   prosa y repetir el control exigía reconstruirlo;
3. «el archivo volvió igual» se afirmaba sin medirlo.

Aquí cada una es un paso con su medición:

- la anulación es un PARCHE (``git apply``), y el parche se copia al banco;
- la restauración es el parche inverso, y se MIDE comparando el blob
  (``git hash-object``) de antes y de después — no se supone;
- si el sujeto tiene cambios sin commitear, su estado de partida se guarda en
  el banco, porque git no lo tiene; si está commiteado, basta el commit.

Rehúsa (``ValueError``) si el parche no aplica, sin tocar nada ni escribir
una salida de una medición que no ocurrió.

Uso::

    bin/annulment_control --bench <dir> --name <pieza> --subject <archivo> \\
        (--patch <parche> | --replace VIEJO NUEVO) -- <comando de la suite...>
"""
from __future__ import annotations

import argparse
import datetime as _dt
import difflib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), *args], check=check,
                          capture_output=True, text=True)


def _blob(repo: Path, subject: Path) -> str:
    return _git(repo, "hash-object", "--", str(subject)).stdout.strip()


def _is_committed(repo: Path, relative: str) -> bool:
    tracked = _git(repo, "ls-files", "--error-unmatch", "--", relative, check=False)
    if tracked.returncode != 0:
        return False
    return _git(repo, "diff", "--quiet", "HEAD", "--", relative, check=False).returncode == 0


def _run(command: list[str], cwd: Path, output: Path) -> int:
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True,
                            stdin=subprocess.DEVNULL)
    output.write_text(result.stdout + result.stderr + f"\n[exit={result.returncode}]\n")
    return result.returncode


def run_annulment(repo: Path, bench: Path, name: str, subject: Path,
                  patch: Path, command: list[str], extra: dict | None = None) -> dict:
    repo, subject, patch = repo.resolve(), subject.resolve(), patch.resolve()
    relative = str(subject.relative_to(repo))
    if _git(repo, "apply", "--check", str(patch), check=False).returncode != 0:
        raise ValueError(f"el parche {patch} no aplica sobre {relative}")

    bench.mkdir(parents=True, exist_ok=True)
    before_text = subject.read_bytes()
    blob_before = _blob(repo, subject)
    committed = _is_committed(repo, relative)
    shutil.copyfile(patch, bench / f"annulled-{name}.patch")
    if not committed:
        (bench / f"{subject.stem}-before-{name}{subject.suffix}").write_bytes(before_text)

    _git(repo, "apply", str(patch))
    try:
        annulled_exit = _run(command, repo, bench / f"annulled-{name}.txt")
    finally:
        if _git(repo, "apply", "-R", str(patch), check=False).returncode != 0:
            # El inverso no aplicó: se repone el estado de partida guardado.
            subject.write_bytes(before_text)
    blob_after = _blob(repo, subject)
    if blob_after != blob_before:
        subject.write_bytes(before_text)
        raise RuntimeError(f"{relative} no volvió a su blob de partida "
                           f"({blob_after} != {blob_before}); se repuso desde memoria")
    restored_exit = _run(command, repo, bench / f"restored-{name}.txt")

    report = {
        "name": name,
        "subject": relative,
        "base_commit": _git(repo, "rev-parse", "HEAD").stdout.strip(),
        "subject_committed": committed,
        "blob_before": blob_before,
        "blob_after": blob_after,
        "annulled_exit": annulled_exit,
        "restored_exit": restored_exit,
        "command": command,
        "at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        **(extra or {}),
    }
    with (bench / "annulment.jsonl").open("a") as manifest:
        manifest.write(json.dumps(report, ensure_ascii=False) + "\n")
    return report


def run_substitution(repo: Path, bench: Path, name: str, subject: Path,
                     old: str, new: str, command: list[str]) -> dict:
    """Anula sustituyendo ``old`` por ``new`` en el sujeto.

    El parche se compone AQUÍ y no fuera: generado aparte, una sustitución que
    no casaba dejaba vacío el archivo anulado y el parche borraba el módulo
    entero; la suite caía por eso y la anulación parecía válida (2026-09-23).
    Rehúsa si ``old`` no aparece exactamente una vez.
    """
    repo, subject = repo.resolve(), subject.resolve()
    text = subject.read_text()
    found = text.count(old)
    if found != 1:
        raise ValueError(f"la sustitución debe casar exactamente una vez; casa {found}")
    relative = str(subject.relative_to(repo))
    diff = "".join(difflib.unified_diff(
        text.splitlines(keepends=True),
        text.replace(old, new, 1).splitlines(keepends=True),
        fromfile=f"a/{relative}", tofile=f"b/{relative}"))
    with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False) as handle:
        handle.write(diff)
        patch = Path(handle.name)
    try:
        return run_annulment(repo, bench, name, subject, patch, command,
                             extra={"replace": [old, new]})
    finally:
        patch.unlink()


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if "--" not in argv:
        print("annulment_control: falta `--` antes del comando de la suite", file=sys.stderr)
        return 2
    split = argv.index("--")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--subject", type=Path, required=True)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--patch", type=Path)
    source.add_argument("--replace", nargs=2, metavar=("VIEJO", "NUEVO"),
                        help="anular sustituyendo un texto que casa exactamente una vez")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args(argv[:split])
    try:
        if args.replace:
            report = run_substitution(args.repo, args.bench, args.name, args.subject,
                                      *args.replace, argv[split + 1:])
        else:
            report = run_annulment(args.repo, args.bench, args.name, args.subject,
                                   args.patch, argv[split + 1:])
    except ValueError as error:
        print(f"annulment_control: {error}", file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
