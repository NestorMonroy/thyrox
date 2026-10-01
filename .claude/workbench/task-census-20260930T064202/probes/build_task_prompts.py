"""Construye un prompt.md por tarea a partir del censo del pool.

Lee los ítems CERRADOS de la salida del censo (``pool_lifecycle closed-items``),
toma de cada ``<n>.json`` el bloque JSON del veredicto y de la fuente citada la
sección de la tarea, y escribe:

- ``impl/census.tsv``: tarea, estado, tamaño, dependencias y bloqueo;
- ``impl/<tarea>/prompt.md``: para cada tarea parcial o pendiente, su texto,
  la evidencia medida, lo que falta y los archivos que tocaría.

Un ítem cuyo veredicto no es JSON legible se declara en ``census.tsv`` como
``ilegible``: no se infiere su estado.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

BENCH = Path(__file__).resolve().parent.parent
OUTPUTS = BENCH / "outputs"
IMPL = BENCH / "impl"
ROOT = BENCH.parents[2]
ACTIONABLE = {"parcial", "pendiente"}
JSON_BLOCK = re.compile(r"\{.*\}", re.S)


def closed_items() -> list[str]:
    result = subprocess.run(["bash", str(ROOT / "bin/pool_lifecycle"), "closed-items", str(OUTPUTS)],
                            capture_output=True, text=True, check=True)
    return result.stdout.split()


def item_lines() -> dict[str, str]:
    lines = (OUTPUTS / "index.tsv").read_text().splitlines()
    return dict(line.split("\t", 1) for line in lines if "\t" in line)


def verdict_of(item: str) -> dict | None:
    raw = (OUTPUTS / f"{item}.json").read_text().strip()
    if not raw:
        return None
    text = json.loads(raw).get("result", "")
    match = JSON_BLOCK.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def task_section(source: Path, task: str) -> str:
    lines = source.read_text().splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("## ") and task in line)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return "\n".join(lines[start:end]).strip()


def bullet_list(values: list[str]) -> str:
    return "\n".join(f"- {value}" for value in values) if values else "- (ninguno)"


def prompt_for(task: str, source: Path, verdict: dict) -> str:
    return (f"# {task}\n\n"
            f"Fuente: `{source}`\n\n"
            f"## La tarea\n\n{task_section(source, task)}\n\n"
            f"## Estado medido por el censo: {verdict.get('status')}\n\n"
            f"Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):\n\n"
            f"{bullet_list(verdict.get('evidence', []))}\n\n"
            f"## Lo que falta — tu alcance\n\n{bullet_list(verdict.get('remaining', []))}\n\n"
            f"## Archivos que te pertenecen\n\n{bullet_list(verdict.get('files', []))}\n\n"
            "Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta "
            "con el archivo y la razón.\n\n"
            f"## Pruebas\n\n{bullet_list(verdict.get('tests', []))}\n\n"
            f"## Dependencias\n\n{bullet_list(verdict.get('depends_on', []))}\n")


def main() -> int:
    IMPL.mkdir(exist_ok=True)
    lines = item_lines()
    rows = ["task\tstatus\tsize\tdepends_on\tblocked_by\tfiles"]
    for item in closed_items():
        task, _, source_text = lines[item].partition(" — fuente: ")
        verdict = verdict_of(item)
        if verdict is None:
            rows.append(f"{task}\tilegible\t\t\t\t")
            continue
        rows.append("\t".join([task, verdict.get("status", ""), verdict.get("size", ""),
                               ";".join(verdict.get("depends_on", [])), verdict.get("blocked_by", ""),
                               ";".join(verdict.get("files", []))]))
        if verdict.get("status") in ACTIONABLE:
            target = IMPL / task
            target.mkdir(exist_ok=True)
            (target / "prompt.md").write_text(prompt_for(task, Path(source_text), verdict))
    (IMPL / "census.tsv").write_text("\n".join(rows) + "\n")
    print(f"censo: {len(rows) - 1} ítem(s) cerrado(s) leídos (alcance medido: {len(lines)} ítem(s) del índice)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
