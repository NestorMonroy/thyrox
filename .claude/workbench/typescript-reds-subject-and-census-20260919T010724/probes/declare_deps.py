"""Inserta dependencias de workspace en package.json SIN reserializar el archivo.

Reserializar con json.dumps normaliza el escape unicode y los objetos en linea:
medido, 6 de 47 package.json del arbol no son byte-identicos al re-volcarlos, asi
que un pase que reserialice mezcla el cambio real con ruido de formato.
"""
import json, re, sys, collections

def indent_of(text, key):
    m = re.search(r'^(\s*)"%s"\s*:' % re.escape(key), text, re.M)
    return m.group(1) if m else '  '

def insert(path, nuevas):
    text = open(path, encoding='utf-8').read()
    data = json.loads(text)
    deps = data.get('dependencies') or {}
    pendientes = [n for n in nuevas if n not in deps]
    if not pendientes:
        return 0
    if 'dependencies' not in data:
        # Sin bloque: se crea al final del objeto raiz, con la sangria del archivo.
        sangria_raiz = indent_of(text, 'name')
        bloque = (',\n' + sangria_raiz + '"dependencies": {\n'
                  + ',\n'.join(f'{sangria_raiz}  "{n}": "workspace:*"'
                                for n in sorted(pendientes, key=str.lower))
                  + '\n' + sangria_raiz + '}')
        cierre = text.rstrip()
        assert cierre.endswith('}'), path
        text = cierre[:-1].rstrip() + bloque + '\n}\n'
        json.loads(text)
        open(path, 'w', encoding='utf-8').write(text)
        return len(pendientes)
    m = re.search(r'^(\s*)"dependencies"\s*:\s*\{\n(.*?)^\1\}', text, re.M | re.S)
    if not m:
        raise SystemExit(f'{path}: bloque "dependencies" no esta en forma multilinea')
    base, cuerpo = m.group(1), m.group(2)
    lineas = [l for l in cuerpo.split('\n') if l.strip()]
    sangria = re.match(r'\s*', lineas[0]).group(0) if lineas else base + '  '
    entradas = collections.OrderedDict()
    for l in lineas:
        k = re.search(r'"([^"]+)"\s*:', l)
        entradas[k.group(1)] = l.rstrip().rstrip(',')
    for n in pendientes:
        entradas[n] = f'{sangria}"{n}": "workspace:*"'
    orden = sorted(entradas, key=lambda s: s.lower())
    cuerpo_nuevo = ',\n'.join(entradas[k] for k in orden) + '\n'
    text = text[:m.start(2)] + cuerpo_nuevo + text[m.end(2):]
    json.loads(text)  # el archivo sigue siendo JSON valido
    open(path, 'w', encoding='utf-8').write(text)
    return len(pendientes)

plan = collections.defaultdict(list)
for linea in open(sys.argv[1], encoding='utf-8'):
    pkg, destino, _ = linea.rstrip('\n').split('\t')
    plan[pkg].append(destino)

total = 0
for pkg, destinos in sorted(plan.items()):
    n = insert(f'src/packages/{pkg}/package.json', sorted(set(destinos)))
    total += n
    print(f'  {pkg}: +{n}')
print(f'declaradas: {total} en {len(plan)} paquetes')
