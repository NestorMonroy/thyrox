#!/usr/bin/env bash
# e2e REAL de la frontera del controlador de continuación: Podman, GNU Parallel,
# worktrees e integración, sin modelo. El trabajador es un doble que exige correr
# dentro de una unidad (`/run/.containerenv`) y deja su evidencia: contenedor,
# cgroup, intervalo y directorio.
#
# Escenarios (SCENARIO=dag|batch|all, por defecto all):
#   dag    T1, T2, T4 independientes; T3 depende de T1; anchura 3.
#          Se exige: T1 T2 T4 en tres unidades a la vez; T3 no se despacha antes
#          de aceptar T1 y arranca mientras T2 y T4 siguen; cuatro dueños,
#          contenedores y cgroups distintos; integración de los cuatro.
#   batch  TASK-A (A1, A2 tras A1), TASK-B (B1), TASK-C (C1): A1 B1 C1 a la vez.
#
# Anulación: FRONTIER_ANNUL=cursor devuelve el cursor serial de antes (el primer
# ítem sin asentar, nada nuevo mientras uno corre); FRONTIER_ANNUL=first sólo
# recorta la frontera a su primer ítem, y NO serializa (medido). Con cursor tienen
# que caer las aserciones de concurrencia (max_active, solapes) y ninguna de
# integración ni de aislamiento.
#
# Corre en el anfitrión: es el plano de control que lanza unidades. Su arenero
# vive en .thyrox/runtime (ignorado); su resumen va a $RESULTS si se declara.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCENARIO="${SCENARIO:-all}"
STAMP="$(date -u +%Y%m%dT%H%M%S)-$$"
SANDBOX="$ROOT/.thyrox/runtime/continuation-frontier-e2e/$STAMP"
RESULTS="${RESULTS:-$SANDBOX/results}"
mkdir -p "$SANDBOX" "$RESULTS"
OK=0; FAILED=0
check() { if [[ "$2" == "$3" ]]; then OK=$((OK+1)); echo "ok   $1"; else FAILED=$((FAILED+1)); echo "FALLA $1: esperado «$2», obtenido «$3»"; fi; }

make_target() {
    local dir="$1"
    git init -q -b main "$dir/repo"
    git -C "$dir/repo" config user.name jcg-admin
    git -C "$dir/repo" config user.email 169318663+jcg-admin@users.noreply.github.com
    echo base > "$dir/repo/README"
    git -C "$dir/repo" add README && git -C "$dir/repo" commit -q -m "Seed the frontier e2e target"
    git init -q --bare "$dir/origin.git"
    git -C "$dir/repo" remote add origin "$dir/origin.git"
    git -C "$dir/repo" push -q origin main
    git -C "$dir/repo" branch -q --set-upstream-to=origin/main
}

make_workbench() {
    # $1 dir, $2 filas del plan (una por línea: id|taskId|dependsOn coma|segundos)
    local dir="$1" rows="$2" wb="$1/wb"
    mkdir -p "$wb/probes" "$wb/prompts" "$wb/outputs/units"
    : > "$wb/plan.jsonl"
    while IFS='|' read -r id task deps seconds; do
        [[ -n "$id" ]] || continue
        echo "trabajo de $id" > "$wb/prompts/$id.md"
        python3 - "$wb" "$id" "$task" "$deps" <<'PY' >> "$wb/plan.jsonl"
import json, sys
wb, item, task, deps = sys.argv[1:]
print(json.dumps({"id": item, "taskId": task, "prompt": f"{wb}/prompts/{item}.md",
                  "verify": f"test \"$(cat {item}.txt 2>/dev/null)\" = ok",
                  "candidates": ["fake-worker"], "dependsOn": [d for d in deps.split(",") if d],
                  "mutates": True, "isolation": "worktree", "owned": [f"{item}.txt"],
                  "secrets": [], "attempts": 1, "resourceProfile": {"cpus": 1, "memoryMib": 256}}))
PY
        printf '%s\t%s\n' "$id" "$seconds" >> "$wb/probes/durations.tsv"
    done <<< "$rows"
    cat > "$wb/probes/delegate.sh" <<'SH'
#!/usr/bin/env bash
# Doble del trabajador: sólo corre DENTRO de una unidad.
set -uo pipefail
wb="$1" item="$2"
[[ -f /run/.containerenv ]] || { echo "delegate: payload fuera de una unidad" >&2; exit 9; }
seconds="$(awk -F'\t' -v i="$item" '$1 == i {print $2}' "$wb/probes/durations.tsv")"
start="$(date +%s.%N)"
sleep "$seconds"
echo ok > "$item.txt"
end="$(date +%s.%N)"
python3 - "$wb" "$item" "$start" "$end" <<'PY'
import json, os, re, socket, sys
wb, item, start, end = sys.argv[1:]
# Con --network host el hostname es el del anfitrión: el contenedor se lee de su cgroup.
cgroup = open("/proc/self/cgroup").read().strip()
match = re.search(r"libpod-([0-9a-f]{64})", cgroup)
json.dump({"item": item, "container": match.group(1) if match else socket.gethostname(), "cgroup": cgroup,
           "start": float(start), "end": float(end), "cwd": os.getcwd(),
           "in_container": os.path.exists("/run/.containerenv")}, open(f"{wb}/outputs/units/{item}.json", "w"))
PY
SH
    chmod +x "$wb/probes/delegate.sh"
}

sample_containers() {
    # Los contenedores de las unidades y sus etiquetas de dueño, cada medio segundo.
    while :; do
        podman ps --filter label=thyrox.owner-kind=task \
            --format '{{.ID}}	{{index .Labels "thyrox.owner-id"}}	{{index .Labels "thyrox.owner-pid"}}	{{index .Labels "thyrox.execution-id"}}' 2>/dev/null
        sleep 0.5
    done
}

run_controller() {
    local dir="$1" width="$2"
    PYTHONPATH="$ROOT/src" FRONTIER_ANNUL="${FRONTIER_ANNUL:-}" python3 - run "$dir/wb" --target "$dir/repo" \
        --width "$width" --seed 1 > "$dir/controller.out" 2>&1 <<'PY'
import os, sys
import session.task_continuation as controller
whole = controller.runnable_items
if os.environ.get("FRONTIER_ANNUL") == "first":
    # Sólo recorta: con la frontera recalculada en cada vuelta, el siguiente ítem
    # se despacha en la vuelta siguiente y la concurrencia sobrevive (medido).
    controller.runnable_items = lambda *a, **k: whole(*a, **k)[:1]
elif os.environ.get("FRONTIER_ANNUL") == "cursor":
    # El cursor de antes (next_item): el primer ítem sin asentar, y nada nuevo
    # mientras uno corre.
    def cursor(plan, states, exposed=()):
        if any(state == "running" for state in states.values()):
            return []
        return whole(plan, states, exposed)[:1]
    controller.runnable_items = cursor
sys.exit(controller.main(sys.argv[1:]))
PY
}

analyze() {
    # Imprime métricas clave=valor a partir de la evidencia del escenario.
    python3 - "$1" <<'PY'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1]); wb = d / "wb"
units = {p.stem: json.loads(p.read_text()) for p in (wb / "outputs/units").glob("*.json")}
log = [json.loads(l) for l in (wb / "outputs/continuation.jsonl").read_text().splitlines() if l.strip()]
accepted = {r["item"]: r["epoch"] for r in log if r.get("kind") == "accepted"}
dispatched = {r["item"]: r["epoch"] for r in log if r.get("kind") == "dispatched"}
samples = {}
for line in (d / "samples.tsv").read_text().splitlines():
    cols = line.split("\t")
    if len(cols) == 4:
        samples[cols[0]] = (cols[1], cols[2])
events = sorted([(u["start"], 1) for u in units.values()] + [(u["end"], -1) for u in units.values()])
active = peak = 0
for _, delta in events:
    active += delta; peak = max(peak, active)
owners = {samples.get(u["container"][:12]) for u in units.values()}
joblog = next((r["joblog"] for r in log if r.get("kind") == "dispatcher"), "")
jobs = [l for l in pathlib.Path(joblog).read_text().splitlines()[1:] if "run-one" in l] if joblog and pathlib.Path(joblog).is_file() else []
dispatcher = next((r["command"] for r in log if r.get("kind") == "dispatcher"), [])
def overlap(a, b):
    return a in units and b in units and units[a]["start"] < units[b]["end"] and units[b]["start"] < units[a]["end"]
out = {
    "units": len(units), "max_active": peak,
    "containers": len({u["container"] for u in units.values()}),
    "cgroups": len({u["cgroup"] for u in units.values()}),
    "owners": len(owners - {None}), "owner_ids": ",".join(sorted({o[0] for o in owners if o})),
    "in_container": all(u["in_container"] and "libpod" in u["cgroup"] for u in units.values()),
    "in_worktree": all("/worktrees/" in u["cwd"] for u in units.values()),
    "parallel_jobs": len(jobs), "via_parallel_map": any(w.endswith("bin/parallel_map") for w in dispatcher),
    "accepted": ",".join(sorted(accepted)),
}
for a, b in (("T1", "T2"), ("T1", "T4"), ("T2", "T4"), ("A1", "B1"), ("A1", "C1"), ("B1", "C1"), ("T3", "T2"), ("T3", "T4")):
    out[f"overlap_{a}_{b}"] = overlap(a, b)
for child, parent in (("T3", "T1"), ("A2", "A1")):
    if child in dispatched and parent in accepted:
        out[f"{child}_dispatched_after_{parent}_accepted"] = dispatched[child] >= accepted[parent]
    if child in units and parent in accepted:
        out[f"{child}_started_after_{parent}_accepted"] = units[child]["start"] >= accepted[parent]
for key, value in out.items():
    print(f"{key}={value}")
PY
}

integration_metrics() {
    local repo="$1/repo"
    echo "files=$(git -C "$repo" ls-files | grep -c '\.txt$')"
    echo "accept_commits=$(git -C "$repo" log --format=%s | grep -c '^Accept ')"
    echo "remote_equals_local=$([[ "$(git -C "$repo" rev-parse HEAD)" == "$(git -C "$1/origin.git" rev-parse main)" ]] && echo true || echo false)"
    echo "worktrees_left=$(git -C "$repo" worktree list | tail -n +2 | wc -l)"
}

scenario() {
    local name="$1" width="$2" rows="$3" dir="$SANDBOX/$1"
    mkdir -p "$dir"
    make_target "$dir"
    make_workbench "$dir" "$rows"
    sample_containers > "$dir/samples.tsv" & local sampler=$!
    run_controller "$dir" "$width"; local code=$?
    kill "$sampler" 2>/dev/null; wait "$sampler" 2>/dev/null
    { echo "controller_exit=$code"; analyze "$dir"; integration_metrics "$dir"; } > "$dir/metrics.txt"
    cp "$dir/metrics.txt" "$RESULTS/$name${FRONTIER_ANNUL:+-annul-$FRONTIER_ANNUL}.metrics.txt"
    cp "$dir/wb/outputs/continuation.jsonl" "$RESULTS/$name${FRONTIER_ANNUL:+-annul-$FRONTIER_ANNUL}.continuation.jsonl"
    echo "== $name (sandbox $dir)"; cat "$dir/metrics.txt"
}

metric() { awk -F= -v k="$2" '$1 == k {print $2}' "$SANDBOX/$1/metrics.txt"; }

if [[ "$SCENARIO" == dag || "$SCENARIO" == all ]]; then
    scenario dag 3 "T1|TASK-THYROX-0754||3
T2|TASK-THYROX-0754||50
T3|TASK-THYROX-0754|T1|3
T4|TASK-THYROX-0754||50"
    check "dag: el controlador acepta todo" 0 "$(metric dag controller_exit)"
    check "dag: cuatro unidades de trabajo" 4 "$(metric dag units)"
    check "dag: max_active >= 2" true "$([[ "$(metric dag max_active)" -ge 2 ]] && echo true || echo false)"
    check "dag: T1 y T2 a la vez" True "$(metric dag overlap_T1_T2)"
    check "dag: T1 y T4 a la vez" True "$(metric dag overlap_T1_T4)"
    check "dag: T2 y T4 a la vez" True "$(metric dag overlap_T2_T4)"
    check "dag: T3 despachado tras aceptar T1" True "$(metric dag T3_dispatched_after_T1_accepted)"
    check "dag: T3 arranca tras aceptar T1" True "$(metric dag T3_started_after_T1_accepted)"
    check "dag: T3 corre mientras T2 sigue" True "$(metric dag overlap_T3_T2)"
    check "dag: T3 corre mientras T4 sigue" True "$(metric dag overlap_T3_T4)"
    check "dag: cuatro contenedores distintos" 4 "$(metric dag containers)"
    check "dag: cuatro cgroups distintos" 4 "$(metric dag cgroups)"
    check "dag: cuatro dueños distintos" 4 "$(metric dag owners)"
    check "dag: todo payload dentro de una unidad" True "$(metric dag in_container)"
    check "dag: cada trabajador en su worktree" True "$(metric dag in_worktree)"
    check "dag: GNU Parallel despachó los cuatro" 4 "$(metric dag parallel_jobs)"
    check "dag: el despacho es parallel_map" True "$(metric dag via_parallel_map)"
    check "dag: los cuatro integrados" 4 "$(metric dag files)"
    check "dag: un commit por ítem" 4 "$(metric dag accept_commits)"
    check "dag: remoto == local" true "$(metric dag remote_equals_local)"
    check "dag: worktrees retirados" 0 "$(metric dag worktrees_left)"
fi

if [[ "$SCENARIO" == batch || "$SCENARIO" == all ]]; then
    scenario batch 3 "A1|TASK-BATCHA-0001||3
A2|TASK-BATCHA-0001|A1|3
B1|TASK-BATCHB-0001||40
C1|TASK-BATCHC-0001||40"
    check "batch: el controlador acepta todo" 0 "$(metric batch controller_exit)"
    check "batch: A1 y B1 a la vez" True "$(metric batch overlap_A1_B1)"
    check "batch: A1 y C1 a la vez" True "$(metric batch overlap_A1_C1)"
    check "batch: B1 y C1 a la vez" True "$(metric batch overlap_B1_C1)"
    check "batch: max_active >= 2" true "$([[ "$(metric batch max_active)" -ge 2 ]] && echo true || echo false)"
    check "batch: A2 despachado tras aceptar A1" True "$(metric batch A2_dispatched_after_A1_accepted)"
    check "batch: tres tareas como dueñas" "task-batcha-0001,task-batchb-0001,task-batchc-0001" "$(metric batch owner_ids)"
    check "batch: todo payload dentro de una unidad" True "$(metric batch in_container)"
    check "batch: los cuatro integrados" 4 "$(metric batch files)"
    check "batch: remoto == local" true "$(metric batch remote_equals_local)"
fi

echo "continuation-frontier-e2e${FRONTIER_ANNUL:+ (anulación $FRONTIER_ANNUL)}: $OK OK, $FAILED FALLAN — resultados en $RESULTS"
[[ "$FAILED" -eq 0 ]]
