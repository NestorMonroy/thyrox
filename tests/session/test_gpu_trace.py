#!/usr/bin/env python3
"""La traza de VRAM y su comparación con los supuestos del fake.

El fake (``fakes/stateful-nvidia-smi.sh``) es un MODELO de cómo creemos que
se comporta una GPU NVIDIA. ``gpu_trace record`` corre un asignador por pasos
y registra, en cada muestra, lo reservado, lo asignado, lo que nvidia-smi
atribuye al PID y lo libre; ``gpu_trace compare`` contrasta esa traza con los
supuestos del modelo y, si no se cumplen, dice qué parámetro del fake hay que
corregir. Se corrige el fake, no la lectura del hardware.

Aquí el registrador corre contra el propio fake: prueba que registrar y
comparar funcionan y que el comparador DETECTA un modelo equivocado (sobrecarga
de contexto, PIDs invisibles). Sobre una GPU real lo corre
``hardware/test_gpu_admission_real.py``; en este contenedor no hay GPU.
"""
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from session import gpu_trace as gt  # noqa: E402

FAKES = Path(__file__).resolve().parent / "fakes"

results = []


def check(name, expected, obtained):
    ok = expected == obtained
    results.append(ok)
    print(("  ok    " if ok else "  FALLA ") + name + ("" if ok else f" — esperado {expected!r}, obtenido {obtained!r}"))


def fake_gpu(tmp: Path, total: int, overhead: int = 0, hide_pids: bool = False) -> tuple[str, Path]:
    state = tmp / "state"
    (state / "used").mkdir(parents=True)
    (state / "total").write_text(f"{total}\n")
    if overhead:
        (state / "context_overhead_mib").write_text(f"{overhead}\n")
    if hide_pids:
        (state / "hide_pids").touch()
    smi = tmp / "nvidia-smi"
    smi.write_text(f'#!/usr/bin/env bash\nGPU_STATE="{state}" exec bash "{FAKES}/stateful-nvidia-smi.sh" "$@"\n')
    smi.chmod(0o755)
    return str(smi), state


def record_on_fake(tmp: Path, **gpu) -> list[gt.TraceRow]:
    smi, state = fake_gpu(tmp, 6000, **gpu)
    ctl = tmp / "ctl"
    ctl.mkdir()
    alloc = ["bash", str(FAKES / "stepped-alloc.sh"), str(ctl), "3200", "4"]
    env = {**os.environ, "GPU_STATE": str(state)}
    return gt.record(alloc, ctl, mib=3200, steps=4, nvidia_smi=smi, window_s=0.3, interval_s=0.05, env=env)


def verdicts(rows) -> dict[str, str]:
    return {name: v.state for name, v in gt.compare(rows).assumptions.items()}


def main() -> int:
    print("== 1. la traza: fases, asignado por paso y liberación al salir ==")
    with tempfile.TemporaryDirectory() as tmp:
        rows = record_on_fake(Path(tmp))
        check("fases en orden", ["baseline", "running", "exited"], list(dict.fromkeys(r.state for r in rows)))
        check("asignado por paso", [0, 800, 1600, 2400, 3200],
              sorted({r.allocated_mib for r in rows if r.state in ("baseline", "running")}))
        settled = gt.settled(rows)
        check("uso según nvidia-smi al asentarse cada paso", [800, 1600, 2400, 3200], [r.smi_used_mib for r in settled])
        check("libre al asentarse cada paso", [5200, 4400, 3600, 2800], [r.free_mib for r in settled])
        out = Path(tmp) / "trace.tsv"
        gt.write_trace(out, rows)
        check("la traza se relee igual (TSV)", rows, gt.read_trace(out))

    print("== 2. contra el fake tal cual, sus supuestos se cumplen ==")
    with tempfile.TemporaryDirectory() as tmp:
        report = gt.compare(record_on_fake(Path(tmp)))
        check("todos los supuestos se cumplen", {n: "holds" for n in gt.ASSUMPTIONS},
              {n: v.state for n, v in report.assumptions.items()})
        check("calibración: sin sobrecarga de contexto", 0, report.calibration["context_overhead_mib"])

    print("== 3. un hardware con sobrecarga de contexto: el comparador pide corregir el fake ==")
    with tempfile.TemporaryDirectory() as tmp:
        report = gt.compare(record_on_fake(Path(tmp), overhead=300))
        check("no_context_overhead se viola", "violated", report.assumptions["no_context_overhead"].state)
        check("la corrección nombra el parámetro y su valor", True,
              "context_overhead_mib=300" in report.assumptions["no_context_overhead"].detail)
        check("el uso sigue lo asignado con desfase constante", "holds", report.assumptions["used_tracks_allocation"].state)
        check("calibración: 300 MiB", 300, report.calibration["context_overhead_mib"])

    print("== 4. PIDs invisibles (otro espacio de nombres): pid_visible se viola ==")
    with tempfile.TemporaryDirectory() as tmp:
        v = verdicts(record_on_fake(Path(tmp), hide_pids=True))
        check("pid_visible se viola", "violated", v["pid_visible"])
        check("sin uso por PID, lo que depende de él no se mide", "unmeasured", v["used_tracks_allocation"])

    print("== 5. una traza sin filas en marcha no concluye nada: unmeasured, no holds ==")
    empty = [gt.TraceRow(0.0, 1, 3200, 0, None, 6000, "baseline")]
    check("todo unmeasured", {n: "unmeasured" for n in gt.ASSUMPTIONS if n != "release_on_exit"} | {"release_on_exit": "unmeasured"},
          verdicts(empty))

    total, failures = len(results), results.count(False)
    print(f"test_gpu_trace: {total - failures} ok, {failures} falla(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
