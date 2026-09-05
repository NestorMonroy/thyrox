#!/usr/bin/env python3
"""Gate — la ruta de un addon de la referencia se pide, no se compone.

Community reparte sus addons en DOS raices: ``addons/`` y ``odoo/addons/``.
``base`` —el addon del que depende todo el porte— y los ``test_*`` viven en la
segunda. ``api: scripts/reference_roots.py`` lo declara una vez y ofrece
``addons_de(alias)`` y ``addon_root(addon, alias)``; quien compone la ruta a
mano cae en una de dos formas, y las dos ya costaron:

1. **UNA sola raiz** — ``tree(alias) / 'addons' / addon``. Declara ausente lo
   que si existe, y su mensaje lo llama *"no existe en la referencia"*: el
   instrumento describe donde miro y lo presenta como un hecho sobre la
   fuente. Es el sub-patron D de ``metrica-decide-la-conclusion.md``.
   Medido en el episodio: ``base`` invisible, 1007 simbolos sin comparar.

2. **La lista DUPLICADA** — ``('addons', 'odoo/addons')`` escrito otra vez.
   Hoy da el mismo resultado y por eso pasa desapercibido; manana la
   referencia se reorganiza, ``reference_roots`` se corrige en un sitio y
   estas copias se quedan atras sin que nada lo delate. Es la segunda fuente
   de verdad que ``calibration-verified-numbers.md`` prohibe.

El gate mide la SEGUNDA forma, que es sintactica y por tanto decidible. La
primera se deduce de ella: un archivo que compone contra una raiz de arbol y
NO consulta la API queda marcado igual.

*Metrica:* archivos ``.py`` que nombran ``reference_roots`` y componen una
ruta de addon sin llamar ``addons_de()`` ni ``addon_root()``.
*Ciega a:* un guion que reciba la raiz por argumento o por entorno y la
componga sin nombrar ``reference_roots`` — no hay import que lo delate. Es
una cota inferior.
"""
import argparse
import ast
import os
import pathlib
import re
import sys

#: Las raices que se barren. Cada una con su repo, para que el reporte diga
#: donde vive el incumplidor sin que quien lo lea tenga que adivinarlo.
DEFAULT_ROOTS = (
    'kaupamex-api/scripts',
    'kaupamex-docs/.claude/scripts',
    'kaupamex-docs/.claude/eventos',
    'kaupamex-docs/.claude/hooks',
)

#: El modulo que declara las raices. Un archivo que no lo nombre queda fuera
#: del alcance: sin import no hay nada que este gate pueda afirmar.
MODULE = 'reference_roots'

#: La API correcta. Llamar a cualquiera de las dos exime al archivo.
CORRECT_API = ('addons_de', 'addon_root')

#: La lista duplicada, en las tres formas medidas en el arbol.
DUPLICATED = re.compile(
    r"""'odoo/addons'|"odoo/addons"|/\s*'odoo'\s*/\s*'addons'"""
)

#: Composicion contra una raiz de arbol: ``<algo>('odoo19c') / 'addons'`` o la
#: variable que lo guarda. El nombre de la variable no se fija —el arbol usa
#: ``ODOO19C`` y ``raiz``— asi que se busca la FORMA, no el identificador.
COMPOSES = re.compile(
    r"""(?:tree|require)\(\s*['"]odoo1[89][ce]['"]\s*\)\s*/\s*['"]addons['"]"""
    r"""|[A-Za-z_][A-Za-z_0-9]*\s*/\s*['"]addons['"]\s*/"""
    r"""|os\.path\.join\(\s*[A-Za-z_][A-Za-z_0-9]*\s*,\s*addon\s*\)"""
)


def calls_correct_api(source):
    """¿El archivo llama a ``addons_de`` o a ``addon_root``? Por AST.

    Se mide la LLAMADA, no el import: un archivo puede importar ``addons_de``
    y no usarla nunca —ocurrio, y por eso este gate existe—, y entonces el
    import no exime de nada.
    """
    try:
        arbol = ast.parse(source)
    except SyntaxError:
        return False
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, ast.Call):
            continue
        f = nodo.func
        nombre = getattr(f, 'id', None) or getattr(f, 'attr', None) or ''
        if nombre.lstrip('_') in CORRECT_API:
            return True
    return False


def offenders(roots, skip_control=True):
    """Los incumplidores y el universo medido, en ese orden.

    ``skip_control`` sólo rige el barrido POR OMISION. Cuando quien llama
    nombra la raiz —la suite, al probar contra los positivos reales— se mide
    lo que pidió: un gate que se negara a mirar donde se le apunta no se
    podria probar, y entonces su verde no distinguiria «no hay defectos» de
    «no miré».
    """
    fuera, medidos = [], 0
    for raiz in roots:
        base = pathlib.Path(raiz)
        if not base.is_dir():
            continue
        for archivo in sorted(base.rglob('*.py')):
            # El propio gate CITA el anti-patron en su docstring y en sus
            # patrones; medirse a si mismo lo marcaria por hablar de el. Es
            # el mismo defecto que `redaccion-tecnica-es.md` describe: el
            # instrumento ve el significante y no el significado.
            if archivo.resolve() == pathlib.Path(__file__).resolve():
                continue
            # Los positivos de control viven en `<evento>/control/`: son
            # copias REALES de git de las versiones defectuosas, y existen
            # para que la suite pueda demostrar que el gate discrimina. Un
            # gate que se pusiera rojo por su propia evidencia obligaria a
            # borrarla, que es como se pierde la prueba de que sirve.
            if skip_control and 'control' in archivo.parts:
                continue
            texto = archivo.read_text(encoding='utf-8', errors='replace')
            if MODULE not in texto or archivo.name == f'{MODULE}.py':
                continue
            medidos += 1
            if calls_correct_api(texto):
                continue
            if DUPLICATED.search(texto):
                fuera.append((archivo, 'DUPLICA la lista de raices'))
            elif COMPOSES.search(texto):
                fuera.append((archivo, 'compone contra UNA raiz'))
    return fuera, medidos


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raices', nargs='*', default=None,
                    help='raices a barrer; por omision las cuatro del arbol')
    ap.add_argument('--strict', action='store_true',
                    help='exit 1 si hay incumplidores')
    ap.add_argument('--quiet', action='store_true',
                    help='solo el conteo, para consumo del audit')
    args = ap.parse_args(argv)

    raices = args.raices or [
        os.path.join(os.environ.get('KAUPAMEX_ROOT', '/home/user'), r)
        for r in DEFAULT_ROOTS
    ]
    fuera, medidos = offenders(raices, skip_control=not args.raices)
    if args.quiet:
        print(len(fuera))
        return 1 if (args.strict and fuera) else 0
    for archivo, motivo in fuera:
        print(f'  {archivo}')
        print(f'      {motivo} — usar reference_roots.addons_de() o addon_root()')
    print(f'check-reference-root-resolution: {len(fuera)} incumplidor(es) '
          f'(alcance medido: {medidos} archivo(s) que nombran {MODULE})')
    return 1 if (args.strict and fuera) else 0


if __name__ == '__main__':
    sys.exit(main())
