#!/usr/bin/env python3
"""Las DOS emisiones de linea `assistant` del cliente, delimitadas POR REGISTRO.

La medicion del transcript dice QUE pasa; esto dice POR QUE, y sale del
ejecutable.

**Por que no un `grep -o` con ventana fija.** La primera version de esta sonda
recortaba con `.\\{260\\}apiBlockIndex:.\\{300\\}`, que es exactamente el defecto
de instrumento que :ref:`h-docs-218` midio: un recorte a distancia fija salta la
frontera del registro y engancha campos del vecino, y su N decide que se ve. El
arbol ya tiene el mecanismo correcto —`bloque_balanceado`, de
`src/packages/agent/bin/extract_model_registry.py`— que delimita por balanceo de
llaves desde el ancla, con conciencia de comillas. Se reusa, no se reescribe:
dos delimitadores serian dos fuentes de verdad que nadie sincroniza.

*Metrica:* los registros del ejecutable que construyen una linea `assistant`
con `apiBlockIndex`, delimitados por balanceo, y si su `message` recompone
`usage`.
*Ciega a:* la CONDICION bajo la que el cliente llega o no a la emision
reconciliada — eso es flujo, y no se lee de un volcado de cadenas; y a las
builds sin corpus versionado.
"""
from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "extract_model_registry",
    ROOT / "src" / "packages" / "agent" / "bin" / "extract_model_registry.py")
_extractor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_extractor)
bloque_balanceado = _extractor.bloque_balanceado

#: Las dos anclas. La primera nombra el INDICE del bloque que se esta cerrando;
#: la segunda es literal 0, porque la emision reconciliada representa al mensaje
#: entero y no a uno de sus bloques.
ANCLAS = {
    "por bloque (desde el mensaje PARCIAL)": "apiBlockIndex:Va.index",
    "reconciliada (con el evento terminal)": "usage:K7(",
}


def resumen(registro: str) -> dict:
    """Los tres rasgos que separan las dos emisiones, leidos del registro."""
    recompone = re.search(r"usage:K7\([A-Za-z_$]+,[A-Za-z_$]+\.usage\)", registro)
    indice = re.search(r"apiBlockIndex:([A-Za-z_$.]+|\d+)", registro)
    return {
        "bytes": len(registro),
        "recompone_usage": recompone.group(0) if recompone else None,
        "apiBlockIndex": indice.group(1) if indice else None,
        "campos": len(re.findall(r"[,{]\.{0,3}[A-Za-z_$]+:", registro)),
    }


def main(argv: list[str]) -> int:
    build = argv[1] if len(argv) > 1 else "2.1.266"
    strings = ROOT / "_references" / "claude-code-bin" / build / "claude_strings.txt"
    if not strings.is_file():
        print(f"ERROR: no esta versionado el corpus de {build} ({strings}).",
              file=sys.stderr)
        print("  No se emite veredicto: un vacio aqui no distingue «no existe la",
              file=sys.stderr)
        print("  forma» de «no pude medir».", file=sys.stderr)
        return 2

    texto = strings.read_text(encoding="utf-8", errors="replace")
    print(f"build medida: {build}")
    print()

    for etiqueta, ancla in ANCLAS.items():
        registro = bloque_balanceado(texto, ancla)
        print(f"== {etiqueta} ==")
        if registro is None:
            print(f"  el ancla `{ancla}` no delimita ningun registro en esta build.")
            print("  Se declara, no se omite: su ausencia acota lo que se puede")
            print("  afirmar de esta build, no de la familia.")
            print()
            continue
        rasgos = resumen(registro)
        print(f"  ancla            : {ancla}")
        print(f"  bytes del registro: {rasgos['bytes']}")
        print(f"  campos           : {rasgos['campos']}")
        print(f"  apiBlockIndex    : {rasgos['apiBlockIndex']}")
        print(f"  recompone usage  : {rasgos['recompone_usage'] or 'NO — hereda la del parcial'}")
        print()

    print("== el guard que NOMBRA la emision por bloque ==")
    for literal in ("partial_message_not_found", "content_block_not_found_stop"):
        print(f"  {literal}: {texto.count(literal)} ocurrencia(s)")
    print()
    print("== K7: la fusion de la contabilidad ==")
    # El ancla va DENTRO del objeto que K7 devuelve, no en `function K7(`.
    # `bloque_balanceado` delimita literales de objeto: con la cabecera de la
    # funcion como ancla retrocede hasta la llave anterior del texto y devuelve
    # el registro VECINO —medido: 1093 bytes del objeto de telemetria del
    # cliente, que no es K7—. No rehuso: devolvio otra cosa, que es peor.
    # Es el sub-patron D con el propio instrumento como sujeto, y el arreglo no
    # es cambiar de instrumento sino anclarlo donde su contrato aplica.
    fusion = bloque_balanceado(texto, "input_tokens:n.input_tokens!==null")
    print(f"  el objeto que devuelve: {'delimitado' if fusion else 'NO delimitado'}"
          + (f", {len(fusion)} bytes" if fusion else ""))
    if fusion:
        print(f"  {fusion}")
        print("  Lee el campo del DELTA cuando llego y no es nulo; si no, el de la")
        print("  base. Por eso un mensaje que nunca recibio su delta conserva el")
        print("  `output_tokens` del `message_start`.")
    print()
    print("CONCLUSION: una linea `assistant` sin `stop_reason` y con un")
    print("`output_tokens` de un digito es la emision POR BLOQUE — el mensaje")
    print("parcial que el cliente persiste al cerrar cada bloque de contenido. No")
    print("es un transcript corrupto ni un agente que paro en una herramienta: es")
    print("la linea que se escribe ANTES de que llegue el evento que trae el")
    print("cierre y el conteo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
