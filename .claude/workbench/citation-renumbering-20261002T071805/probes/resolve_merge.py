"""Resuelve los conflictos del merge de feature/complete-orm-root conservando los dos lados.

Cada conflicto es de unión: esta rama añadió --work (TASK-THYROX-0771) y el socket del
coordinador; la otra, --attest, observe/remove-image y el hogar de la evidencia de
exposición. bg.sh se resolvió antes en el anfitrión porque las unidades dependen de él.
"""
import re
from pathlib import Path

ROOT = Path("/home/user/thyrox")
CONFLICT = re.compile(r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/feature/complete-orm-root\n", re.S)


def resolve(path: str, choose) -> None:
    file = ROOT / path
    text = file.read_text(encoding="utf-8")
    hunks = CONFLICT.findall(text)
    resolved = CONFLICT.sub(lambda m: choose(m.group(1), m.group(2)), text)
    assert "<<<<<<<" not in resolved and ">>>>>>>" not in resolved, path
    file.write_text(resolved, encoding="utf-8")
    print(f"{path}: {len(hunks)} conflicto(s)")


def both(ours: str, theirs: str) -> str:
    return ours + "\n" + theirs if not ours.endswith("\n\n") else ours + theirs


def execution_command(ours: str, theirs: str) -> str:
    if "import {" in ours:
        return (
            "import { EXECUTION_REFERENCE_LABEL_KEY, runExecution, InvalidExecutionAuthorizationError, TASK_CITATION_PATTERN,"
            " type ExecutionAuthorization, type ExecutionKind, type ExecutionReference, type ExecutionSecret } from './executionAuthorization.js'\n"
            "import { ensureSecretValue } from './resourceMaterialization.js'\n"
            "import { buildImage, removeImage } from './imageStore.js'\n"
            + next(line for line in theirs.splitlines(keepends=True) if "podmanObservation" in line)
            + "import { retireOrphanedWorkerContainers, type ContainerOwner } from './workerContainerLifecycle.js'\n"
        )
    observe_and_remove = "".join(line for line in theirs.splitlines(keepends=True) if "build-image" not in line)
    return observe_and_remove + ours


def bg_test(ours: str, theirs: str) -> str:
    return ours + theirs.replace("caso 7:", "caso 9:")


resolve(".env.example", lambda ours, theirs: ours + "\n" + theirs)
resolve("src/packages/podman-execution/executionCommand.ts", execution_command)
resolve("tests/session/test-bg-managed-execution.sh", bg_test)
