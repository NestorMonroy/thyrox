#!/usr/bin/env python3
"""Registra las CONDICIONES bajo las que se produjo una medición.

Es la mitad de ``shell-snapshots`` que sí conviene copiarle al cliente. Éste
congela el entorno de shell —8 apariciones del literal en el ejecutable
2.1.246— para que una ejecución posterior corra en el mismo. Nuestros eventos
de ``.claude/eventos/`` guardan el **resultado** de una medición y no las
condiciones bajo las que se produjo: un resultado sin ellas es una foto, no un
procedimiento repetible.

Hasta hoy eso se compensaba por convención —el volcado de cadenas vive bajo
``_references/claude-code-bin/<versión>/`` justo para que su versión conste— y una
convención no es un mecanismo: depende de que alguien la recuerde.

**Una clave que no se pudo medir se declara ``null``, nunca se omite.** Ausente
y nulo dicen cosas distintas: «nadie ha pasado por aquí» contra «se midió y no
había». Colapsarlas repite un nivel más abajo el defecto que H-DOCS-427 cerró
en el store, donde un ``NULL`` se leía como cero.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

MANIFEST_NAME = 'environment.json'

# Las variables del cliente que cambian el resultado de una medición: el
# esfuerzo con que corrió, y los dos topes de la orquestación.
WATCHED_VARIABLES = (
    'CLAUDE_EFFORT',
    'CLAUDE_CODE_EFFORT_LEVEL',
    'CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS',
    'CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH',
)


def captured_at() -> str:
    """El instante real, en UTC. Nunca escrito a mano (`timestamps-iso8601`)."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')


def executable_path() -> Path | None:
    """El ejecutable del cliente. La variable permite medir el caso ausente."""
    override = os.environ.get('RECORD_ENVIRONMENT_EXECUTABLE')
    candidate = Path(override) if override else None
    if candidate is None:
        located = shutil.which('claude')
        candidate = Path(located).resolve() if located else None
    if candidate is None or not candidate.is_file():
        return None
    return candidate


def executable_version(binary: Path | None) -> str | None:
    """La versión que el propio ejecutable declara al invocarse."""
    if binary is None:
        return None
    result = subprocess.run([str(binary), '--version'],
                            capture_output=True, text=True)
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def executable_sha256(binary: Path | None) -> str | None:
    """La huella del binario: dos builds con la misma versión pueden diferir."""
    if binary is None:
        return None
    digest = hashlib.sha256()
    with binary.open('rb') as handle:
        for block in iter(lambda: handle.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def repo_head(root: Path) -> str | None:
    """El commit contra el que se midió. Sin él la cifra no es reproducible."""
    result = subprocess.run(['git', '-C', str(root), 'rev-parse', 'HEAD'],
                            capture_output=True, text=True)
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def watched_variables() -> dict[str, str | None]:
    """Cada variable vigilada, con ``None`` cuando no está asignada."""
    return {name: os.environ.get(name) for name in WATCHED_VARIABLES}


def capture(root: Path) -> dict[str, object]:
    binary = executable_path()
    return {
        'captured_at': captured_at(),
        'repo_head': repo_head(root),
        'executable_path': str(binary) if binary else None,
        'executable_version': executable_version(binary),
        'executable_sha256': executable_sha256(binary),
        'python_version': sys.version.split()[0],
        'cpu_count': os.cpu_count(),
        'platform': sys.platform,
        'environment_variables': watched_variables(),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('event', help='directorio del evento en .claude/eventos/')
    parser.add_argument('--force', action='store_true',
                        help='reemplaza un manifiesto ya escrito')
    options = parser.parse_args(argv)

    event = Path(options.event)
    if not event.is_dir():
        print(f'ERROR — el evento no existe: {options.event}. '
              'NO se escribe manifiesto.', file=sys.stderr)
        return 2

    manifest = event / MANIFEST_NAME
    if manifest.exists() and not options.force:
        # Las condiciones de un evento son el registro de un momento; pisarlas
        # en silencio pierde el original sin que nadie se entere.
        print(f'ERROR — {manifest} ya existe. Usa --force para reemplazarlo.',
              file=sys.stderr)
        return 1

    manifest.write_text(
        json.dumps(capture(Path.cwd()), indent=2, ensure_ascii=False) + '\n',
        encoding='utf-8',
    )
    print(f'condiciones registradas: {manifest}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
