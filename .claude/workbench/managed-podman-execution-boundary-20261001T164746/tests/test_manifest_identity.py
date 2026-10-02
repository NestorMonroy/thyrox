"""Cada línea de manifest.jsonl atribuye su paso a la unidad que lo ejecutó.

Una línea escrita por la misma unidad que ejecutó el paso lleva
containerId == recordedBy. Una transcripción (containerId distinto) exige
`source`: el archivo que el paso escribió mientras corría, y ese archivo tiene
que nombrar el mismo contenedor. Así una ejecución posterior no puede prestar
su identidad a un paso anterior.

Uso: python3 tests/test_manifest_identity.py [manifest.jsonl]
"""
import json
import pathlib
import sys

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


def main() -> int:
    manifest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else WORKBENCH / "manifest.jsonl"
    found = violations(manifest) + scaffold_attribution(manifest)
    for problem in found:
        print(f"FALLA {problem}")
    lines = len(manifest.read_text().splitlines())
    print(f"{len(found)} violación(es) (alcance medido: {lines} línea(s) de {manifest.name})")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
