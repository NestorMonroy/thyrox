"""Por cada renombre, ¿el nombre inglés ya vive en la misma función?"""
import ast, sys, json
path, pairs = sys.argv[1], json.loads(sys.argv[2])
tree = ast.parse(open(path).read())
scopes = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Module))]
for old, new in pairs.items():
    for s in scopes:
        body = s.body
        names = {n.id for b in body for n in ast.walk(b) if isinstance(n, ast.Name)}
        names |= {a.arg for b in body for n in ast.walk(b) if isinstance(n, ast.arguments) for a in n.args + n.kwonlyargs}
        if old in names and new in names:
            print(f"COLISION {old}->{new} en {getattr(s,'name','<module>')}:{getattr(s,'lineno',0)}")
print("medido", path)
