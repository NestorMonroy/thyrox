"""Anula cada guarda de TASK-THYROX-0763 por separado y registra qué pruebas caen."""
import subprocess
from pathlib import Path

COST = Path("/home/user/thyrox/src/packages/provider/src/cost")
OUT = Path(__file__).resolve().parent.parent / "outputs"
ANNULMENTS = {
    "source-match": (COST / "executionPolicy.ts",
                     "    && (selector.source === undefined || selector.source === entry.source)\n", ""),
    "exclusion-reason": (COST / "policy.ts",
                         "  return local.entries.length > 0 && permitted.entries.length === 0\n",
                         "  return false\n"),
    "source-validation": (COST / "executionPolicy.ts",
                          "  if (!MODEL_SOURCES.includes(value as ModelSource)) {\n",
                          "  if (false) {\n"),
}

for name, (path, old, new) in ANNULMENTS.items():
    original = path.read_text(encoding="utf-8")
    assert original.count(old) == 1, name
    path.write_text(original.replace(old, new), encoding="utf-8")
    try:
        run = subprocess.run(["bun", "test", "__tests__/recommendExecution.test.ts"],
                             cwd=COST.parent.parent, capture_output=True, text=True)
        output = run.stdout + run.stderr
    finally:
        path.write_text(original, encoding="utf-8")
    (OUT / f"annul-{name}.txt").write_text(output, encoding="utf-8")
    failed = [line for line in output.splitlines() if line.startswith("(fail)")]
    print(f"{name}: {len(failed)} caen")
    for line in failed:
        print("   ", line.split(" > ")[-1])
