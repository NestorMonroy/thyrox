"""Anula cada guarda de TASK-THYROX-0780 por separado y registra qué pruebas caen."""
import subprocess
from pathlib import Path

PACKAGE = Path("/home/user/thyrox/src/packages/local-models")
OUT = Path(__file__).resolve().parent.parent / "outputs"
TESTS = ["__tests__/taskSuite.test.ts", "__tests__/qualifyModel.test.ts", "__tests__/qualifyCommand.test.ts"]
ANNULMENTS = {
    "empty-checks": ("taskSuite.ts", "  if (!Array.isArray(value.checks) || value.checks.length === 0) {\n",
                     "  if (!Array.isArray(value.checks)) {\n"),
    "pattern-compiles-at-load": ("taskSuite.ts", "    throw new InvalidTaskSuiteError(path, `${field}.pattern`, (error as Error).message)\n",
                                 "    return /(?!)/u\n"),
    "task-class-known": ("taskSuite.ts", "  return (LOCAL_TASK_CLASSES as readonly unknown[]).includes(value)\n",
                         "  return typeof value === 'string'\n"),
    "pattern-scored": ("taskSuite.ts", "  return !check.expression.test(content)\n", "  return true\n"),
    "task-identity": ("qualifyModel.ts", "{ kind: 'task', taskClass: request.suite.taskClass, suite: request.suite.id }",
                      "{ kind: 'protocol', suite: request.suite.id }"),
    "suite-plan": ("qualifyCommand.ts", "  if (suitePath === undefined) {\n", "  if (true) {\n"),
}

for name, (file, old, new) in ANNULMENTS.items():
    path = PACKAGE / file
    original = path.read_text(encoding="utf-8")
    assert original.count(old) == 1, name
    path.write_text(original.replace(old, new), encoding="utf-8")
    try:
        output = "".join(subprocess.run(["bun", "test", test], cwd=PACKAGE, capture_output=True, text=True).stdout
                         + subprocess.run(["bun", "test", test], cwd=PACKAGE, capture_output=True, text=True).stderr
                         for test in TESTS)
    finally:
        path.write_text(original, encoding="utf-8")
    (OUT / f"annul-{name}.txt").write_text(output, encoding="utf-8")
    failed = sorted({line.split(" > ")[-1].split(" [")[0] for line in output.splitlines() if line.startswith("(fail)")})
    print(f"{name}: {len(failed)} caen")
    for line in failed:
        print("   ", line)
