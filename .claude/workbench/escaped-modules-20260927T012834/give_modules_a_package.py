"""Da identidad de paquete a los módulos TS sueltos de `src/` y reescribe sus imports.

Los cinco directorios quedan donde están —conviven con su gemelo Python—;
lo que cambia es que se importan por NOMBRE (`@thyrox/paths/reach.ts`) y no
por una ruta relativa que, vista desde el enlace `node_modules/@thyrox/<x>`,
apunta a un sitio que no existe.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
MODULES = {
    "paths": ("Resolución de raíces y hogares del árbol (reach, docs).", []),
    "store": ("Conexión a la base SQLite del proveedor.", []),
    "task": ("Esquema, E/S y premisas del registro de tareas.", ["paths"]),
    "coordination": ("Reclamos, ledger e integración de ramas entre sesiones.", []),
    "workbench": ("Manifiesto y rutas del banco de evidencia.", ["paths"]),
}
IMPORT = re.compile(r"""(from\s+|import\(\s*)(['"])((?:\.\./)+|\./\.\./)(paths|store|task|coordination|workbench)/([A-Za-z]+\.ts)\2""")


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def manifests() -> None:
    for name, (description, deps) in MODULES.items():
        exports = {"./*.ts": "./*.ts"}
        if (ROOT / "src" / name / "index.ts").is_file():
            exports = {".": "./index.ts", **exports}
        data = {"name": f"@thyrox/{name}", "version": "0.1.0", "private": True,
                "type": "module", "description": description, "exports": exports}
        if deps:
            data["dependencies"] = {f"@thyrox/{d}": "workspace:*" for d in deps}
        write_json(ROOT / "src" / name / "package.json", data)


def owning_manifest(path: Path) -> Path | None:
    for parent in path.parents:
        if parent == ROOT:
            return None
        if (parent / "package.json").is_file():
            return parent / "package.json"
    return None


def rewrite_imports() -> dict:
    files = subprocess.run(["git", "ls-files", "src/*.ts", "src/*.tsx", "tests/*.ts"],
                           capture_output=True, text=True, check=True).stdout.split()
    touched: dict[Path, set] = {}
    for rel in files:
        path = ROOT / rel
        text = path.read_text(encoding="utf8")
        used = set()

        def swap(m):
            target = (path.parent / m.group(3) / m.group(4) / m.group(5)).resolve()
            if target != (ROOT / "src" / m.group(4) / m.group(5)).resolve():
                return m.group(0)
            if path.resolve().is_relative_to((ROOT / "src" / m.group(4)).resolve()):
                return m.group(0)
            used.add(m.group(4))
            return f"{m.group(1)}{m.group(2)}@thyrox/{m.group(4)}/{m.group(5)}{m.group(2)}"

        new = IMPORT.sub(swap, text)
        if new != text:
            path.write_text(new, encoding="utf8")
            touched[path] = used
    return touched


def declare_dependencies(touched: dict) -> list:
    changed = []
    for path, used in touched.items():
        manifest = owning_manifest(path)
        if manifest is None:
            continue
        data = json.loads(manifest.read_text(encoding="utf8"))
        deps = data.setdefault("dependencies", {})
        before = dict(deps)
        own = data.get("name")
        for name in sorted(used):
            if own != f"@thyrox/{name}":
                deps.setdefault(f"@thyrox/{name}", "workspace:*")
        if deps != before:
            write_json(manifest, data)
            changed.append(str(manifest.relative_to(ROOT)))
    return changed


def workspaces() -> None:
    path = ROOT / "package.json"
    data = json.loads(path.read_text(encoding="utf8"))
    for name in MODULES:
        entry = f"src/{name}"
        if entry not in data["workspaces"]:
            data["workspaces"].append(entry)
    write_json(path, data)


if __name__ == "__main__":
    manifests()
    touched = rewrite_imports()
    changed = declare_dependencies(touched)
    workspaces()
    print(f"imports reescritos en {len(touched)} archivo(s)")
    for p in sorted(touched):
        print("  ", p.relative_to(ROOT), sorted(touched[p]))
    print(f"manifiestos con dependencia nueva: {len(changed)}")
    for c in changed:
        print("  ", c)
