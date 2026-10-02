"""Estrechar por forma: cada variante de AdoptionOutcome agrupa dos estados y tsc no la descarta por igualdad."""
from pathlib import Path

for path in (Path("/home/user/thyrox/src/packages/local-models/catalogCommand.ts"), Path(__file__).with_name("impl.py")):
    text = path.read_text(encoding="utf-8")
    old = "  if (outcome.status === 'adopted' || outcome.status === 'cached') {"
    assert text.count(old) == 1, path
    path.write_text(text.replace(old, "  if ('path' in outcome) {"), encoding="utf-8")
