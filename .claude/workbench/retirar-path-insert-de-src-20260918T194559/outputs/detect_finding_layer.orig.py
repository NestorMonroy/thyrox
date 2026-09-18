#!/usr/bin/env python3
"""Detector PreToolUse: el hallazgo va a SU capa, no a la del trabajo en curso.

Compara el **prefijo del ID** del archivo contra el segmento ``<submodulo>`` de
su ruta, y avisa **antes de que la escritura aterrice** — que es el único
momento en que sirve: un gate de commit lo encuentra cuando el archivo ya está
escrito, indexado y citado desde su índice.

El defecto que lo origina no fue olvidar la regla: fue no plantearse la
pregunta. El turno venía trabajando una iniciativa de una capa y el hallazgo
salió de otra; la carpeta se heredó del contexto, no de una decisión.

Su gemelo de corpus es ``verify.check_hallazgo_submodulo``, y de ahí importa la
raíz y el patrón en vez de declararlos otra vez: dos copias de la misma ruta son
dos fuentes de verdad, y la que nadie sincroniza falla en silencio.
"""

import pathlib
import re
import sys

# ``sys.path[0]`` es ``src/hooks`` y ``verify`` no resolvería desde ahí.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from verify.check_hallazgo_submodulo import RAIZ_PM  # noqa: E402

# El patrón del gate no captura el slug —no le hace falta para medir el corpus—
# y el aviso sí lo nombra, así que aquí se compone A PARTIR de su raíz.
PATTERN = re.compile(
    rf'{re.escape(str(RAIZ_PM))}/(?P<layer>[^/]+)/iniciativas/(?P<slug>[^/]+)/'
    r'hallazgos/hallazgo-H-(?P<prefix>[A-Z]+)-'
)


def initiatives_of(layer):
    """Las iniciativas vivas de la capa, para ofrecer destino y no sólo el veto."""
    root = RAIZ_PM / layer / 'iniciativas'
    if not root.is_dir():
        return []
    return sorted(d.name for d in root.iterdir() if d.is_dir())


def detect(payload):
    """El aviso si el hallazgo va a la carpeta equivocada, o ``None``.

    Función pura sobre el payload: no lee stdin ni imprime. Así la invoca el
    despachador en proceso, que es el ahorro real de consolidar.
    """
    path = (payload.get('tool_input') or {}).get('file_path') or ''
    m = PATTERN.search(str(path).replace('\\', '/'))
    if not m:
        return None

    prefix = m.group('prefix').lower()
    layer = m.group('layer').lower()
    slug = m.group('slug')
    if prefix == layer:
        return None

    candidates = initiatives_of(prefix)
    populated = [c for c in candidates
                 if (RAIZ_PM / prefix / 'iniciativas' / c / 'hallazgos').is_dir()]
    suggested = populated or candidates

    return (
        f'GATE de capa del hallazgo — el ID dice **{prefix}**, la carpeta es '
        f'**pm/{layer}** (iniciativa `{slug}`).\n\n'
        f'`hallazgos-documentacion-obligatoria.md`: el `<submodulo>` de la ruta lo '
        f'determina **la capa del hallazgo, no dónde se descubrió**. Un hallazgo '
        f'`H-{prefix.upper()}-*` vive en una iniciativa de '
        f'`{RAIZ_PM}/{prefix}/iniciativas/<slug>/hallazgos/`; la iniciativa donde '
        f'salió lo cruza con `:ref:`.\n\n'
        f'Antes de escribir: elegir la iniciativa de `pm/{prefix}/` cuya familia de '
        f'hallazgos ya cubre este tema. Con `hallazgos/` poblado hoy: '
        + (', '.join(f'`{c}`' for c in suggested[:12]) if suggested
           else f'(ninguna todavía en pm/{prefix}/)')
        + ('…' if len(suggested) > 12 else '')
        + '\n\nSi la carpeta actual es la correcta a pesar del ID, entonces el ID '
          'está mal: renombrar el archivo y su etiqueta, no mover la carpeta.'
    )
