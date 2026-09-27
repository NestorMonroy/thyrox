#!/usr/bin/env python3
"""Build JavaScript de un paquete @thyrox con `bun build`.

Emite en `dist/` un `.js` por cada fuente que el manifiesto exporta, junto al
`.d.ts` que ya emite `emit_declarations`, y repunta el `default` de cada
entrada de `exports` —y `main`— a ese `.js`. La condición `@thyrox/source`
conserva el fuente para quien la pida con `--conditions=@thyrox/source`.

Por qué `bun build` y con qué banderas, medido en Bun 1.3.11:

- `--splitting`: sin ella cada entrada lleva dentro su copia de los módulos
  que importa, y dos entradas que comparten un módulo con estado ven dos
  estados. La suite lo prueba con un contador compartido.
- `--packages external`: los hermanos `@thyrox/*` y las dependencias de npm se
  resuelven en tiempo de ejecución por su propio `exports`, no se incrustan.
- `--target bun`: el runtime de thyrox; conserva `bun:*` como importación.
- `--root` = el mismo `rootDir` con que `emit_declarations` emite, para que
  `dist/x.js` quede al lado de `dist/x.d.ts`.

Uso:
    build_javascript.py <paquete>...          construye y repunta
    build_javascript.py --check <paquete>...  exit 1 si algún default no es un .js existente
"""
import glob
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from typescript import emit_declarations as emit  # noqa: E402

OUTPUT_DIR = emit.OUTPUT_DIR
SOURCE_CONDITION = emit.SOURCE_CONDITION
SOURCE_SUFFIXES = (".ts", ".tsx", ".mts")
TEST_MARKERS = ("/__tests__/", ".test.", ".spec.")


def dist_entry(source: str, root_dir: str = ".") -> str:
    """La ruta del `.js` emitido para un fuente, relativa al paquete."""
    relative = os.path.normpath(source.lstrip("./") if source.startswith("./") else source)
    if root_dir not in ("", "."):
        relative = os.path.relpath(relative, root_dir)
    stem, _ = os.path.splitext(relative)
    return f"./{OUTPUT_DIR}/{stem}.js"


def source_entries(manifest: dict) -> list:
    """Los fuentes que el manifiesto exporta, sin repetir y nunca bajo dist/."""
    entries = [t for t in emit.export_targets(manifest) if t.endswith(SOURCE_SUFFIXES)]
    return sorted(set(entries))


def expand_entries(package_dir: Path, entries: list) -> list:
    """Un destino con comodín se expande a sus archivos, sin pruebas."""
    out = []
    for entry in entries:
        if "*" not in entry:
            out.append(entry)
            continue
        pattern = str(package_dir / entry.lstrip("./")).replace("*", "**/*", 1) \
            if "/*" in entry and entry.endswith(SOURCE_SUFFIXES) else str(package_dir / entry.lstrip("./"))
        for path in sorted(glob.glob(pattern, recursive=True)):
            rel = "./" + os.path.relpath(path, package_dir)
            if rel.endswith(SOURCE_SUFFIXES) and not any(m in "/" + rel for m in TEST_MARKERS):
                out.append(rel)
    return sorted(set(out))


def build_command(entries: list, root_dir: str = ".") -> list:
    return ["bun", "build", *entries, "--root", root_dir or ".", "--outdir", OUTPUT_DIR,
            "--target", "bun", "--packages", "external", "--splitting"]


def build_package(package_dir) -> subprocess.CompletedProcess:
    package_dir = Path(package_dir)
    manifest = emit._read_manifest(package_dir)
    root_dir, _ = emit._project_shape(package_dir)
    entries = expand_entries(package_dir, source_entries(manifest))
    return subprocess.run(build_command(entries, root_dir), cwd=package_dir,
                          capture_output=True, text=True)


def _repoint_value(value, root_dir: str, package_dir: Path, absent: list):
    if isinstance(value, str):
        if not value.endswith(SOURCE_SUFFIXES):
            return value
        return {SOURCE_CONDITION: value, "default": _target(value, root_dir, package_dir, absent)}
    if isinstance(value, dict):
        source = value.get(SOURCE_CONDITION) or value.get("default")
        if not isinstance(source, str) or not source.endswith(SOURCE_SUFFIXES):
            return value
        repointed = {SOURCE_CONDITION: source}
        for key, nested in value.items():
            if key not in (SOURCE_CONDITION, "default"):
                repointed[key] = nested
        repointed["default"] = _target(source, root_dir, package_dir, absent)
        return repointed
    return value


def _target(source: str, root_dir: str, package_dir: Path, absent: list) -> str:
    target = dist_entry(source, root_dir)
    if "*" in target:
        if not glob.glob(str(package_dir / target.lstrip("./")).replace("*", "**/*", 1), recursive=True):
            absent.append(target)
    elif not (package_dir / target.lstrip("./")).is_file():
        absent.append(target)
    return target


def repoint_default(package_dir) -> bool:
    """Repunta `default` y `main` al `.js`; rehúsa entero si falta alguno."""
    package_dir = Path(package_dir)
    manifest_path = package_dir / "package.json"
    manifest = emit._read_manifest(package_dir)
    root_dir, _ = emit._project_shape(package_dir)
    absent: list = []
    exports = manifest.get("exports")
    if isinstance(exports, dict):
        repointed = {k: _repoint_value(v, root_dir, package_dir, absent) for k, v in exports.items()}
    else:
        repointed = exports
    main = manifest.get("main")
    main_source = main
    if isinstance(main, str) and main.startswith(f"./{OUTPUT_DIR}/"):
        root = repointed.get(".") if isinstance(repointed, dict) else None
        main_source = root.get(SOURCE_CONDITION) if isinstance(root, dict) else None
    new_main = _target(main_source, root_dir, package_dir, absent) \
        if isinstance(main_source, str) and main_source.endswith(SOURCE_SUFFIXES) else main
    if absent:
        print(f"{package_dir.name}: repunte INERTE — {len(absent)} .js no emitido(s):", file=sys.stderr)
        for target in absent:
            print(f"  {target}", file=sys.stderr)
        print("  Corre antes: build_javascript.py <paquete>", file=sys.stderr)
        return False
    manifest["exports"] = repointed
    if new_main is not None:
        manifest["main"] = new_main
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    return True


def check_package(package_dir) -> list:
    """Los `default` de `exports` que no son un `.js` existente."""
    package_dir = Path(package_dir)
    manifest = emit._read_manifest(package_dir)
    missing = []

    def visit(value):
        if isinstance(value, dict):
            if "default" in value:
                visit(value["default"])
            return
        if isinstance(value, str):
            if not value.endswith(".js") or ("*" not in value and not (package_dir / value.lstrip("./")).is_file()):
                missing.append(value)

    exports = manifest.get("exports")
    for value in (exports.values() if isinstance(exports, dict) else [exports]):
        visit(value)
    return missing


def main(argv) -> int:
    check = "--check" in argv
    packages = [a for a in argv if not a.startswith("--")]
    if not packages:
        print("uso: build_javascript.py [--check] <paquete>...", file=sys.stderr)
        return 2
    failed = 0
    for package in packages:
        if check:
            missing = check_package(package)
            if missing:
                failed += 1
                print(f"{Path(package).name}: {len(missing)} default(s) sin .js: {missing[:3]}")
            continue
        result = build_package(package)
        if result.returncode != 0:
            failed += 1
            print(f"{Path(package).name}: bun build salió {result.returncode}\n{result.stderr[-2000:]}")
            continue
        if not repoint_default(package):
            failed += 1
    print(f"build_javascript: {failed} paquete(s) con fallo (alcance medido: {len(packages)} paquete(s))")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
