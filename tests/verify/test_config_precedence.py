"""Control del auditor de precedencia por ramas.

Que haria fallar este control, declarado antes de escribirlo:

1. Que el auditor derivara la precedencia del ORDEN DE ASIGNACION. El control
   positivo es un archivo real —``litellm/proxy/proxy_server.py``— donde los
   dos ordenes DISCREPAN: asigna ``WORKER_CONFIG`` antes que
   ``CONFIG_FILE_PATH``, y la rama que gana es la de ``CONFIG_FILE_PATH``. Un
   auditor por lineas publica el orden invertido y este control lo caza.
2. Que no distinguiera un `elif` de un `if` suelto: dos `if` independientes no
   son una cadena de precedencia, son dos condiciones que pueden cumplirse a
   la vez.
3. Que recorriera por numero de linea en vez de por `orelse`. Se prueba con
   una cadena escrita al reves: el `elif` con numero de linea MENOR que su
   `if`, imposible en fuente normal pero exacto para separar los dos criterios
   — aqui se emula anidando.
4. Que no publicara su denominador, o que publicara un conteo sin decir sobre
   cuantos archivos.
5. Que no rehusara cuando el archivo no parsea: un 0 ahi seria un verde falso.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths.reach import thyrox_root  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228). Se importa la función suelta, no
#: el módulo `reach`, porque más abajo el archivo usa `reach` como nombre de
#: variable para la RUTA de ``reach.py`` — un `from paths import reach` la
#: taparía.
RAIZ = thyrox_root()
GATE = RAIZ / 'src' / 'verify' / 'check_config_precedence.py'
# Vendorizado en `_references/litellm/` (commit `da82ea8e`, MIT; ver su
# `PROVENANCE.md`). Antes se leia de un clon local por ruta literal, ausente
# en cualquier otra sesion, y el control fallaba sin haber medido nada.
LITELLM = RAIZ / '_references' / 'litellm' / 'litellm' / 'proxy' / 'proxy_server.py'

verdes = 0
total = 0


def check(label, esperado, real):
    global verdes, total
    total += 1
    if esperado == real:
        verdes += 1
        print(f'  ok   {label}')
    else:
        print(f'  FALLA {label}\n         esperado: {esperado!r}\n         real:     {real!r}')


def correr(*args):
    return subprocess.run([sys.executable, str(GATE), *args],
                          capture_output=True, text=True)


if not GATE.exists():
    print(f'  FALLA el gate no existe todavia: {GATE}')
    print('\nresultado: 0 de 1 aserciones en verde')
    raise SystemExit(1)

sys.path.insert(0, str(RAIZ / 'src' / 'verify'))
import check_config_precedence as mod  # noqa: E402

# --- 1. el control positivo REAL: los dos ordenes discrepan -----------------
if LITELLM.exists():
    fuente = LITELLM.read_text(encoding='utf-8', errors='replace')
    asign = mod.assignment_order(fuente)
    rama = mod.branch_order(fuente)
    check('la asignacion pone WORKER_CONFIG antes que CONFIG_FILE_PATH',
          ['worker_config', 'env_config_yaml'],
          [n for n in asign if n in ('worker_config', 'env_config_yaml')])
    check('la RAMA pone env_config_yaml antes que worker_config',
          ['env_config_yaml', 'worker_config'],
          [n for n in rama if n in ('worker_config', 'env_config_yaml')])
    check('el auditor declara que los dos ordenes DISCREPAN',
          True, mod.disagrees(fuente))
else:
    check('control positivo alcanzable', True, False)

# --- 2. dos `if` sueltos NO son una cadena de precedencia -------------------
sueltos = '''
import os
a = os.getenv("A")
b = os.getenv("B")
if a is not None:
    usar(a)
if b is not None:
    usar(b)
'''
check('dos `if` independientes no forman cadena', [], mod.branch_order(sueltos))

# --- 3. el recorrido es por `orelse`, no por numero de linea ---------------
#     Cadena real: el `elif` es un `If` DENTRO del `orelse` del primero.
cadena = '''
import os
a = os.getenv("A")
b = os.getenv("B")
if b is not None:
    usar(b)
elif a is not None:
    usar(a)
'''
check('la cadena se recorre por orelse', ['b', 'a'], mod.branch_order(cadena))
check('y su asignacion va al reves', ['a', 'b'], mod.assignment_order(cadena))
check('por tanto discrepa', True, mod.disagrees(cadena))

# --- 4. acuerdo: no discrepa cuando los dos ordenes coinciden --------------
acuerdo = '''
import os
a = os.getenv("A")
b = os.getenv("B")
if a is not None:
    usar(a)
elif b is not None:
    usar(b)
'''
check('no discrepa cuando coinciden', False, mod.disagrees(acuerdo))

# --- 5. la precedencia por RETORNO TEMPRANO, que es la forma que usamos -----
#     `thyrox_root` no escribe if/elif: escribe `if X: return`. Un gate ciego a
#     esta forma daria 0 sobre nuestro arbol midiendo una forma que no usamos —
#     sub-patron D aplicado a la eleccion del sujeto.
guardas = """
import os
def raiz():
    declarada = os.getenv("THYROX_ROOT")
    if declarada:
        return declarada
    heredada = os.getenv("REACH_ROOT")
    if heredada:
        return heredada
    raise RuntimeError("sin raiz")
"""
check('la cadena por retorno temprano se reconoce',
      ['declarada', 'heredada'], mod.branch_order(guardas))
check('y no discrepa cuando lee en el mismo orden', False, mod.disagrees(guardas))

guardas_invertidas = """
import os
def raiz():
    heredada = os.getenv("REACH_ROOT")
    declarada = os.getenv("THYROX_ROOT")
    if declarada:
        return declarada
    if heredada:
        return heredada
    raise RuntimeError("sin raiz")
"""
check('una guarda que aplica al reves de como lee, discrepa',
      True, mod.disagrees(guardas_invertidas))

check('un `if` con retorno SUELTO no es cadena', [], mod.branch_order("""
import os
a = os.getenv("A")
def f():
    if a:
        return a
"""))

# --- 5-bis. un PARAMETRO homonimo no es la variable de modulo --------------
#     Medido en litellm: un helper de redaccion recibe un parametro llamado
#     `worker_config` y lo guarda con `if worker_config is None: return None`.
#     Es otra ligadura; contarla como la del modulo publica una precedencia
#     que no existe.
homonimo = """
import os
worker_config = os.getenv("WORKER_CONFIG")
env_config_yaml = os.getenv("CONFIG_FILE_PATH")

def redactar(worker_config):
    if worker_config is None:
        return None
    if isinstance(worker_config, dict):
        return worker_config
    return worker_config

if env_config_yaml is not None:
    usar(env_config_yaml)
elif worker_config is not None:
    usar(worker_config)
"""
check('un parametro homonimo no entra en la cadena',
      ['env_config_yaml', 'worker_config'], mod.branch_order(homonimo))

# --- 6. nuestro propio mecanismo: el auditor lo ve -------------------------
#     Y aqui el auditor declara su limite en vez de fingir cobertura: la
#     precedencia de `thyrox_root` tiene TRES pasos —variable, ascenso,
#     hermano— y los dos ultimos son `for ...: if ...: return`, no guardas de
#     primer nivel. De todo `reach.py` el auditor recupera UNA cadena, la de
#     `clone_prefix`, y de ella UN nombre: el otro paso (`derive_clone_prefix`)
#     no es una lectura de configuracion. Un `> 0` habria pasado igual y no
#     habria discriminado.
#
#     El nombre era `from_process` hasta `8ea1d652`, que declaro el puerto
#     conducido de `env_value` y retiro su `os.environ.get` directo. Con el se
#     fue la unica lectura que el auditor sabia ver dentro del mecanismo: hasta
#     que `env_value` entro en `FUENTES`, esto daba `[]` — y `[]` no distingue
#     «vi una guarda, no es cadena» de «no vi ninguna lectura».
reach = RAIZ / 'src' / 'paths' / 'reach.py'
text_reach = reach.read_text(encoding='utf-8')
check('el auditor NO cubre la precedencia por bucle de thyrox_root',
      ['del_entorno'], mod.branch_order(text_reach))

# --- 6-bis. y el discriminador: que VEA las lecturas, no que calle ---------
#     La asercion de arriba, sola, no separa sus dos causas posibles. Este
#     control fija la otra mitad: el auditor tiene que reconocer `env_value`,
#     el lector de ESTE arbol. Medido antes de ensancharlo `FUENTES`:
#     `assignment_order` devolvia ['declared'] —la unica ligadura que llama a
#     `os.environ.get` directamente— y las SEIS que pasan por `env_value` eran
#     invisibles.
check('el auditor ve las lecturas que pasan por env_value',
      True, len(mod.assignment_order(text_reach)) > 1)
check('y env_value cuenta como fuente', True, 'env_value' in mod.FUENTES)

# --- 7. denominador y rehuse ------------------------------------------------
r = correr('--root', str(RAIZ))
check('publica su denominador', True, 'alcance medido' in r.stdout)
check('el arbol de thyrox sale 0 con --strict',
      0, correr('--root', str(RAIZ), '--strict').returncode)

with tempfile.TemporaryDirectory() as d:
    r = correr('--root', str(Path(d) / 'no-existe'))
    check('rehusa con exit 2 si la raiz no existe', 2, r.returncode)
    check('y NO emite conteo al rehusar', False, 'alcance medido' in r.stdout)

print(f'\nresultado: {verdes} de {total} aserciones en verde')
raise SystemExit(0 if verdes == total else 1)
