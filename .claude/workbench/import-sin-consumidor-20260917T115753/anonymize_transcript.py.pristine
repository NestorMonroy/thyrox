#!/usr/bin/env python3
"""Fixture versionable a partir de un transcript real (#657, :ref:`h-docs-242`).

EL PROBLEMA. Las cifras de :ref:`h-docs-169` y :ref:`h-docs-171` se midieron
contra transcripts que vivían en ``/root/.claude/projects/`` y desaparecieron
con el contenedor. Su suite quedó publicando verde con seis casos omitidos:
un verde que no distingue «la aritmética es correcta» de «no la pude medir».
Un `.jsonl` de sesión no es versionable tal cual — trae rutas, ramas, la
descripción de la tarea y el contenido completo de cada mensaje.

LISTA BLANCA, NO REDACCIÓN. Se conserva **sólo** lo que el instrumento lee, y
se descarta todo lo demás. La dirección importa: una lista negra —«redacta el
correo, redacta las rutas»— falla abierta ante un campo que nadie previó; una
lista blanca falla cerrada. Medido sobre un transcript real: el nivel superior
declara 21 claves y este guion conserva 9.

LO QUE SE CONSERVA, y por qué cada una:

- ``type`` · ``message.{id,role,model,stop_reason,usage}`` — el recorrido de
  ``_extract_usage`` y ``_extract_cache_resets``. ``usage`` va **verbatim**:
  es el objeto que decide equiv_cost, y tocarlo invalidaría el fixture.
- ``version`` · ``effort`` · ``compactMetadata`` · ``cumulativeDroppedTokens``
  — los ejes de perfil que :ref:`h-docs-222` añadió al store.
- ``isApiErrorMessage`` · ``apiErrorStatus`` · ``quotaLimits`` · ``error`` — la
  causa de muerte que ``api_error`` extrae. ``error`` es una etiqueta corta que
  fabrica el cliente (``rate_limit``, ``invalid_request``), no texto del
  usuario. **La lista blanca no lo tenía en su primera versión, y el control lo
  atrapó**: el ``reason`` del fixture caía de ``rate_limit`` a ``api_error``
  —el valor por defecto— sin que nada más cambiara. Es la razón de que el
  control exista y la evidencia de que discrimina.

LO QUE SE TRANSFORMA, en vez de conservarse o borrarse:

- ``message.id`` → ``msg_NNNN``, preservando el **patrón de repetición**. El
  dedup por ``message.id`` sigue siendo medible (un turno con N tool-calls
  repite su id, y sin dedup el conteo se infla ~2x — H-DOCS-135/136), pero el
  identificador ya no enlaza con ningún registro de la API.
- ``timestamp`` → rebasado a una época fija, **preservando los deltas**. Es lo
  que H-DOCS-171 usó para descartar la hipótesis del TTL: los huecos de 10-15 s
  entre turnos sobreviven; la hora a la que alguien trabajó, no.
- ``message.content`` → se conserva **sólo** en las líneas de error de API, y
  ahí sólo el ``text``, que es la cadena que fabrica el cliente
  («You've hit your session limit …»), no contenido de la conversación.

EL CONTROL QUE PUEDE FALLAR. El fixture vale si, y sólo si, el instrumento da
**la misma respuesta** sobre él que sobre el original. El guion lo comprueba —
equiv_cost, los cuatro componentes, turnos, resets y causa de muerte— y aborta
si algo difiere. Sin esa comparación, «anonimizar» podría estar destruyendo en
silencio la propiedad que el fixture existe para medir, y el verde posterior no
lo delataría. Es el criterio de ``metrica-decide-la-conclusion.md``: un control
declara qué lo haría fallar.

QUÉ NO PUEDE VER, y hay que leerlo antes de confiar en el fixture:

- **Un campo sensible dentro de ``usage``.** Se copia verbatim porque es el
  objeto medido; si un día trae algo que no sea un conteo, este guion lo pasa.
- **El texto del error de API.** Se conserva por necesidad del extractor. Es
  del harness en los casos medidos, pero el guion no lo verifica — quien
  genere un fixture nuevo lo lee antes de commitear.
- **La longitud de la sesión y el volumen de tokens** siguen siendo visibles:
  son exactamente lo que el fixture existe para publicar.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import pathlib
import sys
import tempfile

# El arranque: un módulo siempre sabe su propio directorio, y desde ahí
# `agents_paths` asciende al marcador. Antes `parents[2]` resolvía
# `thyrox/hooks/`, que nunca existió — y como es una constante y no un
# import, ningún control de import podía verlo.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import agents_paths  # noqa: E402  — statement a nivel de módulo tras fijar sys.path

HOOK = agents_paths.hooks_dir() / "register_agent_session.py"

# Nivel superior: lo que el instrumento lee. Todo lo demas se descarta.
TOP_KEPT = frozenset({
    "type", "version", "effort", "compactMetadata", "cumulativeDroppedTokens",
    "isApiErrorMessage", "apiErrorStatus", "quotaLimits", "error",
})
MESSAGE_KEPT = frozenset({"id", "role", "model", "stop_reason", "usage"})
EPOCH = "2026-01-01T00:00:00.000Z"


def load_instrument():
    """El hook, cargado por ruta — es la única fuente de las tres extracciones."""
    spec = importlib.util.spec_from_file_location("ras", HOOK)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def measure(instrument, path: pathlib.Path) -> dict:
    """Lo que el instrumento dice de este archivo — el objeto de la comparación."""
    return {
        "usage": instrument._extract_usage(str(path)),
        "resets": instrument._extract_cache_resets(str(path)) or [],
        "error": instrument.api_error(str(path)),
    }


def rebase(stamp: str, offset: float | None) -> str:
    """Mismo delta contra la época fija; la hora real no sobrevive."""
    if not stamp or offset is None:
        return EPOCH
    import datetime as dt
    try:
        real = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return EPOCH
    base = dt.datetime.fromisoformat(EPOCH.replace("Z", "+00:00"))
    return (base + (real - dt.datetime.fromtimestamp(offset, dt.timezone.utc))).isoformat(
        timespec="milliseconds").replace("+00:00", "Z")


def anonymize_line(raw: str, ids: dict, primero: list) -> str | None:
    """Una línea del transcript, reducida a su contabilidad."""
    try:
        original = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(original, dict):
        return None

    salida = {k: v for k, v in original.items() if k in TOP_KEPT}

    marca = original.get("timestamp")
    if marca:
        import datetime as dt
        try:
            visto = dt.datetime.fromisoformat(marca.replace("Z", "+00:00")).timestamp()
        except ValueError:
            visto = None
        if visto is not None:
            if not primero:
                primero.append(visto)
            salida["timestamp"] = rebase(marca, primero[0])

    mensaje = original.get("message")
    if isinstance(mensaje, dict):
        limpio = {k: v for k, v in mensaje.items() if k in MESSAGE_KEPT}
        real = mensaje.get("id")
        if real is not None:
            limpio["id"] = ids.setdefault(real, f"msg_{len(ids) + 1:04d}")
        # El texto del error lo lee `api_error`; el resto del contenido, nadie.
        if original.get("isApiErrorMessage") and isinstance(mensaje.get("content"), list):
            limpio["content"] = [
                {"type": "text", "text": b.get("text", "")}
                for b in mensaje["content"]
                if isinstance(b, dict) and b.get("type") == "text"
            ]
        salida["message"] = limpio

    return json.dumps(salida, ensure_ascii=False, separators=(",", ":"))


def anonymize(source: pathlib.Path) -> tuple[str, int, int]:
    """El texto anonimizado, con cuántas líneas entraron y cuántas salieron."""
    ids: dict = {}
    primero: list = []
    salida = []
    entradas = 0
    for raw in source.read_text(errors="ignore").splitlines():
        if not raw.strip():
            continue
        entradas += 1
        limpia = anonymize_line(raw, ids, primero)
        if limpia is not None:
            salida.append(limpia)
    return "\n".join(salida) + "\n", entradas, len(salida)


def compare(antes: dict, despues: dict) -> list:
    """Las divergencias entre medir el original y medir el fixture."""
    fallos = []
    for clave in sorted(set(antes["usage"]) | set(despues["usage"])):
        # `perfil` puede traer estructura anidada; se compara por igualdad plana.
        if antes["usage"].get(clave) != despues["usage"].get(clave):
            fallos.append(f"usage.{clave}: {antes['usage'].get(clave)!r} -> "
                          f"{despues['usage'].get(clave)!r}")
    if antes["resets"] != despues["resets"]:
        fallos.append(f"resets: {antes['resets']} -> {despues['resets']}")
    if antes["error"] != despues["error"]:
        fallos.append(f"api_error: {antes['error']} -> {despues['error']}")
    return fallos


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("origen", help="transcript real (.jsonl)")
    parser.add_argument("destino", nargs="?",
                        help="a dónde escribirlo; sin esto sólo mide y reporta")
    args = parser.parse_args()

    source = pathlib.Path(args.origen)
    if not source.is_file():
        print(f"ERROR — no existe: {source}", file=sys.stderr)
        return 2

    instrument = load_instrument()
    antes = measure(instrument, source)
    if not antes["usage"]:
        print(f"ERROR — el instrumento no extrae nada de {source.name}; "
              f"no hay propiedad que preservar.", file=sys.stderr)
        return 2

    texto, entradas, salidas = anonymize(source)

    # El control: se mide el resultado ANTES de publicarlo. Un fixture cuya
    # medicion difiere del original no es un fixture, es otro caso.
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as tmp:
        tmp.write(texto)
        provisional = pathlib.Path(tmp.name)
    try:
        despues = measure(instrument, provisional)
        fallos = compare(antes, despues)
    finally:
        provisional.unlink(missing_ok=True)

    print(f"anonymize-transcript: {source.name}")
    print(f"  lineas: {entradas} leidas -> {salidas} conservadas")
    print(f"  bytes:  {source.stat().st_size} -> {len(texto.encode())}")
    print(f"  turnos: {antes['usage'].get('turns')} | "
          f"equiv_cost: {antes['usage'].get('equiv_cost')} | "
          f"resets: {antes['resets']} | "
          f"api_error: {(antes['error'] or {}).get('reason')}")

    if fallos:
        print("  DIVERGE — la anonimizacion cambio lo que el instrumento mide:",
              file=sys.stderr)
        for f in fallos:
            print(f"    {f}", file=sys.stderr)
        return 1
    print("  control: el instrumento mide LO MISMO sobre el fixture")

    if args.destino:
        destino = pathlib.Path(args.destino)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(texto, encoding="utf-8")
        print(f"  escrito: {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
