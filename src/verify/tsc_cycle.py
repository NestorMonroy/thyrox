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

from agents import model_catalog
from verify import step_setup, tsc_reflect, tsc_routes, tsc_sweep
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
LOCAL_PROMPT = Path("src/verify/prompts/file-local.md")
SWEEP_PROMPT = Path("src/verify/prompts/pattern-sweep.md")
#: El verificador del pipeline: parte de la configuración del paso (step_setup).
TSC_COMMAND = ["bash", "-c", "bunx tsc --noEmit -p tsconfig.json"]


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


# Ruta 3: el ítem es un archivo y un trozo de sus diagnósticos, con el código
# que los rodea. Antes vivía como guion de banco (step-120/build_items.py): el
# contexto en el ítem evita que el `claude -p` gaste turnos leyendo, lo que en
# el paso 114 dejó sin salida 19 de 29 ítems.
LOCAL_CONTEXT_LINES = 10
LOCAL_HEAD = re.compile(r"^(?P<file>[^\s(]+)\((?P<line>\d+),(?P<col>\d+)\): error TS\d+:")


def local_items(log: str, root: Path, excluded: set[str], size: int) -> list[tuple[str, str]]:
    """(archivo, texto del ítem) por trozo de a lo sumo `size` diagnósticos."""
    by_file: dict[str, list[tuple[int, list[str]]]] = {}
    current: list[str] | None = None
    for raw in log.splitlines():
        match = LOCAL_HEAD.match(raw)
        if match:
            current = [raw]
            by_file.setdefault(match["file"], []).append((int(match["line"]), current))
        elif raw.startswith(" ") and current is not None:
            current.append(raw)
        else:
            current = None
    items = []
    for file, entries in by_file.items():
        if file in excluded or not file.startswith("src/") or not (root / file).is_file():
            continue
        source = (root / file).read_text(encoding="utf-8", errors="ignore").splitlines()
        for start in range(0, len(entries), size):
            blocks = []
            for line, lines in entries[start:start + size]:
                low = max(1, line - LOCAL_CONTEXT_LINES)
                high = min(len(source), line + LOCAL_CONTEXT_LINES)
                context = [f"  --- código {file}:{low}-{high} ---"]
                context += [f"  {n:5d}{'>' if n == line else ' '} {source[n - 1]}" for n in range(low, high + 1)]
                blocks.append("\n".join([lines[0], *context, *lines[1:]]))
            items.append((file, "\n".join(blocks) + "\n"))
    return items


def cmd_local_plan(args) -> int:
    excluded = set()
    if args.exclude:
        excluded = {line.strip() for line in args.exclude.read_text().splitlines() if line.strip()}
    return plan_local(args.log, args.bench, args.root, args.run, excluded, args.size)


#: Un archivo sale de la ruta local con al menos estos intentos juzgados…
DEFER_MIN_TRIALS = 3
#: …y una media de éxito no mayor que ésta (0 de 3 da 0.2).
DEFER_MAX_MEAN = 0.25
SOURCE_SUFFIXES = (".ts", ".tsx")


def file_confidence(ledger: Path) -> dict[str, dict]:
    """Éxito por archivo en la ruta local (L03, self-evolving-agents-2026):
    las propuestas `agent:pool:<archivo>` que el ledger juzgó. Éxito =
    `accepted*`, fracaso = `rejected*`, el resto neutro; `mean` es la media
    de Laplace. Los barridos (`agent:pool:pattern:…`) no cuentan: su unidad
    es el patrón, no el archivo.

    Ciega a: la dificultad que cambia cuando otro paso toca el archivo; la
    media pondera igual un rechazo viejo que uno reciente."""
    counts: dict[str, dict] = {}
    for line in ledger.read_text().splitlines() if ledger.exists() else []:
        if not line.strip():
            continue
        row = json.loads(line)
        pid = row.get("proposal_id", "")
        if not pid.startswith("agent:pool:") or not pid.endswith(SOURCE_SUFFIXES):
            continue
        file = pid[len("agent:pool:"):]
        if file.startswith(("pattern:", "module:", "type:")):
            continue
        entry = counts.setdefault(file, {"accepted": 0, "rejected": 0, "neutral": 0})
        outcome = row.get("outcome", "")
        entry["accepted" if outcome.startswith("accepted") else
              "rejected" if outcome.startswith("rejected") else "neutral"] += 1
    for entry in counts.values():
        entry["mean"] = (entry["accepted"] + 1) / (entry["accepted"] + entry["rejected"] + 2)
    return counts


def plan_local(log_path: Path, bench: Path, root: Path, run: Path, excluded: set[str], size: int) -> int:
    """El plan de la ruta 3 detrás del gate 4; 2 si no hay nada que proponer."""
    log = log_path.read_text(encoding="utf-8", errors="ignore") if log_path.is_file() else ""
    pending = tsc_reflect.blocking_pending(run, log.splitlines(), [])
    # Las instancias en archivos que otro paso tiene en vuelo (`excluded`) no
    # bloquean: ése las resuelve, y este plan no las toca. Sin descontarlas,
    # el solape (`local overlap`) rehusaba por trabajo que ya estaba en curso.
    pending = {name: kept for name, found in pending.items()
               if (kept := {file: n for file, n in found.items() if file not in excluded})}
    if pending:
        # Gate 4 del plan v2.2.0: con instancias vivas de un patrón en memoria,
        # la ruta por archivo no arranca; primero se barre (H-THYROX-186).
        instances = sum(sum(found.values()) for found in pending.values())
        print(f"tsc_cycle local plan: GATE 4 BLOQUEADO: {len(pending)} patrón(es) de la memoria con "
              f"{instances} instancia(s) viva(s) sin aplicar, excluir ni cerrar; corre antes "
              "`tsc_cycle sweep plan`", file=sys.stderr)
        return 2
    confidence = file_confidence(run / "ledger.jsonl")
    # Lo que el agente no resuelve tras intentos suficientes no vuelve al pool:
    # va a otra ruta. Lo FÁCIL no se castiga (divergencia declarada de p(1-p):
    # el objetivo es 0 errores, no entrenar), así que el resto se ordena de
    # mayor a menor probabilidad de éxito.
    deferred = {file: entry for file, entry in confidence.items()
                if entry["accepted"] + entry["rejected"] >= DEFER_MIN_TRIALS and entry["mean"] <= DEFER_MAX_MEAN}
    items = local_items(log, root, excluded | set(deferred), size)
    items.sort(key=lambda item: -confidence.get(item[0], {"mean": 0.5})["mean"])
    live = {file for file, _ in local_items(log, root, excluded, size)}
    if deferred.keys() & live:
        bench.mkdir(parents=True, exist_ok=True)
        (bench / "deferred.txt").write_text("".join(
            f"{file}\t{entry['accepted']} de {entry['accepted'] + entry['rejected']} aceptadas "
            f"(media {entry['mean']:.2f})\truta: modules o manual\n"
            for file, entry in sorted(deferred.items()) if file in live))
    if not items:
        print(f"tsc_cycle local plan: {log_path} no tiene diagnósticos locales fuera de lo excluido — "
              "nada que proponer", file=sys.stderr)
        return 2
    write_items(bench, items)
    return 0


def in_flight_files(bench: Path) -> set[str] | None:
    """Los archivos que el paso `bench` tiene en vuelo: la primera columna de
    su `items.txt`. `None` si no existe: sin él no se sabe qué está en vuelo."""
    items = bench / "items.txt"
    if not items.is_file():
        return None
    return {line.split()[0] for line in items.read_text().splitlines() if line.strip()}


def cmd_local_overlap(args) -> int:
    """El paso N+1 de la ruta 3 sobre la cola del paso N (1F1B, cs25-v6 L04):
    planea sólo archivos disjuntos de los que el N tiene en vuelo, arranca el
    pool ya y declara el pipeline con `--after-ok` al del N, que sólo lo
    lanza si el N asienta con 0 — entonces el árbol principal ya tiene lo que
    el N exportó y es la base que el N+1 mide."""
    in_flight = in_flight_files(args.after)
    if in_flight is None:
        print(f"tsc_cycle local overlap: falta {args.after / 'items.txt'} — sin él no se sabe qué "
              "tiene en vuelo el paso anterior, y adelantar podría tocar sus archivos", file=sys.stderr)
        return 2
    code = plan_local(args.log, args.bench, args.root, args.run, in_flight, args.size)
    if code:
        return code
    planned = in_flight_files(args.bench) or set()
    if planned & in_flight:
        print(f"tsc_cycle local overlap: el plan toca archivos en vuelo: {sorted(planned & in_flight)}",
              file=sys.stderr)
        return 2
    name, previous = args.bench.name, args.after.name
    setup = step_setup_of(args.bench, args.model, args.worktree, "local")
    if not args.dry_run:
        step_setup.register(args.ledger.parent, setup)
    pool, pipeline = launch_commands(args.bench, args.model, args.worktree, args.ledger, args.seed, args.width,
                                     route="local", setup_id=setup["setup_id"])
    run = f"cd {shlex.quote(str(THYROX))} && {shlex.join(pipeline[pipeline.index('--') + 1:])}"
    commands = [pool, ["bash", "bin/thyrox-bg", "register", f"{name}-pool"],
                ["bash", "bin/wait-jobs", "register", f"{name}-pipeline", str(args.bench / "pipeline.log"),
                 "--after-ok", f"{previous}-pipeline", "--run", run],
                close_registration(args.bench, args.ledger.parent)]
    for command in commands:
        print(shlex.join(command))
        if not args.dry_run:
            subprocess.run(command, check=True, cwd=THYROX)
    return 0


def write_items(bench: Path, items: list[tuple[str, str]]) -> None:
    """Un `items/<n>.txt` por ítem y el `items.txt` que el pool lee."""
    directory = bench / "items"
    directory.mkdir(parents=True, exist_ok=True)
    lines = []
    for n, (file, text) in enumerate(items, 1):
        path = directory / f"{n}.txt"
        path.write_text(text, encoding="utf-8")
        lines.append(f"{file} {path}")
    (bench / "items.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"local plan: {len(items)} ítem(s) sobre {len({f for f, _ in items})} archivo(s) -> "
          f"{bench / 'items.txt'}")


def _matching_log(log: str, keep) -> str:
    """El log con sólo los diagnósticos (y sus líneas encadenadas) que `keep`
    acepta; `keep` recibe el archivo y la clave `archivo: TSxxxx: mensaje`."""
    kept, taking = [], False
    for raw in log.splitlines():
        match = LOCAL_HEAD.match(raw)
        if match:
            header = tsc_routes.HEADER.match(raw)
            key = f"{header['file']}: {header['code']}: {header['message']}" if header else raw
            taking = keep(match["file"], key)
        elif not raw.startswith(" "):
            taking = False
        if taking:
            kept.append(raw)
    return "\n".join(kept)


def sweep_items(run: Path, log: str, root: Path) -> list[tuple[str, list[str], str]]:
    """(patrón, archivos vivos, texto del ítem) por cada patrón de la memoria
    con instancias vivas sin aplicar, excluir ni cerrar."""
    rows = {row["name"]: row for row in tsc_sweep.load_patterns(run).values()}
    items = []
    for name, found in tsc_reflect.blocking_pending(run, log.splitlines(), []).items():
        row, files = rows[name], sorted(found)
        signal = re.compile(row["signal"])
        wanted = set(files)
        filtered = _matching_log(log, lambda file, key: file in wanted and bool(signal.search(key)))
        blocks = [text for _, text in local_items(filtered, root, set(), size=10 ** 6)]
        header = [f"Patrón: {name}", f"Señal del verificador: {row['signal']}",
                  f"Arreglo genérico: {row['fix']}",
                  f"Ya aplicado en: {', '.join(row.get('applied', [])) or '(ninguno)'}",
                  f"Archivos donde la señal sigue viva: {', '.join(files)}", ""]
        items.append((name, files, "\n".join(header) + "\n" + "\n".join(blocks)))
    return items


def cmd_sweep_plan(args) -> int:
    log = args.log.read_text(encoding="utf-8", errors="ignore") if args.log.is_file() else ""
    items = sweep_items(args.run, log, args.root)
    if not items:
        print(f"tsc_cycle sweep plan: ningún patrón de {args.run} tiene instancias vivas en {args.log}",
              file=sys.stderr)
        return 2
    directory = args.bench / "items"
    directory.mkdir(parents=True, exist_ok=True)
    lines = []
    for n, (name, files, text) in enumerate(items, 1):
        path = directory / f"{n}.txt"
        path.write_text(text, encoding="utf-8")
        lines.append(" ".join([f"pattern:{name}", str(path), *files]))
    (args.bench / "items.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    # El registro que `tsc_reflect.sweep_gate` exige: el paso revisó patrones.
    (args.bench / "gate4.json").write_text(json.dumps({"reviewed": [name for name, _, _ in items]}) + "\n")
    print(f"sweep plan: {len(items)} patrón(es) sobre {len({f for _, files, _ in items for f in files})} "
          f"archivo(s) -> {args.bench / 'items.txt'}")
    return 0


# Orden del plan v3 (tres rutas). Lo determinista que resuelven los
# proponentes (`tsc_zero_loop`) es lo que no es una exportación ausente: ésa
# es un porte y va por módulo.
ROUTE_ORDER = ("deterministic", "modules", "shared", "sweep", "local")
ROUTE_COMMANDS = {
    # Forma de `zero-loop-4` (manifiesto del trabajo): identidad del commit,
    # proponentes y tsc tras sus dos `--`; sin ellos el lazo sale 2.
    "deterministic": ('eval "$(bash bin/commit_identity env </dev/null)"; bash bin/tsc_zero_loop --root .'
                      " --loop-dir <paso> --max-steps 3 --seed N -- bin/tsc_proposers --"
                      " bunx tsc --noEmit -p tsconfig.json --pretty false"),
    "modules": "bash bin/tsc_cycle modules plan --log <log> --bench <paso> && bash bin/tsc_cycle modules launch …",
    "shared": "bash bin/tsc_cycle shared plan --log <log> --bench <paso> --top 1 && bash bin/tsc_cycle shared launch …",
    "sweep": "bash bin/tsc_cycle sweep plan --log <log> --bench <paso> --run <corrida> && bash bin/tsc_cycle sweep launch …",
    "local": "bash bin/tsc_cycle local plan --log <log> --bench <paso> --exclude <en-vuelo> && bash bin/tsc_cycle local launch …",
}


def _log_lines(diagnostics) -> list[str]:
    """Las cabeceras de un log reconstruidas desde sus diagnósticos."""
    return [f"{d.file}({d.line},1): error {d.code}: {d.message}" for d in diagnostics]


def next_route(diagnostics, duplicates: dict[str, list[str]], exhausted: frozenset[str] | set[str] = frozenset(),
               run: Path | None = None) -> str:
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
        # Paso 4 del plan v2.2.0: lo que la memoria ya sabe arreglar va antes
        # que la ruta por archivo (H-THYROX-186).
        "sweep": (list(tsc_reflect.blocking_pending(run, _log_lines(diagnostics), []))
                  if run is not None else []),
        "local": routes["local"],
    }
    with_work = [route for route in ROUTE_ORDER if pending[route]]
    available = [route for route in with_work if route not in exhausted]
    return available[0] if available else "exhausted"


def cmd_next(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    route = next_route(diagnostics, tsc_routes.duplicated_types(args.root / "src" / "packages"),
                       exhausted=set(args.exhausted), run=args.run)
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


def _step_number(bench: Path) -> int | None:
    match = re.fullmatch(r"step-(\d+)", bench.name)
    return int(match.group(1)) if match else None


def previous_item_bound(bench: Path) -> float | None:
    """La duración, en minutos, del ítem más largo del paso anterior medido.

    Ningún hueco entre dos turnos de un `claude -p` supera la duración de su
    ítem, así que el más largo acota el hueco que decide el TTL. `None` si no
    hay paso anterior con salidas: sin medición no se inventa una cota."""
    current = _step_number(bench)
    if current is None:
        return None
    previous = sorted((n, p) for p in bench.parent.glob("step-*")
                      if (n := _step_number(p)) is not None and n < current)
    for _, step in reversed(previous):
        durations = []
        for path in (step / "outputs").glob("*.json"):
            try:
                duration = json.loads(path.read_text()).get("duration_ms")
            except (ValueError, AttributeError):
                continue
            if isinstance(duration, (int, float)):
                durations.append(duration / 60000)
        if durations:
            return round(max(durations), 2)
    return None


def pool_cache_ttl(bench: Path, model: str) -> tuple[str | None, str]:
    """El TTL de la caché de cada `claude -p` del pool y su porqué: el que
    `choose_cache_ttl` da para la cota del paso anterior. Sin cota, o con un
    modelo fuera del catálogo, `None`: lo decide el cliente, y se dice."""
    bound = previous_item_bound(bench)
    if bound is None:
        return None, "sin paso anterior medido: el TTL lo decide el cliente"
    catalog, reason = model_catalog.try_catalog()
    if catalog is None:
        return None, reason or "sin catálogo de modelos"
    try:
        ttl, why = model_catalog.choose_cache_ttl(catalog, model, bound)
    except KeyError as error:
        return None, str(error)
    return ttl, f"ítem más largo del paso anterior {bound} min: {why}"


def step_setup_of(bench: Path, model: str, worktree: Path | list[Path], route: str,
                  cache_ttl: str | None = None) -> dict:
    """La configuración con que el pipeline juzgará el paso (L02): ruta,
    modelo, el scaffold de la ruta, el verificador y la política, que incluye
    el TTL de caché del pool."""
    shared = route == "shared"
    worktrees = worktree if isinstance(worktree, list) else [worktree]
    prompt = {"shared": SHARED_PROMPT, "local": LOCAL_PROMPT, "sweep": SWEEP_PROMPT}.get(route, MODULE_PROMPT)
    return step_setup.setup_record(route=route, model=model, scaffold=THYROX / prompt, verifier=TSC_COMMAND,
                                   policy={"net": shared, "batch": len(worktrees) if shared else 5,
                                           "cache_ttl": cache_ttl})


def launch_commands(bench: Path, model: str, worktree: Path | list[Path], ledger: Path, seed: int,
                    width: int = 8, route: str = "modules", setup_id: str | None = None,
                    cache_ttl: str | None = None) -> list[list[str]]:
    """Los dos trabajos del paso: el pool (juicio, un `claude -p` por módulo,
    repartido por GNU Parallel) y el pipeline (aplica y mide por lotes en
    `worktree` mientras el pool sigue). Ninguno es un subagente."""
    items, outputs = bench / "items.txt", bench / "outputs"
    shared = route == "shared"
    worktrees = worktree if isinstance(worktree, list) else [worktree]
    # Sólo la ruta 2 especula: con su política neta, N worktrees miden N
    # prefijos a la vez (`prefix_speculation`). La de módulos usa el primero.
    worktrees = worktrees if shared else worktrees[:1]
    prompt = {"shared": SHARED_PROMPT, "local": LOCAL_PROMPT, "sweep": SWEEP_PROMPT}.get(route, MODULE_PROMPT)
    unit = "file" if route == "local" else "module"
    pool = (f"bash bin/headless-pool --prompt {shlex.quote(str(prompt))} --out {shlex.quote(str(outputs))}"
            f" --model {shlex.quote(model)} --width {width} --memfree 3G --timeout 900"
            f" --tools Read,Grep,Glob --max-turns 30"
            + (f" --cache-ttl {cache_ttl}" if cache_ttl else "")
            + f" < {shlex.quote(str(items))}")
    pipeline = [sys.executable, "src/verify/pool_pipeline.py", "--main", ".",
                *[arg for wt in worktrees for arg in ("--worktree", str(wt))],
                "--items", str(items), "--outputs", str(outputs), "--bench", str(bench / "pipeline"),
                "--ledger", str(ledger), "--seed", str(seed),
                # Ruta 2: de a una y con la política neta (plan v3, paso 3):
                # el efecto de cada unificación se mide antes de la siguiente.
                "--batch", str(len(worktrees)) if shared else "5", "--poll", "10", "--unit", unit,
                *(["--net"] if shared else []), *(["--setup-id", setup_id] if setup_id else []),
                "--", *TSC_COMMAND]
    name = bench.name
    return [["bash", "bin/thyrox-bg", "start", f"{name}-pool", "--grace", "0", "--", "bash", "-c", pool],
            ["bash", "bin/thyrox-bg", "start", f"{name}-pipeline", "--grace", "0", "--",
             "env", f"PYTHONPATH={THYROX / 'src'}", *pipeline]]


def close_registration(bench: Path, run: Path) -> list[str]:
    """El cierre del paso (`step_close`) declarado con `--after-ok` a su
    pipeline: no lanza nada ahora; `dispatch` lo corre si el pipeline asienta
    con 0, y lo cancela nombrándolo si no. Así el informe, el commit, el
    trinquete y el push no dependen de que alguien se acuerde."""
    command = (f"cd {shlex.quote(str(THYROX))} && bash bin/step_close --bench {shlex.quote(str(bench))} "
               f"--run {shlex.quote(str(run))}")
    return ["bash", "bin/wait-jobs", "register", f"{bench.name}-close", str(bench / "close.log"),
            "--after-ok", f"{bench.name}-pipeline", "--run", command]


def cmd_modules_launch(args) -> int:
    if not (args.bench / "items.txt").is_file():
        print(f"tsc_cycle modules launch: falta {args.bench / 'items.txt'} — corre antes `modules plan`",
              file=sys.stderr)
        return 2
    route = getattr(args, "route", "modules")
    cache_ttl, ttl_why = pool_cache_ttl(args.bench, args.model)
    print(f"cache-ttl: {cache_ttl or '(del cliente)'} — {ttl_why}", file=sys.stderr)
    setup = step_setup_of(args.bench, args.model, args.worktree, route, cache_ttl=cache_ttl)
    if not args.dry_run:
        step_setup.register(args.ledger.parent, setup)
    commands = launch_commands(args.bench, args.model, args.worktree, args.ledger, args.seed, args.width,
                               route=route, setup_id=setup["setup_id"], cache_ttl=cache_ttl)
    # Al ledger, para que la barrera los recoja y una arista `--after-ok` de
    # `local overlap` tenga predecesor: sin registrar, `dispatch` lo reporta
    # SIN-PREDECESOR y el paso siguiente no mide nunca.
    commands += [["bash", "bin/thyrox-bg", "register", f"{args.bench.name}-{job}"] for job in ("pool", "pipeline")]
    commands.append(close_registration(args.bench, args.ledger.parent))
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
    p.add_argument("--worktree", type=Path, action="append", required=True,
                   help="repetible: dos worktrees miden dos prefijos a la vez")
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_modules_launch, route="shared")
    local = sub.add_parser("local", help="ruta 3: un ítem por archivo y trozo de diagnósticos")
    lsub = local.add_subparsers(dest="local_command", required=True)
    p = lsub.add_parser("plan", help="deriva los ítems por archivo con su código alrededor")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--run", type=Path, required=True,
                   help="la corrida cuya memoria (patterns.jsonl) decide el gate 4")
    p.add_argument("--exclude", type=Path, help="archivos que otra ruta tiene en vuelo, uno por línea")
    p.add_argument("--size", type=int, default=2, help="diagnósticos por ítem")
    p.set_defaults(func=cmd_local_plan)
    p = lsub.add_parser("launch", help="lanza el pool y el pipeline de la ruta 3 con thyrox-bg")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--worktree", type=Path, required=True)
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_modules_launch, route="local")
    p = lsub.add_parser("overlap", help="el paso siguiente sobre la cola del actual: archivos disjuntos, "
                                        "pool ya y pipeline tras el OK del anterior")
    p.add_argument("--after", type=Path, required=True, help="el bench del paso en vuelo")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--run", type=Path, required=True)
    p.add_argument("--size", type=int, default=2)
    p.add_argument("--worktree", type=Path, required=True)
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_local_overlap)
    sweep = sub.add_parser("sweep", help="paso 4 del plan v2.2.0: un ítem por patrón de la memoria")
    wsub = sweep.add_subparsers(dest="sweep_command", required=True)
    p = wsub.add_parser("plan", help="un ítem por patrón con instancias vivas, y gate4.json")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--run", type=Path, required=True)
    p.set_defaults(func=cmd_sweep_plan)
    p = wsub.add_parser("launch", help="lanza el pool y el pipeline del barrido con thyrox-bg")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--worktree", type=Path, required=True)
    p.add_argument("--ledger", type=Path, required=True)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--model", default="claude-sonnet-5")
    p.add_argument("--width", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_modules_launch, route="sweep")
    p = sub.add_parser("compare", help="antes y después de una medición de tsc")
    p.add_argument("before", type=Path)
    p.add_argument("after", type=Path)
    p.set_defaults(func=cmd_compare)
    p = sub.add_parser("next", help="la ruta que toca según el plan v3 (1 → 2 → 3)")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--root", type=Path, default=THYROX)
    p.add_argument("--run", type=Path, help="la corrida cuya memoria decide la ruta de barrido")
    p.add_argument("--exhausted", action="append", default=[], choices=ROUTE_ORDER,
                   help="una ruta cuyo lazo terminó stalled; repetible")
    p.set_defaults(func=cmd_next)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
