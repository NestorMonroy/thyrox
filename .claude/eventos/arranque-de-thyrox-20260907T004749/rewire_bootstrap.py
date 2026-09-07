#!/usr/bin/env python3
"""Sustituye el arranque cableado por el arranque con DOS entradas de entorno.

El defecto que corrige es mio y de este mismo pase: al retirar la aritmetica
`../../..` inline el marcador `src/paths/reach.py` en 65 archivos. Cambia una
ruta cableada por otra — el consumidor que reestructure thyrox no tiene donde
declararlo, que es exactamente lo que DEC-04 prohibe: cablear le quita al
usuario la decision de donde van las cosas.

Forma nueva, y es la de `get_secret("WORKER_CONFIG")` /
`get_secret_str("CONFIG_FILE_PATH")`: dos entradas, ambas de entorno — el
VALOR (`THYROX_ROOT`) y la RUTA A SU DECLARACION (`THYROX_ENV_FILE`). El
ascenso queda de ultimo recurso, y los dos literales que necesita van tras
constantes que el entorno tambien puede fijar.
"""
import pathlib, re, sys

RAIZ = pathlib.Path(__file__).resolve()
while RAIZ != RAIZ.parent and not (RAIZ / "src/paths/reach.py").is_file():
    RAIZ = RAIZ.parent

VIEJO = re.compile(
    r'^(?P<s>[ \t]*)# Arranque minimo: se asciende al marcador para HALLAR el localizador, y\n'
    r'.*?^[ \t]*source "\$_thyrox_desde/src/lib/reach\.sh"\n', re.S | re.M)

NUEVO = (
    '{s}# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz\n'
    '{s}# y la RUTA a su declaracion. Los dos literales que el ultimo recurso\n'
    '{s}# necesita van tras constantes que el entorno tambien fija: cablearlos le\n'
    '{s}# quitaria al consumidor la decision de donde van las cosas.\n'
    '{s}_thyrox_root="${{THYROX_ROOT:-}}"\n'
    '{s}if [[ -z "$_thyrox_root" && -n "${{THYROX_ENV_FILE:-}}" && -f "${{THYROX_ENV_FILE}}" ]]; then\n'
    '{s}    _thyrox_root="$(sed -n \'s/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p\' \\\n'
    '{s}        "$THYROX_ENV_FILE" | tail -1 | tr -d \'"\'"\'"\'\')"\n'
    '{s}fi\n'
    '{s}if [[ -z "$_thyrox_root" ]]; then\n'
    '{s}    _thyrox_root="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"\n'
    '{s}    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${{THYROX_LOCATOR:-src/paths/reach.py}}" ]]; do\n'
    '{s}        _thyrox_root="$(dirname "$_thyrox_root")"\n'
    '{s}    done\n'
    '{s}fi\n'
    '{s}source "$_thyrox_root/${{THYROX_LIB_REACH:-src/lib/reach.sh}}"\n')

def main(aplicar: bool) -> int:
    tocados = sitios = 0
    for archivo in sorted(RAIZ.glob("src/**/*.sh")) + sorted(RAIZ.glob("tests/**/*.sh")):
        if "node_modules" in archivo.parts:
            continue
        texto = archivo.read_text(encoding="utf-8")
        nuevo, n = VIEJO.subn(lambda m: NUEVO.format(s=m.group("s")), texto)
        if not n:
            continue
        # `_thyrox_desde` sobrevive donde el guion lo reusa despues del arranque.
        nuevo = nuevo.replace("$_thyrox_desde", "$_thyrox_root")
        tocados += 1; sitios += n
        print(f"  {archivo.relative_to(RAIZ)}")
        if aplicar:
            archivo.write_text(nuevo, encoding="utf-8")
    modo = "APLICADO" if aplicar else "dry-run"
    print(f"\n{modo}: {sitios} arranque(s) en {tocados} archivo(s)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))
