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
fails en silencio y el turno sigue. Es el mismo defecto que #252 nombra para
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

print("== 6. instalar es una FUSION: sustituye lo propio y conserva lo ajeno ==")
# El defecto que cierra: `permissions` lo escribe el CLIENTE durante la sesion.
# Un instalador que reemplace el archivo lo borra, y en silencio.
import json as _json, tempfile as _tf  # noqa: E402


class _FakeBackup:
    """Doble del puerto conducido. Anota lo que le pidieron; no toca el disco."""

    def __init__(self, fails=False):
        self.asked = []
        self.fails = fails

    def backup(self, source, destination):
        self.asked.append((str(source), str(destination)))
        if self.fails:
            raise w.WiringRefused("respaldo simulado que no aterriza")


_tmp = Path(_tf.mkdtemp())
_live = _tmp / "settings.local.json"
_foreign = {"permissions": {"allow": ["Bash(ls)"]},
          "advisorModel": "modelo-viejo",
          "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "true"}]}]}}
_live.write_text(_json.dumps(_foreign))

_double = _FakeBackup()
_record = w.install(_live, w.declared_wiring(), _double, "SELLO", backups=_tmp)
_final = _json.loads(_live.read_text())
check("conserva permissions verbatim", _foreign["permissions"], _final["permissions"])
check("sustituye advisorModel", "claude-fable-5-1", _final["advisorModel"])
check("sustituye hooks por lo declarado", ["PreModelSwitch", "SubagentStart", "SubagentStop"],
      sorted(_final["hooks"]))
check("el acta nombra lo conservado", ["permissions"], _record["preserved"])

print("== 7. respalda ANTES de escribir, y el respaldo es del contenido viejo ==")
check("pidio el respaldo una vez", 1, len(_double.asked))
check("respaldo el archivo vivo", str(_live), _double.asked[0][0])
check("el destino lleva el sello", True, _double.asked[0][1].endswith(".SELLO"))

print("== 8. si el respaldo NO aterriza, el archivo vivo queda INTACTO ==")
# CONTROL DE ANULACION del paso 2: si `install` no llamara a `backup` —o
# atrapara su excepcion— este caso cae, y SOLO este. El 6 seguiria verde con un
# instalador sin respaldo ninguno, asi que sin el 8 el verde no distingue
# «respalda» de «no mira».
_live2 = _tmp / "otro.json"
_before = _json.dumps({"permissions": {"allow": []}})
_live2.write_text(_before)
try:
    w.install(_live2, w.declared_wiring(), _FakeBackup(fails=True), "SELLO", backups=_tmp)
    check("lanza WiringRefused", True, False)
except w.WiringRefused:
    check("lanza WiringRefused", True, True)
check("no escribio nada", _before, _live2.read_text())

print("== 9. lo declarado con una ruta ausente NO se instala ==")
# Instalar un cableado roto reproduce el defecto que este modulo vino a cerrar.
_broken = {"hooks": {"Stop": [{"hooks": [
    {"type": "command", "command": "python3 /no/existe/x.py"}]}]}}
_live3 = _tmp / "tercero.json"
_live3.write_text("{}")
_never = _FakeBackup()
try:
    w.install(_live3, _broken, _never, "SELLO", backups=_tmp)
    check("rehusa antes de tocar nada", True, False)
except w.WiringRefused:
    check("rehusa antes de tocar nada", True, True)
check("ni siquiera pidio el respaldo", 0, len(_never.asked))

print("== 10. el adaptador real deja el respaldo en disco (nohup + ledger) ==")
# El puerto se prueba con un doble; el ADAPTADOR se mide contra el disco, que es
# lo unico que responde «el respaldo existe». Un ledger aislado: el de la sesion
# no se toca.
import os as _os2  # noqa: E402

_source = _tmp / "fuente.json"
_source.write_text('{"marca": "contenido-original"}')
_target = _tmp / "respaldos" / "fuente.json.SELLO"
_os2.environ["THYROX_JOBS_DIR"] = str(_tmp / "ledger")
w.BackgroundBackup(timeout=30).backup(_source, _target)
check("el respaldo aterrizo", True, _target.exists())
check("con el contenido de la fuente", _source.read_text(), _target.read_text())

print("== 11. un trabajo ajeno DETENIDO no toma de rehen al respaldo ==")
# La adaptacion del roster. Un proceso parado (SIGSTOP, estado `T`) responde a
# `kill -0` como si viviera, asi que `cmd_wait` lo cuenta vivo, agota el timeout
# y sale 3 dejando en el ledger a TODOS los trabajos — incluido el que si
# termino. Esperar sobre el ledger compartido hacia que el respaldo dependiera
# de un trabajo que nadie va a revivir.
#
# El discriminador es el RELOJ: con la version que esperaba el ledger
# compartido, esto tarda >= timeout. Con el ledger propio, tarda lo que tarda un
# `cp`. Un caso que solo comprobara «el respaldo existe» pasaria en las dos.
import subprocess as _sp2, time as _time  # noqa: E402

_shared = _tmp / "ledger"
_ledger_sh = str(HERE / "src" / "session" / "wait-jobs.sh")
_stalled = _sp2.Popen(["bash", "-c", "sleep 300"])
_foreign_log = _tmp / "ajeno.log"
_foreign_log.write_text("")
_sp2.run([_ledger_sh, "register", "ajeno", str(_foreign_log), str(_stalled.pid)],
         capture_output=True, text=True,
         env={**_os2.environ, "THYROX_JOBS_DIR": str(_shared)})
_stalled.send_signal(19)  # SIGSTOP -> estado T
_time.sleep(0.5)

_classes = _sp2.run([_ledger_sh, "status"], capture_output=True, text=True,
                   env={**_os2.environ, "THYROX_JOBS_DIR": str(_shared)}).stdout
check("el ledger compartido lo clasifica DETENIDO", True, "DETENIDO" in _classes)

_source2 = _tmp / "fuente2.json"
_source2.write_text('{"marca": "con-vecino-atascado"}')
_target2 = _tmp / "respaldos2" / "fuente2.json.SELLO"
_adapter = w.BackgroundBackup(timeout=30)
_t0 = _time.time()
_adapter.backup(_source2, _target2)
_elapsed = _time.time() - _t0

check("el respaldo aterrizo igual", True, _target2.exists())
check("y NO espero al timeout (< 15 s)", True, _elapsed < 15)
check("pero REPORTA al atascado, no lo esconde", True,
      any("DETENIDO" in linea for linea in _adapter.stuck_elsewhere))

_stalled.send_signal(18)  # SIGCONT, para poder terminarlo
_stalled.kill()
_stalled.wait(timeout=10)

print(f"\n{OK} ok, {FALLOS} fallos")
raise SystemExit(1 if FALLOS else 0)
