#!/usr/bin/env python3
"""Clasificar en QUÉ está cada trabajo del roster — no sólo si vive.

Por qué existe
--------------
``reconciliar-agentes.sh`` responde *"¿está vivo?"* con cinco estados mecánicos
(terminado / vivo / atascado / desaparecido / indecidible), medidos por mtime y
marcador terminal. Es lo que hacía falta para no relanzar dos copias.

Pero deja ciego el otro eje. Un subagente que cerró con *"necesito que me
confirmes cuál de las dos opciones"* se clasifica **terminado**, igual que uno
que cerró con *"suite en verde, commiteado y pusheado"*. Los dos escribieron su
mensaje final; sólo uno terminó el trabajo. El otro **te está esperando**, y
nada en el roster lo dice.

Este guion lee el **texto de cierre** de cada entrada y lo clasifica en
``working`` / ``blocked`` / ``done`` / ``failed``, con un campo ``needs`` cuando
hay algo que la persona tiene que hacer.

De dónde sale
--------------
``ccb: daemon/src/classifier/`` — el banco de patrones (``patterns.ts``), el
vocabulario de estados (``state.ts``) y el motor (``heuristic.ts``). Se porta la
cadena de precedencia completa, incluida la parte que la hace no-ingenua:

* **conciencia de bloques de código** (``isInCodeFence``): un ``blocked:``
  dentro de una cerca ``` no es el agente diciendo que está bloqueado, es el
  agente citando texto. Ya nos costó cuatro falsos positivos en el gate RST
  (H-DOCS-93) y lo habíamos arreglado **sólo ahí**;
* **el descargo**: un marcador ``blocked:`` se degrada si el texto dice
  explícitamente *"nothing needed from you"*;
* **la guarda de recencia**: si tras el marcador vienen 3+ párrafos, ya no es
  el estado de cierre;
* **esperar a CI no es estar bloqueado**: ``WAIT_EXTERNAL`` da ``working/idle``,
  no ``blocked``. Bloqueado es sólo cuando espera a una *persona*.

Qué se porta y qué NO (``porte-completo-no-parcial.md``)
---------------------------------------------------------
Portado: ``state.ts`` (vocabulario + ``truncate`` + estados terminales),
``patterns.ts`` (los 18 patrones), ``heuristic.ts`` (``preClassify``,
``fallbackHeuristic``, ``isInCodeFence``, ``closingShape``).

NO portado, con razón declarada:

* ``llmClient.ts`` + ``systemPrompt.ts`` — la vía LLM. El motor heurístico ya
  responde sin una segunda llamada a un modelo, y pagar tokens por clasificar
  texto que ya tenemos delante contradice el cuidado que el ejecutor pidió.
* ``orchestrator.ts`` — dirige a un worker **vivo**, suscribiéndose a su salida.
  Nosotros clasificamos *post-hoc* sobre el roster; no supervisamos en vivo.
* ``stateFile.ts`` — persiste un ``state.json`` por worker. Nuestro roster lo
  escribe el harness y es de sólo lectura para nosotros.

El banco es bilingüe — medido, no supuesto
--------------------------------------------
El banco original es inglés. Medido 2026-08-13 sobre los 84 transcripts de
subagente de esta sesión, su mensaje final es **47 inglés · 35 español · 1
empate · 1 sin texto**. Un puerto sólo-inglés sería ciego al 42 % del corpus,
así que cada patrón lleva su contraparte en español, marcada ``[es]``.

*Métrica:* frecuencia de palabras función por idioma en el último mensaje
``assistant``. *Ciega a:* un mensaje corto sin palabras función (cae en
"empate").

Uso
---
    clasificar_agentes.py                 # reporte
    clasificar_agentes.py --quiet         # sólo conteos, con denominador
    clasificar_agentes.py --solo-bloqueados
    clasificar_agentes.py --explicar <id> # el texto de cierre y qué regla ganó
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys

MAX_DETAIL_CHARS = 800  # ant PM
TAIL_CHARS = 800  # ventana de cierre que el motor mira

TERMINAL_STATES = frozenset({"done", "failed", "stopped", "crashed"})


# ─────────────────────────── banco de patrones ───────────────────────────
# Los `[en]` son port fiel de `ccb: classifier/patterns.ts`. Los `[es]` son
# nuestros, añadidos porque el corpus es bilingüe (ver cabecera).

FAILED_LINE_RE = re.compile(
    r"(?:^|\n)\s*(?:failed|fall[óo]|fracas[óo])\s*[:—–-]\s*(.{3,200}?)(?=\n|$)",
    re.I,
)
NEEDS_INPUT_LINE_RE = re.compile(
    r"(?:^|\n)\s*(?:needs input|necesito|requiero)\s*[:—–-]\s*(.{3,200}?)(?=\n|$)",
    re.I,
)
BLOCKED_LINE_RE = re.compile(
    r"(?:^|\n)\s*(?:blocked|bloqueado|bloqueada)\s*[:—–-]\s*(.{3,200}?)(?=\n|$)",
    re.I,
)
IM_BLOCKED_RE = re.compile(
    r"\b(?:I'?m blocked|estoy bloquead[oa]|qued[ée] bloquead[oa])\s*[:—–-]\s*(.{3,200}?)(?=\n|$)",
    re.I,
)

WORKING_VERB_RE = re.compile(
    r"^(?:(?:Now|Next|Then|Alright|OK|Okay|Right|Good|First|Also|Ahora|Luego|Enseguida),?\s+)?"
    r"(?:Let me (?!know\b)"
    r"|(?:I(?:'?ll| will) |I'?m going to |Going to )(?!need\b|require\b|wait\b|leave\b|hold\b|skip\b|stop\b)"
    r"|Proceeding |Moving (?:on|to)\b|Continuing |Starting |Trying |Checking |Looking |Searching "
    r"|Reading |Investigating |Running |Re-?running |Building |Rebuilding |Installing |Fetching "
    r"|Applying |Fixing |Patching |Updating |Adding |Removing |Deleting |Importing |Refactoring "
    r"|Rewriting |Writing |Grepping |Scanning |Wrapping |Switching |Testing |Verifying |Regenerating "
    r"|Pushing |Pulling |Reviewing |Examining |Loading |Compiling |Parsing |Analyzing |Tracing |Exploring "
    # [es] — primera persona en curso; se excluyen los pretéritos, que indican cierre
    r"|(?:Voy a |Paso a |Sigo con |Contin[úu]o |Empiezo |Arranco |Reviso |Mido |Verifico |Compruebo "
    r"|Analizo |Leo |Busco |Corro |Ejecuto |Aplico |Escribo |Porto |Adapto |Reescribo |Corrijo )"
    r")",
    re.I,
)
WORKING_VERB_EXCLUDE_RE = re.compile(
    r"\b(?:once |when |after |until |as soon as )(?:you|it|the|that|this|they)\b"
    r"|\bagain in\b|\bcheck back\b"
    r"|\bin ~?\d+\s*(?:s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:ours?|rs?)?)\b"
    r"|\bthen\.?\s*$|\bwhichever you\b|\bhold(?:ing)? for your\b|\b(?:to|and) wait for\b"
    r"|\bgive it (?:more |some )?time\b"
    r"|\bif (?:you(?:'d| want| prefer| need|'re)?|that(?:'s| helps| works)?|useful|needed|helpful|desired)\b"
    r"|\b(?:isn'?t|not|won'?t) going to work\b"
    # [es]
    r"|\b(?:cuando|una vez que|en cuanto|si)\s+(?:vos|us?ted|lo|la|el|eso|esto)\b"
    r"|\bsi (?:quer[ée]s|prefer[íi]s|te parece|hace falta|lo ped[íi]s)\b",
    re.I,
)

AGENTS_STATUS_RE = re.compile(
    r"^(?:(?:\*\*)?[1-9]\d* (?:agent|cron|task|fork|job|worker|PR|check|agente|tarea|trabajo)s? "
    r"(?:in flight|remaining|active|still (?:running|working)|pending|running|launched"
    r"|en vuelo|restantes?|activos?|pendientes?|corriendo|lanzad[oa]s?)\b"
    r"|(?:Continuous )?(?:[Ll]oop|[Cc]rons?|[Bb]abysit) (?:active|healthy|continuing|running|will keep|continues)\b"
    r"|Waiting for (?:the )?(?:agent|cron|task|fork|worker|job|remaining|them)s?\b"
    r"|Esperando (?:a |el |los |las )?(?:agente|tarea|trabajo|resto)s?\b"
    r"|Agents? will report back\b|Waiting\.?$)"
)
WILL_CHECK_BACK_RE = re.compile(
    r"^(?:I will|I'll|Will) (?:check back|re-?check|poll|look again|retry|re-?run|try again) "
    r"(?:(?:when|once|after|until) (?!your?\b)|in\b|again\b)"
    r"|^(?:Vuelvo a (?:revisar|mirar|medir)|Reviso de nuevo|Reintento)\b",
    re.I,
)
CANT_PROCEED_RE = re.compile(
    r"^I (?:can(?:'?t|not)|am unable to) (?:proceed|continue|make (?:any )?progress|complete|fix this)\b"
    r"|^No (?:puedo|logro) (?:seguir|continuar|avanzar|completar|arreglar)\b",
    re.I,
)
GIVING_UP_RE = re.compile(
    r"^(?:Giving up|I(?:'m| am) giving up|The task is not actionable)\b"
    r"|^(?:Me rindo|Abandono|La tarea no es accionable)\b",
    re.I,
)
PUSHED_COMMITTED_RE = re.compile(
    r"^(?:Pushed (?:to `|`[0-9a-f]{7,})|Committed as `?[0-9a-f]{7,}\b|Commit: `?[0-9a-f]{7,}\b"
    r"|(?:Opened|Created) PR #?\d"
    r"|Commiteado (?:en |como )?`?[0-9a-f]{7,}\b|Pusheado (?:a |en )?`)"
)
READY_FOR_RE = re.compile(
    r"^Ready (?:for review|to (?:upload|merge|ship|land))\b|^List[oa] para (?:revisi[óo]n|mergear)\b"
)
VERDICT_RE = re.compile(r"^(?:VERDICT|VEREDICTO): (?:PASS|FAIL|CONFIRMADO|REFUTADO)\b")
PLEASE_DO_RE = re.compile(
    r"^Please (?:start|run|provide|grant|export|add|install|configure|give me|paste|point me"
    r"|set (?:the |up |`?[A-Z][A-Z0-9_]+\b))"
    r"|^(?:Por favor,? )?(?:corr[ée]|ejecut[áa]|pas[áa]me|dame|indic[áa]me|confirm[áa]|deci[dm]í)\b",
    re.I,
)
STOPPING_HERE_RE = re.compile(
    r"^(?:Stopping here|I've stopped here|Parked (?:the|this) branch|Paused here)"
    r"(?:\.|$| —| -| until| pending| since| because)"
    r"|^(?:Paro ac[áa]|Me detengo ac[áa]|Freno ac[áa]|Dejo ac[áa])(?:\.|$| —| -| hasta| porque)",
    re.I,
)
# Las alternativas NO consumen el espacio siguiente: el `\s+` posterior lo
# exige. Escribir `esperando (?:la )?` rompe el patrón —el artículo se lleva
# el espacio y el `\s+` pide otro que ya no está—; lo cazó el test con
# "Quedo esperando la suite".
WAIT_EXTERNAL_RE = re.compile(
    r"\b(?:waiting (?:for|on)|pending|esperando(?: a| el| la| los| las)?"
    r"|a la espera de|pendiente de)\s+"
    r"(?:the\s+)?(?:CI|build|tests?|reviewer|deploy(?:ment)?|workflow|checks?|rollout|merge queue"
    r"|suite|despliegue|compilaci[óo]n)\b",
    re.I,
)
AWAITING_USER_RE = re.compile(
    r"\b(?:awaiting|waiting (?:for|on)|pending)\s+"
    r"(?:your\s+(?:feedback|input|decision|response|approval|direction|guidance|go-ahead)|you\b|the user\b)"
    # [es] — el eje que importa: esperar a una PERSONA, no a un proceso
    r"|\b(?:a la espera de|esperando|pendiente de)\s+(?:tu|su)\s+"
    r"(?:decisi[óo]n|respuesta|confirmaci[óo]n|aprobaci[óo]n|indicaci[óo]n|visto bueno|directiva)"
    r"|\bqueda (?:a tu|en tu|para tu) (?:criterio|decisi[óo]n|cancha)\b"
    r"|\bes (?:tu|una) decisi[óo]n del ejecutor\b|\bdecisi[óo]n del ejecutor\b",
    re.I,
)
ASK_VERB_RE = re.compile(
    r"\b(please (?:run|provide|confirm|clarify|choose|let me know)"
    r"|let me know (?:which|what|how|when)|which (?:option|approach|one)"
    r"|should I (?:proceed|continue|use))\b"
    # [es]
    r"|\b(?:av[íi]same|dec[íi]me|confirm[áa]me|aclar[áa]me)\s+(?:cu[áa]l|qu[ée]|c[óo]mo|cu[áa]ndo|si)\b"
    r"|\b(?:cu[áa]l de las|qu[ée] opci[óo]n|sigo con|procedo con)\b"
    r"|\b¿(?:quer[ée]s|proced[oe]|sigo|lo hago)\b",
    re.I,
)
AUTH_ERROR_RE = re.compile(
    r"\b(not logged in|please run /login|authentication failed|invalid api key"
    r"|oauth token (?:expired|revoked)|credit balance (?:is )?too low|usage limit reached"
    r"|mcp (?:server )?(?:authentication|auth|authorization|unauthorized)"
    r"|mcp (?:server )?(?:credential|token) (?:missing|expired|invalid)"
    r"|401 unauthorized|403 forbidden|token (?:has )?expired|bad credentials"
    r"|gh auth login|gcloud auth login|aws (?:sso )?login)\b"
    # [es]
    r"|\b(?:credenciales inv[áa]lidas|sesi[óo]n expirada|l[íi]mite de uso alcanzado"
    r"|sin permisos|no autorizado)\b",
    re.I,
)

RESULT_LINE_RE = re.compile(r"(?:^|\n)\s*(?:result|resultado):\s*(.+?)\s*(?:\n|$)", re.I)
NEXT_LINE_RE = re.compile(r"(?:^|\n)\s*(?:next|siguiente):\s*\S", re.I)
NO_ACTION_RE = re.compile(
    r"\bnothing (?:needed|required) from you\b|\bno(?: user)? action (?:needed|required)\b"
    r"|\bno (?:necesito|requiero) nada de (?:vos|ti|usted)\b|\bno hace falta que hagas nada\b",
    re.I,
)


def truncate(s: str, limit: int = MAX_DETAIL_CHARS) -> str:
    """Recorta sin partir un par suplente (ant up5)."""
    if len(s) <= limit:
        return s
    q = limit - 1
    if q >= 1 and 0xD800 <= ord(s[q - 1]) <= 0xDBFF:
        q -= 1
    return s[:q] + "…"


def is_in_code_fence(text: str, idx: int) -> bool:
    """¿La posición `idx` cae dentro de una cerca de código abierta? (ant iYH)

    Es la pieza que separa "el agente dice que está bloqueado" de "el agente
    cita un texto que dice blocked:". Sin esto el clasificador confunde la
    evidencia con la afirmación — el defecto exacto de H-DOCS-93.
    """
    open_marker: str | None = None
    open_len = 0
    pos = 0
    while pos < idx:
        tick = text.find("```", pos)
        tilde = text.find("~~~", pos)
        if tick == -1:
            fence = tilde
        elif tilde == -1:
            fence = tick
        else:
            fence = min(tick, tilde)
        if fence == -1 or fence >= idx:
            break
        marker = text[fence]
        left = fence - 1
        left_count = 0
        while left >= 0 and text[left] == " " and left_count < 3:
            left -= 1
            left_count += 1
        at_line_start = left < 0 or text[left] == "\n"
        run_len = 3
        pos = fence + 3
        while pos < len(text) and text[pos] == marker:
            pos += 1
            run_len += 1
        if not at_line_start:
            continue
        if open_marker is None:
            open_marker, open_len = marker, run_len
        elif open_marker == marker and run_len >= open_len:
            open_marker, open_len = None, 0
    return open_marker is not None


def _find_line_marker(full: str, tail: str, offset: int):
    """El marcador de línea MÁS TARDÍO fuera de cerca (ant Up5)."""
    best = None
    for state, rx in (
        ("failed", FAILED_LINE_RE),
        ("blocked", NEEDS_INPUT_LINE_RE),
        ("blocked", BLOCKED_LINE_RE),
        ("blocked", IM_BLOCKED_RE),
    ):
        for m in rx.finditer(tail):
            if is_in_code_fence(full, offset + m.start()):
                continue
            if best is None or m.start() > best["index"]:
                best = {
                    "state": state,
                    "capture": m.group(1).strip(),
                    "index": m.start(),
                    "end": m.end(),
                }
    return best


def pre_classify(text: str) -> dict | None:
    """Cadena de precedencia del motor (ant em7). None = no decide."""
    trimmed = text.strip()
    if not trimmed:
        return None
    tail = trimmed[-TAIL_CHARS:]
    tail_offset = len(trimmed) - len(tail)

    result_match = None
    for m in RESULT_LINE_RE.finditer(tail):
        if not is_in_code_fence(trimmed, tail_offset + m.start()):
            result_match = m

    scan_text, scan_offset = tail, tail_offset
    if result_match:
        after = result_match.end()
        scan_text = tail[after:]
        scan_offset = tail_offset + after

    marker = _find_line_marker(trimmed, scan_text, scan_offset)

    if result_match and not marker:
        detail = truncate(result_match.group(1).strip())
        for n in NEXT_LINE_RE.finditer(scan_text):
            if not is_in_code_fence(trimmed, scan_offset + n.start()):
                return _r("result-then-next", "working", "idle", detail, result=detail)
        return _r("result-marker", "done", "idle", detail, result=detail)

    if marker and marker["state"] == "failed":
        return _r("failed-marker", "failed", "idle", truncate(marker["capture"]))

    if marker and marker["state"] == "blocked":
        after = scan_text[marker["end"] :]
        paragraphs = [p for p in re.split(r"\n\s*\n", after) if p.strip()]
        if len(paragraphs) >= 3:
            return None  # guarda de recencia: ya no es el estado de cierre
        if not NO_ACTION_RE.search(scan_text):
            need = truncate(marker["capture"])
            return _r("blocked-marker", "blocked", "blocked", need, needs=need)
        if result_match:
            d = truncate(result_match.group(1).strip())
            return _r("blocked-disclaimed", "done", "idle", d, result=d)
        return None

    if re.search(r"[?？]\s*$", tail) and len(re.sub(r"[?？\s]+$", "", tail)) >= 4:
        last_break = max(
            tail.rfind("\n"), tail.rfind(". "), tail.rfind("! "), tail.rfind("? ", 0, len(tail) - 2)
        )
        if not is_in_code_fence(trimmed, tail_offset + last_break):
            q = truncate(tail[last_break + 1 :].strip())
            return _r("trailing-q", "blocked", "blocked", q, needs=q)

    sent_break = max(0, tail.rfind(". "), tail.rfind("! "), tail.rfind("? "), tail.rfind("\n"))
    last_sent = re.sub(r"^[.!?\s]+", "", tail[sent_break:])
    in_fence = is_in_code_fence(trimmed, tail_offset + sent_break)
    if in_fence:
        return None

    # El ORDEN importa: esperar a CI es `working`, esperar a una persona es
    # `blocked`. Invertirlo convierte cada suite en curso en una interrupción.
    if (m := WAIT_EXTERNAL_RE.search(last_sent)):
        return _r("wait-external", "working", "idle", truncate(m.group(0)))
    if (m := AWAITING_USER_RE.search(last_sent)):
        need = truncate(last_sent[m.start() :].strip())
        return _r("awaiting-user", "blocked", "blocked", need, needs=need)
    if (m := ASK_VERB_RE.search(last_sent)):
        need = truncate(last_sent[m.start() :].strip())
        return _r("ask-verb", "blocked", "blocked", need, needs=need)
    if AUTH_ERROR_RE.search(last_sent):
        return _r("auth-prose", "blocked", "blocked", "authentication required",
                  needs=truncate(last_sent))
    if WORKING_VERB_RE.search(last_sent) and not WORKING_VERB_EXCLUDE_RE.search(last_sent):
        return _r("working-verb", "working", "active", truncate(last_sent))
    if AGENTS_STATUS_RE.search(last_sent):
        return _r("agents-status", "working", "idle", truncate(last_sent))
    if WILL_CHECK_BACK_RE.search(last_sent):
        return _r("will-check-back", "working", "idle", truncate(last_sent))
    if CANT_PROCEED_RE.search(last_sent):
        d = truncate(last_sent)
        return _r("cant-proceed", "blocked", "blocked", d, needs=d)
    if GIVING_UP_RE.search(last_sent):
        return _r("giving-up", "failed", "idle", truncate(last_sent))
    if PUSHED_COMMITTED_RE.search(last_sent):
        d = truncate(last_sent)
        return _r("pushed-committed", "done", "idle", d, result=d)
    if READY_FOR_RE.search(last_sent):
        return _r("ready-for", "done", "idle", truncate(last_sent))
    if VERDICT_RE.search(last_sent):
        d = truncate(last_sent)
        return _r("verdict-marker", "done", "idle", d, result=d)
    if PLEASE_DO_RE.search(last_sent):
        d = truncate(last_sent)
        return _r("please-do-x", "blocked", "blocked", d, needs=d)
    if STOPPING_HERE_RE.search(last_sent):
        d = truncate(last_sent)
        return _r("stopping-here", "blocked", "blocked", d, needs=d)
    return None


def _r(branch, state, tempo, detail, needs=None, result=None) -> dict:
    out = {"branch": branch, "state": state, "tempo": tempo, "detail": detail,
           "source": "preclassify"}
    if needs:
        out["needs"] = needs
    if result:
        out["result"] = result
    return out


def fallback_heuristic(text: str) -> dict:
    """Nunca devuelve None (ant J08): última línea no vacía, working/idle."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    return {"branch": "heuristic", "state": "working", "tempo": "idle",
            "detail": truncate(lines[-1]) if lines else "—", "source": "heuristic"}


# ─────────────────────────── lectura del roster ───────────────────────────

def resolve_roster() -> tuple[pathlib.Path, str]:
    declared = os.environ.get("RECONCILIAR_ROSTER")
    if declared:
        return pathlib.Path(declared), "declarado"
    base = pathlib.Path("/tmp/claude-0")
    candidates = [p for p in base.glob("*/*/tasks") if p.is_dir()]
    if not candidates:
        return pathlib.Path("/nonexistent"), "no encontrado"
    return max(candidates, key=lambda p: p.stat().st_mtime), "mtime (heurística)"


def closing_text(entry: pathlib.Path) -> str:
    """El texto de cierre: último mensaje de texto del subagente, o la cola
    del stdout de la tarea bash."""
    if entry.is_symlink():
        target = entry.resolve()
        if not target.is_file():
            return ""
        last = ""
        for line in target.read_text(errors="replace").splitlines():
            try:
                o = json.loads(line)
            except Exception:
                continue
            msg = o.get("message") or {}
            content = msg.get("content")
            if o.get("type") == "assistant" and isinstance(content, list):
                txt = " ".join(
                    b.get("text", "") for b in content
                    if isinstance(b, dict) and b.get("type") == "text"
                )
                if txt.strip():
                    last = txt
        return last
    try:
        return entry.read_text(errors="replace")[-4000:]
    except Exception:
        return ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--solo-bloqueados", action="store_true")
    ap.add_argument("--explicar", metavar="ID")
    args = ap.parse_args()

    roster, origen = resolve_roster()
    if not roster.is_dir():
        print(f"clasificar-agentes: roster ilegible ({roster})", file=sys.stderr)
        return 3

    if args.explicar:
        entry = roster / f"{args.explicar}.output"
        if not entry.exists():
            print(f"no hay entrada de roster para '{args.explicar}'")
            return 2
        text = closing_text(entry)
        verdict = pre_classify(text) or fallback_heuristic(text)
        print(f"== {args.explicar} ==")
        print(f"regla que ganó : {verdict['branch']}  (source: {verdict['source']})")
        print(f"estado / tempo : {verdict['state']} / {verdict['tempo']}")
        if verdict.get("needs"):
            print(f"necesita       : {verdict['needs']}")
        print(f"detalle        : {verdict['detail']}")
        print("\n-- texto de cierre (últimos 600 car.) --")
        print(text.strip()[-600:] or "(vacío)")
        return 0

    counts: dict[str, int] = {}
    by_branch: dict[str, int] = {}
    blocked: list[tuple[str, str, str]] = []
    total = fallbacks = sin_texto = 0

    for entry in sorted(roster.glob("*.output")):
        total += 1
        text = closing_text(entry)
        if not text.strip():
            sin_texto += 1
        verdict = pre_classify(text)
        if verdict is None:
            verdict = fallback_heuristic(text)
            fallbacks += 1
        counts[verdict["state"]] = counts.get(verdict["state"], 0) + 1
        by_branch[verdict["branch"]] = by_branch.get(verdict["branch"], 0) + 1
        if verdict["state"] == "blocked":
            kind = "subagente" if entry.is_symlink() else "bash"
            blocked.append((entry.name[:-7], kind,
                            verdict.get("needs", verdict["detail"])[:110]))

    decided = total - fallbacks
    if args.quiet:
        print(f"clasificar-agentes: bloqueados={counts.get('blocked', 0)} "
              f"failed={counts.get('failed', 0)} done={counts.get('done', 0)} "
              f"working={counts.get('working', 0)} "
              f"(decididos por patrón: {decided} de {total}; "
              f"{fallbacks} cayeron al fallback)")
        return 0

    if not args.solo_bloqueados:
        print("== en qué está cada trabajo del roster ==")
        print(f"roster : {roster}  [{origen}]")
        print()
        for state in ("blocked", "failed", "done", "working"):
            print(f"  {state:10} {counts.get(state, 0)}")
        print("  " + "-" * 22)
        print(f"  {'TOTAL':10} {total}")
        print(f"\n  decididos por patrón : {decided} de {total}")
        print(f"  cayeron al fallback  : {fallbacks}   (sin texto de cierre: {sin_texto})")
        print("\n  reglas que más dispararon:")
        for b, n in sorted(by_branch.items(), key=lambda kv: -kv[1])[:8]:
            print(f"    {b:22} {n}")

    if blocked:
        print(f"\n== BLOQUEADOS — esperan a una persona ({len(blocked)}) ==")
        for ident, kind, needs in blocked:
            print(f"  {ident}  ({kind})")
            print(f"      necesita: {needs}")
    elif args.solo_bloqueados:
        print("sin bloqueados en el roster.")

    print("\n'blocked' es esperar a una PERSONA. Esperar a CI o a la suite es")
    print("'working/idle' — invertirlo convierte cada suite en una interrupción.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
