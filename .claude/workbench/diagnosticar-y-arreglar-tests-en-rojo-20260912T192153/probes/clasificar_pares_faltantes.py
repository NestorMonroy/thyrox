#!/usr/bin/env python3
"""Clasifica cada par (paquete, raiz) que `dependencies.test.ts` reporta como
`noResuelven`: FIX (agregar la dependencia — resuelve desde otro paquete que
ya la declara) o BASELINE (nadie en el workspace lo resuelve; el archivo o
paquete destino no existe aun, o es un tercero vendorizado/no publicado).

Reproduce lo que el propio `dependencies.test.ts` hace (mismas regex DESDE/
LLAMADA, mismo `raizDelPaquete`), pero en vez de sólo reportar el fallo,
prueba el especificador EXACTO (no sólo la raiz) contra cada paquete hermano
que ya declara esa raiz como dependencia — así separa «falta el enlace» de
«el archivo no existe en ningún lado».

Uso:
    python3 clasificar_pares_faltantes.py [paquete1 paquete2 ...]
    (sin argumentos: los 14 paquetes que estaban en rojo el 2026-09-12)
"""

import collections
import json
import os
import re
import subprocess
import sys

RAIZ = "/home/user/thyrox"
PAQUETES = os.path.join(RAIZ, "src", "packages")

DESDE = re.compile(r"^\s*(?:import|export)[^'\"]*?from\s+['\"]([^'\"]+)['\"]", re.M)
LLAMADA = re.compile(r"\b(?:import|require)\(\s*['\"]([^'\"]+)['\"]\s*\)")

PAQUETES_POR_DEFECTO = [
    "server", "updater", "config", "teleport", "voice", "agent", "shell",
    "mcp-runtime", "command-runtime", "storage", "ide", "tool-registry", "bridge",
]


def modulos(directorio):
    salida = []
    for raiz, dirs, archivos in os.walk(directorio):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for archivo in archivos:
            if archivo.endswith((".ts", ".tsx")):
                salida.append(os.path.join(raiz, archivo))
    return salida


def especificadores_externos(texto):
    fuera = []
    for patron in (DESDE, LLAMADA):
        for coincidencia in patron.finditer(texto):
            spec = coincidencia.group(1)
            if not spec or spec.startswith((".", "/")):
                continue
            if spec.startswith(("node:", "bun:", "-")):
                continue
            fuera.append(spec)
    return fuera


def raiz_del_paquete(spec):
    if not spec.startswith("@"):
        return spec.split("/")[0]
    partes = spec.split("/")
    return "/".join(partes[:2])


def declaradas(directorio_paquete):
    manifiesto = json.load(open(os.path.join(directorio_paquete, "package.json")))
    deps = manifiesto.get("dependencies", {})
    dev = manifiesto.get("devDependencies", {})
    return dict(deps, **dev)


def resuelve(especificador, directorio):
    proceso = subprocess.run(
        ["bun", "-e",
         f"try{{Bun.resolveSync({json.dumps(especificador)},{json.dumps(directorio)})}}"
         f"catch(e){{process.exit(1)}}"],
        capture_output=True,
    )
    return proceso.returncode == 0


def main():
    paquetes_objetivo = sys.argv[1:] or PAQUETES_POR_DEFECTO

    de_la_raiz = set(declaradas(RAIZ))
    todos = [d for d in os.listdir(PAQUETES)
             if os.path.isfile(os.path.join(PAQUETES, d, "package.json"))]

    declarantes = collections.defaultdict(list)
    for paquete in todos:
        for raiz in declaradas(os.path.join(PAQUETES, paquete)):
            declarantes[raiz].append(paquete)

    for paquete in paquetes_objetivo:
        directorio_paquete = os.path.join(PAQUETES, paquete)
        conocidas = set(declaradas(directorio_paquete)) | de_la_raiz
        for archivo in modulos(directorio_paquete):
            texto = open(archivo, errors="ignore").read()
            for spec in especificadores_externos(texto):
                raiz = raiz_del_paquete(spec)
                if raiz in conocidas:
                    continue
                if resuelve(spec, directorio_paquete):
                    continue
                veredicto = "BASELINE (nadie lo resuelve)"
                for otro in declarantes.get(raiz, []):
                    if otro == paquete:
                        continue
                    if resuelve(spec, os.path.join(PAQUETES, otro)):
                        veredicto = f"FIX (resuelve desde {otro})"
                        break
                print(f"{paquete}::{raiz:30} {spec:55} {veredicto}")


if __name__ == "__main__":
    main()
