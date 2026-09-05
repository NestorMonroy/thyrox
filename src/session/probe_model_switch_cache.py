#!/usr/bin/env python3
"""Sonda: ¿sobrevive la caché de prompt a un cambio de modelo, y dispara el advisor?

Directiva del ejecutor 2026-09-02: *«si habilitamos el advisor con Fable 5.1
y prueba el cambio de modelo, puede existir un tema como el del llenado de
.claude/agent-results que no se hace; analiza si se puede ejecutar con algún
script, usa TDD»*. La suite ``tests/test_probe_model_switch_cache.py`` se
escribió antes que este guion y fija su contrato.

Qué hace en modo ``--live`` (cuesta céntimos: cwd vacío, sin el piso de reglas):

1. Sesión nueva en ``claude-fable-5-1`` → contexto C1.
2. ``--resume`` de la misma sesión con ``claude-opus-5`` → ¿reescribe C1?
3. ``--resume`` otra vez con ``claude-fable-5-1`` → ¿relee ≥ 95 % de C1?
   Si sí, la entrada del modelo original sobrevivió al cambio: cierra el
   INFERRED de ``analisis-gestion-de-la-cache-de-prompt-en-el-binario`` §4.
4. Sesión nueva con ``--advisor <modelo>`` → ¿el ``usage`` trae iteraciones
   ``advisor_message``, o el cliente responde con uno de sus literales de
   rechazo?

Por qué ``--settings`` y ``--session-id`` son obligatorios: en el harness
remoto el ``.claude/settings.json`` del repo no es fuente de settings
(:ref:`h-docs-1010`), así que ni los hooks ni ``advisorModel`` cargarían por
esa vía; la bandera ``--settings`` es ``flagSettings`` y sí carga. Y un hijo
hereda ``CLAUDE_CODE_SESSION_ID``: sin ``--session-id`` propio escribe con el
id de la sesión madre (medido: su transcript apareció con nuestro id).

Métrica: ``usage`` del JSON que ``--output-format json`` devuelve por llamada
(``cache_read_input_tokens``, ``cache_creation_input_tokens`` y su reparto
``ephemeral_5m/1h``), y los marcadores que los hooks ``Pre/PostModelSwitch``
escriben. Ciega a: la caché del prompt de sistema compartida entre sesiones
del mismo modelo (el primer turno ya lee ~33 k), por eso el criterio compara
contra el contexto de la ida y no contra cero.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import uuid

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
MODEL_ID_RE = re.compile(r"^claude-[a-z0-9-]+$")
REUSE_THRESHOLD = 0.95  # el 5 % con que la referencia declara un corte
ADVISOR_LITERALS = (
    ("does not support the advisor tool", "unsupported"),
    ("cannot be used as an advisor", "cannot_advise"),
    ("cannot advise", "cannot_advise"),
    ("in an interactive session", "consent_required"),
    ("advisor_fable_consent", "consent_required"),
)
MOTHER_SESSION_ENV = "CLAUDE_CODE_SESSION_ID"


def new_session_id() -> str:
    """UUID v4 propio: nunca el de la sesión madre."""
    return str(uuid.uuid4())


def build_command(*, model: str, prompt: str, session_id: str, settings_path: str, cwd: str,
                  resume: str | None = None, advisor: str | None = None,
                  claude_bin: str = "claude") -> list[str]:
    """La línea de comandos de una llamada de la sonda. Rehúsa alias y no-UUID."""
    if not MODEL_ID_RE.match(model):
        raise ValueError(f"modelo por identificador completo, no alias: {model!r}")
    if advisor is not None and not MODEL_ID_RE.match(advisor):
        raise ValueError(f"advisor por identificador completo, no alias: {advisor!r}")
    if not UUID_RE.match(session_id):
        raise ValueError(f"session_id debe ser UUID: {session_id!r}")
    cmd = [claude_bin, "-p", prompt, "--model", model, "--output-format", "json",
           "--settings", settings_path]
    if resume:
        # `--session-id` junto a `--resume` exige `--fork-session` (medido en la
        # primera corrida): la reanudación ya nombra la sesión; el id propio va
        # sólo en la sesión nueva, y el hijo no hereda el de la madre (child_env).
        cmd += ["--resume", resume]
    else:
        cmd += ["--session-id", session_id]
    if advisor:
        cmd += ["--advisor", advisor]
    return cmd


def hook_settings(marker_dir: pathlib.Path, advisor_model: str | None = None) -> dict:
    """Settings que la sonda entrega por ``--settings``: hooks que vuelcan su
    payload a un marcador por evento, y ``advisorModel`` si se pide."""
    marker_dir = pathlib.Path(marker_dir)
    hooks = {}
    # Stop es el control: dispara en todo turno de -p. Si su marcador no
    # aparece, `--settings` no cargó hooks y el silencio de los otros dos no
    # significa nada (sub-patrón D de metrica-decide-la-conclusion.md).
    for event in ("PreModelSwitch", "PostModelSwitch", "Stop"):
        marker = marker_dir / f"{event}.json"
        hooks[event] = [{"hooks": [{"type": "command", "command": f"cat > '{marker}'", "timeout": 5}]}]
    settings: dict = {"hooks": hooks}
    if advisor_model:
        settings["advisorModel"] = advisor_model
    return settings


def write_settings(directory: pathlib.Path, settings: dict) -> str:
    path = pathlib.Path(directory) / "probe-settings.json"
    path.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return str(path)


def parse_result(stdout: str) -> dict:
    """Lo que la sonda lee del JSON de ``--output-format json``."""
    try:
        data = json.loads(stdout)
    except ValueError as exc:
        raise ValueError(f"la salida no es JSON: {exc}") from exc
    usage = data.get("usage") or {}
    cc = usage.get("cache_creation") or {}
    inp = usage.get("input_tokens", 0) or 0
    ccre = usage.get("cache_creation_input_tokens", 0) or 0
    cr = usage.get("cache_read_input_tokens", 0) or 0
    iterations = usage.get("iterations") or []
    return {
        "session_id": data.get("session_id"),
        "stop_reason": data.get("stop_reason"),
        "result": data.get("result"),
        "input": inp,
        "cache_creation": ccre,
        "cache_read": cr,
        "output": usage.get("output_tokens", 0) or 0,
        "w5m": cc.get("ephemeral_5m_input_tokens", 0) or 0,
        "w1h": cc.get("ephemeral_1h_input_tokens", 0) or 0,
        "context_tokens": inp + ccre + cr,
        "models": list((data.get("modelUsage") or {}).keys()),
        "client_cost_usd": data.get("total_cost_usd"),
        "advisor_iterations": sum(1 for it in iterations if isinstance(it, dict) and it.get("type") == "advisor_message"),
    }


def cache_reused(*, prior_context: int, cache_read: int, threshold: float = REUSE_THRESHOLD):
    """¿La lectura cubre ≥ threshold del contexto previo? ``None`` si no hay previo."""
    if prior_context <= 0:
        return None
    return cache_read >= prior_context * threshold


def advisor_outcome(*, stdout: str, stderr: str) -> str:
    """Qué hizo el cliente con ``--advisor``, leído de sus propios literales."""
    text = f"{stdout}\n{stderr}"
    for literal, outcome in ADVISOR_LITERALS:
        if literal in text:
            return outcome
    try:
        if parse_result(stdout)["advisor_iterations"] > 0:
            return "used"
    except ValueError:
        pass
    return "unknown"


def verdict(steps: list[dict]) -> dict:
    """La conclusión de la secuencia ida → destino → vuelta."""
    ida = next((s for s in steps if s["step"].endswith("-1")), None)
    destino = next((s for s in steps if s["step"].endswith("-2")), None)
    vuelta = next((s for s in steps if s["step"].endswith("-3")), None)
    control = next((s for s in steps if s["step"].endswith("-4")), None)
    out = {"steps": len(steps), "original_entry_survived": None, "target_rewrote_context": None,
           "return_read_fraction": None, "control_read_fraction": None, "loss_attributable_to_switch": None}
    ok = lambda s: s is not None and "cache_read" in s  # un paso sin usage no decide
    if ok(ida) and ok(vuelta):
        out["original_entry_survived"] = cache_reused(prior_context=ida["context_tokens"], cache_read=vuelta["cache_read"])
        out["return_read_fraction"] = vuelta["cache_read"] / ida["context_tokens"] if ida["context_tokens"] else None
    if ok(vuelta) and ok(control):
        # el control reanuda con el MISMO modelo: lo que pierda es de reanudar
        out["control_read_fraction"] = control["cache_read"] / vuelta["context_tokens"] if vuelta["context_tokens"] else None
        if out["return_read_fraction"] is not None and out["control_read_fraction"] is not None:
            out["loss_attributable_to_switch"] = out["return_read_fraction"] < out["control_read_fraction"] - 0.05
    if ok(ida) and ok(destino):
        # el destino no pudo leer la conversación de la ida: lo que releyó
        # es a lo sumo el prefijo de sistema compartido, y escribió el resto
        out["target_rewrote_context"] = destino["cache_creation"] > 0 and destino["cache_read"] < ida["context_tokens"] * REUSE_THRESHOLD
    return out


def matrix_pairs(models: list[str]) -> list[tuple[str, str]]:
    """Los pares a medir: por cada origen, su control (A→A) y luego los demás.

    El control va PRIMERO y siempre: fija el techo de lo que la reanudación
    sola relee, y sin él un ``cache_read`` bajo no distingue «la clave no se
    comparte» de «reanudar ya pierde eso» (el sub-patrón D de
    ``metrica-decide-la-conclusion.md``).
    """
    orden = list(dict.fromkeys(models))
    pares: list[tuple[str, str]] = []
    for origen in orden:
        pares.append((origen, origen))
        pares.extend((origen, destino) for destino in orden if destino != origen)
    return pares


def matrix_verdict(rows: list[dict]) -> dict:
    """Por par ``A→B``: qué fracción del contexto de A releyó B, y si la comparte.

    ``shared`` es ``None`` cuando no hay contexto previo que releer — un cero
    ahí no dice nada sobre la clave.
    """
    controles = {r["pair"][0]: (r.get("cache_read") or 0) / r["prior_context"]
                 for r in rows
                 if r["pair"][0] == r["pair"][1] and (r.get("prior_context") or 0) > 0}
    out: dict[str, dict] = {}
    for row in rows:
        origen, destino = row["pair"]
        previo = row.get("prior_context") or 0
        leido = row.get("cache_read") or 0
        frac = leido / previo if previo else None
        out[f"{origen}\u2192{destino}"] = {
            "from": origen,
            "to": destino,
            "is_control": origen == destino,
            "prior_context": previo,
            "cache_read": leido,
            "read_fraction": frac,
            "shared": None if frac is None else frac >= REUSE_THRESHOLD,
            # Comparación con el control del MISMO origen: es el único
            # discriminador. Un par cruzado relee el preámbulo del CLI ya
            # cacheado bajo el destino, así que su fracción bruta no dice si
            # comparte la conversación; el control sí fija el techo.
            "vs_control": None if (frac is None or origen not in controles)
            else frac >= controles[origen] - 0.05,
            "control_fraction": controles.get(origen),
        }
    return out


def preconditions(claude_bin: str = "claude") -> tuple[int, str]:
    """0 si se puede lanzar; 2 con el motivo si no. Nunca un 0 sin binario."""
    resolved = shutil.which(claude_bin) if not os.path.isabs(claude_bin) else (claude_bin if os.path.exists(claude_bin) else None)
    if not resolved:
        return 2, f"no hay ejecutable `{claude_bin}`: la sonda no se puede lanzar (sin cifra, no un 0)"
    return 0, resolved


def child_env(base: dict) -> dict:
    """El entorno del hijo: el de la madre sin su ``CLAUDE_CODE_SESSION_ID``."""
    env = dict(base)
    env.pop(MOTHER_SESSION_ENV, None)
    return env


def run_call(cmd: list[str], cwd: str, timeout: int = 180) -> dict:
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                          env=child_env(os.environ), stdin=subprocess.DEVNULL)
    return {"exit": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}


def live(args) -> int:
    rc, why = preconditions(args.claude_bin)
    if rc:
        print(why, file=sys.stderr)
        return rc
    stamp = subprocess.run(["date", "-u", "+%Y%m%dT%H%M%S"], capture_output=True, text=True, check=True).stdout.strip()
    evento = pathlib.Path(args.evento_root) / f"probe-model-switch-cache-{stamp}"
    evento.mkdir(parents=True, exist_ok=False)
    workdir = pathlib.Path(args.cwd)
    workdir.mkdir(parents=True, exist_ok=True)
    settings_path = write_settings(evento, hook_settings(evento, advisor_model=args.advisor))
    steps: list[dict] = []

    def call(step: str, **kw) -> dict:
        cmd = build_command(settings_path=settings_path, cwd=str(workdir), claude_bin=why, **kw)
        res = run_call(cmd, cwd=str(workdir), timeout=args.timeout)
        (evento / f"{step}.stdout.json").write_text(res["stdout"], encoding="utf-8")
        (evento / f"{step}.stderr.txt").write_text(res["stderr"], encoding="utf-8")
        (evento / f"{step}.cmd.txt").write_text(" ".join(cmd) + f"\nexit={res['exit']}\n", encoding="utf-8")
        row = {"step": step, "model": kw["model"], "exit": res["exit"], "advisor": kw.get("advisor")}
        try:
            row.update(parse_result(res["stdout"]))
        except ValueError as exc:
            row["parse_error"] = str(exc)
        row["advisor_outcome"] = advisor_outcome(stdout=res["stdout"], stderr=res["stderr"]) if kw.get("advisor") else None
        row["markers"] = sorted(p.name for p in evento.glob("*ModelSwitch.json"))
        steps.append(row)
        print(f"{step:<10} exit={res['exit']} modelo={kw['model']} ctx={row.get('context_tokens')} "
              f"read={row.get('cache_read')} write={row.get('cache_creation')} (5m {row.get('w5m')}/1h {row.get('w1h')}) "
              f"usd={row.get('client_cost_usd')} advisor={row['advisor_outcome']} marcadores={row['markers']}")
        return row

    sid = new_session_id()
    call("switch-1", model=args.from_model, prompt="Responde exactamente: ok", session_id=sid)
    call("switch-2", model=args.to_model, prompt="Responde exactamente: ok otra vez", session_id=sid, resume=sid)
    call("switch-3", model=args.from_model, prompt="Responde exactamente: ok de vuelta", session_id=sid, resume=sid)
    if args.control:
        call("same-4", model=args.from_model, prompt="Responde exactamente: ok control", session_id=sid, resume=sid)
    if args.advisor:
        for base in dict.fromkeys([args.to_model, args.from_model]):
            call(f"advisor-{base}", model=base, session_id=new_session_id(), advisor=args.advisor,
                 prompt="Antes de responder, consulta al advisor una vez. Luego responde exactamente: ok")
    result = {"verdict": verdict(steps), "steps": steps, "evento": str(evento), "from": args.from_model, "to": args.to_model,
              "advisor": args.advisor, "cwd": str(workdir), "settings": settings_path}
    (evento / "resumen.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    v = result["verdict"]
    frac = lambda x: "—" if x is None else f"{x:.3f}"
    print(f"veredicto: entrada original sobrevivió={v['original_entry_survived']} · destino reescribió={v['target_rewrote_context']} · "
          f"vuelta relee {frac(v['return_read_fraction'])} · control relee {frac(v['control_read_fraction'])} · "
          f"pérdida atribuible al cambio={v['loss_attributable_to_switch']} "
          f"(alcance medido: {v['steps']} llamadas; evidencia en {evento})")
    return 0


def live_matrix(args) -> int:
    """Mide, par a par, si la clave de caché se comparte entre dos modelos.

    Una sesión por par: ida con el origen, vuelta con el destino por
    ``--resume``. El par A→A es el control. Responde a la pregunta del
    ejecutor (2026-09-02): ¿la caché que escribe Fable 5.1 la lee Fable 5?
    ¿la de Opus 5, Opus 4.8?
    """
    rc, why = preconditions(args.claude_bin)
    if rc:
        print(why, file=sys.stderr)
        return rc
    modelos = [m.strip() for m in args.modelos.split(",") if m.strip()]
    for m in modelos:
        if not m.startswith("claude-"):
            print(f"ERROR — '{m}' no es un identificador completo (la sonda no admite alias)", file=sys.stderr)
            return 2
    stamp = subprocess.run(["date", "-u", "+%Y%m%dT%H%M%S"], capture_output=True, text=True, check=True).stdout.strip()
    evento = pathlib.Path(args.evento_root) / f"probe-cache-por-familia-{stamp}"
    evento.mkdir(parents=True, exist_ok=False)
    workdir = pathlib.Path(args.cwd)
    workdir.mkdir(parents=True, exist_ok=True)
    settings_path = write_settings(evento, hook_settings(evento))
    filas: list[dict] = []
    pasos: list[dict] = []
    for origen, destino in matrix_pairs(modelos):
        sid = new_session_id()
        etiqueta = f"{origen}__{destino}"
        ida = destino_row = None
        for sufijo, modelo, prompt, resume in (
            ("1-ida", origen, "Responde exactamente: ok", None),
            ("2-vuelta", destino, "Responde exactamente: ok otra vez", sid),
        ):
            cmd = build_command(model=modelo, prompt=prompt, session_id=sid, settings_path=settings_path,
                                cwd=str(workdir), resume=resume, claude_bin=why)
            res = run_call(cmd, cwd=str(workdir), timeout=args.timeout)
            nombre = f"{etiqueta}.{sufijo}"
            (evento / f"{nombre}.stdout.json").write_text(res["stdout"], encoding="utf-8")
            (evento / f"{nombre}.stderr.txt").write_text(res["stderr"], encoding="utf-8")
            fila = {"step": nombre, "model": modelo, "exit": res["exit"]}
            try:
                fila.update(parse_result(res["stdout"]))
            except ValueError as exc:
                fila["parse_error"] = str(exc)
            pasos.append(fila)
            print(f"{nombre:<46} exit={res['exit']} ctx={fila.get('context_tokens')} "
                  f"read={fila.get('cache_read')} write={fila.get('cache_creation')} modelos={fila.get('models')}")
            if sufijo.startswith("1"):
                ida = fila
            else:
                destino_row = fila
        filas.append({
            "pair": (origen, destino),
            "prior_context": (ida or {}).get("context_tokens", 0),
            "cache_read": (destino_row or {}).get("cache_read", 0),
            "servido_ida": (ida or {}).get("models"),
            "servido_vuelta": (destino_row or {}).get("models"),
        })
    matriz = matrix_verdict(filas)
    resultado = {"matriz": matriz, "pasos": pasos, "modelos": modelos, "evento": str(evento),
                 "umbral_reuso": REUSE_THRESHOLD, "cwd": str(workdir)}
    (evento / "resumen.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("\nveredicto por par (fracción del contexto de la ida que releyó la vuelta):")
    for clave, v in matriz.items():
        frac = "—" if v["read_fraction"] is None else f"{v['read_fraction']:.3f}"
        print(f"  {clave:<46} relee {frac} · comparte clave={v['shared']}"
              + ("  (control)" if v["is_control"] else ""))
    print(f"(alcance medido: {len(filas)} pares, {len(pasos)} llamadas; evidencia en {evento})")
    return 0


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--live", action="store_true", help="ejecuta la secuencia contra el API (cuesta céntimos)")
    p.add_argument("--from-model", default="claude-fable-5-1")
    p.add_argument("--to-model", default="claude-opus-5")
    p.add_argument("--advisor", default=None, help="modelo asesor: añade las llamadas con --advisor")
    p.add_argument("--control", action="store_true", help="cuarta llamada: reanudar con el MISMO modelo, para separar reanudar de cambiar")
    p.add_argument("--cwd", default="/home/user/probe-empty", help="directorio de trabajo del hijo: vacío, sin piso")
    p.add_argument("--evento-root", default=str(pathlib.Path(__file__).resolve().parents[2] / "eventos"))
    p.add_argument("--claude-bin", default="claude")
    p.add_argument("--timeout", type=int, default=180)
    p.add_argument("--matriz", action="store_true",
                   help="mide si la clave se comparte entre los modelos de --modelos (par a par, con control)")
    p.add_argument("--modelos", default="claude-fable-5-1,claude-fable-5,claude-opus-5,claude-opus-4-8",
                   help="identificadores completos separados por coma; nunca alias")
    args = p.parse_args(argv[1:])
    if not args.live:
        p.print_help()
        return 0
    return live_matrix(args) if args.matriz else live(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
