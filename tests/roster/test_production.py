"""Pruebas de ``roster.production`` — vivo no es lo mismo que trabajando.

El defecto que este módulo cierra está escrito, verbatim, en el consumidor que
hoy publica el veredicto (``src/agents/reconcile-agents.sh:322``):

    vivo)  echo "       Su mtime avanzó durante la vigilancia. Sigue trabajando."

El ``mtime`` de un transcript avanza cada vez que el agente **escribe una
línea** — un `grep`, un `ToolSearch`, un párrafo de razonamiento. De ahí no se
sigue que haya producido nada. Es el sub-patrón C: se mide el significante
(el archivo creció) y se concluye sobre el significado (está trabajando).

Los casos que DISCRIMINAN, y por qué:

- **2 y 3** — ``Bash`` NO se clasifica por su nombre. Medido en el transcript
  de un subagente real de esta sesión: **30 de 32** ``tool_use`` son ``Bash``,
  porque en auto mode las operaciones de archivo van por shell. Una taxonomía
  que sólo mirara el nombre declararía indecidible el 94 % de la evidencia.
- **4** — la promoción es de una sola vía: sin evidencia de escritura, un
  comando queda ``undecidable``, **nunca** ``read_only``. Un `python3 script.py`
  escribe sin ningún verbo de shell; leerlo como inocuo sería afirmar ausencia
  desde un instrumento que no puede verla.
- **5** — ``2>&1`` y ``>/dev/null`` son redirecciones que no tocan el árbol.
  Contarlas como escritura convertiría en «productivo» a cualquier `grep`.
- **9** — una herramienta que la taxonomía no conoce cae a ``undecidable``, no
  a ``read_only``: una herramienta nueva del cliente puede escribir, y asumir
  lo contrario es el verde falso de siempre.
- **11-14** — el 2×2 de la actividad. ``alive_without_evidence`` no dice «no
  produjo»: dice que **este instrumento no lo vio**, y el conteo de
  ``undecidable`` que lo acompaña es lo que permite al lector saber cuánto de
  ese silencio es ceguera.

Nada de esto lee un transcript: los eventos se construyen aquí. Extraerlos del
JSONL es sustrato del consumidor (DEC-04), igual que ``read_shape`` en
``job_liveness``.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from roster import job_liveness as jl  # noqa: E402
from roster import production as pr  # noqa: E402

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


print("== 1. la taxonomía nombra los tres efectos, y ninguno es un booleano ==")
check("tres efectos declarados", ("mutating", "read_only", "undecidable"), pr.TOOL_EFFECTS)

print("== 2. una herramienta de escritura se clasifica por su nombre ==")
check("Write muta", "mutating", pr.classify_tool("Write"))
check("Edit muta", "mutating", pr.classify_tool("Edit"))
check("Grep sólo lee", "read_only", pr.classify_tool("Grep"))

print("== 3. Bash NO se decide por el nombre: lo decide su comando ==")
check("Bash sin comando es indecidible", "undecidable", pr.classify_tool("Bash"))
check("Bash con redirección muta", "mutating",
      pr.classify_tool("Bash", {"command": "cat > src/x.py <<'PY'"}))
check("Bash con sed -i muta", "mutating",
      pr.classify_tool("Bash", {"command": "sed -i 's/a/b/' f.txt"}))
check("Bash con git commit muta", "mutating",
      pr.classify_tool("Bash", {"command": "git commit -m x -- src/"}))

print("== 4. la promoción es de UNA vía: nunca se degrada a read_only ==")
check("un grep sigue indecidible, no read_only", "undecidable",
      pr.classify_shell("grep -rn foo src/"))
check("un intérprete que escribe sin verbo de shell queda indecidible", "undecidable",
      pr.classify_shell("python3 scripts/generate.py"))

print("== 5. una redirección que no toca el árbol NO cuenta como escritura ==")
check("2>&1 no es escritura", "undecidable", pr.classify_shell("pytest -q 2>&1"))
check(">/dev/null no es escritura", "undecidable",
      pr.classify_shell("command -v rg >/dev/null"))

print("== 6. el resumen reparte por efecto y fecha la última mutación ==")
eventos = [
    ("Bash", {"command": "grep -rn x src/"}, 10.0),
    ("Bash", {"command": "cat > src/nuevo.py <<'PY'"}, 30.0),
    ("Read", None, 50.0),
    ("SendMessage", None, 5.0),
]
resumen = pr.summarize(eventos, window=900)
check("un mutating", 1, resumen.mutating)
check("un read_only", 1, resumen.read_only)
check("dos indecidibles (grep + SendMessage)", 2, resumen.undecidable)
check("la última mutación se fecha", 30.0, resumen.last_mutation_age)

print("== 7. fuera de la ventana, la mutación no cuenta ==")
resumen = pr.summarize([("Write", None, 5000.0)], window=900)
check("mutación vieja no entra al conteo", 0, resumen.mutating)
check("sin mutación en ventana no hay fecha", None, resumen.last_mutation_age)

print("== 8. el veredicto de producción sólo tiene dos valores ==")
check("dos veredictos", ("producing", "no_evidence_of_production"), pr.PRODUCTION_VERDICTS)
check("con mutación: producing", "producing",
      pr.verdict(pr.summarize([("Write", None, 1.0)], window=900)))
check("sin mutación: no_evidence_of_production", "no_evidence_of_production",
      pr.verdict(pr.summarize([("Bash", {"command": "ls"}, 1.0)], window=900)))

print("== 9. una herramienta desconocida cae a indecidible, no a inocua ==")
check("herramienta futura del cliente", "undecidable", pr.classify_tool("HerramientaQueAunNoExiste"))

print("== 10. una lista vacía de eventos no rehúsa — es un roster tranquilo ==")
resumen = pr.summarize([], window=900)
check("summarize([]) da ceros", (0, 0, 0, None),
      (resumen.mutating, resumen.read_only, resumen.undecidable, resumen.last_mutation_age))

print("== 11-14. el 2x2: vivacidad x producción, cuatro acciones distintas ==")
vivo = jl.Diagnosis(verdict="recent", from_marker=False)
parado = jl.Diagnosis(verdict="stalled_unknown", from_marker=False)
produjo = pr.summarize([("Write", None, 1.0)], window=900)
sin_evidencia = pr.summarize([("Bash", {"command": "ls"}, 1.0)], window=900)

check("vivo + produjo = working", "working", pr.combine(vivo, produjo))
check("vivo + sin evidencia = alive_without_evidence", "alive_without_evidence",
      pr.combine(vivo, sin_evidencia))
check("parado + produjo = stalled_after_producing", "stalled_after_producing",
      pr.combine(parado, produjo))
check("parado + sin evidencia = stalled_without_evidence", "stalled_without_evidence",
      pr.combine(parado, sin_evidencia))

print("== 15. 'sin evidencia' NO es 'no produjo': el silencio trae su conteo ==")
# Es la mitad que hace honesto al veredicto. Un `alive_without_evidence` con
# 30 indecidibles y uno con 0 son estados distintos: en el primero el
# instrumento fue ciego 30 veces, en el segundo no hubo nada que ver.
ciego = pr.summarize([("Bash", {"command": "python3 build.py"}, 1.0)] * 30, window=900)
check("el conteo de indecidibles sobrevive al veredicto", 30, ciego.undecidable)
check("y el veredicto sigue siendo el mismo", "no_evidence_of_production", pr.verdict(ciego))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
