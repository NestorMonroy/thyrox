#!/usr/bin/env python3
"""Una cifra que es propiedad de un artefacto vivo no se transcribe a prosa.

El corolario de ``calibration-verified-numbers.md`` distingue dos usos de un
número, y sólo uno driftea:

- **evidencia fechada de un episodio** — *"se desambiguó con un control: 27 de
  27 casos aciertan"*. Válido: es una ``Observation`` de un momento, y el
  momento no cambia.
- **propiedad de un artefacto vivo** — *"``test-x.sh`` — 17 aserciones"*.
  Prohibido: el guion gana aserciones y la prosa no se entera.

Este gate cubre las dos formas de la segunda clase que resultaron **medibles
sin ambigüedad**. Cada una lleva su razón, porque un patrón sin razón se
convierte en ruido en cuanto alguien lo hereda.

Ceguera declarada, y no es un olvido
------------------------------------
El **ordinal de gate suelto** (``gate #10``) NO se detecta. Medido sobre
``.claude/rules`` y ``source``: la forma mezcla dos referentes —la posición
del gate en su array y el **ID de tarea** que el gate cierra (``gate #334``,
``gate #529``)— y colisiona justo en el rango bajo, donde ``#7``, ``#9``,
``#10`` y ``#13`` son a la vez ordinales válidos e IDs de tarea válidos. Es
el sub-patrón A de ``metrica-decide-la-conclusion.md``: un rótulo que nombra
una cosa y contiene dos. Cablearlo produciría ruido, así que aquí sólo se
detecta el ordinal **citado junto a su script**, que sí desambigua.

La otra mitad del grifo no es este gate: es que el productor no numere. Un
``thyrox-audit.sh`` sin ordinales en sus comentarios no da nada que citar.

La cifra cuyo ARTEFACTO vive en la linea anterior tampoco se detecta, y es la
contrapartida declarada del positivo estrecho de ``aserciones``. Medido sobre
las 28 lineas que el patron ancho publicaba: de las 15 que eran propiedad de un
artefacto vivo, el estrecho ve **13**; las 2 que se le escapan
—``mas **14 aserciones** del instrumento`` y ``Las 18 aserciones de contenido``—
nombran su artefacto un renglon mas arriba, y un instrumento por linea no puede
verlo. A cambio, de las 13 que eran evidencia fechada NO marca **ninguna**.

*Metrica:* lineas donde un artefacto —literal en linea que termina en ``.sh``,
``.py`` o contiene ``test``, o la palabra ``suite``— precede a la cifra con a lo
sumo 40 caracteres de conector entre medias.
*Ciega a:* el artefacto nombrado en otra linea (2 de 15 medidos), y a la cifra
que es propiedad de un artefacto SIN nombrarlo en ningun sitio, que ningun
instrumento sintactico puede separar de la evidencia fechada.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

#: El árbol medido por defecto es el del consumidor; `--raiz` lo sobreescribe.
def default_root():
    """La raiz por defecto del barrido, resuelta al llamar.

    Es funcion y no constante de modulo por una razon medida (ERR-065): el
    `__getattr__` de PEP 562 resuelve el acceso por ATRIBUTO del modulo
    (`modulo.NOMBRE`), no el nombre DESNUDO dentro de una funcion del propio
    modulo. Diferir la constante y seguir leyendola desnuda deja un
    `NameError` en tiempo de ejecucion que ningun import delata.
    """
    try:
        return reach.consumer_root()
    except reach.ConsumerUnknownError as exc:
        # Rehuse declarado, no Traceback: exit 2 es lo que el audit lee como
        # SIN MEDIR. Un 0 aqui seria un verde falso.
        print(f"ERROR - {exc}", file=sys.stderr)
        print("        NO se emite un conteo: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        raise SystemExit(2)

def __getattr__(name: str):
    """`RAIZ_DEFECTO` se resuelve se resuelven al LEERLOS, no al importar el modulo.

    Ligarlos en el import ata el modulo a la raiz del momento de la carga, y
    desde TASK-DOCS-0286 `reach.consumer_root` REHUSA cuando el ascenso
    aterriza en el proveedor: con la ligadura a nivel de modulo ese rehuse
    mataba el `import`, no la llamada. Un modulo que no se puede importar deja
    sin salida incluso a quien iba a declarar el consumidor.

    Es el mismo defecto de firma que `check_workbench.py` tenia, y la misma
    solucion que `reach.py` ya aplica a `REACH_ROOTS` (PEP 562).
    """
    if name == 'RAIZ_DEFECTO':
        return default_root()

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
#: El baseline es PARAMETRO DEL CORPUS, no del mecanismo: vive en el arbol que
#: se mide, no junto a este archivo. Componerlo con `__file__` lo dejaba en el
#: proveedor tras la mudanza, mientras el archivo real seguia en
#: `kaupamex-docs/.claude/baselines/` — asi que el gate leia un conjunto vacio
#: y publicaba `0` sobre un corpus con 65 hallazgos. Es la forma del gate
#: hermano `check-hallazgo-sucesor.sh`, que ya lo resuelve relativo a la raiz.
BASELINE_REL = pathlib.Path('.claude') / 'baselines' / 'cifra_de_artefacto_vivo_baseline.txt'


def baseline_path(raiz: pathlib.Path) -> pathlib.Path:
    """El baseline del corpus `raiz`."""
    return raiz / BASELINE_REL

# (nombre, patrón, razón) — la razón se imprime junto al hallazgo.
PATRONES: list[tuple[str, re.Pattern[str], str]] = [
    (
        'aserciones',
        # POSITIVO ESTRECHO: el artefacto nombrado ANTES de la cifra, en la misma
        # linea, con solo un conector entre medias. Es lo que distingue la
        # PROPIEDAD de un artefacto vivo —«`test-x.sh` — 13 aserciones»— de la
        # EVIDENCIA FECHADA de un episodio —«sin el guard caen exactamente 2
        # aserciones»—, y `calibration-verified-numbers.md` declara la segunda
        # VALIDA en su tabla de dos usos.
        #
        # El patron anterior era `\b\d+ aserciones?\b` a secas: media el
        # SIGNIFICANTE y concluia sobre el SIGNIFICADO, que es el sub-patron C
        # de `metrica-decide-la-conclusion.md` cometido por el gate que existe
        # para hacer cumplir esa misma regla. Medido sobre las 28 lineas que
        # publicaba: 13 eran evidencia fechada, o sea el 46 % de falsos
        # positivos, y reescribirlas habria destruido evidencia valida.
        re.compile(
            r'(?:``[^`\n]*(?:\.sh|\.py|test[^`\n]*)``|\bsuite\b)'
            r'\s*[—,:]?\s*[^`\n]{0,40}?\*{0,2}\d+\s+aserciones?\b',
            re.I,
        ),
        'la suite gana aserciones y la prosa no se entera; nombra el comando, '
        'que publica su conteo al correr',
    ),
    (
        'ordinal-de-gate',
        # El `\*{0,2}` tolera el énfasis RST/Markdown alrededor del número.
        # Sin él, «Gate **18** de ``thyrox-audit.sh``» pasaba sin marcar — un
        # falso negativo REAL, encontrado al correr el gate contra el índice
        # de hallazgos del propio pase que lo escribió.
        re.compile(
            r'\bgate \*{0,2}#?\d+\*{0,2} del? [`*.\w/-]*'
            r'(?:thyrox-audit|pre-commit|pre-push|post-merge|\.sh|\.py)',
            re.I,
        ),
        'insertar un gate antes desplaza el ordinal y la cita queda mintiendo; '
        'el gate se identifica por su script, que es un nombre estable',
    ),
]

SUFIJOS = ('.md', '.rst', '.sh', '.py')
SUBRAICES = ('.claude/rules', '.claude/scripts', 'source')
EXCLUIR = ('node_modules', '.venv', 'venv', '__pycache__', 'build', 'dist')


def cargar_baseline(raiz: pathlib.Path) -> set[str]:
    ruta = baseline_path(raiz)
    if not ruta.is_file():
        return set()
    return {
        línea.strip()
        for línea in ruta.read_text(encoding='utf-8').splitlines()
        if línea.strip() and not línea.startswith('#')
    }


def archivos(raiz: pathlib.Path):
    for sub in SUBRAICES:
        base = raiz / sub
        if not base.is_dir():
            continue
        for f in base.rglob('*'):
            if f.suffix in SUFIJOS and not any(p in EXCLUIR for p in f.parts):
                yield f


INLINE_LITERAL = re.compile(r'``[^`\n]+``')

#: El literal en linea es la otra forma de citar verbatim, y por el mismo
#: motivo que el bloque: dentro va un token transcrito, no una afirmacion de
#: la prosa. Un hallazgo que cita la salida `test-x: 31 aserciones OK` para
#: explicar POR QUE esa cifra era un falso positivo se marcaba a si mismo.
#: Mismo arreglo que en `check_vocabulario_prosa.py` (:ref:`h-docs-442`).

DIRECTIVA_LITERAL = re.compile(r'^(\s*)\.\.\s+(code-block|literalinclude|parsed-literal)::')
CIERRE_DOS_PUNTOS = re.compile(r'::\s*$')

#: La forma-EPISODIO que la regla bendice explicitamente. `N de N aserciones`
#: —«20 de 20 aserciones pasan»— no afirma una propiedad del guion: afirma el
#: resultado de una corrida fechada, y ese resultado no cambia porque la suite
#: crezca. `calibration-verified-numbers.md` la distingue en su tabla: la
#: evidencia fechada de un episodio es **valida**; la propiedad de un artefacto
#: vivo, prohibida. El gate marcaba las dos.
FORMA_EPISODIO = re.compile(r'\b\d+\s+de\s+\d+\s+aserciones?\b', re.I)


def lineas_de_bloque_literal(texto: str) -> set[int]:
    """Los numeros de linea (1-based) que caen dentro de un bloque literal.

    Un bloque literal contiene la salida real de un comando: una cifra ahi es
    la transcripcion de una corrida, no una afirmacion de la prosa sobre el
    guion. Marcarla obliga a falsear la evidencia para pasar el gate, que es lo
    contrario de lo que el gate persigue.

    *Metrica:* renglones sangrados por debajo de una apertura ``::`` o de una
    directiva ``code-block``.
    *Ciega a:* un bloque con sangria inconsistente. Cota inferior.
    """
    lineas = texto.splitlines()
    dentro: set[int] = set()
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        abre = DIRECTIVA_LITERAL.match(linea) is not None or (
            CIERRE_DOS_PUNTOS.search(linea) and linea.strip() != ''
        )
        if not abre:
            i += 1
            continue
        sangria_base = len(linea) - len(linea.lstrip())
        j = i + 1
        while j < len(lineas):
            actual = lineas[j]
            if actual.strip() == '':
                j += 1
                continue
            if len(actual) - len(actual.lstrip()) <= sangria_base:
                break
            dentro.add(j + 1)
            j += 1
        i = max(j, i + 1)
    return dentro


def scan(raiz: pathlib.Path) -> tuple[list[tuple[str, int, str, str]], int]:
    """Devuelve (hallazgos, total de archivos medidos).

    Cada hallazgo es ``(clave, línea, forma, razón)``. La clave es
    ``<ruta relativa>::<forma>`` — nunca la forma sola: la misma cifra puede
    ser la CITA del anti-patrón en la regla que lo prohíbe, y congelarla
    globalmente la autorizaría en un documento nuevo.
    """
    propio = pathlib.Path(__file__).resolve()
    hallazgos: list[tuple[str, int, str, str]] = []
    total = 0
    for f in archivos(raiz):
        if f.resolve() == propio:      # el gate cita sus propias formas
            continue
        total += 1
        try:
            texto = f.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        rel = f.relative_to(raiz).as_posix()
        citadas = lineas_de_bloque_literal(texto)
        for n, línea in enumerate(texto.splitlines(), 1):
            if n in citadas:           # salida de comando transcrita, no prosa
                continue
            episodios = [m.span() for m in FORMA_EPISODIO.finditer(línea)]
            episodios += [m.span() for m in INLINE_LITERAL.finditer(línea)]
            for _nombre, patrón, razón in PATRONES:
                for m in patrón.finditer(línea):
                    if any(a <= m.start() and m.end() <= b for a, b in episodios):
                        continue       # `N de N aserciones` — evidencia fechada
                    hallazgos.append((f'{rel}::{m.group(0)}', n, m.group(0), razón))
    return hallazgos, total


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    # `default=None`, resuelto TRAS `parse_args`: argparse evalua el default al
    # CONSTRUIR el parser, asi que un `default=str(default_root())` invoca la
    # resolucion aunque el llamador pase la raiz. Ese orden hacia que el gate
    # rehusara sobre un arbol declarado explicitamente.
    ap.add_argument('raiz', nargs='?', default=None)
    ap.add_argument('--strict', action='store_true', help='exit 1 si hay nuevos')
    ap.add_argument('--quiet', action='store_true', help='sólo el conteo')
    ap.add_argument('--no-baseline', action='store_true',
                    help='ignora el baseline — mide el universo entero')
    ap.add_argument('--write-baseline', action='store_true')
    args = ap.parse_args()

    raiz = pathlib.Path(args.raiz or default_root()).resolve()
    hallazgos, total = scan(raiz)

    if args.write_baseline:
        claves = sorted({h[0] for h in hallazgos})
        destino = baseline_path(raiz)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(
            '# Deuda heredada de cifras-propiedad, congelada — NO es una lista\n'
            '# de formas autorizadas. La clave es <ruta>::<forma> a propósito:\n'
            '# la misma cifra puede ser la CITA del anti-patrón en la regla que\n'
            '# lo prohíbe. Se paga al tocar el archivo.\n'
            + '\n'.join(claves) + '\n', encoding='utf-8')
        print(f'baseline escrito: {len(claves)} clave(s)')
        return 0

    base = set() if args.no_baseline else cargar_baseline(raiz)
    nuevos = [h for h in hallazgos if h[0] not in base]

    if args.quiet:
        print(len(nuevos))
    else:
        for clave, n, forma, razón in nuevos:
            ruta = clave.split('::', 1)[0]
            print(f'{ruta}:{n}: «{forma}» — {razón}')
        print(f'\n{len(nuevos)} cifra(s)-propiedad nueva(s) '
              f'(alcance medido: {total} archivo(s) bajo '
              f'{"/".join(s.rsplit("/", 1)[-1] for s in SUBRAICES)})')

    return 1 if (args.strict and nuevos) else 0


if __name__ == '__main__':
    sys.exit(main())
