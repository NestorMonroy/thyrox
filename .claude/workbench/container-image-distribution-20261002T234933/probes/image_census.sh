#!/usr/bin/env bash
# Censo reproducible de las container images de un host: observación por la
# autoridad declarada, linaje por Parent, comprobación de que cada intermedia
# no tiene capas propias, fuga de entorno de build en el historial, referencias
# que declara el código y verificación remota de lo publicado. No emite ningún
# verbo de Podman: consume la observación del dueño. Sólo lectura:
# no borra, no publica, no descarga. Idempotente: cada ejecución reescribe sólo
# su directorio de salida.
# Uso: image_census.sh <salida> <repositorio-de-distribución|-> <directorio-de-observación>
#   <repositorio-de-distribución>: namespace OCI configurado, p. ej. docker.io/th3rox
set -uo pipefail
ROOT="${THYROX_ROOT:-/home/user/thyrox}" O="$1" DISTRIBUTION="${2:-}"; [[ "$DISTRIBUTION" == "-" ]] && DISTRIBUTION=""
mkdir -p "$O"; cd "$ROOT" || exit 2

# 1-2. La observación NO se hace aquí: la pide al dueño el plano de control
#    (`podman-execution-execute observe images`, P4 de T005) y deja en el
#    directorio de observación `observe-images.json` e `inspect.json`. Una
#    unidad no ve el almacén. `inspect.json` (Parent, capas, historial) aún no
#    tiene subcomando en el observador: tarea abierta de rutear observadores.
OBSERVED="${3:?falta el directorio de observación (observe-images.json, inspect.json)}"
for file in observe-images.json inspect.json; do
    [[ -s "$OBSERVED/$file" ]] || { echo "falta $OBSERVED/$file" >&2; exit 2; }
    cp "$OBSERVED/$file" "$O/$file"
done

# 3. Linaje, capas propias e historial, derivados de inspect.json.
python3 - "$O" <<'PY'
import json, re, sys
out = sys.argv[1]
images = json.load(open(f"{out}/inspect.json"))
by_id = {i["Id"]: i for i in images}
children = {}
for i in images:
    if i.get("Parent"):
        children.setdefault(i["Parent"], []).append(i["Id"])
def final_of(image_id):
    while children.get(image_id):
        image_id = children[image_id][0]
    return image_id
proxy = re.compile(r"(HTTPS?_PROXY|NO_PROXY|https?_proxy)=")
secret = re.compile(r"(TOKEN|PASSWORD|SECRET|API_KEY|AUTH)[A-Z_]*=")
rows = []
for i in images:
    final = by_id[final_of(i["Id"])]
    layers, final_layers = i["RootFS"]["Layers"], final["RootFS"]["Layers"]
    history = [h.get("created_by", "") for h in (i.get("History") or [])]
    rows.append({
        "imageId": i["Id"], "repoTags": i.get("RepoTags") or [], "repoDigests": i.get("RepoDigests") or [],
        "sizeBytes": i.get("Size"), "createdAt": i.get("Created"), "labels": (i.get("Config") or {}).get("Labels") or {},
        "parentId": i.get("Parent") or None, "finalImageId": final["Id"], "finalTags": final.get("RepoTags") or [],
        "layerCount": len(layers), "layersArePrefixOfFinal": final_layers[:len(layers)] == layers,
        "childCount": len(children.get(i["Id"], [])), "historyLines": len(history),
        "proxyAssignments": sum(bool(proxy.search(h)) for h in history),
        "secretLikeAssignments": sum(bool(secret.search(h)) for h in history),
    })
json.dump(rows, open(f"{out}/census.json", "w"), indent=1)
untagged = [r for r in rows if not r["repoTags"]]
summary = {
    "images": len(rows), "tagged": len(rows) - len(untagged), "untagged": len(untagged),
    "untaggedLayersArePrefixOfFinal": sum(r["layersArePrefixOfFinal"] for r in untagged),
    "untaggedByFinal": {f: sum(r["finalImageId"] == f for r in untagged) for f in sorted({r["finalImageId"] for r in untagged})},
    "historyWithProxyAssignments": [r["imageId"][:12] for r in rows if r["repoTags"] and r["proxyAssignments"]],
}
json.dump(summary, open(f"{out}/summary.json", "w"), indent=1)
print(json.dumps(summary))
PY

# 4. Referencias de imagen que declara el código de producción.
git grep -nE "(docker\.io|localhost)/[a-z0-9._/-]+:[A-Za-z0-9._-]+" -- src bin ':(exclude)**/__tests__/**' ':(exclude)**/dist/**' ':(exclude)**/testing/**' \
    > "$O/declared-references.txt" || true

# 5. Verificación remota de cada etiqueta local bajo el namespace de distribución.
: > "$O/remote-verification.tsv"
if [[ -n "$DISTRIBUTION" ]]; then
    jq -r --arg ns "$DISTRIBUTION/" '.[] | .repoTags[] | select(startswith($ns))' "$O/census.json" | sort -u | while read -r tag; do
        ref="${tag#docker.io/}"; repo="${ref%:*}"; label="${ref##*:}"
        remote=$(curl -sS --max-time 20 "https://hub.docker.com/v2/namespaces/${repo%%/*}/repositories/${repo#*/}/tags/$label" | jq -r '.digest // "absent"')
        local_digests=$(jq -r --arg t "$tag" '.[] | select(.repoTags | index($t)) | .repoDigests[]' "$O/census.json" | sed 's/.*@//' | paste -sd, -)
        verdict=absent; [[ ",$local_digests," == *",$remote,"* ]] && verdict=match
        [[ "$remote" != absent && "$verdict" == absent ]] && verdict=mismatch
        printf '%s\t%s\t%s\n' "$tag" "$remote" "$verdict" >> "$O/remote-verification.tsv"
    done
fi
cat "$O/remote-verification.tsv"
