"""Censo de nombres de subcomando: el primer argumento de `add_parser`, por AST.

Un subcomando es el nombre público de una operación. El gate de idioma lee
identificadores declarados por AST; este nombre es una cadena, y no lo ve.
"""
import ast, pathlib, sys
rows = []
for path in sorted(pathlib.Path('src').rglob('*.py')):
    try:
        tree = ast.parse(path.read_text(encoding='utf-8'))
    except (SyntaxError, UnicodeDecodeError):
        continue
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == 'add_parser' and node.args
                and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)):
            rows.append((str(path), node.lineno, node.args[0].value))
for row in rows:
    print('\t'.join(map(str, row)))
print(f'{len(rows)} subcomando(s) en {len({r[0] for r in rows})} archivo(s)', file=sys.stderr)
