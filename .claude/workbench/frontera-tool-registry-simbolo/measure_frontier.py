#!/usr/bin/env python3
"""Frontera de tool-registry medida por SIMBOLO, no por especificador.

El instrumento anterior media si `@thyrox/agent/hooks.js` RESUELVE, y de
ahi concluia que un util estaba libre. Medir el significante (¿resuelve el
modulo?) y concluir sobre el significado (¿existe el simbolo?) es el
sub-patron C, y publico un falso «libre» para TaskCreateTool: ese modulo
resuelve y no exporta `executeTaskCreatedHooks`.

Y hay una segunda ceguera, medida al estrenarlo: publico 12 libres, de
los cuales NUEVE eran stubs de la propia `ccnmt` —«Auto-generated stub —
replace with real implementation», cuerpo vacio— y un decimo no tenia ni
un `.ts`. Un stub resuelve todos sus imports porque no importa nada, asi
que para un instrumento que mide resolucion es «libre» sin tener nada que
portar. Es el sub-patron C dentro del propio medidor: se midio la
resolucion de importaciones y se concluyo sobre la existencia de codigo.
Desde esa version un util sin ningun archivo con cuerpo real se clasifica
`SIN CUERPO`, aparte de libres y bloqueados.

Las CUATRO ceguera de esta version, y por que las cuatro empujan al mismo lado
------------------------------------------------------------------------------

Las cuatro sesgaban el veredicto hacia «BLOQUEADO», asi que el «LIBRES: 0»
de la corrida anterior era un artefacto del medidor y no una medicion:

1. **Un export SOLO DE TIPO se borra al transpilar**, asi que la sonda de
   runtime (`n in m` sobre el modulo cargado) lo reporta ausente SIEMPRE.
   Medido: `@thyrox/permission` reexporta `PermissionResult`, y su
   declaracion es `export type PermissionResult<` en `permissionTypes.ts`.
   Desde esta version cada simbolo se busca por DOS canales —runtime y
   lectura estatica de la fuente del puerto— y basta con que uno lo halle.

2. **Los archivos del PROPIO util se contaban como bloqueadores.** Un util
   multi-archivo importa `./prompt.js`, que por definicion todavia no esta
   en el puerto: se bloqueaba a si mismo. Un `./x` del mismo directorio es
   la unidad de trabajo; solo `../Otro/x` es un bloqueo real.

3. **Un especificador npm pelado pasaba sin medirse** (`'/' not in origen`),
   asi que `figures` o `ripgrep-napi` se daban por instalados. Ahora se
   sondean de verdad.

4. **Un import de npm SOLO DE TIPO no bloquea en runtime.** Medido sobre
   `ccnmt/packages/tool-registry`: 28 archivos mencionan `@anthropic-ai/sdk`
   y **una sola** sentencia importa un valor (`APIUserAbortError` en
   `tools/BashTool/bashPermissions.ts`); las otras 27 son `import type` y
   desaparecen al transpilar. Clasificar el paquete entero como bloqueador
   es la misma confusion significante/significado del punto 1, un nivel mas
   arriba. Un paquete npm ausente pero usado solo como tipo se reporta
   `AUSENTE-SOLO-TIPO`, que no bloquea.

Metrica: por cada directorio de util de la fuente sin contraparte en el
puerto, si tiene cuerpo real; y si lo tiene, sus importaciones locales
—separadas en mismo-util y cruza-util—, sus importaciones de paquete
hermano descompuestas en simbolos (¿existe cada nombre, por runtime o por
fuente?), y sus paquetes npm (¿resuelve?, ¿lo usa como valor o solo como
tipo?).
Ciega a: un simbolo que exista con el nombre correcto y otra firma o otra
conducta; a las importaciones que un util haga por `require` dinamico; a
`bun:bundle`, que se trata aparte por tener sustituto declarado; a un util
cuyo cuerpo exista y sea un placeholder sin el marcador literal —el
discriminador de stub es esa cadena, no un juicio sobre el contenido—; y,
en el canal estatico de simbolos, a una reexportacion `export *` con mas de
un salto de profundidad.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

FUENTE = Path('/home/user/claude-code-nestor-monroy-tools/packages/tool-registry/src')
PUERTO = Path('/home/user/thyrox/src/packages/tool-registry/src')
RAIZ_PAQUETES = Path('/home/user/thyrox/src/packages')
ALCANCE_FUENTE = '@claude-code-how-works/'
ALCANCE_PUERTO = '@thyrox/'
# Tiene sustituto declarado en internal/pendingCrossPackageDeps.ts.
CON_SUSTITUTO = {'bun:bundle'}
# El literal con que `ccnmt` marca un archivo sin implementar.
MARCA_DE_STUB = 'Auto-generated stub'
# Modulos del runtime: nunca son un bloqueo de porte.
INTEGRADOS = {'node:', 'bun:'}

IMPORT = re.compile(
    r"import\s+(?P<solo_tipo>type\s+)?(?P<clausula>\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)"
    r"\s+from\s+'(?P<origen>[^']+)'",
    re.S,
)


def simbolos(clausula: str) -> list[str]:
    """Los nombres importados; el alias local no cuenta, cuenta el de origen."""
    llaves = re.search(r'\{(.*)\}', clausula, re.S)
    if not llaves:
        return []
    fuera = []
    for pieza in llaves.group(1).split(','):
        pieza = pieza.strip().removeprefix('type ').strip()
        if not pieza:
            continue
        fuera.append(pieza.split(' as ')[0].strip())
    return fuera


def tiene_cuerpo(archivos: list[Path]) -> bool:
    """Si al menos un archivo del util es codigo real y no un stub marcado.

    Un directorio sin ningun `.ts`/`.tsx` tampoco tiene cuerpo: su unico
    contenido es `.js` compilado, que no es la fuente que se porta.
    """
    return any(MARCA_DE_STUB not in f.read_text() for f in archivos)


def clase_local(desde: Path, propios: set[Path], origen: str) -> str:
    """Clasifica un import relativo: presente, mismo-util o cruza-util.

    Ceguera corregida (2): los archivos del PROPIO util no son un bloqueo —
    son la unidad de trabajo. Solo un `../Otro/x` que el puerto no tenga lo es.

    Ceguera 5, corregida al estrenar el modo `--root`: la pertenencia se decide
    contra el CONJUNTO DE ARCHIVOS de la unidad, no contra un directorio. Con
    el directorio, un modulo de raiz tomaba `FUENTE` como «lo propio» y se
    tragaba como suyos los 16 imports de `./tools/**` que `toolConstants.ts`
    hace — publicandolo LIBRE con 16 archivos ausentes. Es el mismo defecto
    que las cuatro anteriores, en direccion contraria: sesgaba a «libre».
    """
    rel = (desde.parent / origen).resolve()
    candidatos = {rel, rel.with_suffix('.ts'), rel.with_suffix('.tsx'),
                  Path(str(rel).removesuffix('.js') + '.ts'),
                  Path(str(rel).removesuffix('.js') + '.tsx')}
    dentro_del_util = bool(candidatos & propios)
    if not (FUENTE in rel.parents):
        return 'fuera-del-arbol'
    base = PUERTO.parent / rel.relative_to(FUENTE.parent)
    for cand in (base, base.with_suffix('.ts'), base.with_suffix('.tsx'),
                 Path(str(base).removesuffix('.js') + '.ts'),
                 Path(str(base).removesuffix('.js') + '.tsx')):
        if cand.is_file():
            return 'presente'
    return 'mismo-util' if dentro_del_util else 'cruza-util'


def archivo_del_modulo(spec: str) -> Path | None:
    """Resuelve `@thyrox/pkg/sub.js` al archivo fuente, via su `exports`."""
    if not spec.startswith(ALCANCE_PUERTO):
        return None
    resto = spec[len(ALCANCE_PUERTO):]
    nombre, _, sub = resto.partition('/')
    manifiesto = RAIZ_PAQUETES / nombre / 'package.json'
    if not manifiesto.is_file():
        return None
    exports = json.loads(manifiesto.read_text()).get('exports', {})
    clave = f'./{sub}' if sub else '.'
    destino = exports.get(clave)
    if destino is None:                       # comodines, del mas literal al menos
        for patron, valor in exports.items():
            if '*' not in patron:
                continue
            pre, _, post = patron.partition('*')
            if clave.startswith(pre) and clave.endswith(post):
                comodin = clave[len(pre):len(clave) - len(post) or None]
                destino = valor.replace('*', comodin)
                break
    if destino is None:
        return None
    if isinstance(destino, dict):
        destino = destino.get('default') or next(iter(destino.values()))
    ruta = (RAIZ_PAQUETES / nombre / destino).resolve()
    return ruta if ruta.is_file() else None


DECLARA_TIPO = (
    r'^export\s+(?:declare\s+)?(?:type|interface)\s+{n}\b',
    r'^export\s+type\s*\{{[^}}]*\b{n}\b',
    r'^export\s+(?:declare\s+)?(?:abstract\s+)?class\s+{n}\b',
)


def exporta_como_tipo(archivo: Path, nombre: str, saltos: int = 1) -> bool:
    """¿La fuente del puerto declara `nombre` como tipo? Sigue `export *` un salto.

    Es el canal que ve lo que la sonda de runtime NO puede ver: un
    `export type X` se borra al transpilar, asi que `X in modulo` es
    siempre falso por construccion.
    """
    try:
        texto = archivo.read_text()
    except OSError:
        return False
    for patron in DECLARA_TIPO:
        if re.search(patron.format(n=re.escape(nombre)), texto, re.M):
            return True
    if saltos <= 0:
        return False
    for m in re.finditer(r"^export\s+\*\s+from\s+'([^']+)'", texto, re.M):
        origen = m.group(1)
        if not origen.startswith('.'):
            continue
        base = (archivo.parent / origen).resolve()
        for cand in (base, base.with_suffix('.ts'), base.with_suffix('.tsx'),
                     Path(str(base).removesuffix('.js') + '.ts'),
                     Path(str(base).removesuffix('.js') + '.tsx')):
            if cand.is_file() and exporta_como_tipo(cand, nombre, saltos - 1):
                return True
    return False


def sonda_paquete(pedidos: dict[str, list[str]], npm: list[str]) -> dict:
    """Carga cada modulo hermano de verdad y pregunta por cada nombre.

    Sondea ademas cada paquete npm pelado (ceguera 3): antes se daban por
    instalados sin medirlos.
    """
    guion = ['const r = {}; const npm = {};']
    for mod, nombres in pedidos.items():
        guion.append(
            f'try {{ const m = await import({json.dumps(mod)});'
            f' r[{json.dumps(mod)}] = Object.fromEntries('
            f'{json.dumps(nombres)}.map(n => [n, n in m])); }}'
            f' catch (e) {{ r[{json.dumps(mod)}] = null; }}'
        )
    for p in npm:
        guion.append(
            f'try {{ await import({json.dumps(p)});'
            f' npm[{json.dumps(p)}] = true; }}'
            f' catch (e) {{ npm[{json.dumps(p)}] = false; }}'
        )
    guion.append('console.log(JSON.stringify({ r, npm }));')
    salida = subprocess.run(
        ['bun', '-e', '\n'.join(guion)],
        cwd=str(PUERTO.parent), capture_output=True, text=True,
    )
    linea = [l for l in salida.stdout.splitlines() if l.startswith('{')]
    return json.loads(linea[-1]) if linea else {'r': {}, 'npm': {}}


def rootUnits() -> list[tuple[str, list[Path]]]:
    """Los modulos de RAIZ de la fuente sin contraparte, como unidades de un archivo.

    El recorrido de `main` arranca en `tools/`, asi que la raiz quedaba fuera y
    se media a mano (TASK-THYROX-0272). Medirla con el MISMO instrumento es lo
    que hace comparables los dos veredictos: una medicion a mano y una
    automatica no se pueden sumar sin declarar que son dos poblaciones.
    """
    fuera = []
    for f in sorted(FUENTE.iterdir()):
        if not f.is_file() or f.suffix not in ('.ts', '.tsx'):
            continue
        base = f.stem
        if any((PUERTO / f'{base}{s}').is_file() for s in ('.ts', '.tsx')):
            continue
        fuera.append((f.name, [f]))
    return fuera


def main() -> int:
    soloRaiz = '--root' in sys.argv
    utiles = sorted(
        d for d in (FUENTE / 'tools').iterdir()
        if d.is_dir() and not (PUERTO / 'tools' / d.name).exists()
    )
    por_util: dict[str, dict] = {}
    sin_cuerpo: list[tuple[str, int]] = []
    pedidos: dict[str, set] = {}
    npm_valor: dict[str, set] = {}   # paquete -> utiles que lo usan como VALOR
    npm_tipo: dict[str, set] = {}    # paquete -> utiles que solo lo tipan
    unidades = (rootUnits() if soloRaiz
                else [(d.name, [f for f in d.rglob('*') if f.suffix in ('.ts', '.tsx')])
                      for d in utiles])
    for nombreUnidad, archivos in unidades:
        if not tiene_cuerpo(archivos):
            sin_cuerpo.append((nombreUnidad, len(archivos)))
            continue
        cruza, propios, hermanos, npm = set(), set(), {}, {}
        deLaUnidad = {f.resolve() for f in archivos}
        for f in archivos:
            for m in IMPORT.finditer(f.read_text()):
                origen = m.group('origen')
                clausula = m.group('clausula')
                es_tipo = bool(m.group('solo_tipo'))
                if origen.startswith('.'):
                    clase = clase_local(f, deLaUnidad, origen)
                    if clase == 'cruza-util':
                        cruza.add(origen)
                    elif clase == 'mismo-util':
                        propios.add(origen)
                elif origen.startswith(ALCANCE_FUENTE):
                    mod = origen.replace(ALCANCE_FUENTE, ALCANCE_PUERTO)
                    hermanos.setdefault(mod, set()).update(simbolos(clausula))
                elif origen in CON_SUSTITUTO:
                    pass
                elif any(origen.startswith(p) for p in INTEGRADOS):
                    pass
                else:
                    # ceguera 4: un import npm solo-de-tipo se borra al transpilar
                    npm[origen] = npm.get(origen, True) and es_tipo
        for mod, nombres in hermanos.items():
            pedidos.setdefault(mod, set()).update(nombres)
        for p, solo_tipo in npm.items():
            (npm_tipo if solo_tipo else npm_valor).setdefault(p, set()).add(nombreUnidad)
        por_util[nombreUnidad] = {
            'lineas': sum(len(f.read_text().splitlines()) for f in archivos),
            'archivos': len(archivos),
            'propios_por_portar': sorted(propios),
            'cruza_util': sorted(cruza),
            'hermanos': {m: sorted(n) for m, n in hermanos.items()},
            'npm': npm,
        }

    todos_npm = sorted(set(npm_valor) | set(npm_tipo))
    salida = sonda_paquete({m: sorted(n) for m, n in pedidos.items()}, todos_npm)
    sonda, npm_resuelve = salida.get('r', {}), salida.get('npm', {})

    libres, bloqueados = [], []
    for nombre, info in sorted(por_util.items(), key=lambda kv: kv[1]['lineas']):
        faltan = [f'{o} (cruza util)' for o in info['cruza_util']]
        for mod, nombres in info['hermanos'].items():
            hallado = sonda.get(mod)
            fuente_mod = archivo_del_modulo(mod)
            if hallado is None and fuente_mod is None:
                faltan.append(f'{mod} (el modulo no carga ni resuelve)')
                continue
            for n in nombres:
                if hallado and hallado.get(n):
                    continue                                   # canal runtime
                if fuente_mod and exporta_como_tipo(fuente_mod, n):
                    continue                                   # canal estatico
                faltan.append(f'{mod}::{n}')
        for p, solo_tipo in info['npm'].items():
            if npm_resuelve.get(p):
                continue
            if solo_tipo:
                continue          # ceguera 4: se borra al transpilar
            faltan.append(f'{p} (npm ausente, usado como valor)')
        (libres if not faltan else bloqueados).append((nombre, info, faltan))

    print(f'{"modulos de RAIZ" if soloRaiz else "utiles"} de la fuente sin '
          f'contraparte: {len(por_util) + len(sin_cuerpo)}')
    print(f'SIN CUERPO (stub de la fuente o sin .ts): {len(sin_cuerpo)}')
    for nombre, n in sorted(sin_cuerpo):
        print(f'  {nombre} ({n} .ts, todos stub)')
    print(f'LIBRES a nivel de simbolo: {len(libres)}')
    for nombre, info, _ in libres:
        propios = len(info['propios_por_portar'])
        print(f"  {info['lineas']:5d} L  {info['archivos']}a  {nombre}"
              + (f'  (+{propios} import del propio util)' if propios else ''))
    print(f'BLOQUEADOS: {len(bloqueados)}')
    for nombre, info, faltan in bloqueados:
        print(f"  {info['lineas']:5d} L  {nombre}: {', '.join(faltan[:4])}"
              + (f' (+{len(faltan)-4})' if len(faltan) > 4 else ''))
    print('\nnpm sondeado (ceguera 3 y 4):')
    for p in todos_npm:
        estado = ('presente' if npm_resuelve.get(p)
                  else ('AUSENTE-SOLO-TIPO' if p not in npm_valor
                        else 'AUSENTE-COMO-VALOR'))
        usos = sorted(npm_valor.get(p, set()) | npm_tipo.get(p, set()))
        print(f'  {estado:19s} {p}  ({len(usos)} utiles)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
