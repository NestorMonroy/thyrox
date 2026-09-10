"""Delimita el catálogo de modelos del ejecutable vendorizado y lo emite como JSON.

El ejecutable está minificado, así que el catálogo llega como un **literal de
objeto de JavaScript**, no como JSON: claves sin comillas, `!0`/`!1` en vez de
`true`/`false`, y `1e6` en vez de `1000000`. Este instrumento lo delimita por
**balanceo de llaves** desde su ancla —nunca con una ventana `.{0,N}?`— porque
un recorte a distancia fija salta la frontera del registro y engancha el
`pricing` del vecino: es el defecto de instrumento que :ref:`h-docs-218` midió
con N=1400 contra N=2000.

Salidas (en el directorio que se le indique):

  model_registry.json  — los registros, con su tier de precio ya RESUELTO a los
                         seis valores de `pricing_tiers`; claves ordenadas.
  aliases.json         — `aliases` (con su mapa por proveedor), `defaults`,
                         `best`, `latest_per_family` y `alias_migration`.

Uso:
    python3 extract_model_registry.py <ruta a claude_strings.txt> <dir salidas>
    python3 extract_model_registry.py <ruta a claude_strings.txt> --stdout

Promovido a ``bin/`` del paquete desde el evento
``catalogo-modelos-cache-20260902T045046`` (2026-09-02): el paquete lo consume
para regenerar y verificar ``src/models.json``. El modo ``--stdout`` emite un
solo JSON con registros, tiers y alias, que es lo que la suite compara contra
el archivo vendorizado. El defecto de :ref:`h-docs-1003` (``!0`` leído como
``false``) ya está corregido aquí.
"""
import json
import pathlib
import re
import sys

# El ancla es la cabecera del catálogo horneado. Sobrevive a la minificación
# porque `schema_version` y `pricing_tiers` son claves del contrato del archivo
# de datos, no identificadores que el minificador pueda renombrar.
ANCLA = 'schema_version:1,pricing_tiers:{'


def bloque_balanceado(texto, ancla, abre='{', cierra='}'):
    """Devuelve el bloque `abre…cierra` balanceado que CONTIENE al ancla.

    Devuelve ``None`` si el ancla no está o si el bloque no cierra dentro del
    texto. Rehusar es el comportamiento correcto: un recorte al tope se leería
    como un catálogo completo y publicaría un conteo falso.
    """
    pos = texto.find(ancla)
    if pos < 0:
        return None
    # El objeto abre ANTES del ancla (`var R8t={"//":…,schema_version:1,…`).
    # Se retrocede hasta la llave que lo abre, contando hacia atrás.
    inicio = texto.rfind('{', 0, pos)
    while inicio > 0 and texto[inicio - 1] not in '=(,[':
        inicio = texto.rfind('{', 0, inicio)
    if inicio < 0:
        return None

    profundidad = 0
    comilla = ''
    escapado = False
    for i in range(inicio, len(texto)):
        c = texto[i]
        if escapado:
            escapado = False
            continue
        if c == '\\':
            escapado = True
            continue
        if comilla:
            if c == comilla:
                comilla = ''
            continue
        if c in '"\'`':
            comilla = c
            continue
        if c == abre:
            profundidad += 1
        elif c == cierra:
            profundidad -= 1
            if profundidad == 0:
                return texto[inicio:i + 1]
    return None


def js_a_json(bloque):
    """Convierte un literal de objeto de JS al JSON equivalente.

    Ciega a: cualquier construcción que no sea un literal de datos — una
    llamada a función, una plantilla o una expresión dentro del objeto rompen
    el `json.loads` posterior en vez de producir un dato equivocado, que es el
    modo de fallo que se quiere.
    """
    salida = []
    comilla = ''
    escapado = False
    i = 0
    n = len(bloque)
    while i < n:
        c = bloque[i]
        if comilla:
            salida.append(c)
            if escapado:
                escapado = False
            elif c == '\\':
                escapado = True
            elif c == comilla:
                comilla = ''
            i += 1
            continue
        if c == '"':
            comilla = c
            salida.append(c)
            i += 1
            continue
        # `!0` / `!1` — la forma minificada de true / false.
        if c == '!' and i + 1 < n and bloque[i + 1] in '01':
            salida.append('false' if bloque[i + 1] == '1' else 'true')
            i += 2
            continue
        # Clave sin comillas: identificador seguido de ':'.
        m = re.match(r'([A-Za-z_$][A-Za-z0-9_$]*)\s*:', bloque[i:])
        if m and (not salida or salida[-1] in '{,'):
            salida.append(json.dumps(m.group(1)) + ':')
            i += m.end()
            continue
        # Notación exponencial: `1e6` no es JSON válido en todos los lectores,
        # pero sí lo es en `json.loads`; se deja tal cual.
        salida.append(c)
        i += 1
    return ''.join(salida)


def ordenar(valor):
    """Ordena las claves de todo diccionario, en profundidad.

    La salida tiene que ser **estable entre ejecuciones**: el paquete la
    consume como fuente de `src/models.ts`, y un diff que cambie por el orden
    de iteración mide el paso del tiempo en vez del cambio del catálogo.
    """
    if isinstance(valor, dict):
        return {k: ordenar(valor[k]) for k in sorted(valor)}
    if isinstance(valor, list):
        return [ordenar(v) for v in valor]
    return valor


def main(argv):
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    ruta = pathlib.Path(argv[1])
    a_stdout = argv[2] == '--stdout'
    destino = None if a_stdout else pathlib.Path(argv[2])
    if not ruta.is_file():
        print(f'ERROR — no existe el volcado {ruta}. NO se emite conteo: '
              'un 0 aquí sería un verde falso.', file=sys.stderr)
        return 2
    if destino is not None:
        destino.mkdir(parents=True, exist_ok=True)

    texto = ruta.read_text(errors='ignore')
    bloque = bloque_balanceado(texto, ANCLA)
    if bloque is None:
        print('ERROR — el ancla no cierra dentro del volcado. Sin veredicto.',
              file=sys.stderr)
        return 2

    try:
        catalogo = json.loads(js_a_json(bloque))
    except json.JSONDecodeError as exc:
        print(f'ERROR — el bloque delimitado no es un literal de datos: {exc}',
              file=sys.stderr)
        return 2

    tiers = catalogo.get('pricing_tiers', {})
    modelos = []
    for registro in catalogo.get('models', []):
        fila = dict(registro)
        tier = registro.get('pricing')
        # El tier se resuelve aquí y no en el consumidor: `ukn()` del ejecutable
        # hace exactamente esto (`pricing_tiers[entry.pricing]`), y dejarlo sin
        # resolver obligaría al paquete a reimplementar esa indirección.
        if isinstance(tier, str):
            fila['pricing_tier'] = tier
            fila['pricing'] = tiers.get(tier)
        else:
            fila['pricing_tier'] = None
        modelos.append(ordenar(fila))

    # La fuente se registra desde `_references/` para que el JSON sea el mismo
    # se invoque con ruta absoluta o relativa: la suite del paquete compara
    # byte a byte y una ruta distinta la haría caer sin que cambie el catálogo.
    #
    # El ancla decía `tools/`, que era el hogar del corpus antes de mudarlo a
    # `_references/`. Un ancla que ya no casa no falla: deja pasar la ruta
    # entera, así que una invocación absoluta incrustaba `/home/user/...` en un
    # artefacto versionado y rompía la comparación byte a byte sin que el
    # catálogo hubiera cambiado.
    CORPUS_ANCHOR = '_references/'
    fuente = str(ruta)
    if CORPUS_ANCHOR in fuente:
        fuente = fuente[fuente.index(CORPUS_ANCHOR):]

    salida_modelos = ordenar({
        'fuente': fuente,
        'schema_version': catalogo.get('schema_version'),
        'pricing_tiers': tiers,
        'models': None,
    })
    salida_modelos['models'] = modelos      # se preserva el orden del catálogo

    salida_alias = ordenar({
        'fuente': fuente,
        'aliases': catalogo.get('aliases', {}),
        'defaults': catalogo.get('defaults', {}),
        'best': catalogo.get('best'),
        'latest_per_family': catalogo.get('latest_per_family', {}),
        'alias_migration': catalogo.get('alias_migration', {}),
    })

    if a_stdout:
        # Un solo documento, claves ordenadas donde el orden no significa nada
        # (los registros conservan el del catálogo): es lo que `src/models.json`
        # vendoriza y lo que la suite del paquete re-deriva para compararlo.
        combinado = dict(salida_modelos)
        combinado.update({k: salida_alias[k] for k in
                          ('aliases', 'defaults', 'best', 'latest_per_family',
                           'alias_migration')})
        print(json.dumps(combinado, indent=2, ensure_ascii=False))
        return 0

    (destino / 'model_registry.json').write_text(
        json.dumps(salida_modelos, indent=2, ensure_ascii=False,
                   sort_keys=False) + '\n')
    (destino / 'aliases.json').write_text(
        json.dumps(salida_alias, indent=2, ensure_ascii=False) + '\n')

    print(f'volcado: {ruta}')
    print(f'bloque:  {len(bloque)} caracteres, cerrado por balanceo')
    print(f'tiers de precio: {len(tiers)}')
    print(f'modelos: {len(modelos)}')
    sin_tier = [m['id'] for m in modelos if m['pricing_tier'] is None]
    print(f'modelos sin tier nombrado: {len(sin_tier)} {sin_tier}')
    for m in modelos:
        p = m.get('pricing') or {}
        print(f"  {m['id']:<22} {m.get('family','?'):<7} "
              f"{str(m.get('pricing_tier')):<28} "
              f"in={p.get('input')} out={p.get('output')} cr={p.get('cache_read')}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
