"""Cada línea de manifest.jsonl atribuye su paso a la unidad que lo ejecutó.

Una línea escrita por la misma unidad que ejecutó el paso lleva
containerId == recordedBy. Una transcripción (containerId distinto) exige
`source`: el archivo que el paso escribió mientras corría, y ese archivo tiene
que nombrar el mismo contenedor. Así una ejecución posterior no puede prestar
su identidad a un paso anterior.

Y declara POR QUÉ ENTRADA fue materializada esa unidad: `entry` la escribe
`probes/unit_identity.sh` desde `THYROX_EXECUTION_ENTRY`, que exporta
`src/lib/managed_execution.sh` a la unidad (la entrada canónica, `thyrox-bg`).
Sin la variable, la unidad no llegó por ella y declara `bootstrap-cli`: es la
deuda de arranque. El campo no existe en las líneas anteriores al mecanismo,
así que se exige desde la primera que lo lleva; su valor tiene que ser una de
las entradas declaradas.

Uso: python3 tests/test_manifest_identity.py [manifest.jsonl]
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile

WORKBENCH = pathlib.Path(__file__).resolve().parent.parent


def violations(manifest: pathlib.Path) -> list[str]:
    found = []
    for number, raw in enumerate(manifest.read_text().splitlines(), start=1):
        line = json.loads(raw)
        where = f"línea {number} ({line.get('item')}/{line.get('step')})"
        if not line.get("recordedBy"):
            found.append(f"{where}: sin recordedBy")
            continue
        if not line.get("containerId"):
            found.append(f"{where}: sin contenedor")
            continue
        if line["containerId"] == line["recordedBy"]:
            continue
        source = line.get("source")
        if not source:
            found.append(f"{where}: atribuye {line['containerId'][:12]} sin fuente de la ejecución original")
            continue
        evidence = WORKBENCH / source
        if not evidence.is_file() or f"libpod-{line['containerId']}" not in evidence.read_text():
            found.append(f"{where}: {source} no declara el contenedor {line['containerId'][:12]}")
    return found


def scaffold_attribution(manifest: pathlib.Path) -> list[str]:
    """El scaffold se atribuye al contenedor que su propia salida declara."""
    evidence = (WORKBENCH / "outputs/p0-scaffold-unit.txt").read_text()
    lines = [json.loads(raw) for raw in manifest.read_text().splitlines()]
    scaffold = [line for line in lines if line["item"] == "p0" and line["step"] == "scaffold"]
    if len(scaffold) != 1:
        return [f"se esperaba una línea p0/scaffold, hay {len(scaffold)}"]
    if f"libpod-{scaffold[0]['containerId']}" not in evidence:
        return [f"p0/scaffold atribuido a {scaffold[0]['containerId'][:12]}, que no es el de outputs/p0-scaffold-unit.txt"]
    return []


ENTRIES = ("thyrox-bg", "bootstrap-cli")


def entry_declaration(manifest: pathlib.Path) -> list[str]:
    """La entrada por la que corrió cada unidad, declarada en su línea de manifiesto."""
    found = []
    adopted = False
    for number, raw in enumerate(manifest.read_text().splitlines(), start=1):
        line = json.loads(raw)
        where = f"línea {number} ({line.get('item')}/{line.get('step')})"
        entry = line.get("entry")
        if entry is None:
            if adopted:
                found.append(f"{where}: sin entry, con una línea anterior que ya lo declara")
            continue
        adopted = True
        if entry not in ENTRIES:
            found.append(f"{where}: entry={entry!r}, fuera de las entradas declaradas {ENTRIES}")
    return found


def probe_entry(entry_env: str | None, source: bool = False) -> dict:
    """La línea que el sondeo escribe para una unidad, con el entorno que se le dé.

    El sondeo se corre de verdad contra un manifiesto temporal: comprobar el
    campo sobre una línea escrita a mano probaría que el test lee lo que él
    mismo escribió, no lo que el sondeo emite.

    El campo nombra la entrada de la unidad que ESCRIBE la línea; en una
    transcripción es la que transcribe, que es la que declara su propio
    entorno, no la que ejecutó el paso.
    """
    with tempfile.TemporaryDirectory() as work:
        workbench = pathlib.Path(work)
        argv = ["bash", str(WORKBENCH / "probes/unit_identity.sh"), str(workbench), "demo", "probe-entry"]
        if source:
            (workbench / "paso.txt").write_text(
                "cgroup=/libpod_parent/libpod-" + "a" * 64 + "\npid=7\nhostname=vm\nutc=2026-10-02T00:00:00\n")
            argv += ["--source", "paso.txt"]
        environment = dict(os.environ)
        environment.pop("THYROX_EXECUTION_ENTRY", None)
        if entry_env is not None:
            environment["THYROX_EXECUTION_ENTRY"] = entry_env
        done = subprocess.run(argv, capture_output=True, text=True, env=environment)
        if done.returncode != 0:
            return {"error": f"salió {done.returncode}: {done.stderr.strip()}"}
        return json.loads((workbench / "manifest.jsonl").read_text().splitlines()[-1])


def entry_of_probe() -> list[str]:
    """El campo `entry` del sondeo: con la variable de la entrada canónica y sin ella."""
    found = []
    cases = (
        ("sin THYROX_EXECUTION_ENTRY", None, False, "bootstrap-cli"),
        ("con la entrada canónica", "thyrox-bg", False, "thyrox-bg"),
        ("transcribiendo el paso de otra unidad", "thyrox-bg", True, "thyrox-bg"),
    )
    for label, entry_env, source, expected in cases:
        line = probe_entry(entry_env, source)
        if "error" in line:
            found.append(f"el sondeo del manifiesto ({label}) {line['error']}")
        elif line.get("entry") != expected:
            found.append(f"el sondeo del manifiesto ({label}) escribió entry={line.get('entry')!r}, no {expected!r}")
    return found


def main() -> int:
    manifest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else WORKBENCH / "manifest.jsonl"
    found = violations(manifest) + scaffold_attribution(manifest) + entry_declaration(manifest) + entry_of_probe()
    for problem in found:
        print(f"FALLA {problem}")
    lines = len(manifest.read_text().splitlines())
    print(f"{len(found)} violación(es) (alcance medido: {lines} línea(s) de {manifest.name})")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
