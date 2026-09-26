import re, sys, pathlib
root = pathlib.Path('src/packages')
pat = re.compile(r"^import\s+(?!type\b)[^;]*?from\s+'([^']+)'", re.M)
def resolve(f, spec):
    if spec.startswith('.'):
        p = (f.parent / spec)
    elif spec.startswith('@thyrox/'):
        pkg, _, rest = spec[8:].partition('/')
        p = root / pkg / 'src' / (rest or 'index')
    else:
        return None
    s = str(p)
    for c in (s, re.sub(r'\.js$', '.ts', s), s + '.ts', s + '.tsx', s + '/index.ts', re.sub(r'\.js$', '.tsx', s)):
        q = pathlib.Path(c)
        if q.is_file(): return q.resolve()
    return None
def deps(f):
    try: t = f.read_text()
    except Exception: return []
    return [d for d in (resolve(f, s) for s in pat.findall(t)) if d]
target = pathlib.Path('src/packages/permission/src/pathSafety.ts').resolve()
start = pathlib.Path(sys.argv[1]).resolve()
# BFS from start recording order; find path pathSafety -> ... -> internalPaths
from collections import deque
def path(a, b):
    prev = {a: None}; dq = deque([a])
    while dq:
        x = dq.popleft()
        if x == b:
            out=[];
            while x: out.append(x); x=prev[x]
            return out[::-1]
        for y in deps(x):
            if y not in prev: prev[y]=x; dq.append(y)
ip = pathlib.Path('src/packages/permission/src/internalPaths.ts').resolve()
for a,b in ((start,ip),(target,ip)):
    p = path(a,b); print('---', a.name, '->', b.name)
    for x in p or []: print('  ', x.relative_to(pathlib.Path.cwd()))
