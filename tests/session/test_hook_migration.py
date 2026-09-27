"""Suite de hook_migration: el procedimiento para mover el archivo de un hook vivo.

Verifica sus tres piezas: clasificar cada referencia a un nombre en todos los
repositorios, encontrar los comandos de hook que apuntan a un archivo que no
existe, y sondear por el tiempo de acceso qué archivo ejecuta el cliente.
"""
from __future__ import annotations

import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
_MODULE = pathlib.Path(os.environ.get("HOOK_MIGRATION_MODULE") or ROOT / "src/session/hook_migration.py")
_spec = importlib.util.spec_from_file_location("hook_migration", _MODULE)
assert _spec is not None and _spec.loader is not None
hm = importlib.util.module_from_spec(_spec)
sys.modules["hook_migration"] = hm
_spec.loader.exec_module(hm)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}")
        FAILED += 1


FIX = ROOT / ".claude/cache/test-hook-migration" / str(os.getpid())
shutil.rmtree(FIX, ignore_errors=True)
FIX.mkdir(parents=True)


def repo(name: str, files: dict[str, str], untracked: dict[str, str] | None = None) -> pathlib.Path:
    path = FIX / name
    path.mkdir()
    subprocess.run(["git", "init", "-q", str(path)], check=True)
    for rel, text in files.items():
        (path / rel).parent.mkdir(parents=True, exist_ok=True)
        (path / rel).write_text(text)
    subprocess.run(["git", "-C", str(path), "add", "-A"], check=True)
    subprocess.run(["git", "-C", str(path), "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base"], check=True)
    for rel, text in (untracked or {}).items():
        (path / rel).parent.mkdir(parents=True, exist_ok=True)
        (path / rel).write_text(text)
    return path


try:
    print("cada ruta cae en su clase")
    cases = {
        "src/hooks/x.py": "LIVE", "bin/x": "LIVE", "tests/x.py": "LIVE", ".claude/settings.json": "LIVE",
        ".claude/settings.local.json": "LIVE", ".claude/hooks/x.sh": "LIVE",
        ".claude/rules/r.md": "CURRENT_DOC", ".claude/CLAUDE.md": "CURRENT_DOC", "README.md": "CURRENT_DOC",
        "source/normativa/x.rst": "CURRENT_DOC",
        ".claude/workbench/b/README.md": "HISTORICAL", ".claude/jobs/j/x.log": "HISTORICAL",
        ".claude/eventos/e/x": "HISTORICAL", ".claude/settings-backups/s.json": "HISTORICAL",
        "source/gestion/pm/thyrox/hallazgos/h.rst": "HISTORICAL", "_references/x/y": "HISTORICAL",
        "notas/sueltas.txt": "UNCLASSIFIED",
    }
    for rel, kind in cases.items():
        check(rel, kind, hm.classify_path(rel))

    print("las referencias se buscan en todos los repositorios, versionadas o no")
    a = repo("a", {"src/hooks/run.py": "import old_hook\n", ".claude/rules/r.md": "usa `old_hook.py`\n",
                   ".claude/workbench/b/README.md": "old_hook corrió\n"}, untracked={"src/new.py": "old_hook\n"})
    b = repo("b", {".claude/settings.json": json.dumps({"hooks": {}}) + "\n# old_hook\n"})
    refs = hm.find_references("old_hook", [a, b])
    kinds = sorted((r.kind, r.root.name, r.path) for r in refs)
    check("clases y rutas", [
        ("CURRENT_DOC", "a", ".claude/rules/r.md"), ("HISTORICAL", "a", ".claude/workbench/b/README.md"),
        ("LIVE", "a", "src/hooks/run.py"), ("LIVE", "a", "src/new.py"), ("LIVE", "b", ".claude/settings.json"),
    ], kinds)
    check("cada referencia lleva su línea", True, all(r.line >= 1 for r in refs))
    check("sin referencias vivas ni de documento, pasa", 0,
          hm.refs_verdict([r for r in refs if r.kind == "HISTORICAL"]))
    check("con una viva, no pasa", 1, hm.refs_verdict(refs))
    check("una sin clasificar tampoco pasa", 1,
          hm.refs_verdict([hm.Reference("UNCLASSIFIED", a, "notas/x", 1)]))

    print("un comando de hook que apunta a un archivo ausente se reporta, con su repositorio")
    c = repo("c", {"hooks/ok.py": "", ".claude/settings.json": json.dumps({"hooks": {"PreToolUse": [{"hooks": [
        {"type": "command", "command": "python3 hooks/ok.py"},
        {"type": "command", "command": "python3 ../gone/missing.py"},
    ]}]}})})
    user = FIX / "user-settings.json"
    user.write_text(json.dumps({"hooks": {"Stop": [{"hooks": [{"type": "command", "command": f"python3 {FIX}/nada.py"}]}]}}))
    broken = hm.broken_hook_commands([c], [user])
    check("dos rotos: el del proyecto y el del usuario", 2, len(broken))
    check("el del proyecto se resuelve contra su repositorio", str((FIX / "gone/missing.py").resolve()),
          next(x["path"] for x in broken if x["settings"].endswith(".claude/settings.json")))
    check("sin rotos, lista vacía", [], hm.broken_hook_commands([a], []))

    print("el sondeo por atime distingue lo que se leyó de lo que no")
    read, unread = FIX / "leido.py", FIX / "sin-leer.py"
    read.write_text("x\n"); unread.write_text("x\n")
    hm.probe([read, unread])
    check("tras sondear, nada cuenta como leído", [False, False], hm.read_since_probe([read, unread]))
    read.read_text()
    check("sólo el leído cuenta", [True, False], hm.read_since_probe([read, unread]))
    check("el sistema de archivos del árbol permite medirlo", True, hm.atime_observable(FIX))
finally:
    shutil.rmtree(FIX, ignore_errors=True)
    try:
        FIX.parent.rmdir()
    except OSError:
        pass

print(f"test_hook_migration: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
