"""¿Los originales de la copia huérfana están en el HEAD empujado?

Lee el informe de `orphan_copy_redundancy.py` y compara cada blob con el
índice de `git ls-tree -r <ref>` en el mismo camino relativo al árbol
principal. Sólo lee.

Métrica: igualdad de blob en el árbol del ref dado.
Ciega a: que el ref siga en el remoto después de la medición.
"""
import json
import subprocess
import sys
from collections import Counter

report, ref, copy_prefix = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
tree = {}
out = subprocess.run(['git', 'ls-tree', '-r', ref], capture_output=True, text=True, check=True).stdout
for line in out.splitlines():
    meta, path = line.split('\t', 1)
    tree[path] = meta.split()[2]
counts, total = Counter(), Counter()
for row in report['rows']:
    original = row['path'][len(copy_prefix) + 1:]
    state = 'in_ref_same_blob' if tree.get(original) == row['blob'] else 'not_in_ref'
    counts[state] += 1
    total[state] += row['bytes']
print(json.dumps({'ref': ref, 'counts': counts, 'bytes': total}))
