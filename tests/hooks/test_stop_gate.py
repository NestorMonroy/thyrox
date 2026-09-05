"""Pruebas de ``hooks.stop_gate`` — el gate de ``Stop`` que consulta un motor.

Dos gates de kaupamex —``stop-gate-evidencia-varada.sh`` y
``stop-gate-espera-pendiente.sh``— comparten esqueleto: leer el payload,
rehusar si es reentrada, rehusar si el motor no está, invocarlo, y traducir su
resultado a ``{}`` o a ``{"decision": "block", "reason": …}``.

Lo que NO comparten es el **modo de veredicto**, y ahí estaba el riesgo del
porte. Medido en este árbol antes de escribir una línea:

- ``evidencia-varada.sh listar`` → **exit 1** con 880 artefactos: decide por
  **código de salida**;
- ``wait-jobs.sh pendientes``   → **exit 0** y stdout vacío: decide por
  **salida**, porque su no-cero sin texto no es un incumplimiento.

Un gate con un solo modo publicaría un veredicto que uno de los dos nunca
pidió. Por eso los modos son excluyentes y se declaran.

El tercer desenlace no es cosmético: un código **no declarado** no es limpio ni
bloqueante — es ``not_measurable``. Emite ``{}`` y lo **nombra en stderr**, para
que «no pude medir» no se lea como «no hay nada». Es el sub-patrón D de
``metrica-decide-la-conclusion.md`` aplicado al propio veredicto.
"""
from __future__ import annotations

import io
import json
import os
import stat
import subprocess
import sys
import tempfile
from contextlib import redirect_stderr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import stop_gate as sg  # noqa: E402

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


def engine(carpeta: str, nombre: str, salida: str, codigo: int) -> Path:
    """Un motor de mentira con salida y código declarados."""
    ruta = Path(carpeta) / nombre
    ruta.write_text(f"#!/bin/sh\nprintf '%s' {json.dumps(salida)}\nexit {codigo}\n")
    ruta.chmod(ruta.stat().st_mode | stat.S_IEXEC)
    return ruta


print("== 1. modo por CÓDIGO: el declarado bloquea, el limpio no ==")
with tempfile.TemporaryDirectory() as c:
    bloquea = sg.Gate(engine=[str(engine(c, "rojo.sh", "880 varados", 1))],
                      block_exits=(1,), clean_exits=(0, 2), reason="Hay varados.\n\n{output}")
    veredicto = bloquea.run("{}")
    check("bloquea", "block", veredicto.get("decision"))
    check("y el motivo trae la salida del motor", True,
          "880 varados" in veredicto["reason"])

    limpio = sg.Gate(engine=[str(engine(c, "verde.sh", "", 0))],
                     block_exits=(1,), clean_exits=(0, 2), reason="x {output}")
    check("el código limpio emite {}", {}, limpio.run("{}"))

print("== 2. modo por CÓDIGO: el 2 declarado limpio NO bloquea ==")
# `evidencia-varada` usa el 2 para «no hay volátil que mirar». Bloquear ahí
# convertiría «no pude medir» en un bloqueo que nadie puede resolver.
with tempfile.TemporaryDirectory() as c:
    g = sg.Gate(engine=[str(engine(c, "nomedible.sh", "sin volatil", 2))],
                block_exits=(1,), clean_exits=(0, 2), reason="x {output}")
    check("el 2 declarado limpio emite {}", {}, g.run("{}"))

print("== 3. modo por SALIDA: no-cero con texto bloquea; sin texto, no ==")
with tempfile.TemporaryDirectory() as c:
    con = sg.Gate(engine=[str(engine(c, "conpend.sh", "suite  /tmp/x.log  4211", 1))],
                  block_on_output=True, clean_exits=(0, 4), reason="Pendientes:\n{output}")
    v = con.run("{}")
    check("no-cero CON texto bloquea", "block", v.get("decision"))
    check("y el texto viaja al motivo", True, "4211" in v["reason"])

    sin = sg.Gate(engine=[str(engine(c, "sinpend.sh", "", 1))],
                  block_on_output=True, clean_exits=(0, 4), reason="x {output}")
    check("no-cero SIN texto emite {}", {}, sin.run("{}"))

    cero = sg.Gate(engine=[str(engine(c, "cero.sh", "ruido informativo", 0))],
                   block_on_output=True, clean_exits=(0, 4), reason="x {output}")
    check("exit 0 emite {} aunque haya texto", {}, cero.run("{}"))

    # DISCRIMINA: el cero es limpio POR EL MODO, no por declaración. Sin este
    # caso, un consumidor que olvidara `--clean-exit 0` bloquearía con la
    # salida informativa de un motor que terminó bien, y en silencio.
    cero_sin = sg.Gate(engine=[str(engine(c, "cero2.sh", "ruido", 0))],
                       block_on_output=True, reason="x {output}")
    check("y sigue limpio SIN declarar el 0", {}, cero_sin.run("{}"))

print("== 4. DISCRIMINA: el exit 4 declarado limpio NO se reclasifica ==")
# El stub de `espera-pendiente` declara `--clean-exit 4` verbatim: «exit 4 se
# lee como limpio hasta que #95 decida». El default de no-declarado NO puede
# tragarse esa declaración — hacerlo sería resolver #95 de tapadillo.
with tempfile.TemporaryDirectory() as c:
    m = str(engine(c, "cuatro.sh", "la cadena rehusó", 4))
    declarado = sg.Gate(engine=[m], block_on_output=True, clean_exits=(0, 4),
                        reason="x {output}")
    with redirect_stderr(io.StringIO()) as err:
        check("declarado limpio: {} y stderr callado", {}, declarado.run("{}"))
    check("y no se nombra como no medible", "", err.getvalue())

    # Y aquí está el motivo de que la declaración se copie VERBATIM al stub:
    # sin ella, en modo por salida el 4 CON texto bloquea. Medido, no supuesto.
    sin_declarar = sg.Gate(engine=[m], block_on_output=True, clean_exits=(0,),
                           reason="x {output}")
    check("sin declarar el 4, el mismo motor bloquea", "block",
          sin_declarar.run("{}").get("decision"))

print("== 4-bis. el código no declarado es `no medible`, no un verde ==")
# Sólo existe en el modo por CÓDIGO: ahí el código ES el discriminador, así que
# uno fuera de las dos listas deja el hecho sin medir. En el modo por salida el
# discriminador es el texto, y un código desconocido no es una incógnita.
with tempfile.TemporaryDirectory() as c:
    m = str(engine(c, "raro.sh", "algo raro", 4))
    g = sg.Gate(engine=[m], block_exits=(1,), clean_exits=(0,), reason="x {output}")
    with redirect_stderr(io.StringIO()) as err2:
        check("no bloquea — nadie sabría cómo resolverlo", {}, g.run("{}"))
    check("pero nombra el código en stderr", True, "4" in err2.getvalue())
    check("y lo declara no medible", True, "no medible" in err2.getvalue())

print("== 5. DISCRIMINA: una reentrada NO consulta al motor ==")
# Consultarlo sería, además de inútil, un bucle: el motivo devuelve el control
# al agente, que vuelve a cerrar, que vuelve a bloquear.
with tempfile.TemporaryDirectory() as c:
    testigo = Path(c) / "el-motor-corrio"
    m = Path(c) / "testigo.sh"
    m.write_text(f"#!/bin/sh\ntouch '{testigo}'\nprintf 'algo'\nexit 1\n")
    m.chmod(m.stat().st_mode | stat.S_IEXEC)
    g = sg.Gate(engine=[str(m)], block_exits=(1,), clean_exits=(0,), reason="x {output}")
    check("emite {}", {}, g.run('{"stop_hook_active": true}'))
    check("y el motor NO corrió", False, testigo.exists())

print("== 6. CONTROL: sin motor el gate calla, no finge ==")
with tempfile.TemporaryDirectory() as c:
    g = sg.Gate(engine=[str(Path(c) / "no-existe.sh")], block_exits=(1,),
                clean_exits=(0,), reason="x {output}")
    with redirect_stderr(io.StringIO()) as err:
        check("emite {}", {}, g.run("{}"))
    check("y lo nombra en stderr", True, "no-existe.sh" in err.getvalue())

print("== 7. CONTROL: los dos modos son EXCLUYENTES ==")
# Un gate con los dos declarados tendría dos veredictos posibles para la misma
# salida y ninguna regla que los ordene. Rehusar es lo que separa «ambiguo» de
# «alguien elegirá por mí».
try:
    sg.Gate(engine=["/bin/true"], block_exits=(1,), block_on_output=True,
            clean_exits=(0,), reason="x")
    check("rehúsa los dos modos a la vez", "ModeError", "no lanzó")
except sg.ModeError as err:
    check("rehúsa los dos modos a la vez", "ModeError", type(err).__name__)

try:
    sg.Gate(engine=["/bin/true"], clean_exits=(0,), reason="x")
    check("rehúsa sin ningún modo", "ModeError", "no lanzó")
except sg.ModeError as err:
    check("rehúsa sin ningún modo", "ModeError", type(err).__name__)

print("== 8. el motivo SIN ranura {output} sigue siendo válido ==")
# `espera-pendiente` incrusta la salida en medio de su prosa; `evidencia-varada`
# también. Pero un motivo que no la quiera no debe romper.
with tempfile.TemporaryDirectory() as c:
    g = sg.Gate(engine=[str(engine(c, "r.sh", "detalle", 1))],
                block_exits=(1,), clean_exits=(0,), reason="Motivo fijo.")
    check("el motivo sale entero", "Motivo fijo.", g.run("{}")["reason"])

print("== 9. CLI: emite JSON por stdout y SIEMPRE sale 0 ==")
MODULO = str(Path(sg.__file__).resolve())
with tempfile.TemporaryDirectory() as c:
    m = str(engine(c, "cli.sh", "lo que sea", 1))
    proc = subprocess.run(
        [sys.executable, MODULO, "--engine", m, "--block-exit", "1",
         "--clean-exit", "0", "--reason", "Bloqueo de prueba.\n\n{output}"],
        input="{}", capture_output=True, text=True)
    check("sale 0", 0, proc.returncode)
    datos = json.loads(proc.stdout)
    check("bloquea", "block", datos.get("decision"))
    check("con la salida del motor dentro", True, "lo que sea" in datos["reason"])

print("== 10. CLI: el modo por salida se declara con su propia bandera ==")
with tempfile.TemporaryDirectory() as c:
    m = str(engine(c, "cli2.sh", "", 1))
    proc = subprocess.run(
        [sys.executable, MODULO, "--engine", m, "--block-on-output",
         "--clean-exit", "0", "4", "--reason", "x {output}"],
        input="{}", capture_output=True, text=True)
    check("sale 0", 0, proc.returncode)
    check("y sin texto NO bloquea", "{}", proc.stdout.strip())

print("== 11. CLI: los dos modos a la vez REHÚSAN, y no emiten un veredicto ==")
proc = subprocess.run(
    [sys.executable, MODULO, "--engine", "/bin/true", "--block-exit", "1",
     "--block-on-output", "--reason", "x"],
    input="{}", capture_output=True, text=True)
check("no sale 0", True, proc.returncode != 0)
check("y NO publica un {} que se lea como limpio", "", proc.stdout.strip())
check("nombra el conflicto en stderr", True, "excluyente" in proc.stderr)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
