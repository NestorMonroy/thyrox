"""Cuánto de una copia huérfana de `.claude/` ya está preservado en otro sitio.

EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
no es autoridad, ni producto, ni evidencia de aceptación por sí sola.

Para cada archivo regular de la copia: si el árbol principal tiene el mismo
camino con el mismo contenido (`same_in_main`), si su blob ya existe en el
almacén de objetos de git (`in_git_objects`), o ninguna de las dos (`unique`).
Sólo lee; no borra nada.

Métrica: igualdad de blob git (`git hash-object`) por archivo, y bytes
aparentes con `st_nlink` para estimar el reclamo físico.
Ciega a: si el blob en git es alcanzable desde una rama empujada (sólo se mide
que existe en el almacén local), y a archivos que no son regulares.
"""
import json
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path


def blob_ids(repo: Path, paths: list[Path]) -> list[str]:
    stdin = '\n'.join(str(p) for p in paths) + '\n'
    out = subprocess.run(['git', '-C', str(repo), 'hash-object', '--no-filters', '--stdin-paths'], input=stdin, capture_output=True, text=True, check=True)
    return out.stdout.split()


def existing_objects(repo: Path, ids: list[str]) -> set[str]:
    out = subprocess.run(['git', '-C', str(repo), 'cat-file', '--batch-check'], input='\n'.join(ids) + '\n', capture_output=True, text=True, check=True)
    return {line.split()[0] for line in out.stdout.splitlines() if not line.endswith('missing')}


def main(repo: Path, copy_root: Path, out_path: Path) -> None:
    files = sorted(p for p in copy_root.rglob('*') if p.is_file() and not p.is_symlink())
    main_paths = [repo / p.relative_to(copy_root) for p in files]
    copy_ids = blob_ids(repo, files)
    present_main = [p for p in main_paths if p.is_file()]
    main_ids = dict(zip(present_main, blob_ids(repo, present_main))) if present_main else {}
    known = existing_objects(repo, copy_ids)
    rows, total, counts = [], Counter(), Counter()
    for path, main_path, blob in zip(files, main_paths, copy_ids):
        stat = path.stat()
        if main_ids.get(main_path) == blob:
            state = 'same_in_main'
        elif blob in known:
            state = 'in_git_objects'
        else:
            state = 'unique'
        counts[state] += 1
        total[state] += stat.st_size
        if stat.st_nlink > 1:
            total['shared_inode_bytes'] += stat.st_size
        rows.append({'path': str(path.relative_to(repo)), 'bytes': stat.st_size, 'nlink': stat.st_nlink, 'blob': blob, 'state': state})
    out_path.write_text(json.dumps({'copyRoot': str(copy_root.relative_to(repo)), 'files': len(rows), 'counts': counts, 'bytes': total, 'rows': rows}, indent=1) + '\n')
    print(json.dumps({'files': len(rows), 'counts': counts, 'bytes': total}))


if __name__ == '__main__':
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(), Path(sys.argv[3]))
