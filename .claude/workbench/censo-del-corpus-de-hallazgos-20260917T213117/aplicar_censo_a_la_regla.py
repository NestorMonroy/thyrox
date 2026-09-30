#!/usr/bin/env python3
"""Retira de la regla las cifras que son propiedad de un corpus vivo.

Cada sustitucion se declara aqui con su clase, y el guion REHUSA si alguna no
aterriza: aplicar 5 de 7 en silencio dejaria la regla a medias con el guion
publicando exito — el sub-patron D con el propio editor como sujeto.

La clase de cada cifra NO es la misma, y por eso no se barre por patron:

- **evidencia fechada de un episodio** — se QUEDA. El 2026-08-03 midio dos
  monolitos para justificar una decision; ese momento no cambia.
- **propiedad de un artefacto vivo** — se RETIRA y la prosa nombra el comando.
"""
from __future__ import annotations

import pathlib
import sys

RULE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1
                    else '.claude/rules/hallazgos-documentacion-obligatoria.md')

EDITS: list[tuple[str, str, str]] = [
    (
        'monolitos: el tamano es del corpus, la DECISION es fechada',
        """> hallazgos. Eso produjo dos monolitos: `hallazgos-adaptar-familias-odoo-monolito-modular.rst`
> con **199 hallazgos en 8369 lineas / 472 KB**, y
> `hallazgos-implementar-o2c-catalogo-a-venta.rst` con 295 KB — mientras el
> tercer archivo mas grande baja a 37 KB (medido sobre los 189 `hallazgos-*.rst`
> del repo). La mediana por hallazgo es de **32 lineas**: leer 472 KB para
> recuperar 32 es el costo que esta regla ahora elimina.""",
        """> hallazgos. Eso produjo dos monolitos —`hallazgos-adaptar-familias-odoo-monolito-modular.rst`
> y `hallazgos-implementar-o2c-catalogo-a-venta.rst`— cuyo tamano dejaba en
> ridiculo al de un hallazgo suelto: leer un archivo entero para recuperar uno
> es el costo que esta regla elimina.
>
> **Sus cifras NO se transcriben aqui.** Son propiedad de un corpus que crece, y
> `calibration-verified-numbers.md` lo prohibe por su corolario —*si el numero lo
> produce un comando, la prosa nombra el comando*—. El comando esta abajo, en
> «El censo».""",
    ),
    (
        'proporcion de la triple declaracion',
        """Medido sobre 511 hallazgos: **448 (88 %)** ya lo cumplen — es la convencion
dominante, no una invencion. Las dos piezas que la hacen mecanica:""",
        """La coherencia es la convencion **dominante**, no una invencion: su proporcion
y su denominador los publica el censo al correr (ver «El censo»), no esta prosa.
Las dos piezas que la hacen mecanica:""",
    ),
    (
        'reparto por raiz y denominador del gate',
        """```text
hallazgos por raiz     api 697 · docs 643 · THYROX 31 · server 18 · db 9 · ui 1
prefijos en uso        H-API · H-DOCS · H-THYROX · H-SERVER · H-DB · H-UI
los 31 H-THYROX        0 incoherentes (sus tres declaraciones coinciden)
denominador del gate   1399  ->  los 31 SIEMPRE estuvieron dentro
```""",
        """El censo lo publica en dos ejes —por **prefijo del ID** y por **raiz de la
ruta**— y `H-THYROX` aparece en los dos con los otros cinco. Las cifras no se
copian aqui: son propiedad de un corpus que crece. Ver «El censo».""",
    ),
    (
        'cuantos hallazgos del cliente aloja una iniciativa',
        """  eso vive en `docs`. Precedente medido: la iniciativa `construir-harness-propio`
  aloja **67** hallazgos de esa clase. Ya no es la unica: ver la contradiccion
  abierta de abajo, que hoy alcanza a **tres** iniciativas de `pm/thyrox`.""",
        """  eso vive en `docs`. Precedente: la iniciativa `construir-harness-propio` aloja
  hallazgos de esa clase — cuantos, y en cuantas iniciativas de `pm/thyrox`, lo
  publica el censo (ver «El censo»). Ver tambien la contradiccion abierta de
  abajo.""",
    ),
    (
        'hallazgos fuera de un hallazgos/ y el prefijo H-E2E',
        """**Y el prefijo NO se inventa por dominio.** Medido 2026-09-17T02:06:51: el arbol tiene ocho
hallazgos fuera de un subdirectorio `hallazgos/`, cuatro de ellos con un
prefijo `H-E2E` que ningun gate mide — ese si es inventado por dominio, no por
raiz de trabajo. Su triaje es **TASK-DOCS-0554**; hasta que se decida, un
hallazgo nuevo usa una de las seis.""",
        """**Y el prefijo NO se inventa por dominio.** Un `H-E2E` nombra un dominio de
prueba, no una raiz de trabajo, y ningun gate lo mide. Cuantos hallazgos viven
hoy fuera de un subdirectorio `hallazgos/` lo publica el censo en su ultima
linea — no esta prosa, que ya publico un ocho que a las horas era otro numero.
Hasta que un prefijo inventado se decida, un hallazgo nuevo usa una de las seis.""",
    ),
]

SECTION = """
## El censo — las cifras de este corpus las publica un comando, no esta regla

`calibration-verified-numbers.md` separa dos usos de un numero y solo uno
driftea. Una cifra de este corpus —cuantos hallazgos hay, como se reparten por
prefijo y por raiz, que proporcion cumple la triple declaracion, cuanto pesa un
monolito— es **propiedad de un artefacto vivo**: correcta el dia que se midio y
falsa a la semana, sin que nadie toque el documento.

```bash
T="${THYROX_ROOT:-/home/user/thyrox}"
python3 "$T/src/hallazgo/census_findings.py"            # el censo, con su denominador
python3 "$T/src/hallazgo/census_findings.py" --json     # legible por maquina
python3 "$T/src/hallazgo/census_findings.py" --root R   # otro corpus
```

Se invoca con el cwd puesto en el CONSUMIDOR: la raiz por defecto es
`source/gestion/pm`, y el mecanismo vive en el proveedor. **No lleva dentro
ninguna lista cerrada** de prefijos ni de raices —los deriva del nombre y de la
ruta— asi que un consumidor con un prefijo que este arbol nunca vio aparece
igual. Su control de anulacion es exactamente ese caso: con una lista cerrada
caen las aserciones del prefijo inedito y ninguna otra
(`thyrox: tests/hallazgo/test_census_findings.py`).

Y **rehusa con exit 2** si la raiz no existe, en vez de publicar un cero: un 0
ahi no distinguiria «corpus vacio» de «no pude medir».

*Metrica:* archivos `hallazgo-*.rst` bajo un directorio `hallazgos/` de la raiz
dada; su prefijo, su raiz de ruta y su clave `:submodulo:`.
*Ciega a:* el `:estado:` de cada hallazgo, que es otro eje; un monolito que no
siga el nombre `hallazgos-*.rst`; y un hallazgo cuyo cuerpo contradiga sus tres
declaraciones — las tres son metadata, no contenido.

"""

ANCHOR = '## Template B — archivo de un hallazgo'


def main() -> int:
    text = RULE.read_text(encoding='utf-8')
    missing = [label for label, old, _ in EDITS if old not in text]
    if missing:
        print('REHUSA — estas sustituciones no aterrizan; la regla cambio:',
              file=sys.stderr)
        for m in missing:
            print(f'  - {m}', file=sys.stderr)
        print('  NO se aplica ninguna: media edicion deja la regla incoherente.',
              file=sys.stderr)
        return 2
    if ANCHOR not in text:
        print(f'REHUSA — no se encontro el ancla {ANCHOR!r}.', file=sys.stderr)
        return 2

    for label, old, new in EDITS:
        text = text.replace(old, new, 1)
        print(f'  aplicada: {label}')

    if '## El censo —' not in text:
        text = text.replace(ANCHOR, SECTION.lstrip('\n') + ANCHOR, 1)
        print('  aplicada: seccion «El censo»')

    RULE.write_text(text, encoding='utf-8')
    print(f'{RULE}: {len(EDITS)} sustitucion(es) + 1 seccion')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
