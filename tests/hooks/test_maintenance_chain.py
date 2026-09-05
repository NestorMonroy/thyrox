"""Pruebas de ``hooks.maintenance_chain`` — la cadena de mantenimiento.

Un mecanismo, dos renders. Detrás de ``reconciliar-store-al-arrancar.sh``
(SessionStart) y ``reconciliar-store-al-cerrar.sh`` (Stop) hay la misma cosa:
una lista ordenada de pasos con su plazo, que nunca bloquea el turno. Lo que
difiere es qué se hace con la salida — uno la publica como
``additionalContext``, el otro la descarta y emite ``{}``.

Los dos ejes que estas pruebas fijan, y que el bash NO tenía:

**El presupuesto se comprueba.** Los plazos de los pasos suman contra el
``timeout`` que ``settings.json`` declara para el hook. El bash lo documentaba
en un comentario —20+90+15 ≤ 130— y nadie lo verificaba: una versión anterior
sumaba 150 contra 130 y el pase moría sin escribir (H-DOCS-235, H-DOCS-498). Un
comentario no es un control.

**Un paso que muere se NOMBRA.** El bash cerraba cada paso con
``>/dev/null 2>&1 || true``: un paso agotado y uno exitoso se ven idénticos
desde fuera. Ése es el sub-patrón D de ``metrica-decide-la-conclusion.md`` —el
verde que no discrimina—, y es el mismo defecto que se acaba de corregir en el
despachador de PreToolUse. No bloquear no obliga a callar.

Los pasos de estas pruebas son sondas (``true``, ``sleep``, ``printf``), nunca
los guiones reales: ``reconciliar_store.py`` corre hasta 90 s y mide el store
compartido.
"""
from __future__ import annotations

import io
import json
import pathlib
import subprocess
import sys
import tempfile
import time
from contextlib import redirect_stderr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import maintenance_chain as mc  # noqa: E402

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


def step(label: str, command: str, timeout: int) -> mc.Step:
    return mc.Step(label=label, command=["sh", "-c", command], timeout=timeout)


print("== 1. los pasos corren en orden y cada uno trae su última línea ==")
chain = mc.Chain(
    steps=[
        step("primero", "printf 'a\\nuno\\n'", 5),
        step("segundo", "printf 'b\\ndos\\n'", 5),
    ],
    budget=30,
)
results = chain.run()
check("dos resultados", 2, len(results))
check("en el orden declarado", ["primero", "segundo"], [r.label for r in results])
check("cada uno con su última línea", ["uno", "dos"], [r.tail for r in results])
check("ninguno agotado", [False, False], [r.timed_out for r in results])
check("ninguno en rojo", [0, 0], [r.exit_code for r in results])

print("== 2. un paso en rojo NO detiene la cadena ==")
chain = mc.Chain(
    steps=[
        step("rojo", "echo fallo; exit 3", 5),
        step("posterior", "printf 'sigo\\n'", 5),
    ],
    budget=30,
)
with redirect_stderr(io.StringIO()) as err:
    results = chain.run()
check("los dos pasos corrieron", 2, len(results))
check("el primero salió en rojo", 3, results[0].exit_code)
check("y el segundo entregó igual", "sigo", results[1].tail)
check("el rojo se nombra en stderr", True, "rojo" in err.getvalue())

print("== 3. DISCRIMINA: un paso agotado se marca Y se nombra en stderr ==")
# El bash lo tragaba con `>/dev/null 2>&1 || true`. Un paso que agota su plazo
# y uno que terminó bien se veían idénticos: el verde no discriminaba.
chain = mc.Chain(steps=[step("colgado", "sleep 100", 1)], budget=30)
with redirect_stderr(io.StringIO()) as err:
    results = chain.run()
check("se marca como agotado", True, results[0].timed_out)
check("el plazo se nombra en stderr", True, "colgado" in err.getvalue())
check("y stderr dice cuántos segundos", True, "1" in err.getvalue())

print("== 4. DISCRIMINA: la suma de plazos se comprueba contra el presupuesto ==")
# Control con la guarda anulada: sin esta comprobación, los tres casos de esta
# sección pasan igual — la suma excedida no tendría dónde manifestarse.
with redirect_stderr(io.StringIO()) as err:
    excedida = mc.Chain(
        steps=[step("largo", "true", 90), step("otro", "true", 60)],
        budget=130,
    )
check("la cadena se construye igual — avisar no es bloquear", 2, len(excedida.steps))
check("stderr nombra la suma", True, "150" in err.getvalue())
check("stderr nombra el presupuesto", True, "130" in err.getvalue())

print("== 5. dentro del presupuesto NO hay aviso ==")
with redirect_stderr(io.StringIO()) as err:
    mc.Chain(steps=[step("corto", "true", 20)], budget=130)
check("stderr queda limpio", "", err.getvalue())

print("== 6. render SessionStart: cada cola entra al additionalContext ==")
results = mc.Chain(
    steps=[
        step("carrete", "printf 'drenados 3\\n'", 5),
        step("store", "printf 'registrados 7\\n'", 5),
    ],
    budget=30,
).run()
salida = mc.render_session_start(results, preamble="El store es compartido.")
datos = json.loads(salida)
contexto = datos["hookSpecificOutput"]["additionalContext"]
check("declara el evento", "SessionStart",
      datos["hookSpecificOutput"]["hookEventName"])
check("trae la cola del primer paso", True, "drenados 3" in contexto)
check("trae la cola del segundo", True, "registrados 7" in contexto)
check("y el preámbulo del consumidor", True, "store es compartido" in contexto)

print("== 7. render Stop: descarta la salida y emite {} exacto ==")
salida = mc.render_stop(results)
check("emite el objeto vacío", "{}", salida)

print("== 8. CONTROL: un comando inexistente no se lee como verde ==")
chain = mc.Chain(
    steps=[mc.Step(label="ausente", command=["/no/existe/comando"], timeout=5)],
    budget=30,
)
with redirect_stderr(io.StringIO()) as err:
    results = chain.run()
check("el paso NO reporta 0", True, results[0].exit_code != 0)
check("no se marca como agotado — murió, no se colgó", False, results[0].timed_out)
check("y se nombra en stderr", True, "ausente" in err.getvalue())

print("== 9. CONTROL: la cadena vacía rehúsa — no publica un verde sin pasos ==")
# Un cero de pasos ejecutados y un cero de pasos declarados publican la misma
# cifra. Rehusar es lo que los separa (mismo criterio que el registro vacío del
# despachador de PreToolUse).
try:
    mc.Chain(steps=[], budget=130)
    check("rehúsa sin pasos", "EmptyChainError", "no lanzó")
except mc.EmptyChainError as err:
    check("rehúsa sin pasos", "EmptyChainError", type(err).__name__)

print("== 10. CLI: los pasos y el presupuesto se inyectan por argumento ==")
# Es la superficie que consumen los dos stubs de kaupamex: conservan su nombre
# de archivo para que `settings.json` no cambie, y pasan aquí sus parámetros.
MODULO = str(Path(mc.__file__).resolve())
proc = subprocess.run(
    [sys.executable, MODULO, "--render", "session-start", "--budget", "60",
     "--preamble", "prosa del consumidor",
     "--step", "carrete", "20", "printf 'drenados 3\\n'",
     "--step", "store", "30", "printf 'registrados 7\\n'"],
    capture_output=True, text=True,
)
check("sale 0", 0, proc.returncode)
datos = json.loads(proc.stdout)
contexto = datos["hookSpecificOutput"]["additionalContext"]
check("publica las dos colas", True,
      "drenados 3" in contexto and "registrados 7" in contexto)
check("y el preámbulo inyectado", True, "prosa del consumidor" in contexto)

print("== 11. CLI: el render Stop emite {} y NUNCA rompe el turno ==")
proc = subprocess.run(
    [sys.executable, MODULO, "--render", "stop", "--budget", "130",
     "--step", "rojo", "5", "exit 3",
     "--step", "colgado", "1", "sleep 100"],
    capture_output=True, text=True,
)
check("sale 0 pese a los dos incidentes", 0, proc.returncode)
check("stdout es el objeto vacío", "{}", proc.stdout.strip())
check("stderr nombra el paso en rojo", True, "rojo" in proc.stderr)
check("stderr nombra el paso agotado", True, "colgado" in proc.stderr)

print("== 12. un paso SIN salida sigue apareciendo, nombrado ==")
# El bash lo cubría con un fallback explícito («sin salida (omitido)») y tenía
# razón: un paso que calla y un paso que no corrió se leen igual si desaparece
# de la lista. Omitirlo sería el mismo silencio del `|| true`.
results = mc.Chain(
    steps=[step("mudo", "true", 5), step("hablador", "printf 'dijo algo\\n'", 5)],
    budget=30,
).run()
contexto = json.loads(mc.render_session_start(results))[
    "hookSpecificOutput"]["additionalContext"]
check("el paso mudo aparece", True, "mudo" in contexto)
check("declarado como sin salida", True, "sin salida" in contexto)
check("y el otro trae la suya", True, "dijo algo" in contexto)

print("== 13. si el paso ya se nombra a sí mismo, la etiqueta no se repite ==")
# Los guiones `--quiet` de kaupamex abren su resumen con su propio nombre
# («reconciliar-store: 0 registrados…»). Anteponerle la etiqueta produce
# «reconciliar-store: reconciliar-store: …», que es ruido, no información.
results = mc.Chain(
    steps=[
        step("reconciliar-store", "printf 'reconciliar-store: 0 altas\\n'", 5),
        step("otro", "printf 'algo\\n'", 5),
    ],
    budget=30,
).run()
contexto = json.loads(mc.render_session_start(results))[
    "hookSpecificOutput"]["additionalContext"]
check("sin etiqueta repetida", False, "reconciliar-store: reconciliar-store" in contexto)
check("pero el resumen entero sigue ahí", True, "reconciliar-store: 0 altas" in contexto)
check("y el que no se nombra sí la lleva", True, "otro: algo" in contexto)

print("== 14. DISCRIMINA: un paso agotado NO deja el trabajo corriendo ==")
# El bash mataba con `timeout(1)`, que senala al comando. `subprocess.run` con
# `timeout=` manda SIGKILL SOLO al proceso lanzado — y si ese proceso es un
# shell que forkeo, el hijo sobrevive: la cadena reporta «agotado» mientras el
# trabajo sigue tocando la base.
#
# Se mide el FENOMENO, no el nombre del proceso. Un `pgrep -f <marca>` no sirve
# por dos razones medidas: el `#` de un comentario no llega al argv del hijo, y
# la marca hace juego con el argv de quien invoca la suite — el primer intento
# reporto huerfano una linea de comando propia. El testigo es un archivo que el
# trabajo crea si sigue vivo: si el grupo murio, no aparece.
with tempfile.TemporaryDirectory() as carpeta:
    testigo = pathlib.Path(carpeta) / "el-trabajo-siguio"
    paso = mc.Step(
        label="colgado",
        command=["sh", "-c", f"(sleep 2; touch '{testigo}') & wait"],
        timeout=1,
    )
    with redirect_stderr(io.StringIO()):
        resultados = mc.Chain(steps=[paso], budget=30).run()
    check("se reporta agotado", True, resultados[0].timed_out)
    time.sleep(3)
    check("y el trabajo NO siguio corriendo", False, testigo.exists())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
