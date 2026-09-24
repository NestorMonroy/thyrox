#!/usr/bin/env python3
"""Suite de `detect_unbounded_wait` — la espera que no puede fallar.

Origen: medido el 2026-09-23. Dos tareas de fondo quedaron girando en vacio
hasta que el ejecutor pregunto por que. Esperaban lineas de un productor que
ya estaba MUERTO:

    until [ "$(grep -c ... "$SALIDA")" -ge 6 ]; do sleep 25; done

El productor salio con 144 —lo mate yo con un `pkill -f` que se caso a si
mismo— y dejo 5 lineas de las 6. La condicion no se podia cumplir ya, y el
bucle no tenia como enterarse.

Por que es un defecto y no una torpeza
---------------------------------------
Es un control sin modo de fallo, el mismo patron que el arbol persigue en la
otra direccion con «verde sobre cero no es verde». Una espera que observa solo
el CONTENIDO del productor no distingue «todavia no ha escrito» de «no va a
escribir nunca», y las dos llevan a acciones opuestas.

El archivo de salida ya traia la respuesta escrita —`[exited with code 144]`—
y el bucle no la miraba.

Que cuenta como acotada
-----------------------
Cualquiera de estas basta, porque cada una da al bucle una forma de terminar
que no depende de que el productor colabore:

- un `timeout` que lo envuelva;
- un tope de iteraciones (un contador);
- observar la MUERTE del productor: su marca de salida, su pid, o los
  mecanismos del arbol (`marker_wait --pid`, `wait-jobs`).

Lo que mide cada bloque:

1. El bucle que solo mira contenido y duerme: avisa.
2. El mismo con `timeout` alrededor: calla.
3. El mismo mirando la marca de salida: calla.
4. El mismo con los mecanismos del arbol: calla.
5. Un bucle SIN sleep no es una espera: calla.
6. ANULACION — si no distinguiera, 1 y 2 darian lo mismo.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from hooks import detect_unbounded_wait as duw  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def warns(command: str) -> bool:
    """Si el detector emite aviso para ese comando."""
    return duw.detect({"tool_name": "Bash",
                       "tool_input": {"command": command}}) is not None


WITHOUT_BOUND = ('until [ "$(grep -c x /tmp/s.out)" -ge 6 ]; do sleep 25; done; '
            'cat /tmp/s.out')

print("=== 1. solo mira contenido y duerme: AVISA ===")
check("el caso medido", True, warns(WITHOUT_BOUND))
check("y su variante con while", True,
      warns('while [ ! -s /tmp/s.out ]; do sleep 5; done'))

print("=== 2. con timeout alrededor: calla ===")
check("timeout lo acota", False, warns(f"timeout 300 bash -c '{WITHOUT_BOUND}'"))

print("=== 3. mirando la marca de salida: calla ===")
check("observar la muerte del productor basta", False,
      warns('until grep -q "\\[exited with code" /tmp/s.out; do sleep 5; done'))

print("=== 4. con los mecanismos del arbol: calla ===")
check("marker_wait --pid", False,
      warns('bash bin/marker_wait --pid-only --pid 123'))
check("wait-jobs", False, warns('bash bin/wait-jobs wait'))

print("=== 5. un bucle SIN sleep no es una espera: calla ===")
check("no avisa sobre un bucle de proceso", False,
      warns('while read -r linea; do echo "$linea"; done < /tmp/s.out'))
check("ni sobre un for", False,
      warns('for f in *.py; do python3 "$f"; done'))

print("=== 6. ANULACION — si no distinguiera, 1 y 2 darian lo mismo ===")
check("acotado y sin acotar NO coinciden",
      True, warns(WITHOUT_BOUND) != warns(f"timeout 300 bash -c '{WITHOUT_BOUND}'"))

print("=== 7. el aviso NOMBRA el remedio ===")
text = duw.detect({"tool_name": "Bash", "tool_input": {"command": WITHOUT_BOUND}})
check("nombra la marca de salida", True, "exited with code" in text)
check("y un mecanismo del arbol", True,
      "wait-jobs" in text or "marker_wait" in text)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
