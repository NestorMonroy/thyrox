"""El hogar del banco de trabajo, del lado Python.

Gemelo de ``paths.ts`` de este mismo subsistema: la convencion medida en el
arbol es ``<subsistema>/paths.<ext>`` —``skills/paths.ts``, ``paths/reach.py``—,
no un modulo suelto por lenguaje.

Lo que este archivo aporta hoy es el PREDICADO que separa el banco del producto.
Lo pide una colision real de nombre: el banco se llama ``workbench`` y
``src/workbench/`` tambien, asi que un gate que excluyera el nombre suelto
apagaria su medicion sobre codigo de producto **en silencio**.

El nombre del directorio: el analisis
``docs: source/gestion/pm/docs/iniciativas/actualizar-agentic-ai-thyrox/``
``analisis-hogar-del-workbench-en-thyrox.rst`` fija que la forma que THYROX
adopta es la de ``kaupamex-api/scripts/workbench/`` — de ahi ``workbench``. El
banco de ``kaupamex-docs`` conserva ``eventos`` porque no viaja: su corpus se
queda donde esta.

El DIRECTORIO PADRE de nuestro banco no lo decide este modulo, y hoy no esta
decidido. Por eso aqui no hay ningun default de ruta: ``paths.ts`` resuelve el
hogar por la constante ``THYROX_WORKBENCH_DIR`` y REHUSA sin ella, y este
predicado sabe reconocer un banco sin necesitar saber donde vive el nuestro.
"""
from __future__ import annotations

from pathlib import Path

#: El segmento que abre la zona de estado de un arbol.
STATE_DIR = ".claude"

#: Como nombra su banco cada arbol. THYROX usa ``workbench``; un consumidor
#: ``kaupamex-*`` conserva ``eventos``. Se declaran los dos porque un gate mide
#: los dos arboles, no porque el nombre sea ambiguo.
BANK_DIR_NAMES = ("workbench", "eventos")


def is_bank_path(path: str | Path) -> bool:
    """¿La ruta cae bajo el banco de algun arbol?

    Se mide el PAR de segmentos adyacentes ``.claude/<nombre>``, nunca el nombre
    suelto. Con el nombre suelto, ``workbench`` casa tambien con
    ``src/workbench/`` —que es producto— y el gate que lo usara para excluir
    evidencia dejaria de medir codigo real sin emitir ninguna señal.
    """
    parts = Path(path).parts
    return any(parts[i] == STATE_DIR and parts[i + 1] in BANK_DIR_NAMES
               for i in range(len(parts) - 1))
