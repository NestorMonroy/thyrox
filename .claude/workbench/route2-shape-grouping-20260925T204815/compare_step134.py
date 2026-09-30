"""Nombres del paso 134: ¿siguen siendo unidad con la agrupación por forma?"""
import pathlib, sys
sys.path.insert(0, "src")
from verify import tsc_routes as tr
root = pathlib.Path("src/packages")
new = tr.duplicated_types(root)
tr.GROUP_BY_SHAPE = False
old = tr.duplicated_types(root)
names = [l.split("\t")[1].split()[0].split(":")[1] for l in
         pathlib.Path(".claude/workbench/tsc-zero-loop/run-20260924T175031/step-134/outputs/index.tsv").read_text().splitlines()]
verdict = dict(l.split("\t")[1:] for l in pathlib.Path(
    ".claude/workbench/tsc-zero-loop/run-20260924T175031/step-134/probes/reading-verdicts.tsv").read_text().splitlines()
    if l and not l.startswith(("#", "item")))
for n in names:
    print(n, len(old.get(n, [])), len(new.get(n, [])), verdict.get(n, "propuso ediciones"), sep="\t")
print("TOTAL", len(old), len(new), sep="\t")
