"""Suite del detector de los momentos en que `git grep` es la forma.

El episodio (2026-09-25): para saber si `thyrox_toolchain_require_pdf_text`
existía en el consumidor se corrió `grep -rl` sin cota sobre `.claude/` de
`kaupamex-docs` y `git log --all -S` sobre toda su historia. El primero
recorre también lo no versionado; el segundo calcula un diff por commit
alcanzable. Los dos acabaron en segundo plano. La pregunta era de PRESENCIA,
y `git grep` la responde leyendo sólo lo versionado.

El control que puede fallar: cada momento tiene su gemelo que no lo es —un
`grep -r` fuera de un work tree de git, un `git log -S` con rango acotado—.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_git_grep_opportunity.py"
if not _MODULE.exists():
    print(f"  FALLO falta {_MODULE}")
    sys.exit(1)
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

OK = 0
FAILED = 0


def check(name: str, expected: bool, command: str, cwd: str) -> None:
    global OK, FAILED
    payload = {"tool_name": "Bash", "tool_input": {"command": command}, "cwd": cwd}
    got = gate.detect(payload) is not None
    if got == expected:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLO {name} — esperado {expected}, obtenido {got}")


def run(base: pathlib.Path) -> None:
    repo = base / "repo"
    (repo / ".git").mkdir(parents=True)
    (repo / ".claude").mkdir()
    outside = base / "plain"
    outside.mkdir()
    r, o = str(repo), str(outside)

    # Momento 1 — grep recursivo dentro de un work tree.
    check("grep -rl sobre un subdirectorio del repo", True, "grep -rl foo .claude", r)
    check("grep -R con ruta absoluta dentro del repo", True, f"grep -R foo {repo}/.claude", o)
    check("grep -rn combinado", True, "grep -rn foo .", r)
    # Gemelo: fuera de git no hay índice que consultar.
    check("grep -r fuera de un work tree", False, "grep -r foo .", o)
    # Gemelo: grep no recursivo sobre un archivo.
    check("grep sobre un archivo, sin -r", False, "grep -n foo README.md", r)
    # Gemelo: ya es git grep.
    check("git grep ya es la forma", False, "git grep -l foo -- .claude", r)

    # Momento 2 — pickaxe sobre un rango ancho.
    check("git log --all -S", True, "git -C . log --all --oneline -S foo", r)
    check("git log -G sin rango", True, "git log -Gfoo --oneline", r)
    # Gemelo: rango acotado, la pregunta es de historia reciente.
    check("git log -S con rango acotado", False, "git log -S foo origin/develop..HEAD", r)
    # Gemelo: git log sin pickaxe.
    check("git log sin -S ni -G", False, "git log --all --oneline -5", r)

    # Gemelo: el texto de un heredoc no se ejecuta. Primer disparo real del
    # detector en sesión (2026-09-25): avisó sobre la prosa de la propia regla.
    check("git log -S dentro de un heredoc", False,
          "cat > regla.md <<'EOF'\nno uses git log --all -S foo\nEOF", r)
    check("grep -r dentro de un heredoc", False,
          "cat > regla.md <<EOF\ngrep -rl foo .\nEOF", r)
    check("tras el heredoc, un comando real sí avisa", True,
          "cat > x <<'EOF'\ntexto\nEOF\ngit log --all -S foo", r)

with tempfile.TemporaryDirectory() as directory:
    print("test_detect_git_grep_opportunity:")
    run(pathlib.Path(directory))

print(f"test_detect_git_grep_opportunity: {OK + FAILED} casos — {OK} ok, {FAILED} fallo(s)")
sys.exit(1 if FAILED else 0)
