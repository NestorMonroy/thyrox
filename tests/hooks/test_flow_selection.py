"""Pruebas de ``hooks.flow_selection`` — resolver el flow a su coordinator.

Adaptación de ``kaupamex-docs: .claude/hooks/inject-flow-selection.sh``. Lo que
viaja es el mecanismo: los flows canónicos de DEC-R-01, la resolución en dos
pasos contra el árbol, y la forma de invocación que el ejecutable declara
(``@agent-<nombre>``, con el prefijo obligatorio). Lo que se inyecta es el
directorio de agentes y las notas propias del consumidor (DEC-04).

**El mapa se DERIVA, no se declara.** El hook no lleva registro de qué
coordinators existen: los resuelve contra el árbol en cada arranque. Un registro
escrito en el mecanismo sería la segunda fuente de verdad que
``calibration-verified-numbers.md`` prohíbe.

Los casos que DISCRIMINAN son el 4, el 5 y el 11. El 4 mide que la coincidencia
por descripción respete la frontera de palabra —sin ella, ``sp`` haría juego con
cualquier descripción que contenga «responsable»—. El 5 mide la precedencia: sin
ella, un coordinator con nombre exacto podría perder contra otro que lo nombre de
pasada. El 11 mide que un directorio ausente REHÚSE en vez de publicar catorce
flows «sin coordinator», que es un informe falso indistinguible de un árbol sin
coordinators.
"""
from __future__ import annotations

import io
import json
import subprocess
import sys
from contextlib import redirect_stderr
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import flow_selection as fs  # noqa: E402

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


def agents(**archivos: str) -> TemporaryDirectory:
    """Un directorio de agentes de mentira: nombre -> su línea ``description:``."""
    carpeta = TemporaryDirectory()
    for nombre, descripcion in archivos.items():
        (Path(carpeta.name) / f"{nombre}.md").write_text(
            f"---\nname: {nombre}\ndescription: {descripcion}\n---\ncuerpo\n"
        )
    return carpeta


print("== 1. coincidencia directa por nombre ==")
with agents(**{"rup-coordinator": "Coordinator para RUP"}) as dir_agentes:
    check("rup resuelve a su homónimo", "rup-coordinator",
          fs.resolve_coordinator("rup", Path(dir_agentes)))

print("== 2. si no hay homónimo, la descripción decide ==")
# El caso real del árbol: `babok` no tiene `babok-coordinator.md`, pero
# `ba-coordinator` declara «Coordinator para BABOK». La convención de nombre no
# cubre ese caso y por eso el segundo paso existe.
with agents(**{"ba-coordinator": "Coordinator para BABOK — análisis de negocio"}) as d:
    check("babok encuentra a ba-coordinator", "ba-coordinator",
          fs.resolve_coordinator("babok", Path(d)))

print("== 3. sin candidato, no se inventa uno ==")
with agents(**{"rup-coordinator": "Coordinator para RUP"}) as d:
    check("scrum no resuelve", None, fs.resolve_coordinator("scrum", Path(d)))

print("== 4. DISCRIMINA: la descripción hace juego por PALABRA, no por subcadena ==")
with agents(**{"otro-coordinator": "Coordinator para BABOKISMO y afines"}) as d:
    check("BABOKISMO no es BABOK", None, fs.resolve_coordinator("babok", Path(d)))
with agents(**{"raro-coordinator": "El responsable de la especificación"}) as d:
    check("«responsable» no contiene el flow sp", None,
          fs.resolve_coordinator("sp", Path(d)))

print("== 5. DISCRIMINA: el homónimo gana sobre el que sólo lo menciona ==")
with agents(**{"rup-coordinator": "Coordinator sin mención",
               "aaa-coordinator": "Coordinator para RUP"}) as d:
    # `aaa-` ordena antes que `rup-`: si el paso 1 no tuviera precedencia, el
    # recorrido alfabético del paso 2 se lo llevaría.
    check("gana el homónimo", "rup-coordinator",
          fs.resolve_coordinator("rup", Path(d)))

print("== 6. resolve_all reparte en resueltos y sin resolver ==")
with agents(**{"rup-coordinator": "Coordinator para RUP",
               "ba-coordinator": "Coordinator para BABOK"}) as d:
    mapa, sin = fs.resolve_all(Path(d), flows=("rup", "babok", "scrum"))
    check("dos resueltos", {"rup": "rup-coordinator", "babok": "ba-coordinator"}, mapa)
    check("uno sin resolver", ["scrum"], sin)

print("== 7. los flows canónicos son los catorce de DEC-R-01 ==")
check("catorce", 14, len(fs.CANONICAL_FLOWS))
check("y son estos", ("rup", "scrum", "kanban", "tdd", "pm", "pdca", "dmaic",
                     "lean", "babok", "bpa", "cp", "pps", "sp", "rm"),
      fs.CANONICAL_FLOWS)

print("== 8. la mención lleva el prefijo obligatorio del ejecutable ==")
# `@agent-${attachment.agentType}` — el prefijo `agent-` no es decorativo: sin
# él la mención no despacha. El contrato en prosa lo escribía sin prefijo.
texto = fs.render({"rup": "rup-coordinator"}, ["scrum"])
check("mención con prefijo", True, "rup→@agent-rup-coordinator" in texto)
check("y sin él no aparece", False, "rup→@rup-coordinator" in texto)

print("== 9. los flows sin coordinator se NOMBRAN ==")
check("scrum aparece como sin coordinator", True, "scrum" in texto.split("SIN coordinator")[1])

print("== 10. las notas del consumidor entran verbatim ==")
texto = fs.render({"rup": "rup-coordinator"}, [],
                  evidence_note="NOTA DE EVIDENCIA. ",
                  closing_note="NOTA DE CIERRE.")
check("la nota de evidencia", True, "NOTA DE EVIDENCIA." in texto)
check("la nota de cierre", True, "NOTA DE CIERRE." in texto)

print("== 11. DISCRIMINA: un directorio ausente REHÚSA, no publica catorce huérfanos ==")
# Sin esta guarda, `resolve_all` sobre una ruta inexistente devuelve el mapa
# vacío y los catorce flows «sin coordinator». Eso se lee como «este árbol no
# tiene coordinators» — indistinguible de «no pude mirar». Es el sub-patrón D.
try:
    fs.resolve_agents_dir("/no/existe/este/arbol")
    check("rehúsa", True, False)
except fs.AgentsDirError as err:
    check("rehúsa", True, True)
    check("y nombra la variable que lo declara", True, fs.AGENTS_DIR_VARS[0] in str(err))

print("== 12. main emite un SessionStart válido ==")
with agents(**{"rup-coordinator": "Coordinator para RUP"}) as d:
    salida = subprocess.run(
        [sys.executable, str(Path(fs.__file__)), "--agents-dir", d],
        capture_output=True, text=True)
    check("exit 0", 0, salida.returncode)
    carga = json.loads(salida.stdout)
    check("evento SessionStart", "SessionStart",
          carga["hookSpecificOutput"]["hookEventName"])
    check("con el mapa dentro", True,
          "rup→@agent-rup-coordinator" in carga["hookSpecificOutput"]["additionalContext"])

print("== 13. main con directorio ausente: {} y el motivo en stderr, nunca rompe ==")
salida = subprocess.run(
    [sys.executable, str(Path(fs.__file__)), "--agents-dir", "/no/existe"],
    capture_output=True, text=True)
check("exit 0 — un hook no rompe el turno", 0, salida.returncode)
check("stdout es {}", "{}", salida.stdout.strip())
check("stderr nombra el directorio", True, "/no/existe" in salida.stderr)

print("== 14. el recorrido por descripción es estable ==")
with agents(**{"zzz-coordinator": "Coordinator para BABOK",
               "aaa-coordinator": "Coordinator para BABOK"}) as d:
    elegidos = {fs.resolve_coordinator("babok", Path(d)) for _ in range(5)}
    check("siempre el mismo, y es el primero alfabético",
          {"aaa-coordinator"}, elegidos)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
