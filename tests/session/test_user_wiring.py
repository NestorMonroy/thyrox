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

print("== 12. TODO ejecutable declarado vive en el PRODUCTOR ==")
# El defecto que cierra: el cableado nombraba tres envoltorios de
# `kaupamex-docs/.claude/hooks/`. Era verdad cuando el mecanismo vivia ahi; con
# la mudanza a `thyrox/src/agents/` quedo atras y nadie lo vio, porque los
# archivos SEGUIAN existiendo — `broken_targets` da 0 con el cableado viejo.
#
# Por eso este caso no mide EXISTENCIA sino PROCEDENCIA: el consumidor puede
# aparecer como PARAMETRO (`--log-dir <docs>/…`), nunca como el ejecutable.
# Anulacion: repuntar un solo comando al envoltorio hace caer este caso y solo
# este.
import re as _re  # noqa: E402

_ejecutables = []
for _ev, _gs in w.declared_wiring()["hooks"].items():
    for _g in _gs:
        for _h in _g["hooks"]:
            # El ejecutable es el primer argumento que es una ruta: lo que
            # viene despues de python3/node/bun run.
            _m = _re.search(r"(?:python3|node|bun run)\s+(\S+)", _h["command"])
            if _m:
                _ejecutables.append((_ev, _m.group(1)))
check("los seis comandos nombran su ejecutable", 6, len(_ejecutables))
_ajenos = [f"{ev}:{r}" for ev, r in _ejecutables if "/thyrox/" not in r]
check("ninguno ejecuta desde el consumidor", [], _ajenos)
check("y todos existen", [],
      [r for _, r in _ejecutables if not Path(r).is_file()])

print("== 13. la deriva entre lo DECLARADO y lo INSTALADO ==")
# MITAD ROJA de este caso, medida 2026-09-07 sobre el archivo vivo ANTES de
# escribir `wiring_drift` (comparando literales de comando por evento):
#
#     PreModelSwitch  vivo=1 declarado=1  literales en comun=1
#     SubagentStart   vivo=2 declarado=2  literales en comun=0
#     SubagentStop    vivo=3 declarado=3  literales en comun=0
#
# Y en el mismo pase se midio la EQUIVALENCIA de esos literales distintos:
# el stub instalado pasa `reach.root("docs")/.claude/agent-results` donde el
# declarado escribe `--results-dir /home/user/kaupamex-docs/.claude/agent-results`,
# y `CLONE_ROOT/.claude/agent-results` donde escribe el mismo `--log-dir`. Los
# dos resuelven al MISMO destino; `register_session` no pasa destino en ninguna
# de las dos formas. Cero literales en comun, comportamiento identico.
#
# Metrica: cadenas de `command` por evento, comparadas como conjuntos.
# Ciega a: un stub que DELEGA en el mismo mecanismo — el literal difiere y el
# destino no. Por eso un rojo de este instrumento NO autoriza a concluir «la
# instalacion esta atrasada»: autoriza a concluir «las dos formas no son la
# misma cadena», que es otra afirmacion. El caso 13.4 fija esa ceguera.
_same = {"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "echo a"}]}]}}
check("dos cableados identicos no derivan", {}, w.wiring_drift(_same, _same))

_other = {"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "echo b"}]}]}}
_drift = w.wiring_drift(_same, _other)
check("un comando cambiado se reporta en su evento", ["Stop"], sorted(_drift))
check("cita el lado vivo", ["echo a"], _drift["Stop"]["only_live"])
check("cita el lado declarado", ["echo b"], _drift["Stop"]["only_declared"])

_missing = {"hooks": {}}
check("un evento declarado y no instalado se reporta",
      ["echo a"], w.wiring_drift(_missing, _same)["Stop"]["only_declared"])
check("y no inventa un lado vivo",
      [], w.wiring_drift(_missing, _same)["Stop"]["only_live"])

# 13.4 — LA CEGUERA, declarada como conducta y no como nota al pie. Las dos
# formas nombran el MISMO mecanismo con el MISMO destino; el instrumento las
# separa igual, porque compara cadenas. Si algun dia dejara de reportarlo,
# habria adquirido una capacidad que aqui no se le atribuye.
_stub = {"hooks": {"SubagentStop": [{"hooks": [{"type": "command",
    "command": "node /home/user/kaupamex-docs/.claude/hooks/save-agent-result.mjs"}]}]}}
_direct = {"hooks": {"SubagentStop": [{"hooks": [{"type": "command",
    "command": "node /home/user/thyrox/src/agents/save_result.mjs"
               " --log-dir /home/user/kaupamex-docs/.claude/agent-results"}]}]}}
check("stub y llamada directa se reportan como deriva (ciega al destino)",
      ["SubagentStop"], sorted(w.wiring_drift(_stub, _direct)))


# --- 14. main PUBLICA la deriva, y NO la mete en su codigo de salida --------
#
# MITAD ROJA, medida antes de escribir el caso: `wiring_drift` existia y
# `main` no lo llamaba ni una vez.
#
#     grep -c wiring_drift src/session/user_wiring.py            -> 1
#     sed -n '/^def main/,$p' ... | grep -c wiring_drift         -> 0
#
# El instrumento estaba construido y su medicion no llegaba a ninguna
# superficie: capacidad muerta. Y el surfacing que se le suponia NO existe —
# `session-start.sh` tiene cero invocadores ejecutables y el settings vivo no
# declara `SessionStart`. La deriva se publica en el comando de medicion que
# YA existe; no se inventa un host.
#
# CONTROL DE ANULACION: si la deriva entrara al codigo de salida, 14.3 caeria
# sola — es la unica asercion que compara los dos codigos entre si. Publicar y
# decidir son cosas distintas: el codigo lo sigue gobernando `broken_targets`
# de lo declarado, que es alcanzabilidad, no coincidencia literal.
import json as _json
import subprocess as _sp
import tempfile as _tf

_MODULO = str(Path(w.__file__))

def _correr(vivo: dict):
    with _tf.TemporaryDirectory() as d:
        ruta = Path(d) / "settings.local.json"
        ruta.write_text(_json.dumps(vivo))
        env = dict(_os.environ, THYROX_LIVE_SETTINGS=str(ruta))
        p = _sp.run([sys.executable, _MODULO], capture_output=True, text=True, env=env)
        return p.returncode, p.stdout + p.stderr

_declarado = w.declared_wiring()
_codigo_sin, _salida_sin = _correr(_declarado)

_con_deriva = _json.loads(_json.dumps(_declarado))
_con_deriva.setdefault("hooks", {}).setdefault("Stop", [])
_con_deriva["hooks"]["Stop"] = [{"hooks": [{"type": "command",
                                            "command": "/bin/true --intruso"}]}]
_codigo_con, _salida_con = _correr(_con_deriva)

print("\n14. main publica la deriva sin tocar su codigo de salida")
check("14.1 sin deriva lo dice, no calla", True, "sin deriva" in _salida_sin)
check("14.2 con deriva nombra el evento", True, "Stop" in _salida_con
      and "/bin/true --intruso" in _salida_con)
check("14.3 el codigo de salida NO cambia por la deriva",
      _codigo_sin, _codigo_con)
check("14.4 y sigue publicando el conteo de rotos", True,
      "roto(s) en la copia viva" in _salida_con)
print(f"\n{OK} ok, {FALLOS} fallos")
raise SystemExit(1 if FALLOS else 0)
