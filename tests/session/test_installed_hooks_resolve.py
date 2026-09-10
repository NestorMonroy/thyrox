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
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from session.user_wiring import declared_wiring  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228).
ROOT = reach.thyrox_root()
INSTALLER = ROOT / "src" / "session" / "instalar-hooks-sesion-multirepo.sh"

#: El consumidor se PASA, no se hereda del default: asi el control mide el
#: parametro y no la coincidencia de que el default apunte al mismo sitio.
CONSUMER = reach.root("docs")

#: Los eventos que el cableado declara. Se afirma el conjunto para que un
#: instalador mudo no pase.
EXPECTED_EVENTS = {"SubagentStart", "PreModelSwitch", "SubagentStop"}

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


#: La topologia CONTRARIA, verbatim como el instalador la componia hasta
#: `thyrox@5862183f`: los seis comandos apuntando a los stubs del consumidor.
#: No es un incumplidor fabricado — es el texto que estuvo vivo en el arbol.
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
}"""


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
        'h = os.path.join(os.environ["CONSUMIDOR"], ".claude", "hooks")\n'
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

    def test_it_emits_the_three_events(self) -> None:
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
        # (b) y (c) NO caen: los seis archivos de la otra topologia existen, asi
        #     que los dos controles viejos dan verde sobre el cableado contrario.
        self.assertEqual(set(contrario.get("hooks", {})), EXPECTED_EVENTS)
        self.assertEqual(missing_files(contrario), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
