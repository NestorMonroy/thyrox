#!/usr/bin/env python3
"""Gate: la evidencia citada desde ``source/**`` existe Y está versionada.

Es la forma ejecutable de una postura, no una comprobación suelta. El cliente
de Claude Code deshace cambios con ``file-history`` / ``file-history-delta``:
guarda el delta de cada archivo que tocó y lo revierte *sin usar git*
(``checkpointing.md:16``). Nosotros **no** copiamos ese mecanismo — usamos git —
y esa decisión tiene una consecuencia que hay que hacer cumplir: un dato que
sólo existe como cambio local no es citable, porque muere con el contenedor.

Ése es literalmente el defecto de H-DOCS-120: tres citas a un directorio de
logs que nunca pudo estar versionado. El gate lo cierra midiendo, por cada
ruta de evidencia que un documento cita, dos cosas distintas:

- que **exista** en disco, y
- que git la **conozca**.

Las dos hacen falta. Un gate que midiera sólo la primera daría verde a la
evidencia sólo-local, que es justo el caso que esta postura existe para
impedir.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Las raíces cuya presencia en una cita significa «esto es evidencia»: material
# que sostiene una afirmación y por tanto tiene que sobrevivir al contenedor.
EVIDENCE_ROOTS = ('.claude/eventos/', 'tools/claude-code-bin/')

# Una cita puede venir en literal doble-comilla-invertida, entre comillas o
# desnuda; el patrón toma la ruta y la puntuación final se recorta aparte.
CITATION = re.compile(
    r'(?:' + '|'.join(re.escape(r) for r in EVIDENCE_ROOTS) + r')[A-Za-z0-9._/-]+'
)
TRAILING = '.,;:`)>\'"'

BASELINE_RELATIVE = Path('.claude/scripts/gates/evidence_tracked_baseline.txt')


def repo_root(start: Path) -> Path | None:
    """La raíz del repo git que contiene ``start``, o None si no hay ninguno."""
    result = subprocess.run(
        ['git', '-C', str(start), 'rev-parse', '--show-toplevel'],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip())


def require_git(start: Path) -> Path:
    """Precondición del gate. Sin git no hay noción de «versionado».

    Rehúsa con exit 2 y **sin emitir conteo**: un 0 aquí no distinguiría «no
    hay evidencia sin versionar» de «no pude medirlo», que es el sub-patrón D
    de `metrica-decide-la-conclusion.md`.
    """
    root = repo_root(start)
    if root is None:
        print('ERROR — el gate exige un repositorio git: sin él no existe la '
              'noción de versionado. NO se emite conteo.', file=sys.stderr)
        raise SystemExit(2)
    return root


def is_glob(line: str, end: int) -> bool:
    """¿La cita continúa en un comodín? Entonces nombra una familia, no una ruta.

    ``.claude/eventos/vocabulario-*/terminos.py`` designa un patrón, y medir su
    existencia sería medir el fenómeno equivocado: no hay un archivo llamado
    así, ni tiene por qué haberlo. La clase de caracteres del patrón se detiene
    ante el ``*``, así que basta con mirar el carácter siguiente.
    """
    return line[end:end + 1] == '*'

def citations(root: Path) -> list[tuple[Path, int, str]]:
    """Cada cita a una raíz de evidencia, con el archivo y la línea que la hace."""
    found = []
    source = root / 'source'
    if not source.is_dir():
        return found
    for document in sorted(source.rglob('*.rst')):
        text = document.read_text(encoding='utf-8', errors='replace')
        for number, line in enumerate(text.splitlines(), start=1):
            for match in CITATION.finditer(line):
                if is_glob(line, match.end()):
                    continue
                found.append((document, number, match.group(0).rstrip(TRAILING)))
    return found


def is_tracked(root: Path, target: str) -> bool:
    """¿git conoce esta ruta? Vale para archivo y para directorio."""
    result = subprocess.run(
        ['git', '-C', str(root), 'ls-files', '--', target],
        capture_output=True, text=True,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


def verdict(root: Path, target: str) -> str | None:
    """``ausente`` · ``sin versionar`` · None cuando la cita se sostiene."""
    if not (root / target).exists():
        return 'ausente'
    if not is_tracked(root, target):
        return 'sin versionar'
    return None


def read_baseline(root: Path) -> set[str]:
    path = root / BASELINE_RELATIVE
    if not path.is_file():
        return set()
    return {
        line.strip() for line in path.read_text(encoding='utf-8').splitlines()
        if line.strip() and not line.startswith('#')
    }


def write_baseline(root: Path, frozen: set[str]) -> Path:
    path = root / BASELINE_RELATIVE
    path.parent.mkdir(parents=True, exist_ok=True)
    header = ('# Deuda heredada de evidencia citada sin respaldo versionado.\n'
              '# Una entrada listada no bloquea; una nueva sí.\n')
    path.write_text(header + ''.join(f'{key}\n' for key in sorted(frozen)),
                    encoding='utf-8')
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si hay incumplidores fuera del baseline')
    parser.add_argument('--write-baseline', action='store_true',
                        help='congela los incumplidores actuales')
    parser.add_argument('--quiet', action='store_true')
    options = parser.parse_args(argv)

    root = require_git(Path.cwd())
    cited = citations(root)
    baseline = read_baseline(root)

    offenders = []
    for document, number, target in cited:
        reason = verdict(root, target)
        if reason is None:
            continue
        key = f'{document.relative_to(root)}::{target}'
        offenders.append((key, number, target, reason))

    if options.write_baseline:
        path = write_baseline(root, {item[0] for item in offenders})
        print(f'baseline escrito: {path.relative_to(root)} '
              f'({len(offenders)} entrada(s))')
        return 0

    fresh = [item for item in offenders if item[0] not in baseline]

    if options.quiet:
        # Sólo el conteo: es lo que `thyrox-audit.sh` consume de todo gate.
        print(len(fresh))
        return 1 if (options.strict and fresh) else 0

    for key, number, target, reason in fresh:
        document = key.split('::', 1)[0]
        print(f'  {document}:{number} — {target} [{reason}]')

    print(f'check-evidence-tracked: {len(fresh)} cita(s) sin respaldo '
          f'versionado (alcance medido: {len(cited)} cita(s) a evidencia en '
          f'{len({item[0] for item in cited})} documento(s); '
          f'{len(baseline)} en baseline)')

    return 1 if (options.strict and fresh) else 0


if __name__ == '__main__':
    raise SystemExit(main())
