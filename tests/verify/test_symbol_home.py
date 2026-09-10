#!/usr/bin/env python3
"""El nivel SITIO del porte, con los clasificadores de lado como parametro.

MITAD ROJA, medida 2026-09-09T22:38 antes de escribir el modulo: de los cuatro
niveles de verificacion de porte, 0 estaban bajo `thyrox/src`. El consumidor SI
mide, con denominador no trivial (`kaupamex-api: scripts/check_symbol_home.py`,
mismo turno):

    check_symbol_home: 0 fuera de sitio, 0 aceptadas
    (alcance medido: 129 de 254 clases; 122 sin contraparte, 3 ambiguas).

CONTROL POSITIVO — el defecto historico, no uno fabricado. La primera corrida
del gate en el consumidor publico **68 falsos positivos** por clasificar el
lado con el PRIMER directorio de la ruta: en el arbol de la fuente el addon
`base` vive bajo `odoo/addons/base/`, asi que todo lo nuestro bajo `addons/`
salia «declarado en el nucleo». El caso 4 reproduce ese par —clasificador
ingenuo contra clasificador correcto sobre el MISMO arbol— y exige que el
primero produzca el falso positivo y el segundo no.

Un test que solo probara el clasificador correcto pasaria igual con el
ingenuo dentro del modulo: el verde no distinguiria «el lado es parametro» de
«el lado se deriva mal aqui dentro».

CONTROL DE ANULACION: si `compare_homes` ignorara el lado de la fuente y diera
siempre «coincide», caen los casos 3.1 y 4.1 —los dos que exigen ver un
desacuerdo— y sobreviven los de reparto (sin contraparte, ambigua, impuesta),
que miden otra cosa. Ese contraste es la medicion.
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "symbol_home", HERE / "src" / "verify" / "symbol_home.py")
home = importlib.util.module_from_spec(spec)
spec.loader.exec_module(home)
reader = home.reader_module

OK = FALLOS = 0


def check(etiqueta, esperado, obtenido):
    global OK, FALLOS
    if esperado == obtenido:
        print(f"  ok    {etiqueta}"); OK += 1
    else:
        print(f"  FALLO {etiqueta}\n        esperado=[{esperado}]"
              f"\n        obtenido=[{obtenido}]"); FALLOS += 1


# --- los clasificadores: parametro del consumidor, declarados aqui ----------
def side_correct(parts):
    """Region de extension si la ruta ATRAVIESA un directorio `addons`."""
    return 'addons' if 'addons' in parts else 'core'


def side_naive(parts):
    """El defecto historico: el PRIMER directorio como criterio."""
    return 'addons' if parts and parts[0] == 'addons' else 'core'


def own_side(parts):
    """Nuestro lado. `None` en lo que no tiene lado que comparar."""
    if not parts:
        return None
    if parts[0] == 'orm':
        return 'core'
    if parts[0] == 'addons':
        return 'addons'
    return None


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    ref, own = raiz / "ref", raiz / "own"

    # La fuente: el addon `base` vive DENTRO del nucleo, que es la trampa.
    (ref / "odoo" / "addons" / "base" / "models").mkdir(parents=True)
    (ref / "odoo" / "orm").mkdir(parents=True)
    (ref / "addons" / "sparse" / "models").mkdir(parents=True)
    (ref / "odoo" / "addons" / "base" / "models" / "res_device.py").write_text(
        "class ResDevice:\n    pass\n")
    (ref / "odoo" / "orm" / "fields.py").write_text(
        "class Field:\n    pass\n"
        "class Registry:\n    pass\n")
    (ref / "addons" / "sparse" / "models" / "fields.py").write_text(
        "class Serialized:\n    pass\n")
    # Un nombre que la fuente declara en LOS DOS lados: no se desempata.
    (ref / "odoo" / "orm" / "module.py").write_text("class Module:\n    pass\n")
    (ref / "addons" / "sparse" / "models" / "module.py").write_text(
        "class Module:\n    pass\n")

    # Lo nuestro.
    (own / "orm").mkdir(parents=True)
    (own / "addons" / "base" / "models").mkdir(parents=True)
    (own / "config").mkdir(parents=True)
    # H-API-556: Serialized aterrizo en el nucleo y la fuente lo declara addon.
    (own / "orm" / "fields.py").write_text(
        "class Field:\n    pass\n"
        "class Serialized:\n    pass\n"
        "class Registry:\n"
        "    class Meta:\n        pass\n")
    (own / "addons" / "base" / "models" / "res_device.py").write_text(
        "class ResDevice:\n    pass\n")
    (own / "orm" / "module.py").write_text("class Module:\n    pass\n")
    (own / "orm" / "propio.py").write_text("class SoloNuestro:\n    pass\n")
    (own / "config" / "settings.py").write_text("class Settings:\n    pass\n")

    print("\n1. index_reference — el lado sale del clasificador que se pasa")
    idx = home.index_reference(ref, side_correct)
    check("el addon dentro del nucleo cuenta como addons", {'addons'},
          idx.get('ResDevice'))
    check("una clase del nucleo cuenta como core", {'core'}, idx.get('Field'))
    check("Serialized lo declara la region de extension", {'addons'},
          idx.get('Serialized'))
    check("un nombre en los dos lados trae los dos", {'core', 'addons'},
          idx.get('Module'))

    print("\n2. own_symbols — solo nivel superior, y solo con lado")
    propias = home.own_symbols(own, own_side)
    nombres = sorted(n for n, _s, _p in propias)
    check("la clase anidada NO entra", False, 'Meta' in nombres)
    check("lo que no tiene lado tampoco", False, 'Settings' in nombres)
    check("las cinco con lado si", ['Field', 'Module', 'Registry',
                                    'ResDevice', 'Serialized', 'SoloNuestro'],
          nombres)

    print("\n3. compare_homes — cuatro desenlaces, no dos")
    r = home.compare_homes(propias, idx, imposed={'Registry'})
    check("3.1 Serialized sale fuera de sitio", ['Serialized'],
          [p.name for p in r.out_of_place])
    check("y dice los dos lados", ('core', 'addons'),
          (r.out_of_place[0].ours, r.out_of_place[0].reference)
          if r.out_of_place else None)
    check("el que la fuente no declara: sin contraparte", 1,
          r.without_counterpart)
    check("el declarado en dos lados: ambigua", ['Module'],
          [n for n, _p in r.ambiguous])
    check("el nombre impuesto no entra al denominador", 5, r.total)
    check("y el denominador decidible descuenta ambas clases", 3, r.measured)

    print("\n4. CONTROL — el clasificador ingenuo produce el falso positivo")
    idx_ingenuo = home.index_reference(ref, side_naive)
    r_ingenuo = home.compare_homes(propias, idx_ingenuo, imposed={'Registry'})
    check("4.1 con el ingenuo, ResDevice sale fuera de sitio (FALSO)",
          True, 'ResDevice' in [p.name for p in r_ingenuo.out_of_place])
    check("4.2 con el correcto, NO sale", False,
          'ResDevice' in [p.name for p in r.out_of_place])

    print("\n5. el trinquete: una ubicacion aceptada no bloquea")
    r_acc = home.compare_homes(propias, idx, imposed={'Registry'},
                               accepted={'Serialized'})
    check("no queda fuera de sitio", 0, len(r_acc.out_of_place))
    check("pero SI se cuenta como aceptada", ['Serialized'],
          [p.name for p in r_acc.accepted])

# --- 6. el LECTOR es parametro: el nivel alcanza un arbol que no es Python --
#
# Correccion del ejecutor en este turno. `ui` declara sus simbolos en
# JavaScript y `_references/claude-code-bin/<build>/` en TypeScript: un nivel
# que solo sabe leer Python publica cero sobre ellos, y ese cero se lee como
# conformidad — el sub-patron D aplicado al alcance del instrumento.
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    (raiz / "ref" / "core").mkdir(parents=True)
    (raiz / "own" / "addons").mkdir(parents=True)
    (raiz / "ref" / "core" / "session.ts").write_text(
        "export class SessionStore {\n}\n")
    (raiz / "own" / "addons" / "session.ts").write_text(
        "export class SessionStore {\n}\n")
    TS = reader.PatternReader()

    print("\n6. CONTROL — el lector es PARAMETRO, no esta cableado a Python")
    idx_ts = home.index_reference(raiz / "ref", side_correct, TS)
    check("6.1 el indice ve la clase de TypeScript", {'core'},
          idx_ts.get('SessionStore'))
    propias_ts = home.own_symbols(raiz / "own", own_side, TS)
    check("6.2 y el arbol propio tambien", ['SessionStore'],
          [n for n, _s, _p in propias_ts])
    r_ts = home.compare_homes(propias_ts, idx_ts)
    check("6.3 el desacuerdo de lado sale igual que en Python",
          ['SessionStore'], [p.name for p in r_ts.out_of_place])
    # Con el lector de Python el MISMO arbol da cero: no es que no haya
    # desacuerdo, es que el lector no alcanza el archivo.
    idx_py = home.index_reference(raiz / "ref", side_correct,
                                  reader.AstReader())
    check("6.4 el lector de Python no indexa nada ahi", 0, len(idx_py))

print(f"\n{OK} ok, {FALLOS} fallos")
sys.exit(1 if FALLOS else 0)
