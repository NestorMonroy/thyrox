#!/usr/bin/env python3
"""El ``.env`` del CONSUMIDOR gana cuando se invoca desde su clon (H-THYROX-178).

Sin ``start``, ``env_value`` ascendía desde la ubicación del módulo —dentro de
thyrox— y leía el ``.env`` del proveedor aunque el comando se invocara desde
otro clon: ``agent_store`` escribía en el store de thyrox y el adaptador de
``ai-course-notes`` tuvo que exportar ``THYROX_ENV_FILE`` para evitarlo.

La capa es ADITIVA: el ``.env`` del consumidor va antes del del proveedor, no
en su lugar. Medido antes de decidirlo: ``kaupamex-docs/.env`` sólo declara
``THYROX_ROOT``, así que sustituir perdería claves como ``THYROX_COMMIT_AUTHOR``.

Qué haría fallar a estos casos:

1. no leer el ``.env`` del consumidor (cae el 1);
2. sustituir en vez de apilar (cae el 2);
3. tratar como consumidor un directorio fuera de un clon (cae el 3);
4. ignorar un ``THYROX_ENV_FILE`` declarado (cae el 4);
5. tratar como consumidor un clon con el marcador del proveedor (cae el 5).
"""

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths import reach  # noqa: E402

KEY = "THYROX_H178_PROBE"
#: Una clave que el ``.env`` real del proveedor declara: el control aditivo.
PROVIDER_KEY = "THYROX_CLONE_PREFIX"


class ConsumerEnvLayer(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name)
        self.clone = base / "ai-course-notes"
        (self.clone / "tools").mkdir(parents=True)
        subprocess.run(["git", "init", "-q", str(self.clone)], check=True)
        (self.clone / ".env").write_text(f"{KEY}=del-consumidor\n")
        self.outside = base / "fuera"
        self.outside.mkdir()
        self._cwd = Path.cwd()
        self._saved = {k: os.environ.pop(k, None) for k in (KEY, PROVIDER_KEY, reach.ENV_FILE_VAR)}
        if not (reach.env_value(PROVIDER_KEY) or "").strip():
            self.skipTest(f"el .env del proveedor no declara {PROVIDER_KEY}")

    def tearDown(self):
        os.chdir(self._cwd)
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self._tmp.cleanup()

    def test_1_from_inside_the_consumer_its_env_is_read(self):
        os.chdir(self.clone / "tools")
        self.assertEqual(reach.env_value(KEY), "del-consumidor")

    def test_2_the_provider_env_still_answers_what_the_consumer_omits(self):
        expected = reach.env_value(PROVIDER_KEY)
        os.chdir(self.clone)
        self.assertEqual(reach.env_value(PROVIDER_KEY), expected)

    def test_3_outside_a_clone_nothing_changes(self):
        os.chdir(self.outside)
        self.assertIsNone(reach.env_value(KEY))

    def test_5_a_clone_with_the_provider_marker_is_not_a_consumer(self):
        # Una copia de thyrox —otro clon con su marcador— es un PROVEEDOR,
        # aunque este módulo viva en otro árbol: decidirlo por la ubicación del
        # módulo hacía que `test_reach.py` leyera el `.env` de thyrox desde una
        # copia de `reach.py`.
        (self.clone / "src" / "paths").mkdir(parents=True)
        (self.clone / "src" / "paths" / "reach.py").write_text("")
        os.chdir(self.clone)
        self.assertIsNone(reach.env_value(KEY))

    def test_4_a_declared_env_file_still_governs(self):
        os.chdir(self.clone)
        os.environ[reach.ENV_FILE_VAR] = os.devnull
        self.assertIsNone(reach.env_value(KEY))


if __name__ == "__main__":
    unittest.main()
