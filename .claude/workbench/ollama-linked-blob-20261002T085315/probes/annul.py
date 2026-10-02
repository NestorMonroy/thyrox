"""Anula cada guarda de TASK-THYROX-0782 y registra qué pruebas caen."""
import subprocess
from pathlib import Path

P = Path("/home/user/thyrox/src/packages")
OUT = Path(__file__).resolve().parent.parent / "outputs"
TESTS = [("local-models", "__tests__/modelArtifactCache.test.ts"), ("local-models", "__tests__/ollamaModelsDirectory.test.ts"),
         ("local-models", "__tests__/commands.test.ts"), ("model-scheduling", "__tests__/podmanModelUnitMaterializer.test.ts")]
PREVIOUS = {"--context declarado viaja como num_ctx", "--isolated declara la medición aislada; sin él queda contended",
            "seis aciertos: sale 0 y escribe la cualificación con el contexto acotado al máximo del modelo",
            "suspendida: sale 1 y también se escribe", "un modelo fuera del catálogo sale 2 sin medir"}
ANNULMENTS = {
    "adopt-links": ("local-models/modelArtifactCache.ts", "    await link(source, partial)\n", "    await copyFile(source, partial)\n",
                    ("import { link, mkdir, rename, rm, stat } from 'node:fs/promises'", "import { copyFile, link, mkdir, rename, rm, stat } from 'node:fs/promises'")),
    "verify-content": ("local-models/modelArtifactCache.ts", "    if (actual !== artifact.sha256) return { status: 'rejected'", "    if (false) return { status: 'rejected'", None),
    "stage-links": ("local-models/ollamaModelsDirectory.ts", "  await link(cached, blob)\n", "  await copyFile(cached, blob)\n",
                    ("import { link, mkdir, rm, stat } from 'node:fs/promises'", "import { copyFile, link, mkdir, rm, stat } from 'node:fs/promises'")),
    "stage-needs-cache": ("local-models/ollamaModelsDirectory.ts", "  if (cachedInode === undefined) {\n", "  if (false) {\n", None),
    "mount-mode": ("model-scheduling/podmanModelUnitMaterializer.ts", "mode: mount.mode }]", "mode: 'ro' }]", None),
    "stage-before-create": ("model-scheduling/podmanModelUnitMaterializer.ts", "    const unstaged = await stagingFailure(profile, grant)\n", "    const unstaged = undefined\n", None),
}
for name, (rel, old, new, extra) in ANNULMENTS.items():
    path = P / rel
    original = path.read_text(encoding="utf-8")
    assert original.count(old) == 1, name
    changed = original.replace(old, new)
    if extra:
        assert changed.count(extra[0]) == 1, name
        changed = changed.replace(extra[0], extra[1])
    path.write_text(changed, encoding="utf-8")
    output = ""
    try:
        for package, test in TESTS:
            run = subprocess.run(["bun", "test", test], cwd=P / package, capture_output=True, text=True)
            output += run.stdout + run.stderr
    finally:
        path.write_text(original, encoding="utf-8")
    (OUT / f"annul-{name}.txt").write_text(output, encoding="utf-8")
    failed = sorted({line.split(" > ")[-1].split(" [")[0] for line in output.splitlines() if line.startswith("(fail)")} - PREVIOUS)
    print(f"{name}: {len(failed)} caen")
    for line in failed:
        print("   ", line)
