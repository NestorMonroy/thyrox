"""Control de que el cableado que el instalador EMITE apunta a archivos que existen.

`instalar-hooks-sesion-multirepo.sh` escribe seis comandos en el
`settings.local.json` que el cliente sí carga. Un comando que nombra un archivo
inexistente **no deja rastro**: el hook falla a nivel de harness, antes de que
nuestro `hook_error_log` pueda registrarlo. Es la clase (b) de fallo, y es la
cara del sub-patrón D en el cableado: nadie lo nota hasta que alguien busca el
dato que el hook debía escribir y lo encuentra vacío.

Qué haría fallar este control, declarado antes de escribirlo:

1. Que el instalador nombre un guion que no está en el árbol — el caso medido:
   tras la mudanza a thyrox, el instalador ya apuntaba a `src/hooks/` y los tres
   guiones de agente seguían en el consumidor.
2. Que el intérprete del comando no sea el que el archivo necesita.
3. Que el instalador deje de emitir algún evento: por eso se afirma el conjunto
   de eventos, no sólo que lo emitido resuelva. Sin esa mitad, un instalador
   que no escribiera nada daría verde.
4. Que el instalador emita una TOPOLOGÍA distinta de la que el proveedor
   declara. Los dos controles anteriores son ciegos a eso, y no por descuido:
   miden la EXISTENCIA de lo nombrado, y las dos topologías nombran archivos
   que existen. El caso medido: el instalador siguió apuntando a los stubs de
   `<consumidor>/.claude/hooks/` un día después de que `declared_wiring()`
   reapuntara al productor, y el verde no se movió. Es el sub-patrón D de
   `metrica-decide-la-conclusion.md` dentro del propio control.

Se corre el instalador de verdad contra una raíz temporal: medir el guion en vez
del texto es lo que separa «el instalador está bien» de «yo creo que está bien».
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from paths import reach
from session.user_wiring import declared_wiring

#: Ya no hay NINGUNA aritmetica de ruta: la raiz la declara `tests/run.sh` con
#: `export PYTHONPATH="$PWD/src"`, la misma forma que `bin/` ya ejercia. El
#: `sys.path.insert(0, ... parents[2] / "src")` que vivia aqui era el bootstrap
#: que `check_path_arithmetic.py` exime — una exencion que solo se sostenia
#: mientras nadie declarara la raiz. Todo lo demas sale del localizador
#: declarado (TASK-DOCS-0504).
ROOT = reach.thyrox_root()
INSTALLER = ROOT / "src" / "session" / "instalar-hooks-sesion-multirepo.sh"

#: El consumidor se PASA, no se hereda del default: asi el control mide el
#: parametro y no la coincidencia de que el default apunte al mismo sitio.
CONSUMER = reach.root("docs")

#: Los eventos que el cableado declara. Se afirma el conjunto para que un
#: instalador mudo no pase: si `declared_wiring` enmudeciera, la comparacion
#: estructural de abajo seguiria verde comparando dos vacios.
#:
#: NO se deriva de `declared_wiring()` a proposito — derivarlo la volveria
#: tautologia, que es el sub-patron D con este caso como sujeto. El precio es
#: que la cifra caduca cuando el productor crece, y ya caduco una vez:
#: `thyrox@6531f327` añadio el ciclo de vida de la tarjeta a las 23:53 y este
#: conjunto quedo en los tres de las 12:54 del mismo dia.
#: Caducó otra vez con `PreToolUse` (los detectores de `pretooluse_dispatch`,
#: 2026-09-24) y `SessionStart` (el contexto tras compactar, `965a9eed`): la
#: suite quedó roja dos días sin que nadie la corriera.
EXPECTED_EVENTS = {"SubagentStart", "PreModelSwitch", "SubagentStop",
                   "TaskCreated", "TaskCompleted", "PreToolUse", "SessionStart"}

#: Intérprete -> en qué posición del comando va la ruta del archivo.
INTERPRETERS = {"python3": 1, "node": 1, "bun": 2}  # `bun run <ruta>`


def emitted_settings(target: Path, installer: Path | None = None) -> dict:
    subprocess.run(["bash", str(installer or INSTALLER), str(target),
                    "--consumidor", str(CONSUMER)],
                   check=True, capture_output=True, text=True, timeout=60)
    return json.loads((target / ".claude" / "settings.local.json").read_text(encoding="utf-8"))


def missing_files(settings: dict) -> list[str]:
    out: list[str] = []
    for event, command in commands(settings):
        target = named_file(command)
        if target is None:
            out.append(f"{event}: interprete no reconocido — {command}")
        elif not target.is_file():
            out.append(f"{event}: no existe — {target}")
    return out


#: La topologia CONTRARIA: los ocho comandos apuntando a los stubs del
#: consumidor. El reparto se declara porque las dos mitades NO tienen la misma
#: procedencia, y colapsarlas seria presentar como verbatim lo que en parte no
#: lo es:
#:
#: - los SEIS primeros son verbatim como el instalador los componia hasta
#:   `thyrox@5862183f`. No es un incumplidor fabricado — es el texto que estuvo
#:   vivo en el arbol, y ese TEXTO es lo que el control no toca.
#: - los DOS del ciclo de vida de la tarjeta (`TaskCreated`/`TaskCompleted`),
#:   y del mismo modo `PreToolUse` y `SessionStart` (con el prefijo
#:   `PYTHONPATH=` de su forma real), nunca vivieron asi: el productor los
#:   añadio en `thyrox@6531f327`, ya
#:   apuntando al proveedor. Aqui se compone su forma contraria con el MISMO
#:   patron de stub que los seis, para que la mutacion siga siendo de UN SOLO
#:   eje —la topologia— y no mezcle «apunta al consumidor» con «le faltan dos
#:   eventos», que son dos causas distintas de un mismo rojo.
#:
#: Lo que si se materializa es el DESTINO: `h` apunta a un directorio que el
#: propio control crea y puebla, no al `.claude/hooks/` del consumidor. La
#: version anterior HEREDABA del arbol su premisa —«los seis archivos
#: existen»— y se pudrio con el: `medir_delta_subagente.py` se renombro a
#: `measure_subagent_delta.py` por `identificadores-en-ingles.md`, y el
#: control empezo a fallar por un nombre, no por una topologia. La existencia
#: del archivo SIEMPRE fue incidental a lo que aqui se mide —que
#: `missing_files` es ciego a la topologia—; establecerla aisla ese eje en vez
#: de fabricar el caso.
TOPOLOGIA_CONTRARIA = """datos["hooks"] = {
    "SubagentStart": [{"hooks": [
        {"type": "command", "command": f"python3 {h}/medir_delta_subagente.py --start"},
        {"type": "command", "command": f"python3 {h}/register_agent_session.py --start"},
    ]}],
    "PreModelSwitch": [{"hooks": [
        {"type": "command", "command": f"bun run {os.environ['THYROX_DIR']}/packages/agent/bin/preModelSwitch.ts", "timeout": 10},
    ]}],
    "SubagentStop": [{"hooks": [
        {"type": "command", "command": f"node {h}/save-agent-result.mjs"},
        {"type": "command", "command": f"python3 {h}/medir_delta_subagente.py --stop"},
        {"type": "command", "command": f"python3 {h}/register_agent_session.py --stop"},
    ]}],
    "TaskCreated": [{"hooks": [
        {"type": "command", "command": f"python3 {h}/task_lifecycle.py"},
    ]}],
    "TaskCompleted": [{"hooks": [
        {"type": "command", "command": f"python3 {h}/task_lifecycle.py"},
    ]}],
    "PreToolUse": [{"matcher": "Bash|Agent|Write|Edit|MultiEdit|Read", "hooks": [
        {"type": "command", "command": f"PYTHONPATH={h} python3 {h}/pretooluse_dispatch.py"},
    ]}],
    "SessionStart": [{"matcher": "compact", "hooks": [
        {"type": "command", "command": f"PYTHONPATH={h} python3 {h}/compact_context.py"},
    ]}],
}"""


#: Los cuatro nombres que `TOPOLOGIA_CONTRARIA` compone bajo `h`. El unico
#: comando de esa topologia que NO los usa (`preModelSwitch.ts`) va por
#: `THYROX_DIR` y existe en el arbol del proveedor: no necesita stub.
CONTRARY_TARGETS = ("medir_delta_subagente.py", "register_agent_session.py",
                    "save-agent-result.mjs", "task_lifecycle.py",
                    "pretooluse_dispatch.py", "compact_context.py")


def stub_home(home: Path) -> Path:
    """El hogar de los stubs de la topologia contraria, creado y poblado.

    `named_file` solo comprueba `.is_file()`, asi que un archivo vacio basta:
    lo que el control mide es que `missing_files` no distinga una topologia de
    la otra, no que estos tres guiones hagan nada.
    """
    destino = home / "stubs-topologia-contraria"
    destino.mkdir(parents=True, exist_ok=True)
    for name in CONTRARY_TARGETS:
        (destino / name).touch()
    return destino


def installer_with_contrary_topology(home: Path) -> Path:
    """Copia del instalador que compone los seis comandos por su cuenta."""
    texto = INSTALLER.read_text(encoding="utf-8")
    # La copia vive fuera de `src/session/`, asi que su auto-localizacion
    # apuntaria a otro sitio. Se fija: reubicar un guion cambia donde cree estar,
    # y eso NO es el fenomeno que este control mide.
    texto = texto.replace(
        'THYROX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"',
        f'THYROX_DIR="{ROOT / "src"}"')
    texto = texto.replace(
        "cableado = declared_wiring(\n"
        '    root=os.path.dirname(os.environ["THYROX_DIR"]),\n'
        '    consumer=os.environ["CONSUMIDOR"],\n'
        "    advisor=advisor or None,\n"
        ")\n"
        'datos["hooks"] = cableado["hooks"]',
        'cableado = declared_wiring(\n'
        '    root=os.path.dirname(os.environ["THYROX_DIR"]),\n'
        '    consumer=os.environ["CONSUMIDOR"],\n'
        "    advisor=advisor or None,\n"
        ")\n"
        f'h = {str(stub_home(home))!r}\n'
        + TOPOLOGIA_CONTRARIA)
    destino = home / "instalador-topologia-contraria.sh"
    destino.write_text(texto, encoding="utf-8")
    return destino


def commands(settings: dict) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for event, groups in settings.get("hooks", {}).items():
        for group in groups:
            for hook in group.get("hooks", []):
                out.append((event, hook["command"]))
    return out


def named_file(command: str) -> Path | None:
    parts = command.split()
    # Las asignaciones de entorno que preceden al intérprete no son el
    # programa: `PYTHONPATH=<src> python3 <ruta>` es la forma del hook de
    # `SessionStart`, y sin saltarlas el intérprete se leía como no reconocido.
    while parts and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=\S*", parts[0]):
        parts = parts[1:]
    if not parts:
        return None
    index = INTERPRETERS.get(Path(parts[0]).name)
    if index is None or len(parts) <= index:
        return None
    return Path(parts[index])


class InstalledHooksResolve(unittest.TestCase):
    def setUp(self) -> None:
        self.target = Path(tempfile.mkdtemp(dir=reach.scratch_root(),
                                           prefix="hooks-cableado-"))
        self.addCleanup(shutil.rmtree, self.target, True)
        self.settings = emitted_settings(self.target)

    def test_it_emits_the_declared_event_set(self) -> None:
        """Sin esto, un instalador que no escribiera nada daría verde."""
        self.assertEqual(set(self.settings.get("hooks", {})), EXPECTED_EVENTS)

    def test_every_command_names_a_file_that_exists(self) -> None:
        missing = missing_files(self.settings)
        self.assertEqual(missing, [], "comandos cableados que no resuelven:\n  "
                         + "\n  ".join(missing))

    def test_it_emits_exactly_what_the_producer_declares(self) -> None:
        """La FUENTE del cableado es una sola: `declared_wiring()`.

        Con dos escritores componiendo sus propios literales, uno se queda atras
        sin que nada lo delate — que es lo que paso durante un dia entre el
        reapunte al productor y este control.
        """
        self.assertEqual(
            self.settings.get("hooks"),
            declared_wiring(root=ROOT, consumer=CONSUMER)["hooks"])

    def test_the_two_older_assertions_cannot_see_the_topology(self) -> None:
        """CONTROL ANULADO: con la topologia contraria, cae UNA y solo una.

        Se sustituye la emision por los literales que el instalador tenia, y
        tienen que caer exactamente las aserciones que dependen de la fuente
        unica. Si las tres siguieran verdes, el caso de arriba no estaria
        midiendo la topologia; si cayeran las tres, no haria falta.
        """
        destino = Path(tempfile.mkdtemp(dir=reach.scratch_root(),
                                        prefix="hooks-contrario-"))
        self.addCleanup(shutil.rmtree, destino, True)
        contrario = emitted_settings(
            destino, installer_with_contrary_topology(destino))

        # (a) La comparacion estructural SI cae — es la que discrimina.
        self.assertNotEqual(
            contrario.get("hooks"),
            declared_wiring(root=ROOT, consumer=CONSUMER)["hooks"])
        # (b) y (c) NO caen: los seis destinos de la otra topologia existen
        #     —los tres de `h` los crea `stub_home`, y `preModelSwitch.ts` esta
        #     en el arbol— asi que los dos controles viejos dan verde sobre el
        #     cableado contrario. Esa premisa la ESTABLECE el control; heredarla
        #     del arbol es lo que la pudrio (ver el comentario de la topologia).
        self.assertEqual(set(contrario.get("hooks", {})), EXPECTED_EVENTS)
        self.assertEqual(missing_files(contrario), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
