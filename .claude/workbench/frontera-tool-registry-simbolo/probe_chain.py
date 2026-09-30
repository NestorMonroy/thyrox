#!/usr/bin/env python3
"""Sonda dirigida de la cadena mas corta de TASK-THYROX-0234.

Mide los simbolos que `tools/BashTool/utils.ts` y `notebook.ts` importan de
paquetes hermanos, para saber que falta ANTES de portar y no despues.

Por que `bun -e` y no un archivo de sonda en el banco: la autorreferencia
`@thyrox/<pkg>` se resuelve contra el `package.json` que gobierna **el
directorio del archivo que importa**, no contra el cwd. Un archivo de sonda en
`.claude/workbench/` esta fuera del espacio de trabajo y devuelve «Cannot find
module» para los trece pares — un rojo del instrumento que se leeria como
«ningun hermano esta portado». `bun -e` si resuelve contra el cwd, asi que la
sonda se ejecuta desde el directorio del paquete consumidor.

Metrica: por par (especificador, simbolo), si el modulo carga y si el nombre
esta en el objeto del modulo.
Ciega a: un `export type`, que se borra al transpilar y el runtime no puede
ver; y a la firma o la conducta del simbolo — se pregunta por el nombre.
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
CONSUMIDOR = RAIZ / 'src' / 'packages' / 'tool-registry'

PARES: list[tuple[str, list[str]]] = [
    ('@thyrox/app-host/bootstrap/state.js', ['getOriginalCwd']),
    ('@thyrox/local-observability', ['logEvent']),
    ('@thyrox/app-host/bootstrap/cwd.js', ['getCwd']),
    ('@thyrox/permission/filesystem', ['pathInAllowedWorkingPath']),
    ('@thyrox/shell/Shell.js', ['setCwd']),
    ('@thyrox/config/env/utils', ['shouldMaintainProjectWorkingDir']),
    ('@thyrox/storage/imageResizer.js', ['maybeResizeAndDownsampleImageBuffer']),
    ('@thyrox/shell/legacy/outputLimits.js', ['getMaxOutputLength']),
    ('@thyrox/output/utils/stringUtils.js', ['countCharInString', 'plural']),
    ('@thyrox/storage/fsOperations.js', ['getFsImplementation']),
    ('@thyrox/storage/path.js', ['expandPath']),
    ('@thyrox/local-observability/slowOperations.js', ['jsonParse']),
    ('@anthropic-ai/sdk/resources/index.mjs', []),
]


def probe(spec: str, simbolos: list[str]) -> str:
    guion = (
        f"const m = await import({json.dumps(spec)});"
        f"const faltan = {json.dumps(simbolos)}.filter(n => !(n in m));"
        "console.log(faltan.length ? 'FALTAN ' + faltan.join(',') : 'OK');"
    )
    r = subprocess.run(
        ['bun', '-e', guion], cwd=CONSUMIDOR,
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        primera = (r.stderr or r.stdout).strip().split('\n')[0]
        return f'NO CARGA    {primera}'
    return r.stdout.strip()


def main() -> int:
    bloqueados = 0
    for spec, simbolos in PARES:
        veredicto = probe(spec, simbolos)
        if not veredicto.startswith('OK'):
            bloqueados += 1
        print(f'{veredicto:<44}  {spec}  {",".join(simbolos)}'.rstrip())
    print(f'\npares medidos: {len(PARES)} — bloqueados: {bloqueados}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
