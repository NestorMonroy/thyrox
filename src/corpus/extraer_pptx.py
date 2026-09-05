#!/usr/bin/env python3
"""Vuelca el texto de un ``.pptx`` a texto plano, diapositiva por diapositiva.

Un ``.pptx`` es un ZIP de XML: cada diapositiva es un ``ppt/slides/slideN.xml``
y sus notas viven aparte, en ``ppt/notesSlides/notesSlideM.xml``. **N y M no
coinciden** — la correspondencia está en el ``.rels`` de cada diapositiva, y
leerla es la única forma de no atribuir a una diapositiva las notas de otra.

Sale a stdout, o al archivo que se le indique. No interpreta el contenido: lo
vuelca entero para que quien lo lea decida qué es relevante. Comprimir aquí
sería elegir qué NO se analiza — la carga de la prueba es del lector, no del
extractor.
"""

import argparse
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

#: Espacio de nombres de DrawingML — donde viven los párrafos y los tramos
#: de texto de una diapositiva.
DRAWING_ML = '{http://schemas.openxmlformats.org/drawingml/2006/main}'

SLIDE = re.compile(r'ppt/slides/slide(\d+)\.xml$')
NOTES = re.compile(r'ppt/notesSlides/notesSlide(\d+)\.xml$')


def paragraphs(archive, name):
    """Los párrafos con texto de una parte del paquete, en orden de lectura.

    Un párrafo se reconstruye juntando sus tramos: el formato parte una frase
    en varios ``<a:t>`` cuando cambia la negrita o el color, y leerlos sueltos
    devolvería la frase troceada.
    """
    root = ET.fromstring(archive.read(name))
    out = []
    for para in root.iter(DRAWING_ML + 'p'):
        text = ''.join(run.text or '' for run in para.iter(DRAWING_ML + 't'))
        if text.strip():
            out.append(text)
    return out


def notes_of(archive, slide):
    """El número de la parte de notas que corresponde a esta diapositiva.

    Se resuelve por el ``.rels``, no por el ordinal del nombre: las dos
    numeraciones son independientes.
    """
    rels = f'ppt/slides/_rels/{os.path.basename(slide)}.rels'
    if rels not in archive.namelist():
        return None
    for rel in ET.fromstring(archive.read(rels)):
        target = rel.get('Target', '')
        if 'notesSlide' in target:
            found = re.search(r'(\d+)\.xml', target)
            if found:
                return int(found.group(1))
    return None


def dump(path):
    archive = zipfile.ZipFile(path)
    slides = sorted(
        (n for n in archive.namelist() if SLIDE.match(n)),
        key=lambda n: int(SLIDE.match(n).group(1)))
    notes = {int(NOTES.match(n).group(1)): paragraphs(archive, n)
             for n in archive.namelist() if NOTES.match(n)}

    lines = []
    for slide in slides:
        lines.append(f'\n===== {os.path.basename(slide)} =====')
        lines.extend(paragraphs(archive, slide))
        which = notes_of(archive, slide)
        if which in notes:
            lines.append('--- NOTAS ---')
            lines.extend(notes[which])
    return lines, len(slides), len(notes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pptx')
    parser.add_argument('-o', '--salida', default=None)
    args = parser.parse_args()

    if not os.path.isfile(args.pptx):
        print(f'extraer-pptx: no existe {args.pptx}', file=sys.stderr)
        return 2

    lines, n_slides, n_notes = dump(args.pptx)
    text = '\n'.join(lines)
    if args.salida:
        with open(args.salida, 'w') as handle:
            handle.write(text)
        print(f'extraer-pptx: {n_slides} diapositiva(s) · {n_notes} con notas '
              f'· {len(text)} bytes → {args.salida}')
    else:
        print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
