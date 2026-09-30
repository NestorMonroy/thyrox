#!/usr/bin/env python3
"""Prueba de ``session.documentation_preflight`` — el pre-vuelo de documentacion.

Portada de pytest a ``unittest`` (stdlib) el 2026-09-17. Era la UNICA suite de
Python del arbol que dependia de pytest, en un corredor cuya cabecera declara
``== Python (stdlib) ==``: moria en ``import pytest`` con ``ModuleNotFoundError``
antes de ejecutar una sola asercion, asi que su rojo no decia nada sobre el
sujeto — el instrumento ni siquiera llegaba a mirarlo.

Nada de lo que usaba exigia pytest: ``tmp_path`` es ``TemporaryDirectory``,
``monkeypatch.setattr`` es ``mock.patch.object`` y ``pytest.raises(match=)`` es
``assertRaisesRegex``. La traduccion es de mecanismo, no de cobertura: las siete
pruebas y el ayudante ``git_repo`` se conservan tal cual.

Uso:  python3 tests/session/test_documentation_preflight.py
"""

from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'src'))

from session.documentation_preflight import (  # noqa: E402
    PreflightError,
    assert_checkout,
    destination,
    find_candidates,
    validate_finding_id,
)


def git_repo(path: Path) -> None:
    path.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", str(path)], check=True)
    subprocess.run(["git", "-C", str(path), "config", "user.email", "test@example.test"], check=True)
    subprocess.run(["git", "-C", str(path), "config", "user.name", "Test"], check=True)
    (path / "seed").write_text("seed\n")
    subprocess.run(["git", "-C", str(path), "add", "seed"], check=True)
    subprocess.run(["git", "-C", str(path), "commit", "-qm", "seed"], check=True)


class TemporaryTreeTestCase(unittest.TestCase):
    """Da a cada prueba su propio arbol, que es lo que ``tmp_path`` daba.

    Se retira en ``tearDown`` incluso si la prueba falla: un fixture que
    sobrevive al fallo ensucia la ejecucion siguiente y confunde la atribucion.
    """

    def setUp(self) -> None:
        self._tree = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self._tree.name)

    def tearDown(self) -> None:
        self._tree.cleanup()


class TestAssertCheckout(TemporaryTreeTestCase):

    def test_refuses_a_directory_inside_another_checkout(self) -> None:
        git_repo(self.tmp_path / "root")
        mount = self.tmp_path / "root" / "thyrox"
        mount.mkdir()
        with self.assertRaisesRegex(PreflightError, "no es la raíz materializada"):
            assert_checkout(mount, "provider")

    def test_accepts_the_materialized_checkout_and_returns_head(self) -> None:
        root = self.tmp_path / "docs"
        git_repo(root)
        self.assertEqual(
            assert_checkout(root, "docs"),
            subprocess.check_output(
                ["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip(),
        )


class TestDestination(unittest.TestCase):

    def test_routes_each_object_by_what_it_is(self) -> None:
        self.assertTrue(
            destination("lesson", "thyrox", None).endswith("thyrox/lecciones-aprendidas/"))
        self.assertTrue(
            destination("finding", "thyrox", "bootstrap").endswith("bootstrap/hallazgos/"))
        with self.assertRaisesRegex(PreflightError, "requiere --initiative"):
            destination("progress", "docs", None)


class TestFindCandidates(TemporaryTreeTestCase):

    def test_searches_both_governance_areas_by_meaningful_tokens(self) -> None:
        for area in ("thyrox", "docs"):
            root = self.tmp_path / "source" / "gestion" / "pm" / area
            root.mkdir(parents=True)
            (root / f"{area}.rst").write_text("Bootstrap del submódulo y documentación\n")
        found = find_candidates(self.tmp_path, "bootstrap documentación")
        self.assertEqual(
            [str(item.path) for item in found],
            [
                "source/gestion/pm/docs/docs.rst",
                "source/gestion/pm/thyrox/thyrox.rst",
            ],
        )

    def test_does_not_call_a_single_generic_token_an_antecedent(self) -> None:
        root = self.tmp_path / "source" / "gestion" / "pm" / "docs"
        root.mkdir(parents=True)
        (root / "noise.rst").write_text("Este documento no trata el tema.\n")
        self.assertEqual(find_candidates(self.tmp_path, "documento submódulo bootstrap"), [])

    def test_empty_topic_refuses_instead_of_publishing_zero(self) -> None:
        with self.assertRaisesRegex(PreflightError, "términos buscables"):
            find_candidates(self.tmp_path, "a y de")


class TestValidateFindingId(TemporaryTreeTestCase):

    def _provider_with_gate(self) -> Path:
        provider = self.tmp_path / "thyrox"
        gate = provider / "src" / "verify" / "check_ids_entre_ramas.py"
        gate.parent.mkdir(parents=True)
        gate.write_text("# fixture\n")
        return provider

    def test_finding_requires_a_well_formed_available_id(self) -> None:
        provider = self._provider_with_gate()
        calls: list[list[str]] = []

        def run(command, **kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command, 0, "DISPONIBLE\n", "")

        with mock.patch.object(subprocess, "run", run):
            validate_finding_id(self.tmp_path, provider, "docs", "H-DOCS-1266")
            self.assertEqual(calls[0][-3:], ["--disponible", "docs", "1266"])
            with self.assertRaisesRegex(PreflightError, "forma H-DOCS-NNN"):
                validate_finding_id(self.tmp_path, provider, "docs", "H-API-1266")

    def test_finding_refuses_an_id_reported_as_used(self) -> None:
        provider = self._provider_with_gate()
        with mock.patch.object(
            subprocess, "run",
            lambda *a, **k: subprocess.CompletedProcess(a[0], 1, "OCUPADO\n", ""),
        ):
            with self.assertRaisesRegex(PreflightError, "OCUPADO"):
                validate_finding_id(self.tmp_path, provider, "docs", "H-DOCS-1023")


if __name__ == '__main__':
    unittest.main(verbosity=2)
