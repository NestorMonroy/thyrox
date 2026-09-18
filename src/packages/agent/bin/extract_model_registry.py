"""Delimita el catálogo de modelos del ejecutable vendorizado y lo emite como JSONL.

El ejecutable está minificado, así que el catálogo llega como un **literal de
objeto de JavaScript**, no como JSON: claves sin comillas, `!0`/`!1` en vez de
`true`/`false`, y `1e6` en vez de `1000000`. Este instrumento lo delimita por
**balanceo de llaves** desde su ancla —nunca con una ventana `.{0,N}?`— porque
un recorte a distancia fija salta la frontera del registro y engancha el
`pricing` del vecino: es el defecto de instrumento que :ref:`h-docs-218` midió
con N=1400 contra N=2000.

La salida es **JSON Lines**: un registro por línea, etiquetado con `kind`.
Cada línea se clasifica por lo que DICE, no por dónde está — ver `KIND_KEY`.

Salidas (en el directorio que se le indique):

  model_registry.jsonl — una `meta` + un `tier` por tier + un `model` por
                         registro, con su tier de precio ya RESUELTO a los
                         valores de `pricing_tiers`; claves ordenadas.
  aliases.jsonl        — una `meta` con `aliases` (y su mapa por proveedor),
                         `defaults`, `best`, `latest_per_family` y
                         `alias_migration`.

Uso:
    python3 extract_model_registry.py <ruta a claude_strings.txt> <dir salidas>
    python3 extract_model_registry.py <ruta a claude_strings.txt> --stdout

Promovido a ``bin/`` del paquete desde el evento
``catalogo-modelos-cache-20260902T045046`` (2026-09-02): el paquete lo consume
para regenerar y verificar ``src/models.jsonl``. El modo ``--stdout`` emite el
catálogo combinado —meta, tiers y modelos— en JSONL, que es lo que la suite
compara contra el archivo vendorizado. El defecto de :ref:`h-docs-1003` (``!0`` leído como
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
                bloque = texto[inicio:i + 1]
                # POSTCONDICIÓN: el bloque tiene que contener al ancla.
                #
                # El retroceso de arriba reconoce la llave cuyo carácter previo
                # está en `=(,[` — asignación, llamada, elemento de lista. Un
                # `return{…}` no está en ese conjunto, así que sigue retrocediendo
                # y aterriza en el registro ANTERIOR del texto. Medido sobre
                # 2.1.266: con el ancla `input_tokens:n.input_tokens!==null`
                # devolvía 1093 bytes del objeto de telemetría vecino.
                #
                # El arreglo no es enseñarle esa forma —eso ampliaría la
                # heurística a una más y dejaría las siguientes igual de mudas—
                # sino comprobar lo que este docstring ya promete. Devolver el
                # registro equivocado es peor que rehusar: quien lo recibe no
                # tiene cómo notar que mide otra cosa.
                return bloque if ancla in bloque else None
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


#: El sobre de cada linea. Es NUESTRO, no una clave del catalogo del
#: ejecutable: un lector que busque `kind` en el volcado del binario no lo
#: encontrara. Lo anade este extractor para que cada linea se clasifique por lo
#: que DICE y no por donde esta. Una cabecera por posicion —«la linea 1 es la
#: meta»— repetiria un nivel mas abajo el defecto que :ref:`h-thyrox-37`
#: registro: clasificar por el sitio en vez de por el contenido.
KIND_KEY = 'kind'

#: La version de NUESTRO contrato de salida, no la del catalogo horneado.
#:
#: Las dos convivian en la misma clave hasta la adopcion de JSONL, porque el
#: valor se copiaba de `catalogo['schema_version']`. Ahora la clave tiene un
#: solo referente —la forma en que ESTE extractor serializa— y la version de la
#: fuente la fija el ANCLA: lleva `schema_version:1` literal, asi que un
#: catalogo con otra version no casa y el extractor rehusa con exit 2 en vez de
#: emitir un documento que dice ser de una fuente que no leyo.
#:
#: Bumpea a 2 con JSONL porque un lector de la v1 hace `json.load` del archivo
#: entero y falla ante el nuevo: si la clave no cambiara, no podria discriminar
#: las dos formas — el verde que no discrimina aplicado al propio contrato.
OUTPUT_SCHEMA_VERSION = 2


def tagged_records(models_output, alias_output):
    """Las lineas JSONL del catalogo combinado: 1 `meta` + N `tier` + N `model`.

    Una clave de raiz **expande** a una linea por elemento cuando cada elemento
    es un registro con sentido propio; se queda dentro de `meta` cuando es una
    tabla de consulta que solo significa entera.

    - `models` expande: cada modelo se cita por su `id` y se lee solo.
    - `pricing_tiers` expande: un modelo lo cita por nombre (`pricing_tier`) y
      el tier existe sin el modelo.
    - `aliases` y `latest_per_family` se quedan en `meta`: una entrada suelta
      no dice a que proveedor pertenece sin su clave.
    - `fuente`, `best`, `defaults` y `alias_migration` se quedan: escalares y
      dicts vacios, cuya forma la decide su primer contenido.

    Derivacion del criterio: `.claude/workbench/
    adoptar-jsonl-censo-20260917T051111/forma-de-models-json.md`.
    """
    meta = {KIND_KEY: 'meta',
            'fuente': models_output['fuente'],
            'schema_version': OUTPUT_SCHEMA_VERSION,
            'best': alias_output['best'],
            'aliases': alias_output['aliases'],
            'defaults': alias_output['defaults'],
            'latest_per_family': alias_output['latest_per_family'],
            'alias_migration': alias_output['alias_migration']}
    registros = [meta]
    # El orden de los tiers es el de `sorted()` que `ordenar` ya impuso, y el de
    # los modelos es el del catalogo: los dos son estables entre ejecuciones,
    # que es lo que la comparacion byte a byte de la suite exige.
    for nombre, precios in models_output['pricing_tiers'].items():
        registros.append({KIND_KEY: 'tier', 'name': nombre, 'pricing': precios})
    for modelo in models_output['models']:
        fila = {KIND_KEY: 'model'}
        fila.update(modelo)
        registros.append(fila)
    return registros


def jsonl(registros):
    """Un registro por linea, sin sangria — es lo que hace legible el diff.

    `ensure_ascii=False` por la misma razon que en el resto del extractor: un
    identificador con acento se lee en el archivo, no como escape.
    """
    return ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in registros)


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

    registros = tagged_records(salida_modelos, salida_alias)

    if a_stdout:
        # Un registro por linea: es lo que `src/models.jsonl` vendoriza y lo
        # que la suite del paquete re-deriva para compararlo byte a byte.
        sys.stdout.write(jsonl(registros))
        return 0

    # Los dos archivos son el MISMO catalogo repartido, asi que llevan los
    # mismos registros etiquetados: el de modelos se queda con `meta` + tiers +
    # modelos, y el de alias con una `meta` propia.
    #
    # Su `meta` es UNA linea porque ninguna de sus claves cumple el criterio de
    # expansion: son tablas de consulta y escalares. La divergencia se declara
    # en vez de omitirse — sobre un archivo de una sola linea `json.load` del
    # entero pasa, asi que ese archivo NO sirve como control de que el lector
    # lea lineas. El control vive en el combinado, que tiene 28.
    meta_modelos = {KIND_KEY: 'meta',
                    'fuente': salida_modelos['fuente'],
                    'schema_version': OUTPUT_SCHEMA_VERSION}
    meta_alias = {KIND_KEY: 'meta'}
    meta_alias.update({k: salida_alias[k] for k in
                       ('fuente', 'aliases', 'defaults', 'best',
                        'latest_per_family', 'alias_migration')})
    meta_alias['schema_version'] = OUTPUT_SCHEMA_VERSION

    (destino / 'model_registry.jsonl').write_text(
        jsonl([meta_modelos] + [r for r in registros
                                if r[KIND_KEY] in ('tier', 'model')]))
    (destino / 'aliases.jsonl').write_text(jsonl([meta_alias]))

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
