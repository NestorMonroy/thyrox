#!/usr/bin/env python3
"""Detecta que un consumidor lleve COPIA de lo que thyrox ya tiene.

El defecto que existe, medido antes de escribir esto
-----------------------------------------------------

thyrox no gobierna el multi-repo: los consumidores no lo invocan, lo copian.

    invocaciones que apuntan a thyrox desde los cinco clones ....... 0
    archivos .sh/.py de .claude/ que son copia byte a byte ......... 54
      kaupamex-api ....... 25 de 38     kaupamex-ui ....... 27 de 39

Las ocho «invocaciones de thyrox» de `kaupamex-api` corren
`bash .claude/skills/thyrox/scripts/...` — su propia copia, con el nombre de
thyrox y sin ninguna relacion viva con el.

Por que importa, y no es teorico
---------------------------------

Una copia diverge en silencio. Ocurrio el mismo dia que se escribio este gate:
una clase de corchetes con caracter multibyte en `count-requirements.sh` habia
que corregirla en thyrox, en kaupamex-api y en kaupamex-ui — tres veces la
misma linea, porque son tres archivos y no uno consumido (:ref:`h-docs-1114`).

Los dos veredictos, que NO son el mismo
----------------------------------------

- **copia**: el consumidor tiene un archivo identico byte a byte a uno de
  thyrox. Es duplicacion pura: el consumo lo resolveria sin perder nada.
- **fork**: existe con el mismo nombre relativo pero DIFIERE. Ya no es una
  copia — es una divergencia, y decidir si el consumidor necesita su variante
  o si se quedo atras es juicio, no medicion. Se reporta aparte y no bloquea.

Ciego, y se declara
-------------------

- Al archivo que el consumidor **adapto renombrandolo**: se empareja por
  contenido para la copia y por nombre relativo para el fork, asi que un
  renombre con cambio de contenido no aparece en ninguno de los dos.
- A la copia de un archivo que thyrox **no tiene todavia** — el gate mide
  duplicacion contra la fuente, no oportunidad de centralizar.
- Al `.md`, al `.rst` y al `.json`: hoy mide `.sh` y `.py`, que es donde vive
  el mecanismo. Un skill duplicado como `SKILL.md` no lo ve.
"""
import argparse
import hashlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

#: Lo que se mide: donde vive el mecanismo ejecutable.
SUFIJOS = ('.sh', '.py')

#: Ni dependencia, ni artefacto, ni evidencia, ni el archivo de otro arbol.
SKIP_DIRS = {'.git', 'node_modules', '.venv', 'build', 'dist', '__pycache__',
             '_archived', '_references', 'eventos', 'agent-results'}


def _digest(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def _walk(root: Path):
    for p in sorted(root.rglob('*')):
        if p.is_file() and p.suffix in SUFIJOS \
                and not any(part in SKIP_DIRS for part in p.parts):
            yield p


def _index(root: Path) -> tuple[dict[str, list[str]], set[str]]:
    """Mapa de digest -> rutas, y el conjunto de nombres relativos."""
    por_digest: dict[str, list[str]] = {}
    nombres: set[str] = set()
    for p in _walk(root):
        rel = str(p.relative_to(root))
        nombres.add(Path(rel).name)
        d = _digest(p)
        if d:
            por_digest.setdefault(d, []).append(rel)
    return por_digest, nombres


def compare(fuente: Path, consumidor: Path) -> tuple[list[str], list[str], int]:
    """Devuelve (copias, forks, archivos medidos en el consumidor).

    `copias` se empareja por CONTENIDO —un renombre sigue siendo la misma
    copia—; `forks` por NOMBRE de archivo, porque una divergencia cambia el
    contenido por definicion y el nombre es lo unico que queda para
    emparejarlos.
    """
    por_digest, nombres = _index(fuente)
    copias: list[str] = []
    forks: list[str] = []
    medidos = 0
    # Sólo se mide la zona de estado del consumidor: es donde aterriza lo
    # copiado. Su código propio no es asunto de este gate.
    raiz_estado = consumidor / '.claude'
    if not raiz_estado.is_dir():
        return copias, forks, medidos
    for p in _walk(raiz_estado):
        medidos += 1
        rel = str(p.relative_to(consumidor))
        d = _digest(p)
        if d and d in por_digest:
            copias.append(rel)
        elif p.name in nombres:
            forks.append(rel)
    return copias, forks, medidos


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    # Ninguna de las dos es obligatoria: las dos son DERIVABLES, y un gate del
    # registro se invoca a secas —la convencion que la referencia fija al
    # declarar su `Check` sin campo de argumentos—. Exigirlas hacia que el
    # corredor lo publicara SIN MEDIR con el `usage:` de argparse por mensaje.
    parser.add_argument('--fuente', default=None,
                        help='la raiz de thyrox (por defecto, reach.thyrox_root)')
    parser.add_argument('--consumidor', default=None,
                        help='el clon consumidor (por defecto, reach.consumer_root)')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si hay copias')
    parser.add_argument('--quiet', action='store_true',
                        help='emitir solo el conteo de copias, entero pelado')
    args = parser.parse_args()

    # La derivacion puede rehusar (`ReachRootError`): eso es un 2, no un
    # traceback. Un gate que revienta no nombra nada, y un veredicto ausente se
    # lee igual que uno limpio.
    try:
        fuente = Path(args.fuente) if args.fuente else reach.thyrox_root()
        consumidor = (Path(args.consumidor) if args.consumidor
                      else reach.consumer_root())
    except Exception as exc:                       # noqa: BLE001
        print(f'ERROR — no se pudieron derivar las dos raices: {exc}',
              file=sys.stderr)
        print('NO se emite un conteo: este gate mide ENTRE dos arboles.',
              file=sys.stderr)
        return 2
    for etiqueta, raiz in (('fuente', fuente), ('consumidor', consumidor)):
        if not raiz.is_dir():
            print(f'ERROR — la raiz {etiqueta} no existe: {raiz}', file=sys.stderr)
            print('NO se emite un conteo: este gate mide ENTRE dos arboles; '
                  'sin uno de los dos, un 0 seria un verde falso.',
                  file=sys.stderr)
            return 2

    copias, forks, medidos = compare(fuente, consumidor)

    if args.quiet:
        print(len(copias))
        return 1 if (args.strict and copias) else 0

    for rel in copias:
        print(f'  COPIA  {rel}')
    for rel in forks:
        print(f'  fork   {rel}   (mismo nombre, contenido distinto — juicio, no medicion)')

    print(f'check-consumer-copies: {len(copias)} copia(s) · {len(forks)} fork(s) '
          f'(alcance medido: {medidos} archivo(s) de {consumidor.name}/.claude)')
    return 1 if (args.strict and copias) else 0


if __name__ == '__main__':
    raise SystemExit(main())
