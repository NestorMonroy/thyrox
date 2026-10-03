"""Censo durable de las imágenes sin etiqueta.

Une lo que ya está medido —observación del dueño (`podman-execution-execute
observe images|containers`), el censo y la procedencia de
`container-image-distribution-20261002T234933` y el inventario T005— en una
fila por imagen sin etiqueta. No observa Podman por su cuenta ni decide
borrar: la clase es provisional y `deletable` es siempre falso.

Métrica: campos unidos por identificador de imagen completo.
Ciega a: bytes únicos de imágenes que ninguna fuente midió (quedan `null`
con `uniqueBytesSource: "not-measured"`), y al contenido de las capas.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DISTRIBUTION = ROOT / '.claude/workbench/container-image-distribution-20261002T234933/outputs'
T005 = ROOT / '.claude/workbench/postgres-corpus-disk-reclaim-20261002T023317/outputs/T005-inventory.json'

# Etapa de compilación del cuantizador, fijada por digest en su Containerfile.
LLAMA_CPP_REFERENCE = 'ghcr.io/ggml-org/llama.cpp@sha256:88ef2d9c2a221e80d5eb96f707a719524e9fc522d34b272bf2852dde4898d2dc'
QUANTIZER_CONTAINERFILE = 'src/packages/model-artifacts/quantizer-image/Containerfile'


def load(path):
    return json.loads(Path(path).read_text())


def classify(row):
    """Clase provisional y su motivo; ninguna es DISPOSABLE sin las seis condiciones."""
    if row['upstreamReference']:
        return 'BUILD_CACHE', 'etapa upstream fijada por digest; reproducible con pull por digest'
    if row['buildStageOf']:
        return 'BUILD_CACHE', 'imagen de etapa creada por la construcción declarada de TASK-THYROX-0912'
    if row['crossBuildCacheReuse']:
        return 'BUILD_CACHE', 'capa intermedia reutilizada como caché por otra construcción'
    if row['relatedTaggedImage'] and row['layersArePrefixOfFinal']:
        return 'BUILD_CACHE', 'intermedia de la cadena de construcción de una final etiquetada; sus capas son prefijo de la final'
    return 'UNKNOWN', 'sin relación medida con una imagen etiquetada'


def main(outputs):
    images = load(outputs / 'observe-images.json')
    containers = load(outputs / 'observe-containers.json')
    census_rows = load(DISTRIBUTION / 'census/census.json')
    census = {r['imageId']: r for r in (census_rows if isinstance(census_rows, list) else census_rows['rows'])}
    plan = {r['imageId']: r for r in load(DISTRIBUTION / 'preservation/plan.json')}
    provenance = load(DISTRIBUTION / 'preservation/provenance.json')
    t005 = {r['id']: r for r in load(T005)['rows'] if 'id' in r}
    tagged = {i['id']: i for i in images if i['tags']}
    finals_by_prefix = {key: value for key, value in provenance['finals'].items()}

    rows = []
    for image in images:
        if image['tags']:
            continue
        image_id = image['id']
        prior = census.get(image_id, {})
        planned = plan.get(image_id, {})
        final_id = planned.get('finalImageId') or prior.get('finalImageId')
        final = tagged.get(final_id) if final_id else None
        final_provenance = finals_by_prefix.get(final_id[:12]) if final_id else None
        labels = image.get('labels') or {}
        upstream = LLAMA_CPP_REFERENCE if t005.get(image_id, {}).get('resource', '').endswith(LLAMA_CPP_REFERENCE.split('@')[1]) else None
        stage_of = None
        if not upstream and not prior and labels.get('org.opencontainers.image.title') == 'llama.cpp':
            stage_of = 'localhost/thyrox-model-quantizer:candidate-81e5a993a7be'
        unique = planned.get('uniqueBytes')
        unique_source = 'container-image-distribution plan.json' if unique is not None else None
        if unique is None and image_id in t005:
            unique, unique_source = t005[image_id].get('uniqueBytes'), 'T005-inventory.json'
        row = {
            'imageId': image_id,
            'localDigest': image.get('digests') or [],
            'sizeBytes': image['bytes'],
            'createdAt': image['created'],
            'labels': labels,
            'historyLines': prior.get('historyLines'),
            'historySource': 'container-image-distribution census/inspect.json' if prior else 'not-measured',
            'parentId': prior.get('parentId'),
            'layersArePrefixOfFinal': prior.get('layersArePrefixOfFinal'),
            'relatedTaggedImage': {'id': final_id, 'tags': final['tags'] if final else None} if final_id else None,
            'upstreamReference': upstream,
            'buildStageOf': stage_of,
            'crossBuildCacheReuse': provenance['crossBuildCacheReuse'].get(image_id[:12]),
            'task': planned.get('task') or (final_provenance or {}).get('task') or ('TASK-THYROX-0912' if stage_of else None),
            'commit': planned.get('commit') or (final_provenance or {}).get('commit') or ('81e5a993a7be' if stage_of else None),
            'workbench': planned.get('build') or (final_provenance or {}).get('build') or ('.claude/workbench/publish-quantizer-image-20261003T005015' if stage_of else None),
            'containerfile': planned.get('containerfile') or (QUANTIZER_CONTAINERFILE if (stage_of or upstream) else None),
            'containersReferencing': sorted(c['name'] for c in containers if c.get('imageId') == image_id),
            'uniqueBytes': unique,
            'uniqueBytesSource': unique_source or 'not-measured',
            'reproducible': planned.get('reproducible') or ('yes: pull by digest' if upstream else 'partial: rebuilt by the declared build, identity not bit-identical' if stage_of else None),
            'semanticValue': planned.get('semanticValue'),
            'secretLikeAssignments': prior.get('secretLikeAssignments'),
            'proxyAssignments': prior.get('proxyAssignments'),
            'finalRemoteCopy': (final_provenance or {}).get('remoteReference'),
            'deletable': False,
        }
        row['provisionalClass'], row['classReason'] = classify(row)
        rows.append(row)
    return rows


if __name__ == '__main__':
    out = Path(sys.argv[1])
    rows = main(out)
    (out / 'census.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
    print(len(rows))
