#!/usr/bin/env python3
"""Control del corredor de gates — la superficie que ccnmt llama `doctor:arch`.

Qué mide, y qué haría fallar a cada caso (sub-patrón D):

- Un gate REGISTRADO que no está en disco no es un aprobado. Si el corredor lo
  omitiera o lo contara como pass, el caso `missing` lo detecta.
- El veredicto bloquea con `missing`, no sólo con `fail`. La referencia lo fija
  así: `anyFailure = results.some(r => r.status !== 'pass')`.
- El denominador va siempre. Un conteo sin él no discrimina un corredor ciego
  de uno correcto.
- El árbol medido es un PARÁMETRO. thyrox es proveedor: sus gates miden el
  corpus del consumidor, que no está aquí. ccnmt no tiene este problema —es un
  repo— así que esta parte no se copia, se construye.
"""
import json
import os
import pathlib
import subprocess
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
sys.path.insert(0, str(THYROX / 'src'))

from gates import doctor  # noqa: E402


class RunnerTest(unittest.TestCase):
    """El corredor, ejercitado con un registro sintético."""

    def setUp(self):
        import tempfile
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.consumer = self.tmp / 'consumer'
        (self.consumer / 'source').mkdir(parents=True)
        self.gates = self.tmp / 'gates'
        self.gates.mkdir()

    def _gate(self, name, code):
        path = self.gates / name
        path.write_text(f'#!/usr/bin/env bash\nexit {code}\n')
        path.chmod(0o755)
        return path

    def test_passing_gate_is_reported_as_pass(self):
        self._gate('check-a.sh', 0)
        checks = [doctor.Check('a', 'Prosa', 'rst', 'check-a.sh', 'regla-a')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertEqual([r.status for r in results], ['pass'])

    def test_failing_gate_is_reported_as_fail(self):
        self._gate('check-b.sh', 1)
        checks = [doctor.Check('b', 'Prosa', 'rst', 'check-b.sh', 'regla-b')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertEqual([r.status for r in results], ['fail'])

    def test_registered_gate_absent_from_disk_is_missing_not_pass(self):
        """El caso que la referencia resuelve con un tercer estado."""
        checks = [doctor.Check('c', 'Prosa', 'rst', 'check-ausente.sh', 'regla-c')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertEqual([r.status for r in results], ['missing'])

    def test_missing_blocks_the_verdict(self):
        """`missing` NO es un aprobado: sin esto, un gate borrado pasa en verde."""
        checks = [doctor.Check('c', 'Prosa', 'rst', 'check-ausente.sh', 'regla-c')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertFalse(doctor.verdict(results).ok)

    def test_a_gate_that_refuses_with_2_is_not_measured(self):
        """Exit 2 = «no emití veredicto». Ni pass ni fail: sin medir."""
        self._gate('check-d.sh', 2)
        checks = [doctor.Check('d', 'Prosa', 'rst', 'check-d.sh', 'regla-d')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertEqual([r.status for r in results], ['unmeasured'])

    def test_verdict_publishes_every_bucket(self):
        """El denominador. Un conteo sin el reparto no es un resultado."""
        self._gate('check-a.sh', 0)
        self._gate('check-b.sh', 1)
        self._gate('check-d.sh', 2)
        checks = [
            doctor.Check('a', 'Prosa', 'rst', 'check-a.sh', 'r'),
            doctor.Check('b', 'Prosa', 'rst', 'check-b.sh', 'r'),
            doctor.Check('d', 'Prosa', 'rst', 'check-d.sh', 'r'),
            doctor.Check('c', 'Prosa', 'rst', 'check-ausente.sh', 'r'),
        ]
        v = doctor.verdict(doctor.run(checks, gates_dir=self.gates, consumer=self.consumer))
        self.assertEqual((v.passed, v.failed, v.missing, v.unmeasured), (1, 1, 1, 1))
        self.assertEqual(v.total, 4)

    def test_the_consumer_is_passed_to_the_gate_as_its_cwd(self):
        """thyrox es proveedor: el arbol medido es un parametro, no su propio cwd."""
        probe = self.gates / 'check-cwd.sh'
        probe.write_text('#!/usr/bin/env bash\npwd\nexit 0\n')
        probe.chmod(0o755)
        checks = [doctor.Check('cwd', 'Prosa', 'rst', 'check-cwd.sh', 'r')]
        results = doctor.run(checks, gates_dir=self.gates, consumer=self.consumer)
        self.assertEqual(results[0].stdout.strip(), str(self.consumer))


class SelectionTest(unittest.TestCase):
    """`--only` y `--list`, la superficie de seleccion de la referencia."""

    def test_only_filters_by_substring_of_the_id(self):
        checks = [
            doctor.Check('rst-sintaxis', 'Prosa', 'rst', 'a.sh', 'r'),
            doctor.Check('vocabulario', 'Prosa', 'lex', 'b.sh', 'r'),
        ]
        self.assertEqual([c.id for c in doctor.select(checks, 'rst')], ['rst-sintaxis'])

    def test_only_with_no_match_refuses(self):
        """Un filtro que no selecciona nada NO aprueba en vacio."""
        checks = [doctor.Check('a', 'Prosa', 'rst', 'a.sh', 'r')]
        with self.assertRaises(doctor.NothingSelected):
            doctor.select(checks, 'no-existe')


class RegistryTest(unittest.TestCase):
    """El registro declarativo: datos, no 1126 lineas de bloques a mano."""

    def test_every_registered_id_is_unique(self):
        from gates import registry
        ids = [c.id for c in registry.CHECKS]
        self.assertEqual(len(ids), len(set(ids)), 'hay ids repetidos en el registro')

    def test_the_registry_is_not_empty(self):
        from gates import registry
        self.assertGreater(len(registry.CHECKS), 0)

    def test_every_registered_check_declares_its_rule(self):
        """Sin la regla que lo documenta, un fallo no dice contra que mide."""
        from gates import registry
        for c in registry.CHECKS:
            self.assertTrue(c.doc, f'{c.id} no declara su regla')


class CoverageTest(unittest.TestCase):
    """El quinto instrumento: el unico que puede fallar por AUSENCIA.

    La referencia lo satisface exactamente —84 entradas, 84 verificadores en
    disco— y esa coincidencia es lo que hace del registro una fuente y no una
    lista parcial. Un gate en disco que nadie registra no se corre nunca; uno
    registrado que no esta en disco lo detecta el corredor, no esto.
    """

    def _on_disk(self):
        import re
        return {p.name for p in (THYROX / 'src' / 'gates').iterdir()
                if re.match(r'^check[-_].*\.(sh|py)$', p.name)}

    def test_every_gate_on_disk_is_registered(self):
        from gates import registry
        registered = {c.script for c in registry.CHECKS}
        missing = sorted(self._on_disk() - registered)
        self.assertEqual(missing, [], f'{len(missing)} gate(s) en disco sin registrar')

    def test_every_registered_gate_is_on_disk(self):
        from gates import registry
        registered = {c.script for c in registry.CHECKS}
        phantom = sorted(registered - self._on_disk())
        self.assertEqual(phantom, [], f'{len(phantom)} registrado(s) que no existen')


class CliTest(unittest.TestCase):
    """La invocacion real, que es como lo consume un hook."""

    def _run(self, *args, env=None):
        e = dict(os.environ)
        e.update(env or {})
        return subprocess.run(
            [sys.executable, str(THYROX / 'src' / 'gates' / 'doctor.py'), *args],
            capture_output=True, text=True, env=e,
        )

    def test_list_prints_the_registry_and_exits_0(self):
        r = self._run('--list')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('rst', r.stdout)

    def test_json_is_machine_readable(self):
        r = self._run('--list', '--json')
        json.loads(r.stdout)

    def test_only_without_match_exits_2(self):
        r = self._run('--list', '--only', 'no-existe-este-gate')
        self.assertEqual(r.returncode, 2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
