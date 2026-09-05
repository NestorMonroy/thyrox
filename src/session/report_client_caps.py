#!/usr/bin/env python3
"""report_client_caps.py — publica los tres caps de concurrencia del cliente,
leidos del ejecutable de ESTA sesion.

Por que existe
--------------
Los tres caps son **propiedad de un artefacto vivo**: cambian entre builds y
uno de ellos depende ademas de `nproc` de la maquina. Transcribirlos a prosa
es la forma que `calibration-verified-numbers.md` prohibe en su corolario
*«si el numero lo produce un comando, la prosa nombra el comando, no el
numero»*.

Y ya cobro: H-DOCS-211 dejo `min(16, CPUs-2)` en dos reglas de api durante
nueve dias. La parafrasis perdia el piso —con `nproc <= 3` predice 1 donde el
real es 2— y aqui coincidian por casualidad, que es lo que lo oculto.

Los tres son mecanismos DISTINTOS
---------------------------------
No se suman ni se sustituyen:

- **anchura de `Agent`** — cuantos subagentes corren a la vez.
- **anchura de `parallel()`** — otro mecanismo, dentro de `Workflow`, con
  piso 2 y techo 16.
- **profundidad** — cuantos niveles de anidamiento admite el arbol. Con 1, un
  subagente no puede engendrar otro.

Precondicion declarada
----------------------
Sin ejecutable legible REHUSA con exit 2 y NO publica ningun valor: un valor
por omision aqui seria peor que ninguno — se leeria como medido.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

#: etiqueta -> (que es, patron sobre las cadenas del ejecutable)
CAPS = {
    "agent_width": (
        "anchura del tool Agent (subagentes simultaneos)",
        re.compile(r"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS\?\?([A-Za-z_$][A-Za-z0-9_$]*)"),
    ),
    "parallel_width": (
        "anchura de parallel() dentro de Workflow",
        re.compile(r"Math\.min\(16,Math\.max\(2,[A-Za-z_$][A-Za-z0-9_$]*-2\)\)"),
    ),
    "spawn_depth": (
        "profundidad de anidamiento de subagentes",
        re.compile(r"CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH"),
    ),
}


def executable_strings() -> tuple[Path, str]:
    binario = shutil.which("claude")
    if not binario:
        print("ERROR — no hay ejecutable `claude` en PATH. NO se publica "
              "ningun valor: uno por omision se leeria como medido.",
              file=sys.stderr)
        raise SystemExit(2)
    ruta = Path(binario).resolve()
    try:
        salida = subprocess.run(["strings", "-n", "4", str(ruta)],
                                capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"ERROR — no pude leer las cadenas de {ruta}: {exc}",
              file=sys.stderr)
        raise SystemExit(2)
    return ruta, salida.stdout


def client_version(cadenas: str) -> str:
    """La build, por el literal N.N.N mas frecuente (13x de margen medido)."""
    conteo: dict[str, int] = {}
    for m in re.finditer(r"\b\d+\.\d+\.\d+\b", cadenas):
        conteo[m.group(0)] = conteo.get(m.group(0), 0) + 1
    if not conteo:
        return "(sin literal de version)"
    orden = sorted(conteo.items(), key=lambda kv: -kv[1])
    return orden[0][0]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--solo", choices=sorted(CAPS),
                    help="publica un solo cap, sin cabecera")
    args = ap.parse_args()

    ruta, cadenas = executable_strings()
    try:
        nucleos = os.cpu_count() or 0
    except NotImplementedError:
        nucleos = 0

    resultados: dict[str, tuple[str, str]] = {}

    # --- anchura de Agent ---------------------------------------------------
    etiqueta, patron = CAPS["agent_width"][0], CAPS["agent_width"][1]
    var = patron.search(cadenas)
    entorno = os.environ.get("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS")
    if entorno:
        resultados["agent_width"] = (etiqueta, f"{entorno} (de la variable de entorno)")
    elif var:
        # El guard nombra una variable —``…??J``— y el valor de esa variable
        # es el cap real cuando el entorno no la fija. Publicar sólo su nombre
        # deja la cifra sin medir, que es lo que este guion existe para
        # evitar: quien lo lea acaba citando el 20 de otra build.
        nombre = var.group(1)
        asignacion = re.search(rf",{re.escape(nombre)}=(\d+);", cadenas)
        if asignacion:
            resultados["agent_width"] = (
                etiqueta,
                f"{asignacion.group(1)}  [el default de la build, variable "
                f"`{nombre}`; sin asignar en el entorno]")
        else:
            resultados["agent_width"] = (
                etiqueta,
                f"SIN MEDIR — el guard nombra `{nombre}` y su asignación no "
                f"aparece con la forma `,{nombre}=<n>;`")
    else:
        resultados["agent_width"] = (etiqueta, "SIN MEDIR — el guard no aparece")

    # --- anchura de parallel() ---------------------------------------------
    etiqueta, patron = CAPS["parallel_width"][0], CAPS["parallel_width"][1]
    formas = sorted(set(m.group(0) for m in patron.finditer(cadenas)))
    if len(formas) == 1 and nucleos:
        valor = min(16, max(2, nucleos - 2))
        resultados["parallel_width"] = (
            etiqueta, f"{valor}  [{formas[0]} con nproc={nucleos}]")
    elif len(formas) == 1:
        resultados["parallel_width"] = (etiqueta, f"{formas[0]} (nproc no legible)")
    else:
        resultados["parallel_width"] = (
            etiqueta, f"SIN MEDIR — {len(formas)} forma(s) casan, sin desempate")

    # --- profundidad --------------------------------------------------------
    etiqueta, patron = CAPS["spawn_depth"][0], CAPS["spawn_depth"][1]
    entorno = os.environ.get("CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH")
    if entorno:
        resultados["spawn_depth"] = (etiqueta, f"{entorno} (de la variable de entorno)")
    elif patron.search(cadenas):
        resultados["spawn_depth"] = (
            etiqueta, "sin asignar en el entorno — lo fija una bandera remota")
    else:
        resultados["spawn_depth"] = (etiqueta, "SIN MEDIR — el guard no aparece")

    if args.solo:
        print(resultados[args.solo][1])
        return 0

    print(f"client-caps: medidos sobre {ruta} (build {client_version(cadenas)}), "
          f"nproc={nucleos or '?'}")
    for clave in ("agent_width", "parallel_width", "spawn_depth"):
        etiqueta, valor = resultados[clave]
        print(f"  {clave:<16} {valor}")
        print(f"  {'':<16} ^ {etiqueta}")
    print("  (los tres son mecanismos distintos: no se suman ni se sustituyen)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
