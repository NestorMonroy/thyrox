#!/usr/bin/env python3
"""El cableado vivo se DECLARA en thyrox, y un control lo mide contra el disco.

MITAD ROJA. Medido 2026-09-07 sobre `/home/user/.claude/settings.local.json`,
que es el unico settings que el lanzador remoto carga (el cwd de la sesion es
`/home/user`, no un clon):

  - Declara **6** comandos de hook (SubagentStart 2, PreModelSwitch 1,
    SubagentStop 3) mas `advisorModel`. Yo dije «5» al contarlos a ojo antes
    de tener el instrumento; el instrumento dice 6.
  - De los 6, **1 apunta a una ruta AUSENTE**: `preModelSwitch.ts` bajo
    `kaupamex-docs/.claude/packages/agent/bin/` — el real esta en
    `thyrox/src/packages/agent/bin/`—, lo que deja el hook `PreModelSwitch`
    MUERTO.
  - Su contenido **no esta registrado en ningun repo**: el unico `advisorModel`
    de los seis clones vive dentro de un artefacto de sonda del 2026-09-02.

Nada lo delataba porque el cliente no avisa: un hook cuyo comando no existe
falla en silencio y el turno sigue. Es el mismo defecto que #252 nombra para
el `bin` — una ruta declarada que nadie comprueba.

CONTROL DE ANULACION: si `broken_targets` devolviera siempre [], cae el caso 2
—y solo el 2—, porque el 1 mide la forma de la declaracion y el 3 mide que un
comando sano NO se reporte. Sin el 2 el verde no distinguiria «ve las rutas
rotas» de «no mira ninguna».
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "user_wiring", HERE / "src" / "session" / "user_wiring.py")
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)

OK = FALLOS = 0


def check(etiqueta, esperado, obtenido):
    global OK, FALLOS
    if esperado == obtenido:
        print(f"  ok    {etiqueta}"); OK += 1
    else:
        print(f"  FALLO {etiqueta}\n        esperado=[{esperado}]\n        obtenido=[{obtenido}]"); FALLOS += 1


print("== 1. la declaracion existe y tiene la forma del settings del cliente ==")
d = w.declared_wiring()
check("es un settings con hooks", True, "hooks" in d)
check("declara los tres eventos", ["PreModelSwitch", "SubagentStart", "SubagentStop"],
      sorted(d["hooks"]))

print("== 2. el control VE una ruta que no existe ==")
falso = {"hooks": {"SubagentStop": [{"hooks": [
    {"type": "command", "command": "python3 /no/existe/hook.py --stop"}]}]}}
rotos = w.broken_targets(falso)
check("nombra el comando roto", 1, len(rotos))
check("cita la ruta", "/no/existe/hook.py", rotos[0]["path"])
check("cita su evento", "SubagentStop", rotos[0]["event"])

print("== 3. un comando cuyo archivo SI existe no se reporta ==")
real = {"hooks": {"SubagentStop": [{"hooks": [
    {"type": "command", "command": f"python3 {HERE}/src/session/user_wiring.py"}]}]}}
check("sin rotos", [], w.broken_targets(real))

print("== 4. lo declarado en thyrox no apunta a ninguna ruta ausente ==")
# Es el caso que fuerza la correccion: la declaracion que thyrox versiona
# NO puede nacer con las dos rutas muertas que el archivo vivo tiene hoy.
check("la declaracion propia esta sana", [], w.broken_targets(d))

print("== 5. sin cableado que medir REHUSA, no publica un cero ==")
# El defecto que este caso cierra lo cometi aqui: la primera version resolvia
# el archivo con `Path.home()`, que es `/root` mientras el cwd es
# `/home/user`, y el control publico «0 rotos sobre 0 comandos» sobre un
# archivo que existe a dos directorios. Un 0 sin sujeto no es un resultado.
import os as _os, subprocess as _sp
r = _sp.run([sys.executable, str(HERE / "src" / "session" / "user_wiring.py")],
            capture_output=True, text=True,
            env={**_os.environ, "THYROX_LIVE_SETTINGS": "/no/existe/settings.json"})
check("exit 2", 2, r.returncode)
check("no emite conteo", 0, r.stdout.count("roto(s)"))
check("nombra la variable con que declararlo", True, "THYROX_LIVE_SETTINGS" in r.stderr)

print(f"\n{OK} ok, {FALLOS} fallos")
raise SystemExit(1 if FALLOS else 0)
