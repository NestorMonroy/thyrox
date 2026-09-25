"""Candidatos del paso 081: los dos que el 080 dejó a un eslabón.

A  tokenEstimation.ts copiado con el cast adaptado a su Content, más la
   clave ./model/bedrock.js del manifiesto de provider
B  la cadena de runClaudeCode: cli/src/index.ts (el reexport), entry/run-cli.ts
   y entry/detect-mode.ts (detectRuntimeMode)
"""
import hashlib, json, pathlib, sys
S = pathlib.Path(sys.argv[1])
sha = lambda t: hashlib.sha256(t.encode()).hexdigest()
def whole(path, new):
    old = pathlib.Path(path).read_text()
    return {'file': path, 'start': 0, 'length': len(old), 'newText': new}, sha(old)
prev = {json.loads(l)['files'][0]: json.loads(l) for l in open('.claude/workbench/copia-de-simbolos/candidatos-079.jsonl')}
out = []
te = 'src/packages/agent/tokenEstimation.ts'; pj = 'src/packages/provider/package.json'
e1, b1 = whole(te, (S / 'tokenEstimation-adaptado.ts').read_text())
text = pathlib.Path(pj).read_text(); anchor = '    "./model/check1mAccess.js": {'
key = '    "./model/bedrock.js": {\n      "types": "./dist/model/bedrock.d.ts",\n      "default": "./src/model/bedrock.ts"\n    },\n'
e2, b2 = whole(pj, text.replace(anchor, key + anchor, 1))
out.append({'proposal_id': 'copy-symbols:src/packages/agent/tokenEstimation.ts:adapted-content', 'proposer': 'copy-missing-symbols',
            'targets': prev[te]['targets'], 'files': [te, pj], 'edits': [e1, e2], 'bases': {te: b1, pj: b2}})
chain = [json.loads(l) for l in open(S / 'cadena.jsonl')]
idx = prev['src/packages/cli/src/index.ts']
b = {'proposal_id': 'copy-symbols:src/packages/cli/src/index.ts:run-cli-chain', 'proposer': 'copy-missing-symbols',
     'targets': idx['targets'], 'files': list(idx['files']), 'edits': list(idx['edits']), 'bases': dict(idx['bases'])}
for c in chain:
    b['files'] += c['files']; b['edits'] += c['edits']; b['bases'].update(c['bases'])
out.append(b)
with open(S / 'candidates.jsonl', 'w') as f:
    for x in out: f.write(json.dumps(x) + '\n')
print([x['files'] for x in out])
