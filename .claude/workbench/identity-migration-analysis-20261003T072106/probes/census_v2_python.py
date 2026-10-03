#!/usr/bin/env python3
# EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
# no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
# Reutiliza la medición del gate check_product_word (archivos versionados,
# extensiones medidas, mecanismo de nombres ajenos) cambiando sólo la palabra:
# no reimplementa el recorrido. No escribe baseline.
import collections, json, pathlib, re, sys
from verify import check_product_word as gate

repo = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
gate._WORD = re.compile(r"thyrox", re.IGNORECASE)
roots = ["src", "bin", "tests", ".githooks", ".claude/rules", ".claude/skills",
         ".claude/commands", ".claude/CLAUDE.md", "README.md", "install.sh",
         ".env.example", "package.json", "pyproject.toml", ".gitignore"]
rows = []
for root in roots:
    counts = gate.measure(repo, root)
    for rel, n in counts.items():
        rows.append((rel, n))
rows.sort(key=lambda r: -r[1])
(out / "product-word-thyrox-by-file.tsv").write_text("".join(f"{n}\t{r}\n" for r, n in rows))
area = collections.Counter()
for rel, n in rows:
    p = rel.split("/")
    k = "/".join(p[:3]) if p[:2] == ["src", "packages"] else "/".join(p[:2]) if len(p) > 1 else p[0]
    area[k] += n
(out / "product-word-thyrox-by-area.tsv").write_text("".join(f"{n}\t{k}\n" for k, n in area.most_common()))
print(json.dumps({"extensions": list(gate.MEASURED_EXTENSIONS), "files": len(rows), "occurrences": sum(n for _, n in rows)}))
