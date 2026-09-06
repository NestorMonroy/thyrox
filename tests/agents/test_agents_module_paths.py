"""Control de que cada módulo de ``src/agents/`` RESUELVE sus rutas tras la mudanza.

Qué haría fallar este control, declarado antes de escribirlo:

1. Que un módulo componga una ruta con aritmética (``parents[N]``) calibrada
   para el árbol de ORIGEN. Es el defecto que el docstring de ``reach.py``
   declara: falla **en silencio** al mover el archivo un nivel, y la mudanza a
   thyrox movió estos archivos tres niveles.
2. Que un módulo importe a un hermano por un ``sys.path`` compuesto a mano.
3. Que la ruta rota sea una CONSTANTE y no un import: no lanza, se queda ahí, y
   su ``glob`` devuelve cero. Por eso hay dos aserciones y no una.

Por qué el import y no ``--help``: la primera sonda invocó cada módulo con
``--help`` y marcó en rojo ``extract_agent_output.py``, que toma una ruta
posicional y leyó ``--help`` como nombre de archivo. Ese rojo medía el
argumento, no la ruta — el sub-patrón D aplicado al propio instrumento.

Se importa en un subproceso: un import a nivel de módulo ejecuta código, y el
efecto de un módulo no debe contaminar el veredicto del siguiente.
"""
from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AGENTS = ROOT / "src" / "agents"

#: Fallos de import que SÍ son este defecto. Un ``ImportError`` por una
#: dependencia externa ausente no lo es, y se distingue por el nombre.
SIGNALS = ("ModuleNotFoundError", "FileNotFoundError", "IndexError")

#: Módulos cuyo guard de deprecación aborta el import a propósito.
DEPRECATED = ("backfill_agent_sessions.py",)


def modules() -> list[Path]:
    return sorted(p for p in AGENTS.glob("*.py") if p.name != "__init__.py")


def import_probe(module: Path) -> tuple[int, str]:
    script = (
        "import importlib.util;"
        f"spec = importlib.util.spec_from_file_location('probe', {str(module)!r});"
        "mod = importlib.util.module_from_spec(spec);"
        "spec.loader.exec_module(mod)"
    )
    r = subprocess.run([sys.executable, "-c", script],
                       capture_output=True, text=True, timeout=60)
    return r.returncode, r.stderr


def dangling_paths(module: Path) -> tuple[int, str]:
    """Constantes ``Path`` de nivel de módulo que apuntan a lo que no existe.

    El control de import es ciego a esto. Medido: ``anonymize_transcript.HOOK``
    apuntaba a ``thyrox/hooks/`` —inexistente— con el import en verde, y
    ``fix_agent_frontmatter.AGENTS_DIR`` era ``.claude/agents`` RELATIVO, cuyo
    ``glob`` dependía del cwd. Los dos son el silencio del sub-patrón D.

    La sonda NO usa un literal de salto de línea: dentro de ``python3 -c`` un
    ``\\n`` es un salto REAL que parte el statement. Ése fue el defecto de su
    primera versión — SyntaxError, exit 1, stdout vacío — y el veredicto lo
    leía como «no hay constantes colgantes»: un verde que no discriminaba,
    dentro del control escrito para que discrimine.
    """
    script = (
        "import importlib.util;"
        "from pathlib import Path;"
        f"spec = importlib.util.spec_from_file_location('probe', {str(module)!r});"
        "mod = importlib.util.module_from_spec(spec);"
        "spec.loader.exec_module(mod);"
        "faltan = [(k, str(v)) for k, v in vars(mod).items()"
        " if isinstance(v, Path) and not k.startswith('_') and not v.exists()];"
        "[print(f'{k} = {v}') for k, v in faltan]"
    )
    r = subprocess.run([sys.executable, "-c", script],
                       capture_output=True, text=True, timeout=60)
    return r.returncode, r.stdout


class AgentsModulePaths(unittest.TestCase):
    def test_the_census_is_not_empty(self) -> None:
        """Sin esto un directorio vacío daría verde: no discriminaría."""
        self.assertGreaterEqual(len(modules()), 10)

    def test_every_agents_module_resolves_its_paths(self) -> None:
        broken: list[str] = []
        for module in modules():
            code, err = import_probe(module)
            if code != 0 and any(s in err for s in SIGNALS):
                last = [l for l in err.strip().splitlines() if l.strip()][-1]
                broken.append(f"{module.name}: {last.strip()}")
        self.assertEqual(broken, [], "módulos con ruta sin resolver:\n  "
                         + "\n  ".join(broken))

    def test_no_module_constant_points_at_nothing(self) -> None:
        dangling: list[str] = []
        for module in modules():
            if module.name in DEPRECATED:
                continue
            code, out = dangling_paths(module)
            if code != 0:
                # La sonda que no corre NO es un verde: sin esta rama, un
                # SyntaxError de la propia sonda se lee como ausencia.
                dangling.append(f"{module.name}: la sonda no corrió (exit {code})")
                continue
            for line in out.strip().splitlines():
                if line.strip():
                    dangling.append(f"{module.name}: {line.strip()}")
        self.assertEqual(dangling, [], "constantes Path que no resuelven:\n  "
                         + "\n  ".join(dangling))


if __name__ == "__main__":
    unittest.main(verbosity=2)
