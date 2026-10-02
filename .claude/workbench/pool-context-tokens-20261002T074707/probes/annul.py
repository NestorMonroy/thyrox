"""Anula cada guarda de TASK-THYROX-0781 y registra qué casos caen."""
import subprocess
from pathlib import Path

ROOT = Path("/home/user/thyrox")
POOL = ROOT / "src/session/headless-pool.sh"
TEST = ROOT / "tests/session/test-headless-pool-model-policy.sh"
OUT = Path(__file__).resolve().parent.parent / "outputs"
ANNULMENTS = {
    "forward-context": ('        ${CONTEXT_TOKENS:+--context "$CONTEXT_TOKENS"} --json', "        --json"),
    "validate-context": ('[[ -z "$CONTEXT_TOKENS" || "$CONTEXT_TOKENS" =~ ^[1-9][0-9]*$ ]]', "[[ true ]]"),
}
for name, (old, new) in ANNULMENTS.items():
    original = POOL.read_text(encoding="utf-8")
    assert original.count(old) == 1, name
    POOL.write_text(original.replace(old, new), encoding="utf-8")
    try:
        output = subprocess.run(["bash", str(TEST)], capture_output=True, text=True).stdout
    finally:
        POOL.write_text(original, encoding="utf-8")
    (OUT / f"annul-{name}.txt").write_text(output, encoding="utf-8")
    failed = [line.strip() for line in output.splitlines() if "FALLA" in line]
    print(f"{name}: {len(failed)} caen")
    for line in failed:
        print("   ", line.split(" — ")[0])
