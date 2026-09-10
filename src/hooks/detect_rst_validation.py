#!/usr/bin/env python3
"""Detector PreToolUse: validar RST a mano, y el verde falso del `;`.

Mira el ``command`` de un ``Bash`` y avisa de dos defectos independientes.

**Primero, la validación escrita a mano.** ``docutils`` no está en el
``python3`` del sistema, así que el comando revienta o —peor— parsea sin
registrar los roles ni las directivas de Sphinx: ``:ref:`` y ``toctree`` salen
como desconocidos y hay que filtrarlos a mano. Ese filtro es exactamente el
defecto que el gate de corpus existe para no repetir; reinventarlo lo
reintroduce.

**Segundo, y es el peor: el verde falso.** Con ``;`` en vez de ``&&``, el
``echo "validado"`` del final **imprime aunque la validación haya reventado**.
Es un control que publica éxito sin haber medido nada.

Las dos mitades se detectan por separado: un comando puede traer una sin la
otra, y el aviso nombra sólo la que trae.

La ruta del gate se resuelve **desde este archivo dentro de la distribución**,
nunca cruzándola: la versión de la que se porta componía el literal
``src/gates/…``, que dejó de existir al renombrarse la familia a ``verify``, y
el defecto era **mudo** porque el aviso sólo CITA el comando sin ejecutarlo.
"""

import pathlib
import re

#: El gate real. ``parents[1]`` es ``src/`` — un salto dentro de la
#: distribución, que es lo único que la aritmética de ruta admite.
GATE_PATH = pathlib.Path(__file__).resolve().parents[1] / 'verify' / 'check_rst_sintaxis.py'
GATE = f'python3 {GATE_PATH}'

#: Señales de que el comando valida RST por su cuenta.
HAND_ROLLED = re.compile(
    r'docutils|publish_doctree|publish_parts|publish_string|rst2\w+', re.I)

#: Un `;` seguido de un eco de éxito — el `;` no corta ante el fallo previo.
FALSE_GREEN = re.compile(
    r';\s*echo\s+["\']?[^"\'\n]*'
    r'(validad|verificad|correcto|listo|\bOK\b|sin errores)', re.I)


def detect(payload):
    """El aviso para este comando, o ``None`` si no hay nada que decir."""
    command = ((payload or {}).get('tool_input') or {}).get('command') or ''
    if not command:
        return None

    warnings = []

    if HAND_ROLLED.search(command) and 'check_rst_sintaxis' not in command:
        warnings.append(
            'Estás validando RST a mano. Usa el gate que ya existe:\n'
            f'    {GATE} <archivos>\n'
            'Motivo medido: `docutils` NO está en el `python3` del sistema '
            '(sí en `.venv`), y un parse pelado no registra los roles ni las '
            'directivas de Sphinx — `:ref:` y `toctree` salen como '
            'desconocidos y acabas filtrándolos a mano, que es el defecto '
            'que ese gate existe para no repetir.')

    if FALSE_GREEN.search(command):
        warnings.append(
            'El `;` antes del eco de éxito NO corta ante el fallo previo: ese '
            '"validado" se imprime aunque el comando anterior reviente. Usa '
            '`&&` si el eco depende del resultado, o imprime el código real '
            'con `echo "exit=$?"`.')

    return '\n\n'.join(warnings) if warnings else None
