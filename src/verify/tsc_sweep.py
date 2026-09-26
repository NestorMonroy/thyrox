#!/usr/bin/env python3
"""Barrido proactivo de un patrón aprendido — el paso 4 del plan v2
(«aplicar cada patrón de MEMORIA a TODO el código restante, sin esperar a
que el verificador señale cada instancia»).

Un patrón vive en `patterns.jsonl`, junto al registro y las reflexiones
(`tsc_reflect`), con los campos del formato del plan: `name`, `signal`
(regex sobre la clave `archivo: TSxxxx: mensaje` que lo delata), `fix`
(el arreglo en lenguaje), y — cuando el arreglo es mecánico — `site` y
`replace`, una regla de sustitución por línea (`re.M`). `include` acota las
rutas; `exclude` y `applied` sacan archivos del barrido.

El barrido NO escribe en el árbol ni decide nada: produce candidatas con el
formato de `agent_proposal` (bases = texto actual, edición mínima por
archivo) y las juzga `tsc_zero_step`. Por defecto sale UNA propuesta con
todos los sitios, para la política neta; `--split` da una por archivo, para
cuando el grupo no pasa y hay que ver cuál sitio lo hunde. Los objetivos son
globales — los diagnósticos que casan la señal en todo el log — porque el
error de un alias suele vivir en sus consumidores, no en el archivo del
alias.

Rehúsa sin sitios o sin objetivos: un barrido sin señal que lo respalde no
aporta (lección del paso 13 del lazo, en `reflections.jsonl`).

Uso::

    bin/tsc_sweep add-pattern --run R --name N --signal RE --fix TEXTO \\
        [--site RE --replace T] [--include RE] [--exclude archivo ...]

Sin `--site`/`--replace` el patrón es NO mecánico: queda en la memoria y
`agent_proposal` nombra los archivos donde su señal sigue viva, pero
`propose` lo rehúsa.
    bin/tsc_sweep propose --run R --name N --before-log L [--split] > candidatas.jsonl
    bin/tsc_sweep applied --run R --name N archivo...
    bin/tsc_sweep exclude --run R --name N --reason TEXTO archivo...
    bin/tsc_sweep close --run R --name N --reason TEXTO
    bin/tsc_sweep revert --run R --name N
    bin/tsc_sweep confidence --run R
    bin/tsc_sweep evict --run R --reason TEXTO [--min-trials 3] [--max-mean 0.25]

La memoria se gobierna con los cinco mecanismos que pide BALTO
(self-evolving-agents-2026, lección 7): alcance (`include`/`exclude`),
versión (`version`, `history`, `revert`), deduplicación (la misma señal con
el mismo alcance se funde como alias), confianza (`confidence`, medida por
ejecución real en el ledger) y descarte (`evict`, `close`).
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from verify.agent_proposal import _minimal_edit
from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key

PATTERNS = "patterns.jsonl"
LEDGER = "ledger.jsonl"
#: Los campos cuyo cambio es una versión nueva del patrón.
VERSIONED = ("signal", "fix", "site", "replace", "include", "on_failure", "done_when")
#: Recuperación ante un fallo del barrido (L07): excluir el archivo rechazado
#: con su razón, o cerrar el patrón (su regla está mal, no el archivo).
ON_FAILURE = ("exclude-file", "close-pattern")
#: Criterio de terminación: el patrón acaba cuando su señal no tiene
#: instancias vivas en su alcance (lo que mide el gate 4).
DONE_WHEN = ("no-live-instances",)
SUFFIXES = (".ts", ".tsx")


def load_patterns(run: Path) -> dict[str, dict]:
    path = run / PATTERNS
    rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()] if path.exists() else []
    return {row["name"]: row for row in rows}


def _save(run: Path, patterns: dict[str, dict]) -> None:
    (run / PATTERNS).write_text("".join(json.dumps(p, ensure_ascii=False) + "\n"
                                        for p in patterns.values()))


def add_pattern(run: Path, pattern: dict) -> dict:
    for key in ("name", "signal", "fix"):
        if not str(pattern.get(key, "")).strip():
            raise ValueError(f"un patrón sin `{key}` no enseña nada")
    # `site` y `replace` van juntos o no van: sin ellos el patrón es memoria
    # de un arreglo que exige juicio — se recuerda y se señala, no se barre.
    mechanical = [bool(str(pattern.get(k, "")).strip()) for k in ("site", "replace")]
    if mechanical[0] != mechanical[1]:
        raise ValueError("`site` y `replace` van juntos: uno sin el otro no es una sustitución")
    pattern = {"on_failure": ON_FAILURE[0], "done_when": DONE_WHEN[0], **pattern}
    if pattern["on_failure"] not in ON_FAILURE or pattern["done_when"] not in DONE_WHEN:
        raise ValueError(f"un skill necesita recuperación en {ON_FAILURE} y terminación en {DONE_WHEN}; "
                         f"llegó {pattern['on_failure']!r} / {pattern['done_when']!r}")
    re.compile(pattern["signal"])
    if mechanical[0]:
        re.compile(pattern["site"], re.M)
    patterns = load_patterns(run)
    # Deduplicación (BALTO, L07): la misma señal con el mismo alcance bajo
    # otro nombre es el mismo patrón. Se devuelve el existente, con el nombre
    # nuevo como alias, para que quien escribe marque ahí lo aplicado.
    for other in patterns.values():
        if (other["name"] != pattern["name"] and other.get("status") != "closed"
                and other["signal"] == pattern["signal"]
                and (other.get("include") or "") == (pattern.get("include") or "")):
            other["aliases"] = sorted(set(other.get("aliases", [])) | {pattern["name"]})
            if pattern.get("provenance"):
                other["alias_provenance"] = {**other.get("alias_provenance", {}),
                                             pattern["name"]: pattern["provenance"]}
            _save(run, patterns)
            return other
    previous = patterns.get(pattern["name"])
    row = {"include": "", "exclude": [], "site": "", "replace": "", **pattern,
           "applied": previous.get("applied", []) if previous else []}
    # Versión (L07) y reversión (L09): sobrescribir el contenido guarda el
    # estado anterior; reescribir lo mismo no crea versión.
    if previous:
        row["version"] = previous.get("version", 1)
        row["history"] = previous.get("history", [])
        row["aliases"] = previous.get("aliases", [])
        if any(previous.get(key, "") != row.get(key, "") for key in VERSIONED):
            row["history"] = [*row["history"], {**{key: previous.get(key, "") for key in VERSIONED},
                                                "version": row["version"],
                                                "provenance": previous.get("provenance")}]
            row["version"] += 1
        elif previous.get("provenance"):
            # Reescribir lo mismo no es una versión: la procedencia sigue siendo
            # la de quien lo escribió primero.
            row["provenance"] = previous["provenance"]
    else:
        row["version"] = 1
    patterns[row["name"]] = row
    _save(run, patterns)
    return row


def skill_card(row: dict) -> dict:
    """La definición de un patrón como skill (L07): condición de activación,
    entradas (su alcance), acciones, recuperación ante fallos y criterio de
    terminación. `mechanical` separa la sustitución ejecutable del arreglo
    en prosa que un agente interpreta."""
    return {"activation": row["signal"],
            "inputs": {"include": row.get("include", ""), "exclude": row.get("exclude", [])},
            "action": {"fix": row["fix"], "mechanical": bool(row.get("site")),
                       "site": row.get("site", ""), "replace": row.get("replace", "")},
            "on_failure": row.get("on_failure", ON_FAILURE[0]),
            "done_when": row.get("done_when", DONE_WHEN[0])}


def set_provenance(run: Path, name: str, provenance: dict) -> dict:
    """Fija la procedencia de un patrón SIN versionarlo: no cambia su
    contenido, sólo registra de dónde salió."""
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    patterns[name]["provenance"] = provenance
    _save(run, patterns)
    return patterns[name]


def revert_pattern(run: Path, name: str) -> dict:
    """Restaura la versión anterior de un patrón (L09: reversión)."""
    patterns = load_patterns(run)
    row = patterns.get(name)
    if not row or not row.get("history"):
        raise ValueError(f"el patrón {name!r} no tiene versión anterior que restaurar")
    *rest, last = row["history"]
    row.update({key: last.get(key, "") for key in VERSIONED}, version=last["version"], history=rest,
               provenance=last.get("provenance"))
    _save(run, patterns)
    return row


def mark_applied(run: Path, name: str, files: list[str]) -> dict:
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    patterns[name]["applied"] = sorted(set(patterns[name]["applied"]) | set(files))
    _save(run, patterns)
    return patterns[name]


def _require_reason(reason: str) -> str:
    if not reason.strip():
        raise ValueError("una salida del gate 4 sin razón escrita no se admite")
    return reason.strip()


def exclude_files(run: Path, name: str, files: list[str], reason: str) -> dict:
    """Saca archivos de un patrón porque su señal casa ahí por OTRA causa."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    row = patterns[name]
    row["exclude"] = sorted(set(row.get("exclude", [])) | set(files))
    row["exclude_reasons"] = {**row.get("exclude_reasons", {}), **{f: reason for f in files}}
    _save(run, patterns)
    return row


def close_pattern(run: Path, name: str, reason: str) -> dict:
    """Cierra un patrón: su señal ya no pide aplicación (agotado, o demasiado
    amplia para seguir usándola como gate)."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    patterns[name].update(status="closed", closed_reason=reason)
    _save(run, patterns)
    return patterns[name]


def merge_duplicates(run: Path, *, reason: str) -> list[str]:
    """Funde los duplicados que ya existían: misma señal y mismo alcance entre
    patrones abiertos. Se conserva el primero en la memoria, se le unen
    `applied` y los nombres como alias, y los demás se CIERRAN con la razón y
    el nombre del conservado — no se borran, para poder revertir (L09)."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    kept: dict[tuple[str, str], dict] = {}
    merged = []
    for row in patterns.values():
        if row.get("status") == "closed":
            continue
        key = (row["signal"], row.get("include") or "")
        if key not in kept:
            kept[key] = row
            continue
        first = kept[key]
        first["applied"] = sorted(set(first.get("applied", [])) | set(row.get("applied", [])))
        first["aliases"] = sorted(set(first.get("aliases", [])) | {row["name"], *row.get("aliases", [])})
        row.update(status="closed", closed_reason=f"duplicado de {first['name']} (misma señal y alcance) — {reason}")
        merged.append(row["name"])
    _save(run, patterns)
    return merged


def _pattern_of(proposal_id: str) -> str | None:
    """El patrón que una propuesta aplicó: `agent:pool:pattern:<nombre>` (la
    ruta de barrido) o `pattern:<nombre>[:<archivo>]` (la mecánica)."""
    for prefix in ("agent:pool:pattern:", "pattern:"):
        if proposal_id.startswith(prefix):
            return proposal_id[len(prefix):].split(":", 1)[0]
    return None


def pattern_confidence(run: Path) -> dict[str, dict]:
    """Confianza de cada patrón medida por ejecución real (BALTO, L07): las
    aplicaciones que el ledger juzgó. Éxito = `accepted*`; fracaso =
    `rejected*`; el resto (`partial`, `revealed`) es neutro y se reporta
    aparte. `mean` es la media de Laplace, (a+1)/(a+r+2).

    Ciega a: una aplicación cuyo id no lleve el nombre del patrón."""
    names = set(load_patterns(run))
    path = run / LEDGER
    counts: dict[str, dict] = {}
    for line in path.read_text().splitlines() if path.exists() else []:
        if not line.strip():
            continue
        row = json.loads(line)
        name = _pattern_of(row.get("proposal_id", ""))
        if name not in names:
            continue
        entry = counts.setdefault(name, {"accepted": 0, "rejected": 0, "neutral": 0})
        outcome = row.get("outcome", "")
        key = "accepted" if outcome.startswith("accepted") else "rejected" if outcome.startswith("rejected") \
            else "neutral"
        entry[key] += 1
    for entry in counts.values():
        entry["mean"] = (entry["accepted"] + 1) / (entry["accepted"] + entry["rejected"] + 2)
    return counts


def pattern_transfer(run: Path) -> dict[str, dict]:
    """¿Cambió el patrón la conducta futura? (L05: una reflexión que no cambia
    la estrategia de ejecución no es automejora; L07: evaluar si transfiere
    entre tareas.) Transferir es haberse aplicado con éxito —`applied`, que
    sólo crece con lo aceptado— a archivos distintos del que se aprendió.

    Veredicto: `transfiere`; `no transfiere` (tuvo intentos juzgados y ningún
    archivo nuevo); `sin oportunidad` (ni lo uno ni lo otro: no se puede
    juzgar); `sin procedencia` (patrón anterior a la procedencia: su origen
    no se adivina).

    Ciega a: una mejora que no pase por el barrido, como un agente del pool
    que lea la memoria en su prompt y acierte sin nombrar el patrón."""
    confidence = pattern_confidence(run)
    report = {}
    for name, row in load_patterns(run).items():
        origin = (row.get("provenance") or {}).get("file")
        entry = confidence.get(name, {"accepted": 0, "rejected": 0})
        attempts = entry["accepted"] + entry["rejected"]
        moved = sorted(set(row.get("applied", [])) - {origin}) if origin else []
        verdict = ("sin procedencia" if not origin else "transfiere" if moved
                   else "no transfiere" if attempts else "sin oportunidad")
        report[name] = {"learned_from": origin, "transferred_to": moved, "attempts": attempts,
                        "verdict": verdict}
    return report


def evict(run: Path, *, min_trials: int, max_mean: float, reason: str) -> list[str]:
    """Descarte (L07): cierra, con su razón y sus cifras, los patrones
    abiertos con al menos `min_trials` aplicaciones juzgadas y confianza no
    mayor que `max_mean`. Un patrón con pocos intentos queda abierto: no hay
    evidencia para descartarlo."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    evicted = []
    for name, entry in sorted(pattern_confidence(run).items()):
        trials = entry["accepted"] + entry["rejected"]
        if patterns[name].get("status") == "closed" or trials < min_trials or entry["mean"] > max_mean:
            continue
        close_pattern(run, name, f"descartado por confianza: {entry['accepted']} de {trials} "
                                 f"aplicaciones aceptadas (media {entry['mean']:.2f}) — {reason}")
        evicted.append(name)
    return evicted


#: Umbrales del criterio de amplitud: por debajo, «acepta toda la población de
#: su código» también lo cumple una señal precisa, y el patrón queda abierto.
BROAD_MIN_MATCHES = 5
BROAD_MIN_FILES = 3


def undiscriminating(run: Path, log_lines: list[str]) -> dict[str, dict[str, int]]:
    """Los patrones abiertos cuya señal no discrimina causa dentro de su código.

    Es el control del sub-patrón D aplicado a la señal: discrimina si RECHAZA
    al menos un diagnóstico de su mismo código en el log. Una señal que acepta
    toda la población de sus códigos —con al menos ``BROAD_MIN_MATCHES``
    instancias en ``BROAD_MIN_FILES`` archivos— es el código más el texto que
    el compilador fija para él, no una causa, y barrerla aplicaría el arreglo
    donde la causa es otra. El alcance (``include``) del patrón acota la
    población, igual que en ``tsc_reflect.pending_outside``.

    Ciega a: una señal amplia cuyo código sólo tiene hoy instancias de su
    propia causa (no hay nada que rechazar), y a una señal precisa que el log
    todavía no ha podido desmentir; las dos quedan abiertas.
    """
    rows = [row for row in load_patterns(run).values() if row.get("status") != "closed"]
    diagnostics = [(m.group("file"), m.group("code"), diagnostic_key(m))
                   for line in log_lines if (m := DIAGNOSTIC.match(line))]
    broad: dict[str, dict[str, int]] = {}
    for row in rows:
        regex = re.compile(row["signal"])
        scope = re.compile(row.get("include") or "")
        in_scope = [(file, code, key) for file, code, key in diagnostics if scope.search(file)]
        matched = [(file, code) for file, code, key in in_scope if regex.search(key)]
        if len(matched) < BROAD_MIN_MATCHES:
            continue
        codes = {code for _, code in matched}
        population = [file for file, code, _ in in_scope if code in codes]
        files = {file for file, _ in matched}
        if len(matched) == len(population) and len(files) >= BROAD_MIN_FILES:
            broad[row["name"]] = {"matched": len(matched), "population": len(population),
                                  "files": len(files)}
    return broad


def close_broad(run: Path, log_lines: list[str], step: str) -> tuple[dict[str, dict[str, int]], int]:
    """Cierra los patrones de ``undiscriminating`` con una razón que cita el
    paso y las cifras. Devuelve los cerrados y cuántos patrones abiertos se
    evaluaron."""
    evaluated = sum(1 for row in load_patterns(run).values() if row.get("status") != "closed")
    broad = undiscriminating(run, log_lines)
    for name, counts in broad.items():
        close_pattern(run, name, f"{step}: la señal acepta {counts['matched']} de "
                                 f"{counts['population']} diagnósticos de su código en "
                                 f"{counts['files']} archivos; no discrimina causa")
    return broad, evaluated


#: Utilidad demostrada: media de Laplace por encima de esto y al menos una
#: aplicación aceptada. Un patrón sin ejecución juzgada no se protege.
REHEARSAL_MIN_MEAN = 0.5


def rehearse(run: Path, pattern: dict, log_lines: list[str]) -> list[dict]:
    """Ensayo balanceado (L07): qué patrones útiles pisaría ``pattern``.

    Se ensaya su señal contra las instancias del log que ya reclaman los
    patrones abiertos con utilidad demostrada. Reclamar las mismas con otro
    arreglo es un conflicto: el nuevo desplazaría a uno que funciona. Con el
    mismo arreglo no lo es — es un duplicado, y `add_pattern` lo funde.

    Ciega a: un patrón útil cuyas instancias ya no están en el log (no hay
    qué ensayar) y a uno cuya utilidad no pasó por el ledger."""
    confidence = pattern_confidence(run)
    new_targets = set(_targets(pattern, log_lines))
    conflicts = []
    for other in load_patterns(run).values():
        entry = confidence.get(other["name"], {})
        useful = entry.get("accepted", 0) >= 1 and entry.get("mean", 0) > REHEARSAL_MIN_MEAN
        if (other["name"] == pattern["name"] or other.get("status") == "closed" or not useful
                or other.get("fix") == pattern.get("fix")):
            continue
        shared = sorted(new_targets & set(_targets(other, log_lines)))
        if shared:
            conflicts.append({"pattern": other["name"], "shared": shared, "mean": round(entry["mean"], 4)})
    return conflicts


def sites(root: Path, pattern: dict) -> list[tuple[str, str]]:
    """(archivo, texto sustituido) de cada archivo seguido donde la regla cambia algo."""
    listed = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True,
                            check=True).stdout.splitlines()
    include = re.compile(pattern.get("include") or "")
    skip = set(pattern.get("exclude", [])) | set(pattern.get("applied", []))
    site = re.compile(pattern["site"], re.M)
    found = []
    for file in sorted(listed):
        if not file.endswith(SUFFIXES) or file in skip or not include.search(file):
            continue
        text = (root / file).read_text()
        new = site.sub(pattern["replace"], text)
        if new != text:
            found.append((file, new))
    return found


def _targets(pattern: dict, before_lines: list[str]) -> list[str]:
    signal = re.compile(pattern["signal"])
    keys = {diagnostic_key(m) for m in map(DIAGNOSTIC.match, before_lines) if m}
    return sorted(k for k in keys if signal.search(k))


def propose(root: Path, pattern: dict, before_lines: list[str], *, split: bool) -> list[dict]:
    if not pattern.get("site"):
        raise ValueError(f"el patrón {pattern['name']!r} no es mecánico: su arreglo exige juicio "
                         "y se aplica con agent_proposal, que lo señala por archivo")
    found = sites(root, pattern)
    if not found:
        raise ValueError(f"el patrón {pattern['name']!r} no tiene sitios pendientes")
    targets = _targets(pattern, before_lines)
    if not targets:
        raise ValueError(f"la señal de {pattern['name']!r} no nombra ningún diagnóstico del log")
    name = f"pattern:{pattern['name']}"

    def row(group: list[tuple[str, str]], pid: str) -> dict:
        files = [f for f, _ in group]
        bases = {f: hashlib.sha256((root / f).read_text().encode()).hexdigest() for f in files}
        edits = [_minimal_edit(f, (root / f).read_text(), new) for f, new in group]
        return {"proposal_id": pid, "proposer": name, "targets": targets, "files": files,
                "edits": edits, "bases": bases}

    if split:
        return [row([site], f"{name}:{site[0]}") for site in found]
    return [row(found, name)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    add_p = sub.add_parser("add-pattern")
    add_p.add_argument("--run", type=Path, required=True)
    for key in ("name", "signal", "fix"):
        add_p.add_argument(f"--{key}", required=True)
    add_p.add_argument("--site", default="")
    add_p.add_argument("--replace", default="")
    add_p.add_argument("--include", default="")
    add_p.add_argument("--exclude", nargs="*", default=[])
    add_p.add_argument("--log", type=Path, help="ensaya la señal contra este log antes de guardar (L07)")
    add_p.add_argument("--overlap-reason", default="",
                       help="guarda aunque pise a un patrón útil, y deja la razón en el patrón")
    prop_p = sub.add_parser("propose")
    prop_p.add_argument("--run", type=Path, required=True)
    prop_p.add_argument("--root", type=Path, default=Path("."))
    prop_p.add_argument("--name", required=True)
    prop_p.add_argument("--before-log", type=Path, required=True)
    prop_p.add_argument("--split", action="store_true")
    app_p = sub.add_parser("applied")
    app_p.add_argument("--run", type=Path, required=True)
    app_p.add_argument("--name", required=True)
    app_p.add_argument("files", nargs="+")
    exc_p = sub.add_parser("exclude", help="saca archivos del patrón: su señal casa ahí por otra causa")
    exc_p.add_argument("--run", type=Path, required=True)
    exc_p.add_argument("--name", required=True)
    exc_p.add_argument("--reason", required=True)
    exc_p.add_argument("files", nargs="+")
    close_p = sub.add_parser("close", help="cierra un patrón: su señal ya no pide aplicación")
    close_p.add_argument("--run", type=Path, required=True)
    close_p.add_argument("--name", required=True)
    close_p.add_argument("--reason", required=True)
    broad_p = sub.add_parser("close-broad",
                             help="cierra los patrones cuya señal acepta toda la población de su código")
    broad_p.add_argument("--run", type=Path, required=True)
    broad_p.add_argument("--log", type=Path, required=True)
    broad_p.add_argument("--step", required=True)
    dup_p = sub.add_parser("merge-duplicates", help="funde los patrones abiertos con la misma señal y alcance")
    dup_p.add_argument("--run", type=Path, required=True)
    dup_p.add_argument("--reason", required=True)
    rev_p = sub.add_parser("revert", help="restaura la versión anterior de un patrón")
    rev_p.add_argument("--run", type=Path, required=True)
    rev_p.add_argument("--name", required=True)
    conf_p = sub.add_parser("confidence", help="aplicaciones juzgadas por patrón, desde el ledger")
    conf_p.add_argument("--run", type=Path, required=True)
    tr_p = sub.add_parser("transfer", help="¿cambió cada patrón la conducta futura? (transferencia)")
    tr_p.add_argument("--run", type=Path, required=True)
    ev_p = sub.add_parser("evict", help="cierra los patrones de baja confianza con intentos suficientes")
    ev_p.add_argument("--run", type=Path, required=True)
    ev_p.add_argument("--min-trials", type=int, default=3)
    ev_p.add_argument("--max-mean", type=float, default=0.25)
    ev_p.add_argument("--reason", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "add-pattern":
            new = {k: getattr(args, k) for k in ("name", "signal", "site", "replace", "fix", "include", "exclude")}
            if args.log:
                conflicts = rehearse(args.run, new, args.log.read_text(errors="ignore").splitlines())
                if conflicts and not args.overlap_reason.strip():
                    for conflict in conflicts:
                        print(f"tsc_sweep: el ensayo de {args.name!r} pisa a {conflict['pattern']!r} "
                              f"(media {conflict['mean']}) en {len(conflict['shared'])} instancia(s), "
                              f"p. ej. {conflict['shared'][0]}", file=sys.stderr)
                    print("tsc_sweep: no se guarda; acota la señal o declara --overlap-reason", file=sys.stderr)
                    return 1
                if conflicts:
                    new["overlap_accepted"] = {"with": [c["pattern"] for c in conflicts],
                                               "reason": args.overlap_reason.strip()}
            row = add_pattern(args.run, new)
            print(json.dumps(row, ensure_ascii=False))
        elif args.command == "propose":
            patterns = load_patterns(args.run)
            if args.name not in patterns:
                raise ValueError(f"no hay patrón {args.name!r}")
            for row in propose(args.root, patterns[args.name],
                               args.before_log.read_text().splitlines(), split=args.split):
                print(json.dumps(row, ensure_ascii=False))
        elif args.command == "applied":
            print(json.dumps(mark_applied(args.run, args.name, args.files), ensure_ascii=False))
        elif args.command == "exclude":
            print(json.dumps(exclude_files(args.run, args.name, args.files, args.reason),
                             ensure_ascii=False))
        elif args.command == "merge-duplicates":
            merged = merge_duplicates(args.run, reason=args.reason)
            print("\n".join(merged))
            print(f"merge-duplicates: {len(merged)} cerrado(s) por duplicado")
        elif args.command == "revert":
            print(json.dumps(revert_pattern(args.run, args.name), ensure_ascii=False))
        elif args.command == "confidence":
            confidence = pattern_confidence(args.run)
            for name, entry in sorted(confidence.items(), key=lambda item: item[1]["mean"]):
                print(json.dumps({"name": name, **entry}, ensure_ascii=False))
            print(f"confidence: {len(confidence)} patrón(es) con aplicaciones juzgadas de "
                  f"{len(load_patterns(args.run))} en la memoria")
        elif args.command == "transfer":
            report = pattern_transfer(args.run)
            for name, entry in sorted(report.items()):
                print(json.dumps({"name": name, **entry}, ensure_ascii=False))
            verdicts = collections.Counter(entry["verdict"] for entry in report.values())
            print("transfer: " + ", ".join(f"{v} {n}" for v, n in sorted(verdicts.items())))
        elif args.command == "evict":
            evicted = evict(args.run, min_trials=args.min_trials, max_mean=args.max_mean, reason=args.reason)
            print("\n".join(evicted))
            print(f"evict: {len(evicted)} descartado(s)")
        elif args.command == "close-broad":
            closed, evaluated = close_broad(args.run, args.log.read_text().splitlines(), args.step)
            for name, counts in sorted(closed.items()):
                print(json.dumps({"name": name, **counts}, ensure_ascii=False))
            print(f"close-broad: {len(closed)} cerrado(s) de {evaluated} evaluado(s)")
        else:
            print(json.dumps(close_pattern(args.run, args.name, args.reason), ensure_ascii=False))
    except (OSError, ValueError, KeyError, re.error, json.JSONDecodeError,
            subprocess.CalledProcessError) as error:
        print(f"tsc_sweep: REHÚSA — {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
