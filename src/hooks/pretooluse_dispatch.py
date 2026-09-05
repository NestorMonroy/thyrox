"""Un proceso para todos los detectores de ``PreToolUse``.

Adaptación de ``kaupamex-docs: .claude/hooks/despachar_pretooluse.py`` (140
líneas). Cada hook de ``PreToolUse`` es un ``fork`` + ``exec`` por cada
``Write`` o ``Edit``; con N detectores se paga N veces. El despachador los
invoca **en proceso** y compone una sola salida.

La forma de esa salida no es preferencia: sale de medir el ejecutable
(``h-docs-451``, 9 de 9 mecanismos presentes en 2.1.246).

1. **El cliente funde y NO atribuye.** ``foldSettingsHooks`` concatena los
   ``additionalContexts`` de N hooks, el renderizador los une dentro de UN
   ``<system-reminder>`` y lo etiqueta con el **evento**, nunca con el script.
   La atribución la pone el despachador porque nadie más va a ponerla.
2. **El tope es POR HOOK y ANTES de concatenar** (``WBr = 10 000``).
   Consolidados lo **comparten**: ése es el precio real de la mudanza, y por eso
   hay presupuesto por detector. Sin él, el primero que se desborde deja mudos
   a los demás.
3. **Un contenido vacío no aporta elemento** — de ahí el cortocircuito.

Lo que este porte CORRIGE de su fuente
----------------------------------------

La fuente construía su registro de forma tolerante —``except Exception:
continue``— y dejaba la lista vacía si ninguno cargaba. Con lista vacía
devolvía ``{}`` y salía 0: indistinguible de «ningún detector tenía nada que
avisar». Un hook que sale verde sin medir nada es el sub-patrón D de
``metrica-decide-la-conclusion.md`` con el propio mecanismo como sujeto, y
:ref:`h-docs-1080` lo nombró al clasificar el archivo.

Aquí las dos situaciones se separan, porque son distintas:

- **un detector roto se sigue aislando** — su excepción no viaja al contexto ni
  tumba a sus compañeros. Consolidar no puede convertir un fallo aislado en uno
  total, y ése era el acierto de la fuente;
- **cero detectores cargados REHÚSA** con ``EmptyRegistryError``, porque no hay
  con qué medir;
- **una carga parcial sigue adelante y lo declara**: ``build_registry`` devuelve
  también los que faltaron, para que la merma sea visible en vez de silenciosa.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import Callable, Iterable, Sequence

#: El tope que el cliente aplica por hook (``WBr``, medido en 2.1.246). Al
#: consolidar, los detectores lo comparten en vez de tener uno cada uno.
TOTAL_BUDGET = 10000

#: Margen para el separador de cada detector y el pegamento entre bloques.
_FORMAT_MARGIN = 200

Detector = tuple[str, Callable[[dict], str | None]]


class EmptyRegistryError(RuntimeError):
    """Ningún detector se cargó: no hay con qué medir.

    Distinto de «ninguno tuvo nada que avisar», que es el caso común y devuelve
    ``{}``. Confundirlos publica un verde que no discrimina.
    """


def load_detector(directory: Path, name: str) -> Callable[[dict], str | None]:
    """Importa un detector por ruta y devuelve su ``detectar``.

    El nombre de la función se conserva **en español** a propósito: es el
    contrato que los detectores de kaupamex ya exponen, y renombrarlo aquí
    rompería a los tres sin ganar nada.
    """
    spec = importlib.util.spec_from_file_location(name, Path(directory) / f"{name}.py")
    if spec is None or spec.loader is None:
        raise ImportError(f"no se pudo componer el spec de {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.detectar


def build_registry(directory: Path,
                   names: Sequence[str]) -> tuple[list[Detector], list[str]]:
    """Los detectores que cargaron, y los nombres de los que no.

    Devuelve las dos listas en vez de sólo la primera: sin la segunda, una
    carga parcial es indistinguible de una completa, y ésa es la mitad que a la
    fuente le faltaba. El orden es el de declaración, y es el que verá el lector.
    """
    registry: list[Detector] = []
    missing: list[str] = []
    for name in names:
        try:
            registry.append((name.removeprefix("inject_"),
                             load_detector(directory, name)))
        except Exception:
            missing.append(name)
    return registry, missing


def _truncate(text: str, quota: int) -> str:
    """El texto dentro de su cuota, diciendo cuánto se dejó fuera.

    Un recorte mudo es peor que no recortar: el lector no puede distinguir «el
    detector dijo esto» de «el detector dijo más y no cabía».
    """
    if len(text) <= quota:
        return text
    dropped = len(text) - quota
    notice = f"\n[recortado: {dropped} caracteres más — la ventana es compartida]"
    return text[:max(0, quota - len(notice))] + notice


def dispatch(payload: dict, detectors: Iterable[Detector]) -> dict:
    """El JSON a imprimir: un solo bloque con lo que cada detector aporte.

    Devuelve ``{}`` cuando ninguno tiene nada que decir — el caso común y el
    único que no cuesta nada. Con la lista vacía **rehúsa**: ver la clase.
    """
    detectors = list(detectors)
    if not detectors:
        raise EmptyRegistryError(
            "no se cargó ningún detector: no hay con qué medir, y devolver "
            "un JSON vacío se leería como «ninguno tuvo nada que avisar». "
            "Declara la lista de detectores y su directorio."
        )

    quota = max(1, (TOTAL_BUDGET - _FORMAT_MARGIN) // len(detectors))

    blocks: list[str] = []
    for name, detect in detectors:
        try:
            notice = detect(payload)
        except Exception:
            # Un detector roto se aísla. Su excepción no llega al contexto: el
            # lector no puede hacer nada con ella y el ruido tapa a los sanos.
            continue
        if not notice or not str(notice).strip():
            continue                      # cortocircuito por vacío
        blocks.append(f"[{name}]\n{_truncate(str(notice), quota)}")

    if not blocks:
        return {}

    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": "\n\n".join(blocks),
        }
    }


def main(stdin_text: str | None = None,
         detectors: Iterable[Detector] | None = None,
         directory: Path | None = None,
         names: Sequence[str] | None = None) -> int:
    """Punto de entrada del hook. NUNCA rompe el flujo: imprime y sale 0.

    Que el despachador no bloquee no contradice el ``EmptyRegistryError``: la
    excepción es para quien lo consume como biblioteca —que puede decidir— y
    aquí se convierte en un aviso por stderr. Lo que no se hace es imprimir un
    ``{}`` alegre sin dejar rastro de que no se midió nada.
    """
    text = stdin_text if stdin_text is not None else _read_stdin()
    try:
        payload = json.loads(text or "{}")
        if not isinstance(payload, dict):
            payload = {}
    except (ValueError, TypeError):
        print("{}")
        return 0

    if detectors is None:
        if directory is None or not names:
            print("{}")
            print("pretooluse_dispatch: sin directorio ni lista de detectores; "
                  "no se midió nada.", file=sys.stderr)
            return 0
        detectors, missing = build_registry(directory, names)
        if missing:
            print(f"pretooluse_dispatch: no cargaron {len(missing)} de "
                  f"{len(names)} detectores: {', '.join(missing)}", file=sys.stderr)

    try:
        print(json.dumps(dispatch(payload, detectors), ensure_ascii=False))
    except EmptyRegistryError as err:
        print("{}")
        print(f"pretooluse_dispatch: {err}", file=sys.stderr)
    except Exception:
        print("{}")
    return 0


def _read_stdin() -> str:
    try:
        return sys.stdin.read()
    except (OSError, ValueError):
        return ""


if __name__ == "__main__":
    raise SystemExit(main())
