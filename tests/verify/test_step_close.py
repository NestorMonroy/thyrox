#!/usr/bin/env python3
"""El cierre de un paso del lazo, sin manos: informe, commit por pathspec
de lo que el paso conservó más su banco, sus jobs y la memoria de la
corrida, el trinquete bajado cuando el gate lo pide, y push.

Antes se hacía a mano y cada eslabón tropezó una vez en el paso 159:
`step_report` con el argumento equivocado, la lista de archivos escrita a
mano, el trinquete en un segundo commit, y el push a una rama que no era
la actual.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import step_close

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


# La configuración global hostil del contenedor: firma sin firmante.
_HOSTILE = Path(tempfile.mkdtemp()) / "gitconfig"
_HOSTILE.write_text("[commit]\n\tgpgsign = true\n[gpg]\n\tprogram = /nonexistent/signer\n")
os.environ["GIT_CONFIG_GLOBAL"] = str(_HOSTILE)

# La línea que imprime el gate real (`src/verify/check-cli-typecheck.sh`).
HOOK = """#!/usr/bin/env bash
echo "check-cli-typecheck: tsconfig.json baja: 80 bajo un baseline de 89 — baja el baseline en x para que no vuelva a subir." >&2
echo "check-cli-typecheck: tsconfig.tests.json no crece: 89, igual al baseline." >&2
"""


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True).stdout


def fixture(base: Path) -> tuple[Path, Path, Path]:
    remote = base / "remote.git"
    git(base, "init", "-q", "--bare", str(remote))
    repo = base / "repo"
    repo.mkdir()
    git(repo, "init", "-q", "-b", "feature/x")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "a.ts").write_text("const a = 1\n")
    (repo / "b.ts").write_text("const b = 1\n")
    baseline = repo / ".claude/baselines/cli_typecheck_baseline.txt"
    baseline.parent.mkdir(parents=True)
    baseline.write_text("tsconfig.json 89\ntsconfig.tests.json 89\n")
    run = repo / ".claude/workbench/tsc-zero-loop/run-1"
    run.mkdir(parents=True)
    for name in ("ledger.jsonl", "patterns.jsonl", "setups.jsonl"):
        (run / name).write_text("{}\n")
    (run / "step-6").mkdir()
    (run / "step-6/close.log").write_text("close: abc\n")
    git(repo, "add", ".")
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed")
    git(repo, "remote", "add", "origin", str(remote))
    git(repo, "push", "-q", "-u", "origin", "feature/x")
    # El paso: dos archivos conservados, uno tocado que NO se conservó, su
    # banco con el informe del pipeline, dos jobs y la memoria que creció.
    (repo / "a.ts").write_text("const a = 2\n")
    (repo / "b.ts").write_text("const b = 2\n")
    (repo / "c.ts").write_text("otro escritor\n")
    bench = run / "step-7"
    (bench / "pipeline").mkdir(parents=True)
    (bench / "pipeline/pipeline.json").write_text(json.dumps({
        "batches": [{"batch": 1, "total_before": 20, "total_final": 17},
                    {"batch": 2, "total_before": 17, "total_final": 15}],
        "files_kept": ["a.ts", "b.ts"]}))
    for n, (before, final) in enumerate(((20, 17), (17, 15)), 1):
        (bench / f"pipeline/batch-0{n}").mkdir()
        (bench / f"pipeline/batch-0{n}/report.json").write_text(json.dumps(
            {"total_before": before, "total_final": final, "outcomes": {"a": "accepted"}, "tsc_runs": 1}))
    for job in ("step-7-pool-20260101T000000", "step-7-pipeline-20260101T000001"):
        (repo / ".claude/jobs" / job / "outputs").mkdir(parents=True)
        (repo / ".claude/jobs" / job / "outputs/salida.log").write_text("ok\n")
    (repo / ".claude/jobs/step-8-pool-20260101T000009").mkdir(parents=True)
    (repo / ".claude/jobs/step-8-pool-20260101T000009/x").write_text("otro paso\n")
    (run / "ledger.jsonl").write_text("{}\n{\"n\": 2}\n")
    # El cierre anterior escribió su log DESPUÉS de commitear: queda modificado
    # y sólo el cierre siguiente puede llevárselo.
    (run / "step-6/close.log").write_text("close: abc\nEXIT=0\n")
    hook = repo / ".git/hooks/pre-commit"
    hook.write_text(HOOK)
    hook.chmod(0o755)
    return repo, run, bench


with tempfile.TemporaryDirectory() as tmp:
    repo, run, bench = fixture(Path(tmp))
    plan = step_close.close_plan(repo, run, bench)
    assert_equal("el asunto nombra el paso y los totales del pipeline",
                 "Apply tsc-zero step 7: 20 -> 15", plan.subject)
    assert_equal("lo que se commitea: lo conservado, el banco, sus jobs y la memoria de la corrida",
                 ["a.ts", "b.ts", ".claude/jobs/step-7-pipeline-20260101T000001",
                  ".claude/jobs/step-7-pool-20260101T000000", ".claude/workbench/tsc-zero-loop/run-1/ledger.jsonl",
                  ".claude/workbench/tsc-zero-loop/run-1/patterns.jsonl",
                  ".claude/workbench/tsc-zero-loop/run-1/setups.jsonl",
                  ".claude/workbench/tsc-zero-loop/run-1/step-6/close.log",
                  ".claude/workbench/tsc-zero-loop/run-1/step-7"], plan.paths)

    result = step_close.close_step(repo, run, bench)
    subjects = git(repo, "log", "--format=%s").splitlines()
    assert_equal("dos commits: el paso y el trinquete", ["Lower the CLI typecheck baseline to 80", "Apply tsc-zero step 7: 20 -> 15", "seed"], subjects)
    assert_equal("el trinquete baja sólo el proyecto que el gate nombró",
                 "tsconfig.json 80\ntsconfig.tests.json 89\n",
                 (repo / ".claude/baselines/cli_typecheck_baseline.txt").read_text())
    assert_equal("lo que no conservó el paso ni es suyo queda fuera",
                 "?? .claude/jobs/step-8-pool-20260101T000009/\n?? c.ts\n",
                 git(repo, "status", "--porcelain", "--untracked-files=normal").replace(" M c.ts", "?? c.ts"))
    assert_equal("el informe del paso queda en su banco y en el commit",
                 True, "capability" in json.loads((bench / "report.json").read_text()))
    assert_equal("empuja la rama actual a su upstream",
                 git(repo, "rev-parse", "HEAD").strip(), git(repo, "rev-parse", "origin/feature/x").strip())
    assert_equal("el resultado nombra los commits", 2, len(result.commits))

with tempfile.TemporaryDirectory() as tmp:
    repo, run, bench = fixture(Path(tmp))
    (bench / "pipeline/pipeline.json").unlink()
    try:
        step_close.close_plan(repo, run, bench)
        outcome = "cerró"
    except ValueError as error:
        outcome = "rehúsa" if "pipeline.json" in str(error) else str(error)
    assert_equal("sin informe del pipeline no hay cierre: rehúsa nombrándolo", "rehúsa", outcome)
    assert_equal("y no commitea nada", 1, len(git(repo, "log", "--format=%s").splitlines()))

with tempfile.TemporaryDirectory() as tmp:
    repo = Path(tmp)
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    try:
        step_close._git(repo, "commit", "-q", "-m", "x", "--", "no-such-path")
        outcome = "commiteó"
    except step_close.GitError as error:
        outcome = "nombra" if "no-such-path" in str(error) else str(error)
    assert_equal("un git que falla nombra su stderr: el cierre no calla la causa", "nombra", outcome)

print(f"test_step_close: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
