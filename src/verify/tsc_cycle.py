#!/usr/bin/env python3
"""El driver por fases del lazo tsc cero (plan v3: tres rutas).

    tsc_cycle classify --log L --packages P --out O.json
    tsc_cycle status   --bench STEP [--job-dir J]
    tsc_cycle reject   --run RUN --bench STEP --file F --lesson L
    tsc_cycle modules plan   --log L --bench STEP
    tsc_cycle modules launch --bench STEP --worktree W --ledger L --seed N
                             [--model M] [--width N] [--dry-run]
    tsc_cycle shared plan    --log L --bench STEP [--top N]
    tsc_cycle shared launch  (mismas opciones que modules launch)
    tsc_cycle next     --log L [--root R]
    tsc_cycle compare  ANTES DESPUES

Cada fase es un subcomando que lee y escribe en el banco del paso, así una
fase se repite sin rehacer las anteriores. `tsc_zero_loop` sigue siendo el
lazo de proponentes deterministas; éste envuelve lo que hasta el paso 112 se
hacía a mano: pool, pipeline, revisión, rechazo, memoria y cierre.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

from verify import tsc_reflect, tsc_routes
from verify.batch_verification import _new_diagnostics
from verify.source_copy_step import _package_map, _resolve_package, _resolve_relative


def cmd_classify(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    if not diagnostics:
        # Un log vacío no distingue «cero errores» de «tsc no corrió»: el
        # veredicto de cero lo da la medición, no la clasificación.
        print(f"tsc_cycle classify: {args.log} sin diagnósticos — no se clasifica nada", file=sys.stderr)
        return 2
    duplicates = tsc_routes.duplicated_types(args.packages)
    routes = tsc_routes.classify(diagnostics, duplicates)
    counts = {"total": len(diagnostics), **{name: len(found) for name, found in routes.items()}}
    data = {
        "log": str(args.log),
        "counts": counts,
        "queue": tsc_routes.shared_queue(routes["shared"], duplicates),
        "routes": {name: [f"{d.file}({d.line}): {d.code}: {d.message}" for d in found]
                   for name, found in routes.items()},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("classify: " + " ".join(f"{k}={v}" for k, v in counts.items()) + f" duplicated_types={len(duplicates)}"
          f" -> {args.out}")
    return 0


def job_state(job_dir: Path | None) -> str:
    """`running`/`ended` según el pid que `thyrox-bg` escribe en `outputs/pid`.

    Paso 111: un `pgrep | head -1` devolvió el pid del shell que LANZÓ el
    trabajo, que muere al instante, y la espera concluyó «murió sin marcador»
    con el trabajo vivo. El pid sale del archivo del trabajo, nunca de pgrep;
    sin archivo el estado es `unknown`, no `ended`.
    """
    pid_file = job_dir / "outputs" / "pid" if job_dir else None
    if pid_file is None or not pid_file.is_file():
        return "unknown"
    try:
        os.kill(int(pid_file.read_text().split()[0]), 0)
    except (ValueError, IndexError):
        return "unknown"
    except ProcessLookupError:
        return "ended"
    except PermissionError:
        return "running"
    return "running"


def cmd_status(args) -> int:
    items_file = args.bench / "items.txt"
    items = [l for l in items_file.read_text().splitlines() if l.strip()] if items_file.is_file() else []
    endings: collections.Counter = collections.Counter()
    outputs = sorted((args.bench / "outputs").glob("*.json"))
    for path in outputs:
        try:
            endings[json.loads(path.read_text()).get("subtype", "unknown")] += 1
        except (OSError, ValueError):
            endings["unreadable"] += 1
    print(f"status: outputs={len(outputs)}/{len(items)} " + " ".join(f"{k}={v}" for k, v in sorted(endings.items()))
          + f" job={job_state(args.job_dir)}")
    for report in sorted((args.bench / "pipeline").glob("batch-*/report.json")):
        data = json.loads(report.read_text())
        print(f"  {report.parent.name} {data.get('total_before')}->{data.get('total_final')}"
              f" kept={len(data.get('files_kept', []))}")
    return 0


def accepting_batch(bench: Path, file: str) -> Path | None:
    proposal = f"agent:pool:{file}"
    for report in sorted((bench / "pipeline").glob("batch-*/report.json")):
        if proposal in json.loads(report.read_text()).get("accepted", []):
            return report.parent
    return None


def before_log(batch: Path) -> Path | None:
    """El «antes» de un lote: su `base.log` o, desde el segundo, el `final.log` del anterior.

    Paso 110: tres reflexiones salieron SIN MEDIR porque se pidió el
    `base.log` de lotes que no lo tienen — el pipeline mide la base una sola
    vez, y cada lote parte del final del anterior.
    """
    if (batch / "base.log").is_file():
        return batch / "base.log"
    previous = sorted(p for p in batch.parent.glob("batch-*") if p.name < batch.name)
    if previous and (previous[-1] / "final.log").is_file():
        return previous[-1] / "final.log"
    return None


def cmd_reject(args) -> int:
    batch = accepting_batch(args.bench, args.file)
    if batch is None:
        print(f"tsc_cycle reject: ningún lote de {args.bench} aceptó {args.file} — no se revierte nada",
              file=sys.stderr)
        return 2
    before = before_log(batch)
    if before is None or not (batch / "batch.log").is_file():
        print(f"tsc_cycle reject: {batch.name} no tiene «antes» o batch.log — no se revierte nada", file=sys.stderr)
        return 2
    subprocess.run(["git", "checkout", "--", args.file], check=True, capture_output=True)
    proposal = f"agent:pool:{args.file}"
    with (args.run / "ledger.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"proposal_id": proposal, "proposer": "agent", "outcome": "rejected-review",
                                 "targets_before": 0, "targets_after": 0, "new_diagnostics": [],
                                 "total_before": 0, "total_after": 0}) + "\n")
    tsc_reflect.add(args.run, proposal, [args.file], args.lesson, before.read_text().splitlines(),
                    (batch / "batch.log").read_text().splitlines())
    kept = args.bench / "kept.txt"
    if kept.is_file():
        remaining = [l for l in kept.read_text().splitlines() if l.strip() and l != args.file]
        kept.write_text("".join(f"{l}\n" for l in remaining))
    print(f"reject: {args.file} revertido y registrado ({batch.name}, antes={before.name})")
    return 0


# «El módulo X no exporta Y»: TS2305 y TS2614 (`Module '"X"' has no exported
# member 'Y'`) y TS2724 (`'"X"' has no exported member named 'Y'`).
MISSING_EXPORT = re.compile(r"""'"(?P<module>[^"]+)"' has no exported member (?:named )?'(?P<member>[^']+)'""")
MISSING_EXPORT_CODES = {"TS2305", "TS2614", "TS2724"}
THYROX = Path(__file__).resolve().parents[2]
MODULE_PROMPT = Path("src/verify/prompts/module-port.md")
SHARED_PROMPT = Path("src/verify/prompts/shared-type.md")


def _unit_of(spec: str, consumer: str, root: Path | None, packages: dict) -> str:
    """El archivo al que resuelve `spec` desde `consumer`, relativo a `root`,
    con la misma resolución que ya usa la bisección (`source_copy_step`).
    Sin archivo real que resuelva, la ruta normalizada del especificador."""
    if root is not None:
        targets = (_resolve_relative(root / consumer, spec) if spec.startswith(".")
                   else _resolve_package(spec, packages))
        existing = sorted(t for t in targets if t.is_file())
        if existing:
            return str(existing[0].relative_to(root.resolve()))
    # `./compact.js` nombra un módulo distinto según quién lo importe.
    return os.path.normpath(os.path.join(os.path.dirname(consumer), spec)) if spec.startswith(".") else spec


def module_units(diagnostics, root: Path | None = None) -> dict[str, dict]:
    """Los módulos que un porte tiene que completar: por el archivo al que
    resuelven, sus consumidores (quien emite el error) y los miembros que le
    faltan. Un import de paquete y uno relativo al mismo archivo son UNA
    unidad: dos pools portando el mismo módulo se pisarían."""
    packages = _package_map(root / "src" / "packages") if root is not None and (root / "src/packages").is_dir() else {}
    units: dict[str, dict] = {}
    for d in diagnostics:
        match = MISSING_EXPORT.search(d.message) if d.code in MISSING_EXPORT_CODES else None
        if not match:
            continue
        module = _unit_of(match["module"], d.file, root, packages)
        unit = units.setdefault(module, {"consumers": set(), "members": set(), "diagnostics": []})
        unit["consumers"].add(d.file)
        unit["members"].add(match["member"])
        unit["diagnostics"].append(f"{d.file}({d.line}): error {d.code}: {d.message}")
    return {k: {"consumers": sorted(v["consumers"]), "members": sorted(v["members"]),
                "diagnostics": v["diagnostics"]} for k, v in units.items()}


def cmd_modules_plan(args) -> int:
    units = module_units(tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore")),
                         args.root)
    if not units:
        # Un lote vacío correría el pool para nada y se leería como «hecho».
        print(f"tsc_cycle modules plan: {args.log} no tiene exportaciones ausentes — no hay módulo que portar",
              file=sys.stderr)
        return 2
    items = args.bench / "items"
    items.mkdir(parents=True, exist_ok=True)
    lines = []
    for n, (module, unit) in enumerate(sorted(units.items()), 1):
        path = items / f"{n}.txt"
        path.write_text(f"Módulo: {module}\nMiembros que faltan: {', '.join(unit['members'])}\n\n"
                        + "\n".join(unit["diagnostics"]) + "\n", encoding="utf-8")
        lines.append(" ".join([f"module:{module}", str(path), *unit["consumers"]]))
    (args.bench / "items.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"modules plan: {len(units)} módulo(s), "
          f"{sum(len(u['consumers']) for u in units.values())} consumidor(es) -> {args.bench / 'items.txt'}")
    return 0


def shared_units(diagnostics, duplicates: dict[str, list[str]], prefix: str) -> list[dict]:
    """La ruta 2 como unidades: una por definición duplicada, de la más citada
    a la menos (la cola de `classify`). Objetivos: consumidores y copias."""
    routes = tsc_routes.classify(diagnostics, duplicates)
    by_type: dict[str, list] = {}
    for d in routes["shared"]:
        by_type.setdefault(tsc_routes.shared_type(d, duplicates), []).append(d)
    units = []
    for entry in tsc_routes.shared_queue(routes["shared"], duplicates):
        definitions = [f"{prefix}{f}" for f in entry["definitions"]]
        units.append({"type": entry["type"], "definitions": definitions,
                      "targets": sorted(set(entry["consumers"]) | set(definitions)),
                      "diagnostics": [f"{d.file}({d.line}): error {d.code}: {d.message}"
                                      for d in by_type[entry["type"]]]})
    return units


def cmd_shared_plan(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    packages = args.root / "src" / "packages"
    units = shared_units(diagnostics, tsc_routes.duplicated_types(packages), "src/packages/")
    if args.top:
        units = units[: args.top]
    if not units:
        print(f"tsc_cycle shared plan: {args.log} no tiene causas compartidas — nada que unificar",
              file=sys.stderr)
        return 2
    items = args.bench / "items"
    items.mkdir(parents=True, exist_ok=True)
    lines = []
    for n, unit in enumerate(units, 1):
        path = items / f"{n}.txt"
        path.write_text(f"Tipo: {unit['type']}\nCopias:\n" + "".join(f"  {d}\n" for d in unit["definitions"])
                        + "\n" + "\n".join(unit["diagnostics"]) + "\n", encoding="utf-8")
        lines.append(" ".join([f"type:{unit['type']}", str(path), *unit["targets"]]))
    (args.bench / "items.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"shared plan: {len(units)} definición(es), "
          f"{sum(len(u['diagnostics']) for u in units)} diagnóstico(s) -> {args.bench / 'items.txt'}")
    return 0


# Orden del plan v3 (tres rutas). Lo determinista que resuelven los
# proponentes (`tsc_zero_loop`) es lo que no es una exportación ausente: ésa
# es un porte y va por módulo.
ROUTE_ORDER = ("deterministic", "modules", "shared", "local")
ROUTE_COMMANDS = {
    # Forma de `zero-loop-4` (manifiesto del trabajo): identidad del commit,
    # proponentes y tsc tras sus dos `--`; sin ellos el lazo sale 2.
    "deterministic": ('eval "$(bash bin/commit_identity env </dev/null)"; bash bin/tsc_zero_loop --root .'
                      " --loop-dir <paso> --max-steps 3 --seed N -- bin/tsc_proposers --"
                      " bunx tsc --noEmit -p tsconfig.json --pretty false"),
    "modules": "bash bin/tsc_cycle modules plan --log <log> --bench <paso> && bash bin/tsc_cycle modules launch …",
    "shared": "bash bin/tsc_cycle shared plan --log <log> --bench <paso> --top 1 && bash bin/tsc_cycle shared launch …",
    "local": "pool por archivo: pool_pipeline --unit file (ruta 3)",
}


def next_route(diagnostics, duplicates: dict[str, list[str]], exhausted: frozenset[str] | set[str] = frozenset()) -> str:
    """La ruta que toca ahora según el plan v3: la primera con trabajo que no
    se haya declarado agotada. Una ruta se agota cuando su lazo termina
    `stalled`: tiene diagnósticos y no sabe producir nada para ellos (paso
    132). Si todas las que tienen trabajo están agotadas, devuelve
    `exhausted`, que no es lo mismo que `none`."""
    if not diagnostics:
        return "none"
    routes = tsc_routes.classify(diagnostics, duplicates)
    missing = {id(d) for d in routes["deterministic"]
               if d.code in MISSING_EXPORT_CODES and MISSING_EXPORT.search(d.message)}
    pending = {
        "deterministic": [d for d in routes["deterministic"] if id(d) not in missing],
        "modules": [d for d in routes["deterministic"] if id(d) in missing],
        "shared": routes["shared"],
        "local": routes["local"],
    }
    with_work = [route for route in ROUTE_ORDER if pending[route]]
    available = [route for route in with_work if route not in exhausted]
    return available[0] if available else "exhausted"


def cmd_next(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    route = next_route(diagnostics, tsc_routes.duplicated_types(args.root / "src" / "packages"),
                       exhausted=set(args.exhausted))
    if route == "none":
        # Un log sin diagnósticos no distingue «cero» de «tsc no corrió».
        print(f"tsc_cycle next: {args.log} sin diagnósticos — el cero lo confirma una medición", file=sys.stderr)
        return 2
    if route == "exhausted":
        print(f"tsc_cycle next: toda ruta con trabajo está agotada ({', '.join(sorted(args.exhausted))}); "
              "el siguiente paso no es un lazo, es juicio sobre lo que queda", file=sys.stderr)
        return 2
    print(f"next: {route} — {ROUTE_COMMANDS[route]}")
    return 0


def cmd_compare(args) -> int:
    """El antes y el después de una medición, con la misma comparación que
    usa el paso (`_new_diagnostics`): un error que sólo cambió de línea no
    cuenta como nuevo."""
    missing = [p for p in (args.before, args.after) if not p.is_file()]
    if missing:
        print(f"tsc_cycle compare: no existe {missing[0]} — no se publica una cifra", file=sys.stderr)
        return 2
    before = args.before.read_text(encoding="utf-8", errors="ignore").splitlines()
    after = args.after.read_text(encoding="utf-8", errors="ignore").splitlines()
    new, _ = _new_diagnostics(before, after)
    gone, _ = _new_diagnostics(after, before)
    total = len(tsc_routes.parse_diagnostics("\n".join(after)))
    print(f"total {total} desaparecidos {len(gone)} nuevos {len(new)}")
    for line in new:
        print(f" + {line[:200]}")
    return 0


def launch_commands(bench: Path, model: str, worktree: Path, ledger: Path, seed: int,
                    width: int = 8, route: str = "modules") -> list[list[str]]:
    """Los dos trabajos del paso: el pool (juicio, un `claude -p` por módulo,
    repartido por GNU Parallel) y el pipeline (aplica y mide por lotes en
    `worktree` mientras el pool sigue). Ninguno es un subagente."""
    items, outputs = bench / "items.txt", bench / "outputs"
    shared = route == "shared"
    prompt = SHARED_PROMPT if shared else MODULE_PROMPT
    pool = (f"bash bin/headless-pool --prompt {shlex.quote(str(prompt))} --out {shlex.quote(str(outputs))}"
            f" --model {shlex.quote(model)} --width {width} --memfree 3G --timeout 900"
            f" --tools Read,Grep,Glob --max-turns 30 < {shlex.quote(str(items))}")
    pipeline = [sys.executable, "src/verify/pool_pipeline.py", "--main", ".", "--worktree", str(worktree),
                "--items", str(items), "--outputs", str(outputs), "--bench", str(bench / "pipeline"),
                "--ledger", str(ledger), "--seed", str(seed),
                # Ruta 2: de a una y con la política neta (plan v3, paso 3):
                # el efecto de cada unificación se mide antes de la siguiente.
                "--batch", "1" if shared else "5", "--poll", "10", "--unit", "module",
                *(["--net"] if shared else []), "--", "bash", "-c", "bunx tsc --noEmit -p tsconfig.json"]
    name = bench.name
    return [["bash", "bin/thyrox-bg", "start", f"{name}-pool", "--grace", "0", "--", "bash", "-c", pool],
            ["bash", "bin/thyrox-bg", "start", f"{name}-pipeline", "--grace", "0", "--",
             "env", f"PYTHONPATH={THYROX / 'src'}", *pipeline]]


def cmd_modules_launch(args) -> int:
    if not (args.bench / "items.txt").is_file():
        print(f"tsc_cycle modules launch: falta {args.bench / 'items.txt'} — corre antes `modules plan`",
              file=sys.stderr)
        return 2
    commands = launch_commands(args.bench, args.model, args.worktree, args.ledger, args.seed, args.width,
                               route=getattr(args, "route", "modules"))
    for command in commands:
        print(shlex.join(command))
        if not args.dry_run:
            subprocess.run(command, check=True, cwd=THYROX)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("classify", help="reparte los diagnósticos de un log en las tres rutas")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--packages", type=Path, default=Path("src/packages"))
    p.add_argument("--out", type=Path, required=True)
    p.set_defaults(func=cmd_classify)
    p = sub.add_parser("status", help="progreso del paso sin bloquear: pool, lotes y trabajo")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--job-dir", type=Path)
    p.set_defaults(func=cmd_status)
    p = sub.add_parser("reject", help="revierte un archivo rechazado en revisión y lo registra")
    p.add_argument("--run", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--lesson", required=True)
    p.set_defaults(func=cmd_reject)
    modules = sub.add_parser("modules", help="el módulo como unidad: pool de claude -p y pipeline de medición")
    msub = modules.add_subparsers(dest="modules_command", required=True)
    p = msub.add_parser("plan", help="deriva un ítem por módulo con exportaciones ausentes")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX, help="árbol contra el que se resuelven los módulos")
    p.set_defaults(func=cmd_modules_plan)
    p = msub.add_parser("launch", help="lanza el pool y el pipeline con thyrox-bg")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--worktree", type=Path, required=True)
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true", help="imprime los comandos sin lanzarlos")
    p.set_defaults(func=cmd_modules_launch, route="modules")
    shared = sub.add_parser("shared", help="ruta 2: una definición duplicada por unidad, medida de a una")
    ssub = shared.add_subparsers(dest="shared_command", required=True)
    p = ssub.add_parser("plan", help="un ítem por definición duplicada, en el orden de la cola")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--top", type=int, help="sólo las N más citadas")
    p.set_defaults(func=cmd_shared_plan)
    p = ssub.add_parser("launch", help="lanza el pool y el pipeline de la ruta 2 con thyrox-bg")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--worktree", type=Path, required=True)
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_modules_launch, route="shared")
    p = sub.add_parser("compare", help="antes y después de una medición de tsc")
    p.add_argument("before", type=Path)
    p.add_argument("after", type=Path)
    p.set_defaults(func=cmd_compare)
    p = sub.add_parser("next", help="la ruta que toca según el plan v3 (1 → 2 → 3)")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--exhausted", action="append", default=[], choices=ROUTE_ORDER,
                   help="una ruta cuyo lazo terminó stalled; repetible")
    p.set_defaults(func=cmd_next)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
