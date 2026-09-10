#!/usr/bin/env python3
"""Suite de `merge_stores` — la union entre dos stores y su registro de resolvedores.

CONTROL DE ANULACION, medido y anotado en cada caso: se declara que haria
fallar a cada uno. Un control que no puede fallar no discrimina «fusiona bien»
de «el instrumento no mira» — el sub-patron D de
`metrica-decide-la-conclusion.md`.
"""

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents.merge_stores import (  # noqa: E402
    MergeRefused,
    citation_is_stable,
    merge,
    newest_wins,
    register_resolver,
    resolver_for,
)

ESQUEMA = """
CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, model TEXT, updated_at TEXT);
CREATE TABLE tasks (task_id TEXT, session_id TEXT, citation_id TEXT, subject TEXT,
                    updated_at TEXT, PRIMARY KEY (task_id, session_id));
"""


def _store(ruta: Path, filas_sesion=(), filas_tarea=()):
    c = sqlite3.connect(ruta)
    c.executescript(ESQUEMA)
    c.executemany("INSERT INTO agent_sessions VALUES (?,?,?)", filas_sesion)
    c.executemany("INSERT INTO tasks VALUES (?,?,?,?,?)", filas_tarea)
    c.commit()
    c.close()
    return ruta


class TestUnion(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.raiz = Path(self.dir.name)

    def tearDown(self):
        self.dir.cleanup()

    def _filas(self, ruta, tabla="agent_sessions"):
        c = sqlite3.connect(ruta)
        try:
            return {r[0]: r for r in c.execute('SELECT * FROM "%s"' % tabla)}
        finally:
            c.close()

    def test_1_la_fila_que_solo_esta_en_el_origen_se_inserta(self):
        """Falla si la union no trae lo ausente — el defecto que motiva el guion."""
        o = _store(self.raiz / "o.db", [("a", "m1", "T1"), ("solo-origen", "m2", "T1")])
        d = _store(self.raiz / "d.db", [("a", "m1", "T1")])
        merge(o, d)
        self.assertIn("solo-origen", self._filas(d))

    def test_2_la_fila_que_solo_esta_en_el_destino_SOBREVIVE(self):
        """Falla si la fusion se implementa como copia. Es el riesgo real: 3 filas
        vivian solo en el destino, y una copia las habria borrado."""
        o = _store(self.raiz / "o.db", [("a", "m1", "T1")])
        d = _store(self.raiz / "d.db", [("a", "m1", "T1"), ("solo-destino", "m9", "T1")])
        merge(o, d)
        self.assertIn("solo-destino", self._filas(d))

    def test_3_gana_el_updated_at_mayor(self):
        """Falla si el defecto no compara fechas."""
        o = _store(self.raiz / "o.db", [("a", "nuevo", "2026-09-07T10:00:00")])
        d = _store(self.raiz / "d.db", [("a", "viejo", "2026-09-06T10:00:00")])
        merge(o, d)
        self.assertEqual(self._filas(d)["a"][1], "nuevo")

    def test_4_ante_empate_NO_se_toca_el_destino(self):
        """Falla si el origen gana por defecto. Sin criterio, no cambiar es la
        unica accion reversible."""
        o = _store(self.raiz / "o.db", [("a", "origen", "2026-09-06T10:00:00")])
        d = _store(self.raiz / "d.db", [("a", "destino", "2026-09-06T10:00:00")])
        merge(o, d)
        self.assertEqual(self._filas(d)["a"][1], "destino")

    def test_5_dry_run_no_escribe(self):
        """Falla si --dry-run escribe. Es lo que permite medir antes de aplicar."""
        o = _store(self.raiz / "o.db", [("nueva", "m", "T1")])
        d = _store(self.raiz / "d.db", [])
        merge(o, d, dry_run=True)
        self.assertEqual(len(self._filas(d)), 0)

    def test_6_el_registro_devuelve_el_resolvedor_declarado(self):
        """Falla si el motor ignora el registro y usa siempre el defecto."""
        self.assertIs(resolver_for("tasks"), citation_is_stable)
        self.assertIs(resolver_for("tabla_sin_registro"), newest_wins)

    def test_7_un_resolvedor_registrado_a_mano_gobierna_su_tabla(self):
        """Falla si registrar no tiene efecto — el punto entero del registro."""
        register_resolver("agent_sessions", lambda pk, d, o: d)   # el destino siempre
        try:
            o = _store(self.raiz / "o.db", [("a", "nuevo", "2026-09-09T00:00:00")])
            d = _store(self.raiz / "d.db", [("a", "viejo", "2026-01-01T00:00:00")])
            merge(o, d)
            self.assertEqual(self._filas(d)["a"][1], "viejo")
        finally:
            from agents import merge_stores
            merge_stores._RESOLVERS.pop("agent_sessions", None)

    def test_8_citation_is_stable_rehusa_si_la_cita_cambia_de_sujeto(self):
        """CONTROL POSITIVO, con la forma del defecto real de H-DOCS-1236: una
        cita que pasa a nombrar otro trabajo. Falla si el resolvedor deja pasar."""
        with self.assertRaises(MergeRefused) as ctx:
            citation_is_stable(
                ("253", "s1"),
                {"citation_id": "TASK-DOCS-0253", "subject": "Portar el registro de hooks",
                 "updated_at": "T1"},
                {"citation_id": "TASK-DOCS-0253", "subject": "Obtener los Lineamientos",
                 "updated_at": "T9"},
            )
        self.assertIn("nombraria otro sujeto", str(ctx.exception))

    def test_9_citation_is_stable_deja_pasar_lo_que_no_desliza(self):
        """Falla si el resolvedor rehusa TODO — un guard que siempre rehusa no
        protege nada, bloquea. Es el par que hace discriminar al caso 8."""
        gana = citation_is_stable(
            ("253", "s1"),
            {"citation_id": "TASK-DOCS-0253", "subject": "mismo", "updated_at": "T1"},
            {"citation_id": "TASK-DOCS-0253", "subject": "mismo", "updated_at": "T9"},
        )
        self.assertEqual(gana["updated_at"], "T9")


if __name__ == "__main__":
    unittest.main(verbosity=2)
