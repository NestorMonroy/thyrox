#!/usr/bin/env python3
"""Control de `--home` y de su puerta de shell, `thyrox_config_home`.

Qué haría fallar a este control: que la resolución de una ruta declarada deje
de tomar las tres vías —absoluta tal cual, ``~`` expandida, relativa compuesta
sobre la raíz—, o que la puerta de shell deje de reenviar sus argumentos al
mecanismo.

Ese segundo caso ya ocurrió: ``_thyrox_delegate`` tomaba sólo ``$1`` como modo
y descartaba el resto, así que ``--home`` llegaba sin su clave. Falló ruidoso
por suerte —el modo exige la clave— y un modo con argumentos opcionales habría
respondido otra cosa en silencio. Por eso el caso de shell se ejercita aparte:
medir sólo la mitad Python habría dado verde con la puerta rota.

Y los tres desenlaces se separan a propósito. Colapsar «ausente sin default»
(1) con «rehúso del mecanismo» (2) le quitaría al llamador la única señal que
distingue una ausencia legítima de un fallo — el sub-patrón D, un nivel más
abajo que la propia resolución.
"""
from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path

# Bootstrap canónico (`paths.reach.BOOTSTRAP`): ascenso con detección hasta el
# marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402

KEY = "THYROX_TEST_HOME_KEY"
REACH_PY = _RAIZ / "src" / "paths" / "reach.py"
REACH_SH = _RAIZ / "src" / "lib" / "reach.sh"


def run_python(*args: str, value: str | None = None) -> subprocess.CompletedProcess:
    """Invoca el modo `--home` en un proceso propio, con el entorno controlado."""
    env = dict(os.environ)
    env.pop(KEY, None)
    if value is not None:
        env[KEY] = value
    return subprocess.run([sys.executable, str(REACH_PY), "--home", *args],
                          capture_output=True, text=True, env=env)


def run_shell(*args: str, value: str | None = None) -> subprocess.CompletedProcess:
    """La misma pregunta por la puerta de shell — el canal que ya se rompió."""
    env = dict(os.environ)
    env.pop(KEY, None)
    if value is not None:
        env[KEY] = value
    quoted = " ".join(f'"{arg}"' for arg in args)
    return subprocess.run(
        ["bash", "-c", f'source "{REACH_SH}"; thyrox_config_home {quoted}'],
        capture_output=True, text=True, env=env)


class ResolucionEnTresVias(unittest.TestCase):
    """Las tres formas sintácticas que `resolve_home` distingue."""

    def test_absoluta_se_devuelve_tal_cual(self) -> None:
        salida = run_python(KEY, "sin-usar", value="/srv/corpus")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        self.assertEqual(salida.stdout.strip(), "/srv/corpus")

    def test_tilde_se_expande(self) -> None:
        salida = run_python(KEY, "sin-usar", value="~/corpus")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        obtenido = salida.stdout.strip()
        self.assertTrue(Path(obtenido).is_absolute(), obtenido)
        self.assertNotIn("~", obtenido)
        self.assertTrue(obtenido.endswith("/corpus"), obtenido)

    def test_relativa_se_compone_sobre_la_raiz(self) -> None:
        # Es la vía que importa: como segmento, una sola clave dice lo correcto
        # para varios árboles, mientras que una absoluta les da el hogar de uno.
        salida = run_python(KEY, "sin-usar", value="corpus/bin")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        self.assertEqual(salida.stdout.strip(),
                         str(reach.thyrox_root() / "corpus" / "bin"))

    def test_el_default_tambien_pasa_por_la_resolucion(self) -> None:
        # Un default relativo que se imprimiera crudo le daría al llamador una
        # ruta relativa al cwd, que es una raíz que nadie declaró.
        salida = run_python(KEY, "_references/claude-code-bin")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        self.assertEqual(salida.stdout.strip(),
                         str(reach.thyrox_root() / "_references" / "claude-code-bin"))


class TresDesenlaces(unittest.TestCase):
    """Declarada, ausente-con-default y ausente-sin-default no se colapsan."""

    def test_ausente_sin_default_rehusa_por_1_y_sin_imprimir(self) -> None:
        salida = run_python(KEY)
        self.assertEqual(salida.returncode, 1)
        self.assertEqual(salida.stdout.strip(), "")
        self.assertIn(KEY, salida.stderr)

    def test_sin_clave_rehusa_por_2(self) -> None:
        salida = run_python()
        self.assertEqual(salida.returncode, 2)
        self.assertEqual(salida.stdout.strip(), "")


class PuertaDeShell(unittest.TestCase):
    """El canal que descartaba sus argumentos — se mide aparte a propósito."""

    def test_la_clave_llega_al_mecanismo(self) -> None:
        salida = run_shell(KEY, "sin-usar", value="/srv/corpus")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        self.assertEqual(salida.stdout.strip(), "/srv/corpus")
        # El síntoma exacto del reenvío roto, por si vuelve con otra forma.
        self.assertNotIn("exige una clave", salida.stderr)

    def test_el_default_llega_al_mecanismo(self) -> None:
        salida = run_shell(KEY, "corpus/bin")
        self.assertEqual(salida.returncode, 0, salida.stderr)
        self.assertEqual(salida.stdout.strip(),
                         str(reach.thyrox_root() / "corpus" / "bin"))

    def test_el_codigo_se_propaga_sin_aplanarse(self) -> None:
        # Si el delegado aplanara todo no-cero a 2, este caso daría 2 y no
        # habría forma de separar «no declarada» de «el mecanismo rehusó».
        salida = run_shell(KEY)
        self.assertEqual(salida.returncode, 1, salida.stderr)

    def test_clave_invalida_no_viaja(self) -> None:
        salida = run_shell("no-valida")
        self.assertEqual(salida.returncode, 2)
        self.assertIn("clave invalida", salida.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
