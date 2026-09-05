"""El payload del hook ``Stop`` — leído, no greppeado.

Adaptación del preámbulo que los tres gates de ``Stop`` de kaupamex repiten
verbatim. Viaja el mecanismo —decidir si el cliente está reentrando—; no viaja
nada del consumidor, porque el payload es contrato del cliente y no del clon.

Por qué es un módulo y no una copia más
----------------------------------------

``stop_tests.py`` ya lo tenía en casa, y ``stop_gate.py`` sería la tercera
copia. Tres copias de un predicado de seguridad divergen: la de kaupamex ya lo
hizo — ``hallazgo-pendiente.sh`` corrigió su lectura en :ref:`h-docs-370` y sus
dos hermanos **no**, así que hoy uno de ellos da el veredicto invertido.

Por qué el bash no podía hacerlo bien
--------------------------------------

Sin parser a mano, la fuente lee la reentrada por subcadena::

    printf '%s' "$ENTRADA" | grep -q '"stop_hook_active"...true'

bajo ``set -uo pipefail``. El constructo **invierte el veredicto** cuando el
payload es multilínea y el acierto cae temprano: ``-q`` cierra el pipe al
primer acierto, ``printf`` muere con SIGPIPE, y ``pipefail`` propaga ese 141
como salida del pipe. El ``if`` da FALSO *porque* encontró lo que buscaba.

Medido antes de portar (:ref:`h-docs-1083`), con un payload de 2.1 MB y el
acierto en la línea 2: ``PIPESTATUS=141 0``, y el hook bloqueó siendo una
reentrada. Aquí no hay pipe, así que la trampa no existe.

Y el parser además **discrimina un caso que el ``grep`` no puede**: la cadena
``"stop_hook_active": true`` dentro del valor de otro campo —un transcript
citado, por ejemplo— acierta el patrón y no es una reentrada. El ``grep`` mide
el significante; el parser mide el campo.

Por qué un payload roto NO se lee como reentrada
-------------------------------------------------

Un JSON ilegible deja el hecho sin medir, y sin medición el default correcto es
el que **no desactiva el gate**: ``False`` lo deja correr. Lo contrario —tratar
lo ilegible como reentrada— apagaría el control justo cuando la entrada es
anómala, que es cuando más hace falta.
"""
from __future__ import annotations

import json

#: La clave con que el cliente declara que ya reentró en el hook ``Stop``.
REENTRY_KEY = "stop_hook_active"


def parse(payload: str | None) -> dict:
    """El payload como diccionario. Lo ilegible vale ``{}``, nunca revienta.

    Un hook que muere leyendo su entrada rompe el turno del consumidor, que es
    peor que cualquier veredicto que pudiera emitir.
    """
    try:
        data = json.loads(payload or "{}")
    except (ValueError, TypeError):
        return {}
    return data if isinstance(data, dict) else {}


def is_reentry(payload: str | None) -> bool:
    """¿El cliente ya está reentrando en el hook ``Stop``?

    Se lee del campo, no de la subcadena: el espaciado no cambia el veredicto y
    la cadena dentro de un valor ajeno no lo dispara.
    """
    return bool(parse(payload).get(REENTRY_KEY))
