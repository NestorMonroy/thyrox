"""T001: verificaciones deterministas sobre la observación del plano de control.

Corre DENTRO de una unidad. Lee el `podman inspect` del contenedor y del
volumen que el anfitrión observó, y compara contra la contraseña montada como
secreto sin imprimirla: sólo publica present/absent.
Uso: t001_checks.py <container-inspect.json> <volume-inspect.json>
"""
import json
import os
import sys
from pathlib import Path

container = json.loads(Path(sys.argv[1]).read_text())[0]
volume = json.loads(Path(sys.argv[2]).read_text())[0]
labels = container["Config"].get("Labels") or {}
mounts = container.get("Mounts") or []
data_mount = next((m for m in mounts if m.get("Type") == "volume"), {})
env = container["Config"].get("Env") or []
password = os.environ.get("THYROX_INFRA_POSTGRES_PASSWORD", "")
serialized = json.dumps(container)
checks = {
    "running": container["State"]["Status"] == "running",
    "ownerKind": labels.get("thyrox.owner-kind") == "infrastructure",
    "ownerId": labels.get("thyrox.owner-id") == "infrastructure-bootstrap",
    "volume": data_mount.get("Name") == "thyrox-postgres-data",
    "passwordFileMechanism": any(item.startswith("POSTGRES_PASSWORD_FILE=") for item in env),
    "passwordLiteralAbsent": bool(password) and password not in serialized,
}
print(json.dumps({
    "containerId": container["Id"], "image": container.get("ImageName") or container["Config"].get("Image"),
    "ownerKind": labels.get("thyrox.owner-kind"), "ownerId": labels.get("thyrox.owner-id"),
    "volume": data_mount.get("Name"), "mountDestination": data_mount.get("Destination"),
    "volumeMountpoint": volume.get("Mountpoint"), "volumeLabels": volume.get("Labels"),
    "ports": container["HostConfig"].get("PortBindings"), "health": (container["State"].get("Health") or {}).get("Status"),
    "secret_THYROX_INFRA_POSTGRES_PASSWORD": "present" if password else "absent",
    "checks": checks, "passed": all(checks.values()),
}, ensure_ascii=False))
sys.exit(0 if all(checks.values()) else 1)
