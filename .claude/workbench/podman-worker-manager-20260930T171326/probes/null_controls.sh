#!/usr/bin/env bash
# Anula una guarda por vez y lista los casos que caen; restaura siempre.
set -u
F=src/podman/podmanWorkerManager.ts
cp "$F" "$F.orig"; trap 'mv "$F.orig" "$F"' EXIT
run() {  # <nombre> <python de reemplazo>
    cp "$F.orig" "$F"
    python3 -c "import sys;p='$F';s=open(p).read();o,n=sys.argv[1],sys.argv[2];assert s.count(o)==1,o;open(p,'w').write(s.replace(o,n))" "$2" "$3"
    echo "== $1"
    timeout 60 bun test src/__tests__/podmanWorkerManager.test.ts 2>&1 | grep -E '^\(fail\)| pass$| fail$'
}
run liveness "if (!isWorkerContainerProcessAlive(inspection, this.deps.lifecycle.isProcessAlive)) {" "if (false) {"
run release-on-failure "      await this.deps.vram.release(this.deps.daemonPid)
      throw error" "      throw error"
run owner-busy "if (current) throw new VramOwnerBusyError(request.workerId, current.workerId)" ""
