#!/usr/bin/env python3
"""check_doc_citations.py — las citas ``:doc:`` que no aterrizan en el arbol de HOY.

Un rol ``:doc:`` nombra un ``docname``: la ruta de un ``.rst`` bajo ``source/``,
sin la extension. Si ese ``docname`` no existe, el enlace no resuelve y el
lector llega a nada. ``SPHINX_NITPICKY=1 make html`` ya lo detecta — y tarda
15-20 min, asi que en la practica no corre nunca antes de un commit. Este gate
mide lo mismo en **0.6 s sobre 5620 archivos** (medido con `time`, corpus de
`kaupamex-docs`), que es lo que lo hace cableable a un `pre-commit`.

**El criterio es «resuelve contra el arbol de hoy», NO «existio alguna vez».**
La distincion importa y es la que separa este gate de su antecesor: TASK-GEN-0635
partio las citas rotas con `git log --all --pretty=format: --name-only`, que
enumera **9273 rutas historicas** por invocacion. Esa medicion es la correcta
para decidir el *desenlace* de una cita —repuntarla contra su sucesor o
declararla hueco de diseno— y es inviable dentro de un gate que tiene que
costar segundos. Aqui no se pregunta que paso: se pregunta si el enlace lleva
a alguna parte.

Uso — con el cwd puesto en el CONSUMIDOR, que es de donde salen el corpus y el
baseline:

    T=/home/user/thyrox
    python3 "$T/src/verify/check_doc_citations.py"              # reporte
    python3 "$T/src/verify/check_doc_citations.py" --quiet      # solo el conteo
    python3 "$T/src/verify/check_doc_citations.py" --strict     # exit 1 si hay nuevas
    python3 "$T/src/verify/check_doc_citations.py" <archivos>   # solo esos
    python3 "$T/src/verify/check_doc_citations.py" --write-baseline

Tres estados de salida, que `check_veredicto_de_gate.py` exige distinguibles:
``0`` limpio · ``1`` rota nueva (con ``--strict``) · ``2`` rehusado. El tercero
existe porque un cero sin ``source/`` o sin baseline no distingue «no hay citas
rotas» de «no pude medir» — el sub-patron D de
``metrica-decide-la-conclusion.md``.

*Metrica:* destinos del rol ``:doc:`` fuera de un literal, resueltos a
``docname`` y contrastados contra los ``docname`` presentes en ``source/``.
*Ciega a:* toda cita **dentro** de un literal, que Sphinx no resuelve y este
gate no cuenta —por eso su cifra es MENOR que la del censo de TASK-GEN-0635,
que las contaba: son **5 de sus 85**, cuatro prosa que cita la forma de un
enlace y una plantilla con marcador (`tpl-ventana`, `adr-NNN-...`)—; a un
``docname`` que exista en otro formato de fuente (``.md`` con MyST, si alguna
vez se habilita); a lo que `conf.py` excluya del build, que este gate no lee;
y a un enlace que resuelva y apunte al documento equivocado, que es una
cuestion de contenido y no de forma.
"""

import os
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / 'src' / 'paths' / 'reach.py').is_file()), None)
if _ROOT is None:  # pragma: no cover — el clon esta roto si esto ocurre
    raise RuntimeError(f'thyrox: no se encontro src/paths/reach.py sobre {_HERE}')

from docs import citations                                # noqa: E402
from verify import check_vocabulario_prosa as _parameter  # noqa: E402

SOURCE_ROOT = 'source'

#: El baseline es PARAMETRO DEL CONSUMIDOR (DEC-04): congela la deuda de ESTE
#: corpus, no del mecanismo. Se resuelve con el mismo resolutor que sus dos
#: hermanos —no con una copia— para no fabricar una segunda fuente de verdad.
BASELINE_NAME = 'doc_citations_baseline.txt'
BASELINE_VAR = 'DOC_CITATIONS_BASELINE'


def resolve_baseline(measured=()):
    return _parameter.resolve_parameter(BASELINE_NAME, BASELINE_VAR, measured)


def baseline_destination(measured=()):
    """Donde ATERRIZA --write-baseline: el consumidor, nunca el proveedor.

    No se reusa `resolve_baseline`: su ultimo candidato es el directorio del
    propio gate, y escribir ahi crearia en el PROVEEDOR un baseline que despues
    satisface la busqueda de cualquier consumidor. El destino se compone, no se
    descubre — mismo criterio que `check_hallazgo_submodulo.py`.
    """
    declared = os.environ.get(BASELINE_VAR, '').strip()
    if declared:
        return pathlib.Path(declared)
    return _parameter.consumer_root(measured) / '.claude' / 'baselines' / BASELINE_NAME


def consumer_root(measured=()):
    return _parameter.consumer_root(measured)


def refuse_without_source(root):
    print(
        f'ERROR — no se encontro {SOURCE_ROOT}/ bajo el consumidor.\n'
        f'  Raiz resuelta: {root}\n'
        f'  El gate se invoca con el cwd puesto en el repo de documentacion.\n'
        f'  NO se emite un conteo: un 0 sin corpus no distingue «no hay citas\n'
        f'  rotas» de «no pude medir».',
        file=sys.stderr,
    )
    raise SystemExit(2)


def docnames(root):
    """Los ``docname`` que HOY existen: `source/**/*.rst` sin su extension."""
    src = pathlib.Path(root) / SOURCE_ROOT
    return {p.relative_to(src).with_suffix('').as_posix()
            for p in src.rglob('*.rst')}


def corpus(root):
    """Los archivos citantes: todo `.rst` de `source/`, en orden estable."""
    src = pathlib.Path(root) / SOURCE_ROOT
    return sorted(src.rglob('*.rst'))


def _docname_of(path, root):
    """El ``docname`` de un archivo, o ``None`` si cae fuera de `source/`.

    Devuelve `None` en vez de reventar porque el `pre-commit` pasa lo que este
    en *staging*, y ahi hay `.rst` fuera de `source/` —plantillas, bancos de
    evidencia— que no son corpus de Sphinx. Un `ValueError` ahi mataria el
    commit por un archivo que el gate ni siquiera juzga.
    """
    src = (pathlib.Path(root) / SOURCE_ROOT).resolve()
    try:
        return pathlib.Path(path).resolve().relative_to(src).with_suffix('').as_posix()
    except ValueError:
        return None


def scan(files, root, names):
    """Devuelve (citas_medidas, rotas).

    Cada rota es ``(citing, target, resolved, line)``.
    """
    measured, broken = 0, []
    for path in files:
        citing = _docname_of(path, root)
        if citing is None:
            continue
        try:
            text = pathlib.Path(path).read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        for target, line in citations.iter_citations(text, citing):
            measured += 1
            resolved = citations.resolve_target(target, citing)
            if resolved not in names:
                broken.append((citing, target, resolved, line))
    return measured, broken


def read_baseline(measured=()):
    """Las claves congeladas, o REHUSA.

    Devolver un conjunto vacio cuando el archivo no aparece publica la deuda
    heredada entera como nueva — el sub-patron D aplicado al propio gate.
    """
    path = resolve_baseline(measured)
    if not path.is_file():
        _parameter.refuse_without_parameter(
            BASELINE_NAME, BASELINE_VAR, path,
            'sin baseline, la deuda heredada se publicaria\n  entera como nueva.')
    return {l.strip() for l in path.read_text(encoding='utf-8').splitlines()
            if l.strip() and not l.startswith('#')}


def key_of(broken_row):
    """`<citante>::<destino escrito>` — las dos mitades son texto del autor.

    Se congela el destino ESCRITO y no el resuelto: si el citante se mueve, una
    cita relativa resuelve a otro sitio y su entrada dejaria de emparejar, con
    lo que el movimiento reabriria deuda que nadie reintrodujo.
    """
    citing, target, _resolved, _line = broken_row
    return f'{citing}::{target}'


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    args = [a for a in argv if not a.startswith('--')]
    quiet = '--quiet' in argv
    strict = '--strict' in argv
    writing = '--write-baseline' in argv

    hint = [pathlib.Path(a) for a in args]
    root = consumer_root(hint)
    if not (root / SOURCE_ROOT).is_dir():
        refuse_without_source(root)

    names = docnames(root)
    files = hint if args else corpus(root)

    frozen = set() if writing else read_baseline(hint)
    measured, broken = scan(files, root, names)
    new_ones = [b for b in broken if key_of(b) not in frozen]

    if writing:
        destination = baseline_destination(hint)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            '# Deuda heredada de check_doc_citations.py — congelada, no barrida.\n'
            '# Clave: <docname citante>::<destino escrito en el rol :doc:>.\n'
            '# Una entrada listada no bloquea; una nueva si. Al repuntar una cita,\n'
            '# quitar su linea: si no, el baseline miente sobre deuda que ya no existe.\n'
            + '\n'.join(sorted(key_of(b) for b in broken)) + '\n',
            encoding='utf-8')
        print(f'baseline escrito en {destination}: {len(broken)} cita(s)')
        return 0

    if quiet:
        print(len(new_ones))
    else:
        if new_ones:
            print(f'check-doc-citations: {len(new_ones)} cita(s) :doc: que no aterrizan, '
                  f'sin baseline')
            for citing, target, resolved, line in new_ones:
                print(f'  source/{citing}.rst:{line}')
                print(f'      :doc:`{target}`  ->  {resolved}  (no existe)')
        else:
            print('OK: 0 cita(s) :doc: que no aterrizan')
        inherited = len(broken) - len(new_ones)
        print(f'  (alcance medido: {measured} cita(s) en {len(files)} archivo(s); '
              f'{inherited} en baseline heredado)')

    return 1 if (strict and new_ones) else 0


if __name__ == '__main__':
    sys.exit(main())
