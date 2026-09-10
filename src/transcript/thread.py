"""El HILO de un transcript — cuál de sus cadenas es la conversación viva.

``transcript.messages`` resuelve **de quién** es cada línea y
``transcript.usage`` **cuánto** costó. Este módulo resuelve la tercera
pregunta que el formato declara y ningún consumidor leía: **cuáles de las
líneas pertenecen a la misma conversación**.

Por qué el filtro por ``sessionId`` no aísla nada
--------------------------------------------------

La forma intuitiva —quedarse con las líneas cuyo ``sessionId`` coincide— no
discrimina. Medido sobre el transcript de esta sesión (2026-09-10):

======================================  =========
``sessionId`` distintos en el archivo   **1**
líneas totales                          104 449
líneas que el filtro selecciona         104 449
======================================  =========

Un filtro que selecciona el **100 %** de las filas no separa nada: el
archivo entero ES una sola sesión, y aun así hospeda **250 cadenas
distintas** (250 líneas con ``parentUuid`` nulo, o sea 250 raíces). El
``sessionId`` mide el archivo, no el hilo; concluir sobre el hilo desde él
es medir el significante y concluir sobre el significado.

Qué SÍ aísla: la cadena de ``parentUuid``
-------------------------------------------

Cada línea declara su ``uuid`` y el ``parentUuid`` de la que la precede en
su cadena. Caminar hacia atrás desde la última línea da el hilo vivo. Medido
en el mismo archivo: la cadena tiene **35** líneas frente a las 104 449 del
archivo — tres órdenes de magnitud de diferencia, que es lo que el
``sessionId`` no veía.

Dos hechos del formato que el recorrido tiene que absorber, los dos medidos:

- **Un ``uuid`` se repite.** 85 006 líneas traen ``uuid`` y sólo **83 764**
  son únicos: 1 242 repeticiones, que son los fragmentos de un mismo turno
  emitido en streaming — la misma causa que obliga a ``usage.accumulate`` a
  deduplicar por ``message.id``. El índice se construye por ``uuid`` y la
  última escritura gana.
- **No hay huérfanos.** 0 líneas apuntan a un ``parentUuid`` que no exista en
  el archivo, así que el recorrido no necesita reparar cadenas rotas; se
  detiene cuando llega a una raíz.

Por qué la cadena de la última línea NO es la sesión entera
-------------------------------------------------------------

Una compactación corta la cadena: la línea que abre el contexto nuevo nace
con ``parentUuid`` nulo. Por eso hay 250 raíces en un archivo de una sola
sesión. La cadena que este módulo devuelve es **el hilo desde la última
compactación**, que es exactamente lo que un consumidor quiere cuando
pregunta «qué pasó en esta conversación»; quien necesite la historia
completa tiene que recorrer las raíces, y este módulo no lo hace.

*Métrica:* la cadena de ``parentUuid`` hacia atrás desde la última línea con
``uuid`` que no sea sidechain.
*Ciega a:* las 19 443 líneas sin ``uuid`` del archivo medido (``attachment``
y ``system`` en su mayoría), que no participan de ninguna cadena; y a las
cadenas anteriores a la última compactación, por la razón de arriba.
"""
from __future__ import annotations

from collections.abc import Iterable

from .messages import _lines

#: La bandera con que el formato marca una línea que NO es del hilo principal.
#: Se lee como falsa cuando la línea no la declara: ausente significa «del
#: hilo», no «desconocido» — el cliente sólo la escribe para marcar el desvío.
SIDECHAIN_FLAG = "isSidechain"


def index_rows(lines: Iterable[dict]) -> tuple[dict[str, dict], list[str]]:
    """Indexa las líneas por ``uuid`` y devuelve además el orden de llegada.

    Un ``uuid`` repetido (fragmento de streaming) sobrescribe al anterior: la
    última aparición es la que trae el turno completo. El orden de llegada se
    conserva aparte porque el índice, al ser un mapa, ya no lo declara.
    """
    rows: dict[str, dict] = {}
    order: list[str] = []
    for line in lines:
        uuid = line.get("uuid")
        if not uuid:
            continue
        if uuid not in rows:
            order.append(uuid)
        rows[uuid] = line
    return rows, order


def chain_from(rows: dict[str, dict], start: str) -> list[dict]:
    """La cadena de ``parentUuid`` desde ``start`` hacia atrás, ya invertida.

    Devuelve las líneas en orden cronológico (raíz primero). Un ``uuid`` ya
    visitado detiene el recorrido: un ciclo en los punteros dejaría la
    función girando para siempre, y ese caso no se distingue de una cadena
    larga sin el guard.
    """
    walked: list[dict] = []
    seen: set[str] = set()
    cursor: str | None = start
    while cursor and cursor in rows and cursor not in seen:
        seen.add(cursor)
        walked.append(rows[cursor])
        cursor = rows[cursor].get("parentUuid")
    walked.reverse()
    return walked


def main_chain(lines: Iterable[dict]) -> list[dict]:
    """El hilo vivo: la cadena desde la última línea que no sea sidechain.

    Cero líneas con ``uuid`` da una lista vacía, no una excepción: un
    transcript que aún no tiene ninguna línea encadenable describe un hecho
    medible, no una configuración ambigua — el mismo criterio que
    ``usage.accumulate`` ya declaró para su lista vacía.
    """
    rows, order = index_rows(lines)
    for uuid in reversed(order):
        if not rows[uuid].get(SIDECHAIN_FLAG):
            return chain_from(rows, uuid)
    return []


def main_chain_of(path) -> list[dict]:
    """``main_chain`` sobre el JSONL de ``path``.

    La RUTA es parámetro del consumidor (DEC-04): este módulo exporta el
    mecanismo de aislar un hilo, no sabe dónde vive ningún transcript.
    """
    return main_chain(_lines(path))
