"""Pruebas de ``session.log_tail`` — una linea critica no se pierde tras el corte.

``bg.sh`` truncaba con ``tail -N`` a secas en tres sitios (``cmd_start`` y
``cmd_wait``, dos veces). Un ``pytest`` que cierra con ``63 failed, ...`` en la
linea 1 de 4000 desaparece bajo una ventana de 40 — el defecto que
``H-DOCS-155`` ya nombro para la suite entera: *"el `7 failed` existia y nadie
lo vio"*. Esto no es un port de SmartCrusher (headroom README.md:373, que mide
varianza de campos JSON): es la adaptacion NATIVA de su principio —preservar
una linea critica bajo compresion— a un sustrato de texto plano de log de
shell, con patrones declarados en vez de estadistica.

El control que puede fallar
----------------------------
La unica aserccion que depende del rescate es el caso 2. Retirarlo
(``patterns=()``, caso 6) tiene que hacer caer **esa aserccion sola** — ninguna
de las otras depende del rescate, asi que un rescate roto que las tumbe tambien
estaria midiendo otra cosa.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.log_tail import smart_tail  # noqa: E402

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


def lines(n: int, *, tag: str = "linea") -> list[str]:
    return [f"{tag} {i}" for i in range(n)]


# --- 1. sin nada critico, es un tail ciego normal ----------------------------
print("== 1. sin lineas criticas, la ventana es un tail plano ==")
body = "\n".join(lines(50))
result = smart_tail(body, window=10)
check("las ultimas 10 lineas, tal cual", lines(50)[-10:], result.splitlines())

# --- 2. una linea critica fuera de la ventana sobrevive ----------------------
print("== 2. FATAL fuera de la ventana se rescata ==")
body = "\n".join([*lines(5), "FATAL: se cayo el proceso", *lines(50)])
result = smart_tail(body, window=10)
check("FATAL aparece en el resultado", True, "FATAL: se cayo el proceso" in result)
check("la ventana final sigue siendo la cola real", lines(50)[-10:], result.splitlines()[-10:])

# --- 3. una critica YA dentro de la ventana no se duplica --------------------
print("== 3. una critica dentro de la ventana no se repite ==")
body = "\n".join([*lines(3), "ERROR: fallo temprano", *lines(3, tag="cola")])
result = smart_tail(body, window=4)
check("ERROR aparece una sola vez", 1, result.count("ERROR: fallo temprano"))

# --- 4. el resumen de pytest sobrevive al corte ------------------------------
print("== 4. el resumen final de pytest sobrevive al corte ==")
summary = "63 failed, 2127 passed, 1 xfailed, 15 errors in 3890.61s"
body = "\n".join([summary, *lines(60)])
result = smart_tail(body, window=20)
check("el resumen aparece en el resultado", True, summary in result)

# --- 5. texto vacio da vacio --------------------------------------------------
print("== 5. texto vacio no revienta ==")
check("vacio -> vacio", "", smart_tail("", window=40))

# --- 6. ANULACION: sin patrones, el rescate no puede ocurrir -----------------
print("== 6. ANULACION: patterns=() apaga el rescate ==")
body = "\n".join([*lines(5), "FATAL: se cayo el proceso", *lines(50)])
result = smart_tail(body, window=10, patterns=())
check("sin patrones, FATAL NO aparece", False, "FATAL: se cayo el proceso" in result)
check("y la ventana queda igual que el caso 1 (tail ciego)", lines(50)[-10:], result.splitlines())
check("con patrones habia rescate — el control DISCRIMINA", True,
      "FATAL: se cayo el proceso" in smart_tail(body, window=10)
      and "FATAL: se cayo el proceso" not in result)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
