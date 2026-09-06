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

Se corre el instalador de verdad contra una raíz temporal: medir el guion en vez
del texto es lo que separa «el instalador está bien» de «yo creo que está bien».
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INSTALLER = ROOT / "src" / "session" / "instalar-hooks-sesion-multirepo.sh"

#: Los eventos que el cableado declara. Se afirma el conjunto para que un
#: instalador mudo no pase.
EXPECTED_EVENTS = {"SubagentStart", "PreModelSwitch", "SubagentStop"}

#: Intérprete -> en qué posición del comando va la ruta del archivo.
INTERPRETERS = {"python3": 1, "node": 1, "bun": 2}  # `bun run <ruta>`


def emitted_settings(target: Path) -> dict:
    subprocess.run(["bash", str(INSTALLER), str(target)],
                   check=True, capture_output=True, text=True, timeout=60)
    return json.loads((target / ".claude" / "settings.local.json").read_text(encoding="utf-8"))


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
        self.target = Path(tempfile.mkdtemp(prefix="hooks-cableado-"))
        self.addCleanup(shutil.rmtree, self.target, True)
        self.settings = emitted_settings(self.target)

    def test_it_emits_the_three_events(self) -> None:
        """Sin esto, un instalador que no escribiera nada daría verde."""
        self.assertEqual(set(self.settings.get("hooks", {})), EXPECTED_EVENTS)

    def test_every_command_names_a_file_that_exists(self) -> None:
        missing: list[str] = []
        for event, command in commands(self.settings):
            target = named_file(command)
            if target is None:
                missing.append(f"{event}: intérprete no reconocido — {command}")
            elif not target.is_file():
                missing.append(f"{event}: no existe — {target}")
        self.assertEqual(missing, [], "comandos cableados que no resuelven:\n  "
                         + "\n  ".join(missing))


if __name__ == "__main__":
    unittest.main(verbosity=2)
