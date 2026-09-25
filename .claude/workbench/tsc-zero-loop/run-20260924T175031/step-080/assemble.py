"""Arma los candidatos del paso 080: tres copias que necesitan una pieza más.

A  tokenEstimation.ts + la clave ./model/bedrock.js del manifiesto de provider
B  cli/src/index.ts + runClaudeCode en entry/run-cli.ts (la cadena del reexport)
C  getNextPermissionMode.ts con el ToolPermissionContext canónico, como la fuente
"""
import hashlib, json, pathlib, sys
S = pathlib.Path(sys.argv[1])
sha = lambda t: hashlib.sha256(t.encode()).hexdigest()
cands = {json.loads(l)['files'][0]: json.loads(l) for l in open('.claude/workbench/copia-de-simbolos/candidatos-079.jsonl')}
runcli = json.loads(open(S / 'run-cli.jsonl').readline())

def edit_whole(path, new):
    old = pathlib.Path(path).read_text()
    return {'file': path, 'start': 0, 'length': len(old), 'newText': new}, sha(old)

out = []
# A
a = cands['src/packages/agent/tokenEstimation.ts']
pj = 'src/packages/provider/package.json'
text = pathlib.Path(pj).read_text()
anchor = '    "./model/check1mAccess.js": {'
key = '    "./model/bedrock.js": {\n      "types": "./dist/model/bedrock.d.ts",\n      "default": "./src/model/bedrock.ts"\n    },\n'
assert anchor in text and '"./model/bedrock.js"' not in text
e, b = edit_whole(pj, text.replace(anchor, key + anchor, 1))
a['proposal_id'] += ':with-bedrock-export'; a['files'].append(pj); a['edits'].append(e); a['bases'][pj] = b
out.append(a)
# B
bcand = cands['src/packages/cli/src/index.ts']
bcand['proposal_id'] += ':with-run-cli'
bcand['files'] += runcli['files']; bcand['edits'] += runcli['edits']; bcand['bases'].update(runcli['bases'])
out.append(bcand)
# C
c = cands['src/packages/permission/src/getNextPermissionMode.ts']
new = c['edits'][0]['newText']
local = new[new.index('// V7 — tipo local angosto'):new.index('// Divergencia declarada arriba')]
new = new.replace(local, "import type { ToolPermissionContext } from '@thyrox/tool-registry/Tool.js'\n\n", 1)
c['edits'][0]['newText'] = new; c['proposal_id'] += ':canonical-context'
out.append(c)
with open(S / 'candidates.jsonl', 'w') as f:
    for x in out: f.write(json.dumps(x) + '\n')
print(len(out), [x['files'] for x in out])
