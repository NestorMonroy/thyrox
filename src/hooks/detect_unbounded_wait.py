"""Detector de la espera que no puede fallar — un bucle que solo mira contenido.

El defecto, medido por conducta
--------------------------------
El 2026-09-23 dos tareas de fondo quedaron girando en vacio hasta que el
ejecutor pregunto por que. Esperaban lineas de un productor MUERTO::

    until [ "$(grep -c ... "$SALIDA")" -ge 6 ]; do sleep 25; done

El productor salio con 144 —lo mato un ``pkill -f`` que se caso a si mismo,
que es el defecto hermano de ``detect_self_matching_pgrep``— y dejo 5 lineas
de las 6. La condicion ya no se podia cumplir, y el bucle no tenia como
enterarse.

Por que es un control sin modo de fallo
----------------------------------------
Es «verde sobre cero» en la otra direccion. Una espera que observa solo el
CONTENIDO del productor no distingue «todavia no ha escrito» de «no va a
escribir nunca», y las dos llevan a acciones opuestas: en un caso esperar es
correcto, en el otro es girar para siempre.

Lo mas caro del episodio: el archivo de salida YA traia la respuesta escrita
—``[exited with code 144]``— y el bucle no la miraba.

Metrica
-------
Un bucle ``until``/``while`` con un ``sleep`` en el cuerpo y NINGUNA de las
tres formas de terminar que no dependen de que el productor colabore:

1. un ``timeout`` que lo envuelva;
2. un tope de iteraciones;
3. observar la MUERTE del productor — su marca de salida, su pid, o los
   mecanismos del arbol (``marker_wait --pid``, ``wait-jobs``).

*Ciego a:* el bucle cuya cota llega por una variable o una funcion definida
fuera del comando; a la espera escrita en Python o en otro lenguaje; y al
bucle acotado cuyo tope sea tan alto que en la practica no acote. Mide la
FORMA del comando, no su duracion.
"""

from __future__ import annotations

import re

#: Un bucle que duerme es una espera. Sin `sleep` es un bucle de proceso
#: —`while read`, `for f in ...`— y no tiene nada que ver con esto.
_LOOP = re.compile(r"\b(until|while)\b")
_SLEEP = re.compile(r"\bsleep\s")

#: Las formas de terminar que NO dependen de que el productor colabore. Basta
#: una: cada una le da al bucle una salida propia.
_BOUNDED = (
    re.compile(r"\btimeout\s+\d"),              # envuelto en un tope de tiempo
    re.compile(r"\[exited with code"),          # observa la marca de salida
    re.compile(r"\bmarker_wait\b"),             # el mecanismo del arbol
    re.compile(r"\bwait-jobs\b"),               # la barrera del arbol
    re.compile(r"\bkill\s+-0\s"),               # pregunta si el pid vive
    re.compile(r"\bwait\s+\$"),                 # espera al hijo de verdad
    re.compile(r"\b(i|n|intentos|tries)\s*=\s*\d+"),   # un contador
    re.compile(r"\bTaskStop\b"),
)

AVISO = (
    "GATE DE ESPERA — este bucle duerme esperando CONTENIDO y no tiene como "
    "terminar si el productor muere. Medido el 2026-09-23: dos tareas "
    "quedaron girando porque su productor salio con 144 y dejo 5 lineas de "
    "las 6 que el bucle esperaba; la condicion ya no se podia cumplir. Es "
    "«verde sobre cero» en la otra direccion — mirar solo el contenido no "
    "distingue «todavia no ha escrito» de «no va a escribir nunca».\n"
    "  El archivo de salida YA trae la respuesta: espera la marca "
    "`[exited with code` en vez del conteo, y termina tanto si acaba bien "
    "como si lo matan.\n"
    "  Para un proceso ajeno, `bash bin/marker_wait --pid-only --pid <pid>`; "
    "para N trabajos, `bash bin/wait-jobs wait`. Y si el bucle se queda, "
    "envuelvelo en `timeout <segundos>`: un tope explicito es peor que el "
    "mecanismo y mucho mejor que ninguno."
)


def is_bounded(command: str) -> bool:
    """Si el comando declara alguna forma de terminar sin el productor."""
    return any(pattern.search(command) for pattern in _BOUNDED)


def is_wait_loop(command: str) -> bool:
    """Si el comando es un bucle de ESPERA: repite y duerme."""
    return bool(_LOOP.search(command) and _SLEEP.search(command))


def detect(payload: dict) -> str | None:
    """El aviso, o ``None`` si el comando no tiene la forma del defecto."""
    if (payload.get("tool_name") or "") != "Bash":
        return None
    command = ((payload.get("tool_input") or {}).get("command") or "")
    if not is_wait_loop(command) or is_bounded(command):
        return None
    return AVISO
