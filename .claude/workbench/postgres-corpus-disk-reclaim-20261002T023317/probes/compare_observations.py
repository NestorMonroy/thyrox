"""Compara dos observaciones del estado de Podman en los campos que el
inventario usa: raíz del almacén, volúmenes (nombre, montaje, creación,
usuarios), contenedores (nombre, id, estado) e imágenes de primer nivel (id,
etiquetas, digests, bytes). La canónica lista también las intermedias; se
compara sobre las que la directa vio.
Uso: compare_observations.py <canónica.json> <directa.json>
"""
import json
import sys
from pathlib import Path

canonical, direct = (json.loads(Path(p).read_text()) for p in sys.argv[1:3])
norm = lambda i: i.removeprefix("sha256:")


def volumes(o):
    return sorted((v["name"], v["mountpoint"], v["createdAt"], tuple(sorted(v["users"]))) for v in o["volumes"])


def containers(o):
    return sorted((c["name"], c["id"], c["state"]) for c in o["containers"])


def images(o, ids):
    return sorted((norm(i["id"]), tuple(sorted(i["tags"])), tuple(sorted(i["digests"])), i["bytes"]) for i in o["images"] if norm(i["id"]) in ids)


direct_ids = {norm(i["id"]) for i in direct["images"]}
checks = {"graphRoot": canonical["graphRoot"] == direct["graphRoot"], "volumes": volumes(canonical) == volumes(direct),
          "containers": containers(canonical) == containers(direct), "images": images(canonical, direct_ids) == images(direct, direct_ids),
          "running": sorted(canonical["running"]) == sorted(direct["running"])}
print(json.dumps({"passed": all(checks.values()), "checks": checks, "directImages": len(direct_ids), "canonicalImages": len(canonical["images"])}))
sys.exit(0 if all(checks.values()) else 1)
