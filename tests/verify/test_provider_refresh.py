#!/usr/bin/env python3
"""Antes de tipar un consumidor, sus providers viejos se reconstruyen.

El consumidor tipa contra el ``dist/*.d.ts`` de cada provider (la condición
``types`` de ``exports``). ``check_package_typecheck`` no lo miraba: dependía de
que alguien corriera ``emit_declarations`` a mano, y cuando nadie lo hizo
``app-host`` publicó un TS2305 que no era suyo (``primePlatform`` existía en la
fuente de ``config`` y no en su ``platform.d.ts``).

``refresh_providers`` cierra el ciclo: toma el cierre transitivo de providers
de workspace de cada consumidor, reconstruye sólo los viejos
(``is_stale``), sella cada uno y, si alguno no emite, bloquea a los
consumidores que dependen de él para que no se tipen contra un contrato roto.

Controles de anulación, medidos (cada uno junto a su caso en el cuerpo):

- sin cierre transitivo caen 7 comprobaciones de los casos 0, 1 y 4: ``base``
  sólo es provider de ``consumer`` a través de ``mid``;
- sin consultar ``is_stale``, las 2 del caso 3;
- sin propagar el fallo a los consumidores, 3 del caso 4;
- con el manifiesto fuera de la huella, 3 del caso 2. La primera versión de
  ese caso añadía ``src/extra.ts`` en el mismo paso que cambiaba el
  manifiesto, y la anulación pasaba en verde: el archivo nuevo bastaba para
  volverlo viejo. Ahora la fuente existe antes de sellar.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()
from typescript import emit_declarations as ed
from verify import check_package_typecheck as gate

ok_count = 0
fail_count = 0


def check(label, expected, seen):
    global ok_count, fail_count
    if expected == seen:
        ok_count += 1
        print(f"  ok   {label}")
    else:
        fail_count += 1
        print(f"  FALLO {label}\n       esperado: {expected!r}\n       obtenido: {seen!r}")


def package(root: Path, name: str, deps: dict | None = None, exports: dict | None = None) -> Path:
    pkg = root / "src" / "packages" / name
    (pkg / "src").mkdir(parents=True, exist_ok=True)
    manifest = {"name": f"@thyrox/{name}", "exports": exports or {".": "./src/index.ts"},
                "dependencies": deps or {}}
    (pkg / "package.json").write_text(json.dumps(manifest) + "\n")
    (pkg / "src" / "index.ts").write_text(f"export const {name.replace('-', '_')} = 1\n")
    return pkg


class FakeEmitter:
    """El emisor inyectado: registra a quién se pidió y decide si emite."""

    def __init__(self, failing=()):
        self.calls: list[str] = []
        self.failing = set(failing)

    def __call__(self, package_dir: Path):
        self.calls.append(package_dir.name)
        emitted = package_dir.name not in self.failing
        if emitted:
            (package_dir / "dist").mkdir(exist_ok=True)
            (package_dir / "dist" / "index.d.ts").write_text("export {}\n")
        return ed.EmitResult(package_dir.name, emitted, 0, "" if emitted else "rehusado")


def tree(tmp: str):
    root = Path(tmp)
    base = package(root, "base")
    mid = package(root, "mid", {"@thyrox/base": "workspace:*"})
    consumer = package(root, "consumer", {"@thyrox/mid": "workspace:*", "left-pad": "^1.0.0"})
    other = package(root, "other")
    return root, base, mid, consumer, other


print("\n0. los providers son el cierre transitivo de las dependencias de workspace")
with tempfile.TemporaryDirectory() as tmp:
    root, base, mid, consumer, other = tree(tmp)
    names = [p.name for p in gate.workspace_providers(consumer, gate.packages_by_name(root))]
    # Anulación: sin cierre transitivo, `base` (provider de `mid`) queda fuera,
    # y con él caen también los casos 1 y 4.
    check("mid y base, no left-pad ni other", ["base", "mid"], sorted(names))

print("\n1. un provider sin dist/ se reconstruye antes de tipar al consumidor")
with tempfile.TemporaryDirectory() as tmp:
    root, base, mid, consumer, other = tree(tmp)
    emit = FakeEmitter()
    report = gate.refresh_providers([consumer], root, emit=emit)
    check("reconstruye los dos providers", ["base", "mid"], sorted(emit.calls))
    check("y los sella", [False, False], [ed.is_stale(base), ed.is_stale(mid)])
    check("no bloquea a nadie", set(), report.blocked)

print("\n3. un provider al día no se reconstruye")
with tempfile.TemporaryDirectory() as tmp:
    root, base, mid, consumer, other = tree(tmp)
    for pkg in (base, mid):
        (pkg / "dist").mkdir()
        ed.write_digest(pkg)
    emit = FakeEmitter()
    report = gate.refresh_providers([consumer], root, emit=emit)
    # Anulación: sin consultar `is_stale`, se reconstruyen los dos.
    check("no llama al emisor", [], emit.calls)
    check("nada reconstruido", [], report.rebuilt)

print("\n4. un rebuild que falla corta el typecheck de quien depende de él")
with tempfile.TemporaryDirectory() as tmp:
    root, base, mid, consumer, other = tree(tmp)
    emit = FakeEmitter(failing={"base"})
    report = gate.refresh_providers([consumer, other], root, emit=emit)
    # Anulación: sin propagar el fallo a los consumidores, `consumer` se tipa.
    check("consumer queda bloqueado", {"consumer"}, report.blocked)
    check("other, que no depende de base, no", False, "other" in report.blocked)
    check("el fallido no se sella", True, ed.is_stale(base))
    check("el fallo se nombra", ["base"], report.failed)
    # Y el gate lo respeta: sin medir al bloqueado, sin veredicto.
    measured: list[str] = []
    code = gate.run_with_refresh(
        [consumer, other], root, emit=emit,
        check=lambda p: measured.append(p.name) or ed.EmitResult(p.name, True, 0, ""))
    check("mide sólo al no bloqueado", ["other"], measured)
    check("y sale 2: sin veredicto con un contrato roto", 2, code)

print("\n2. un manifiesto cambiado con tsconfig.build.json viejo: viejo, y el emisor real lo regenera")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    stub = root / "node_modules" / "@types" / "bun"
    stub.mkdir(parents=True)
    (stub / "package.json").write_text('{"name":"@types/bun","version":"1.0.0","types":"./index.d.ts"}\n')
    (stub / "index.d.ts").write_text("export {}\n")
    provider = package(root, "prov")
    consumer = package(root, "cons", {"@thyrox/prov": "workspace:*"})
    # La fuente nueva existe ANTES de sellar: lo único que cambia después es
    # el manifiesto, así que sólo él puede volver viejo al provider.
    (provider / "src" / "extra.ts").write_text("export const extra = 2\n")
    first = ed.emit_package(provider)
    check("la primera emisión sale", True, first.emitted)
    ed.write_digest(provider)
    project_before = (provider / "tsconfig.build.json").read_text()
    # El manifiesto gana una exportación; el proyecto de build sigue el de antes.
    manifest = json.loads((provider / "package.json").read_text())
    manifest["exports"]["./extra"] = "./src/extra.ts"
    (provider / "package.json").write_text(json.dumps(manifest) + "\n")
    check("el proyecto aún no nombra ./extra", False, "@thyrox/prov/extra" in project_before)
    # Anulación: una huella sin el manifiesto no lo ve viejo.
    check("el cambio de manifiesto lo vuelve viejo", True, ed.is_stale(provider))
    report = gate.refresh_providers([consumer], root)
    check("se reconstruyó con el emisor real", ["prov"], report.rebuilt)
    check("el proyecto regenerado nombra ./extra", True,
          "@thyrox/prov/extra" in (provider / "tsconfig.build.json").read_text())
    check("sellado", False, ed.is_stale(provider))

print(f"\ntest_provider_refresh: {ok_count} ok, {fail_count} falla(s)")
sys.exit(1 if fail_count else 0)
