"""Pruebas de ``agents.measure_delta`` — el delta de símbolos que deja un subagente.

Porta el mecanismo de ``kaupamex-docs: .claude/hooks/medir_delta_subagente.py``.
Mide lo que quedó EN EL DISCO, no lo que el agente dice — por eso es
complementario al reporte final y no redundante: un agente cortado por
``maxTurns`` deja trabajo y no devuelve mensaje.

Lo que se INYECTA (DEC-04): qué repos se miden y dónde va el log. El original
resolvía el log con ``reach.root('docs')``, o sea el nombre de un consumidor
dentro del proveedor.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import measure_delta  # noqa: E402

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


print("== A. Los símbolos de un .py se extraen por AST, no por regex ==")
codigo = "def uno():\n    pass\n\nclass Dos:\n    def tres(self):\n        pass\n"
simbolos = measure_delta.symbols(codigo)
check("ve la función de nivel superior", True, "uno" in simbolos)
# El contrato es el de la FUENTE, no uno inventado aquí: `class:X` para las
# clases y el nombre pelado para funciones y métodos. Escribir `Dos.tres` habría
# sido rebautizar el mecanismo al portarlo — el defecto que
# `porte-completo-no-parcial.md` prohíbe, en su forma de comportamiento.
check("la clase lleva su prefijo", True, "class:Dos" in simbolos)
check("y el método va con el nombre pelado", True, "tres" in simbolos)

check("un archivo que no parsea NO revienta: devuelve vacío",
      set(), measure_delta.symbols("def roto( :\n"))

print("== B. El delta discrimina en los dos sentidos ==")
antes = {"a", "b", "c"}
despues = {"b", "c", "d"}
ganados, perdidos = measure_delta.diff_symbols(antes, despues)
check("nombra lo ganado", ["d"], sorted(ganados))
check("y lo perdido", ["a"], sorted(perdidos))

# CONTROL DE ANULACIÓN: sin cambios, el delta es vacío en ambos lados. Si no
# lo fuera, los verdes de arriba no medirían el diff sino su propio orden.
g, p = measure_delta.diff_symbols(antes, antes)
check("sin cambios, nada ganado ni perdido (control)", (set(), set()), (g, p))

print("== C. El destino del log es PARÁMETRO, no `docs` ==")
check("sin destino declarado, rehúsa en vez de inventarlo",
      None, measure_delta.resolve_log(None))
with tempfile.TemporaryDirectory() as tmp:
    destino = Path(tmp) / "agent-results"
    ruta = measure_delta.resolve_log(destino)
    check("con destino, compone la ruta del log",
          "delta-de-agentes.md", ruta.name)
    check("y crea el directorio si falta", True, ruta.parent.is_dir())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
