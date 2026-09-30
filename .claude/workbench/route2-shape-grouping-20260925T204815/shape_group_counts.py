"""Cuántos grupos de forma distinta tiene cada nombre duplicado (umbral de nombre convencional)."""
import sys
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0, "src")
from verify import tsc_routes as tr
root = Path("src/packages")
copies = defaultdict(list)
for path in sorted(root.rglob("*.ts*")):
    if any(p in tr.SKIPPED for p in path.parts) or path.name.endswith(".d.ts") or path.is_symlink():
        continue
    text = path.read_text(errors="ignore")
    for m in tr.DECLARATION.finditer(text):
        try:
            s = tr.shape_of(tr._body(text, m.end(), m["kind"]), m["kind"])
        except ValueError:
            continue
        if s is not None and s.kind != "stub":
            copies[m["name"]].append(s)
def groups(shapes):
    parent = list(range(len(shapes)))
    def find(i):
        while parent[i] != i:
            i = parent[i]
        return i
    for i in range(len(shapes)):
        for j in range(i + 1, len(shapes)):
            if tr.same_type(shapes[i], shapes[j]):
                parent[find(i)] = find(j)
    return len({find(i) for i in range(len(shapes))})
counts = {n: groups(s) for n, s in copies.items() if len(s) > 1}
for n, c in sorted(counts.items(), key=lambda x: -x[1])[:15]:
    print(n, len(copies[n]), c, sep="\t")
print("distribucion", sorted(Counter(counts.values()).items()), sep="\t")
