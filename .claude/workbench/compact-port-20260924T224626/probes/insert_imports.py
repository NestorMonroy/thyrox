"""Inserta las lineas `import` que reporta port_missing.ts tras la cabecera de
imports del porte.

Uso: python3 insert_imports.py <plan.tsv> <porte>
La cabecera termina en la ultima declaracion import completa antes del primer
codigo; ahi se abre un bloque comentado con los imports del porte completo.
"""
import pathlib
import re
import sys

plan, target = sys.argv[1], pathlib.Path(sys.argv[2])
imports = [l.rstrip('\n').split('\t', 1)[1] for l in open(plan) if l.startswith('import\t')]
if not imports:
    print('sin imports por juntar')
    sys.exit(0)
lines = target.read_text().split('\n')
last, open_import = -1, False
for i, line in enumerate(lines):
    if line.startswith('import '):
        open_import = True
    if open_import and re.search(r"from '[^']+'\s*;?\s*$", line):
        last, open_import = i, False
    elif not open_import and line and not line.startswith(('//', '/*', ' *', '*/', 'import', 'export type {', "'use")) and last >= 0:
        break
block = ['', '// Imports del porte completo, derivados de la fuente por port_missing.ts.'] + imports
lines[last + 1:last + 1] = block
target.write_text('\n'.join(lines))
print(f'{len(imports)} imports insertados tras la linea {last + 1}')
