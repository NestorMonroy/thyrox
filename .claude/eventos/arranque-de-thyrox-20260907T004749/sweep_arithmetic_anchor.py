#!/usr/bin/env python3
"""Barrido: la aritmetica de raiz que aterriza FUERA de thyrox -> reach.sh.

Sujeto: las lineas `<VAR>="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"`
cuyo destino, resuelto desde el archivo que las escribe, cae fuera del arbol de
thyrox. Se sustituyen por el arranque minimo (ascenso al marcador) mas la
delegacion a `thyrox_root`, que es el unico duenno de la precedencia.

NO toca la aritmetica que se queda DENTRO: `parents[1]` desde `src/<pkg>/`
apunta a `src/`, que es la raiz del paquete propio — un anclaje al proveedor.

Metrica: lineas con la forma, cuyo `cd` resuelto sale de la raiz de thyrox.
Ciega a: una raiz compuesta en dos pasos (una variable intermedia), y a la
aritmetica escrita con `dirname $0` en vez de `BASH_SOURCE`.
"""
import pathlib, re, subprocess, sys

RAIZ = pathlib.Path(__file__).resolve()
while RAIZ != RAIZ.parent and not (RAIZ / "src/paths/reach.py").is_file():
    RAIZ = RAIZ.parent
#: Forma B: en vez de asignar, entra en la raiz. Mismo defecto, otra sintaxis —
#: y la que mas veces aparece en `tests/legacy/`, que es donde vivia el corredor.
FORMA_CD = re.compile(
    r'^(?P<sangria>\s*)cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)(?P<suf>/[^"]*)"'
    r'(?P<cola>.*)$')

FORMA = re.compile(
    r'^(?P<sangria>\s*)(?P<var>[A-Za-z_][A-Za-z0-9_]*)='
    r'"\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)(?P<suf>/[^"]*)" && pwd\)"\s*$')

BOOTSTRAP = (
    '{s}# Arranque minimo: se asciende al marcador para HALLAR el localizador, y\n'
    '{s}# a partir de ahi la precedencia la decide el (THYROX_ROOT, .env, hermano).\n'
    '{s}_thyrox_desde="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"\n'
    '{s}while [[ "$_thyrox_desde" != "/" && ! -f "$_thyrox_desde/src/paths/reach.py" ]]; do\n'
    '{s}    _thyrox_desde="$(dirname "$_thyrox_desde")"\n'
    '{s}done\n'
    '{s}source "$_thyrox_desde/src/lib/reach.sh"\n')

ARRANQUE = (
    '{s}# Arranque minimo: se asciende al marcador para HALLAR el localizador, y\n'
    '{s}# a partir de ahi la precedencia la decide el (THYROX_ROOT, .env, hermano).\n'
    '{s}_thyrox_desde="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"\n'
    '{s}while [[ "$_thyrox_desde" != "/" && ! -f "$_thyrox_desde/src/paths/reach.py" ]]; do\n'
    '{s}    _thyrox_desde="$(dirname "$_thyrox_desde")"\n'
    '{s}done\n'
    '{s}source "$_thyrox_desde/src/lib/reach.sh"\n'
    '{s}{var}="$(thyrox_root)" || exit 2\n')

def escapa(archivo: pathlib.Path, suf: str) -> bool:
    destino = (archivo.parent / suf.lstrip("/")).resolve()
    return not str(destino).startswith(str(RAIZ))

def main(aplicar: bool) -> int:
    tocados = medidos = sitios = 0
    salida = subprocess.run(["git", "grep", "-ln", 'BASH_SOURCE\\[0\\]', "--", "*.sh"],
                            cwd=RAIZ, capture_output=True, text=True)
    for rel in sorted(salida.stdout.split()):
        archivo = RAIZ / rel
        lineas = archivo.read_text(encoding="utf-8").splitlines(keepends=True)
        medidos += 1
        nuevas, cambio = [], False
        for linea in lineas:
            m = FORMA.match(linea.rstrip("\n"))
            mc = FORMA_CD.match(linea.rstrip("\n"))
            if m and escapa(archivo, m.group("suf")):
                nuevas.append(ARRANQUE.format(s=m.group("sangria"), var=m.group("var")))
                cambio = True; sitios += 1
            elif mc and escapa(archivo, mc.group("suf")):
                s = mc.group("sangria")
                nuevas.append(BOOTSTRAP.format(s=s))
                nuevas.append(f'{s}cd "$(thyrox_root)"{mc.group("cola")}\n')
                cambio = True; sitios += 1
            else:
                nuevas.append(linea)
        if cambio:
            tocados += 1
            print(f"  {rel}")
            if aplicar:
                archivo.write_text("".join(nuevas), encoding="utf-8")
    modo = "APLICADO" if aplicar else "dry-run"
    print(f"\n{modo}: {sitios} sitio(s) en {tocados} archivo(s) "
          f"(alcance medido: {medidos} archivo(s) .sh con BASH_SOURCE)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))
