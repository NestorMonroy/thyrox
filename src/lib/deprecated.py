#!/usr/bin/env python3
"""deprecated.py — el guard de script deprecado, para un modulo de Python.

Es el gemelo de ``deprecated.sh``, que sólo servía a `bash`: un `.py`
deprecado no tenía con qué declararse y quedaba como comentario que nadie
aplica. Cierra la tarea **#864**.

El criterio no cambia, y es el de su hermano: un artefacto con un defecto
medido **no se barre ni se reescribe en el sitio**. Se queda como evidencia,
se marca desactivado con su motivo, y la versión nueva vive al lado. Un
script sin marcador corre en silencio, y esa indistinción entre «ejecuté lo
vigente» y «ejecuté la reserva degradada» es un verde que no discrimina
(sub-patrón D de ``metrica-decide-la-conclusion.md``).

Uso, en el módulo que se deprecia — las tres líneas van como comentario de
cabecera, igual que en `bash`, para que sean greppeables sin importar el
módulo::

    #!/usr/bin/env python3
    # DEPRECATED: <fecha ISO> — <motivo, medido>
    # SUCESOR: <qué usar en su lugar>
    # HALLAZGO: <ID del hallazgo que lo mide>
    \"\"\"...\"\"\"
    import importlib.util, pathlib
    _g = importlib.util.spec_from_file_location(
        "deprecado", pathlib.Path(__file__).resolve().parents[1] / "deprecated.py")
    _m = importlib.util.module_from_spec(_g); _g.loader.exec_module(_m)
    _m.deprecated_guard("<name-del-script>")

Y en el ÚNICO sitio donde la ejecución sigue siendo legítima::

    ACCEPT_DEPRECATED=<name-del-script> python3 <ruta>

La declaración nombra un script concreto: no es un permiso global. Quien la
escribe deja constancia de que conoce el defecto y aun así lo invoca.

El primer marcador admite **dos términos**, y el guard lee el que encuentre:
``# DEPRECATED:`` para lo que aún funciona y no se recomienda, ``# OBSOLETE:``
para lo que ya no sirve a ningún propósito. La variable de escape se llama
``ACCEPT_DEPRECATED`` en los dos casos — es el nombre del mecanismo, no del
término.
"""
from __future__ import annotations

import inspect
import os
import re
import sys
from pathlib import Path

#: Las claves de la cabecera, con la misma grafía que `deprecated.sh` lee con
#: `sed`. Compartir la grafía es lo que permite que un solo gate
#: (`check_script_deprecated.py`) mida los dos lenguajes sin ramificar.
#:
#: `DEPRECATED` y `OBSOLETE` son alternativas —un archivo declara una, nunca
#: las dos—: `deprecated` es lo que aún funciona y no se recomienda;
#: `obsolete` es lo que ya no sirve a ningún propósito. Leer el término en vez
#: de asumirlo es lo que impide colapsar los dos en el punto de uso, que es
#: justo donde la distinción importa.
_TERMS = ("DEPRECATED", "OBSOLETE")
_KEYS = _TERMS + ("SUCESOR", "HALLAZGO")


def read_header(source_path: Path) -> dict:
    """Las claves declaradas como comentario en la cabecera del módulo.

    Se leen del TEXTO, no del docstring: un módulo puede documentar la
    convención —este mismo lo hace— sin estar deprecado. Por eso el patrón se
    ancla a inicio de línea y sólo se busca antes de la primera línea de
    código, que es donde `deprecated.sh` las pone.
    """
    fields: dict[str, str] = {}
    try:
        lines = source_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return fields
    for line in lines[:40]:
        m = re.match(r"^# (%s): *(.*)$" % "|".join(_KEYS), line)
        if m:
            fields.setdefault(m.group(1), m.group(2).strip())
    return fields


def deprecated_guard(name: str | None = None) -> None:
    """Avisa siempre; rehúsa salvo declaración explícita del llamador.

    El aviso va a **stderr** sin excepción, incluso en el camino aceptado —
    un guard que calla cuando se le declara devuelve el problema que existe
    para cerrar—, y a stderr y no a stdout porque el script deprecado suele
    generar su artefacto por stdout y el aviso lo corrompería.
    """
    frame = inspect.stack()[1]
    source_path = Path(frame.filename).resolve()
    name = name or source_path.name
    fields = read_header(source_path)

    # El TÉRMINO se lee de la cabecera, no se asume (ver `_TERMS`). Si el
    # archivo no declara ninguno, el guard igual avisa: el defecto de omitir
    # el marcador lo mide `check_script_deprecated.py`, no este aviso.
    term = next((k for k in _TERMS if fields.get(k)), "DEPRECATED")
    print(f"{term} — {name}", file=sys.stderr)
    if fields.get(term):
        print(f"  desde:    {fields[term]}", file=sys.stderr)
    if fields.get("SUCESOR"):
        print(f"  usar:     {fields['SUCESOR']}", file=sys.stderr)
    if fields.get("HALLAZGO"):
        print(f"  hallazgo: {fields['HALLAZGO']}", file=sys.stderr)

    if os.environ.get("ACCEPT_DEPRECATED") == name:
        print(f"  se ejecuta: el llamador declaró ACCEPT_DEPRECATED={name}",
              file=sys.stderr)
        return

    print(f"  NO se ejecuta. Para invocarlo a sabiendas: "
          f"ACCEPT_DEPRECATED={name} <comando>", file=sys.stderr)
    raise SystemExit(3)
