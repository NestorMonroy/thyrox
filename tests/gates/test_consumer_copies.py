"""Control del detector de copia en vez de consumo.

Que haria fallar este control, declarado antes de escribirlo:

1. Que no viera una copia REAL. El control positivo no es fabricado: son los
   54 archivos que hoy estan duplicados byte a byte entre thyrox y los
   consumidores, y el gate tiene que verlos.
2. Que contara como copia un archivo que thyrox NO tiene — eso seria medir
   otra cosa.
3. Que contara como copia un archivo que DIFIERE. Una divergencia ya no es
   una copia: es un fork, y el veredicto es otro (se reporta aparte).
4. Que no publicara su denominador, o lo publicara sobre el arbol equivocado.
5. Que no rehusara cuando falta una raiz: un 0 ahi seria un verde falso, y
   este gate mide entre DOS arboles — si uno no esta, no hay medicion.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
GATE = RAIZ / 'src' / 'gates' / 'check_consumer_copies.py'

verdes = total = 0


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

sys.path.insert(0, str(RAIZ / 'src' / 'gates'))
import check_consumer_copies as mod  # noqa: E402

with tempfile.TemporaryDirectory() as d:
    base = Path(d)
    fuente = base / 'fuente'
    (fuente / 'src' / 'gates').mkdir(parents=True)
    (fuente / 'src' / 'gates' / 'medir.py').write_text('print("uno")\n')
    (fuente / 'src' / 'gates' / 'otro.sh').write_text('echo dos\n')

    cons = base / 'consumidor'
    (cons / '.claude' / 'scripts').mkdir(parents=True)
    # (a) copia identica -> es el defecto
    (cons / '.claude' / 'scripts' / 'medir.py').write_text('print("uno")\n')
    # (b) divergente -> ya no es copia, es fork
    (cons / '.claude' / 'scripts' / 'otro.sh').write_text('echo dos\necho tres\n')
    # (c) propio del consumidor -> no es asunto del gate
    (cons / '.claude' / 'scripts' / 'suyo.sh').write_text('echo propio\n')

    copias, forks, medidos = mod.compare(fuente, cons)
    check('ve la copia identica', ['.claude/scripts/medir.py'], sorted(copias))
    check('el divergente NO es copia: es fork',
          ['.claude/scripts/otro.sh'], sorted(forks))
    check('el propio del consumidor no entra', 3, medidos)

    r = correr('--fuente', str(fuente), '--consumidor', str(cons))
    check('publica su denominador', True, 'alcance medido' in r.stdout)
    check('nombra la copia en su salida', True, 'medir.py' in r.stdout)
    check('--strict sale 1 con copias', 1,
          correr('--fuente', str(fuente), '--consumidor', str(cons),
                 '--strict').returncode)

    limpio = base / 'limpio'
    (limpio / '.claude').mkdir(parents=True)
    (limpio / '.claude' / 'nada.sh').write_text('echo distinto\n')
    check('un consumidor sin copias sale 0 con --strict', 0,
          correr('--fuente', str(fuente), '--consumidor', str(limpio),
                 '--strict').returncode)

    r = correr('--fuente', str(base / 'no-existe'), '--consumidor', str(cons))
    check('rehusa con exit 2 si falta una raiz', 2, r.returncode)
    check('y NO emite conteo al rehusar', False, 'alcance medido' in r.stdout)

# --- el control positivo REAL, sobre el arbol vivo -------------------------
r = correr('--fuente', str(RAIZ), '--consumidor', '/home/user/kaupamex-api')
check('ve copias reales en kaupamex-api', True,
      'copia(s)' in r.stdout and ': 0 copia(s)' not in r.stdout)

# --- sin argumentos: el registro invoca los gates a secas ------------------
# Es la convencion que fija la referencia: `ccnmt: scripts/doctor-architecture.ts`
# declara su `Check` con id/layer/subsystem/script/doc y ningun campo de
# argumentos, y su `runCheck` lanza el guion pelado. Este gate exigia --fuente
# y --consumidor, asi que el corredor lo publicaba SIN MEDIR con el `usage:` de
# argparse por mensaje.
#
# Que haria fallar a este control (sub-patron D): que sin argumentos el gate
# rehuse por falta de argumentos en vez de derivar sus dos raices. Las dos son
# derivables —`reach.thyrox_root()` y `reach.consumer_root()`— asi que
# exigirlas era pedir un parametro que el mecanismo ya sabe resolver.
r = correr()
check('sin argumentos NO rehusa por falta de argumentos', False,
      'the following arguments are required' in (r.stdout + r.stderr))
check('sin argumentos SI emite su denominador', True, 'alcance medido' in r.stdout)

print(f'\nresultado: {verdes} de {total} aserciones en verde')
raise SystemExit(0 if verdes == total else 1)

