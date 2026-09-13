from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from session.documentation_preflight import (
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


def test_refuses_a_directory_inside_another_checkout(tmp_path: Path) -> None:
    git_repo(tmp_path / "root")
    mount = tmp_path / "root" / "thyrox"
    mount.mkdir()
    with pytest.raises(PreflightError, match="no es la raíz materializada"):
        assert_checkout(mount, "provider")


def test_accepts_the_materialized_checkout_and_returns_head(tmp_path: Path) -> None:
    root = tmp_path / "docs"
    git_repo(root)
    assert assert_checkout(root, "docs") == subprocess.check_output(
        ["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()


def test_routes_each_object_by_what_it_is() -> None:
    assert destination("lesson", "thyrox", None).endswith("thyrox/lecciones-aprendidas/")
    assert destination("finding", "thyrox", "bootstrap").endswith("bootstrap/hallazgos/")
    with pytest.raises(PreflightError, match="requiere --initiative"):
        destination("progress", "docs", None)


def test_searches_both_governance_areas_by_meaningful_tokens(tmp_path: Path) -> None:
    for area in ("thyrox", "docs"):
        root = tmp_path / "source" / "gestion" / "pm" / area
        root.mkdir(parents=True)
        (root / f"{area}.rst").write_text("Bootstrap del submódulo y documentación\n")
    found = find_candidates(tmp_path, "bootstrap documentación")
    assert [str(item.path) for item in found] == [
        "source/gestion/pm/docs/docs.rst",
        "source/gestion/pm/thyrox/thyrox.rst",
    ]


def test_does_not_call_a_single_generic_token_an_antecedent(tmp_path: Path) -> None:
    root = tmp_path / "source" / "gestion" / "pm" / "docs"
    root.mkdir(parents=True)
    (root / "noise.rst").write_text("Este documento no trata el tema.\n")
    assert find_candidates(tmp_path, "documento submódulo bootstrap") == []


def test_empty_topic_refuses_instead_of_publishing_zero(tmp_path: Path) -> None:
    with pytest.raises(PreflightError, match="términos buscables"):
        find_candidates(tmp_path, "a y de")


def test_finding_requires_a_well_formed_available_id(tmp_path: Path, monkeypatch) -> None:
    provider = tmp_path / "thyrox"
    gate = provider / "src" / "verify" / "check_ids_entre_ramas.py"
    gate.parent.mkdir(parents=True)
    gate.write_text("# fixture\n")
    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return subprocess.CompletedProcess(command, 0, "DISPONIBLE\n", "")

    monkeypatch.setattr(subprocess, "run", run)
    validate_finding_id(tmp_path, provider, "docs", "H-DOCS-1266")
    assert calls[0][-3:] == ["--disponible", "docs", "1266"]
    with pytest.raises(PreflightError, match="forma H-DOCS-NNN"):
        validate_finding_id(tmp_path, provider, "docs", "H-API-1266")


def test_finding_refuses_an_id_reported_as_used(tmp_path: Path, monkeypatch) -> None:
    provider = tmp_path / "thyrox"
    gate = provider / "src" / "verify" / "check_ids_entre_ramas.py"
    gate.parent.mkdir(parents=True)
    gate.write_text("# fixture\n")
    monkeypatch.setattr(subprocess, "run", lambda *a, **k:
                        subprocess.CompletedProcess(a[0], 1, "OCUPADO\n", ""))
    with pytest.raises(PreflightError, match="OCUPADO"):
        validate_finding_id(tmp_path, provider, "docs", "H-DOCS-1023")
