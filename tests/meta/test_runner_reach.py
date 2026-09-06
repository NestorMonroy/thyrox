#!/usr/bin/env python3
"""El corredor alcanza TODO archivo de test del árbol, y publica su denominador.

El defecto que cierra: `tests/run.sh` terminaba con «OK: las dos mitades en
verde» habiendo invocado `bun test tests/` y un `find tests -name 'test_*.py'`.
Medido al escribir este control, el árbol tenía **600** archivos de test y el
corredor alcanzaba **54** — el 9 %. Las dos mitades estaban en verde; la frase
era cierta y la conclusión que induce —«la suite pasa»— era falsa. Es el
sub-patrón C: se mide el significante (las dos invocaciones que hay) y se
concluye sobre el significado (el estado del árbol).

Qué haría fallar este control, declarado antes de escribirlo:

1. Que una lengua entera quede sin invocar. Era el caso de shell: 91 archivos
   y ninguna invocación que los alcanzara.
2. Que una lengua se invoque con la raíz recortada. Era el caso de TypeScript:
   `bun test tests/` deja fuera los 455 `.test.ts` que viven bajo `src/`.
3. Que el corredor no sepa decir qué va a correr. Sin `--list` el alcance sólo
   se puede inferir leyendo el guion, que es medir el texto y no la conducta.

Por qué se mide con `--list` y no parseando `run.sh`: un control que leyera el
guion aceptaría una invocación escrita y rota. `--list` es la conducta del
propio corredor resolviendo su alcance, y por eso cae si la resolución falla.

*Métrica:* archivos de test en disco por patrón de nombre, contra los que
`run.sh --list` enumera.
*Ciega a:* un archivo de test cuyo nombre no case el patrón de su lengua —no
aparece ni en el disco medido ni en el corredor, así que su ausencia no se
distingue de que no exista—; y a si un archivo alcanzado contiene aserciones:
mide alcance, no cobertura.
"""
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CORREDOR = RAIZ / 'tests' / 'run.sh'

fallos: list[str] = []


def comprobar(condicion: bool, mensaje: str) -> None:
    if condicion:
        print(f'  ok  {mensaje}')
    else:
        print(f'  FALLA  {mensaje}')
        fallos.append(mensaje)


def en_disco(patron: str, *raices: str) -> set[str]:
    # `node_modules` se excluye porque sus tests no son nuestros: 198 de zod,
    # medidos. Incluirlos inflaría el denominador con material que no
    # mantenemos y haría que el control exigiera al corredor algo que no debe
    # hacer. El corredor los excluye por la misma razón y con el mismo
    # predicado — si uno cambiara sin el otro, este control caería.
    hallados: set[str] = set()
    for raiz in raices:
        salida = subprocess.run(
            ['find', raiz, '-name', patron, '-not', '-path', '*/node_modules/*'],
            cwd=RAIZ, capture_output=True, text=True, check=True).stdout
        hallados.update(l for l in salida.splitlines() if l)
    return hallados


def listados() -> set[str]:
    # El timeout no es prudencia: es parte del control. Un corredor que ignora
    # una bandera desconocida y corre la suite entera tarda minutos, y ese
    # «rojo por agotamiento» sería indistinguible de un cuelgue. Con la cota,
    # el defecto se lee como lo que es — el corredor no sabe listar.
    try:
        r = subprocess.run(['bash', str(CORREDOR), '--list'], cwd=RAIZ,
                           capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        print('  (--list no rehusó ni listó: corrió la suite y agotó los 30 s)')
        return set()
    if r.returncode != 0:
        return set()
    return {l.strip() for l in r.stdout.splitlines() if l.strip()}


print('== el corredor sabe decir qué va a correr ==')
lista = listados()
comprobar(len(lista) > 0, '`run.sh --list` enumera archivos en vez de rehusar')

print('== ninguna lengua queda fuera del alcance ==')
for lengua, patron, raices in [
    ('TypeScript', '*.test.ts', ('tests', 'src')),
    ('Python', 'test_*.py', ('tests',)),
    ('shell', 'test*.sh', ('tests',)),
]:
    disco = en_disco(patron, *raices)
    # Un control que pasara con cero archivos en disco no discriminaría: sería
    # verde porque no hay nada que alcanzar, no porque el corredor alcance.
    comprobar(len(disco) > 0, f'{lengua}: hay archivos de test en disco ({len(disco)})')
    faltan = sorted(disco - lista)
    comprobar(not faltan,
              f'{lengua}: los {len(disco)} archivos están en el alcance'
              + (f' — faltan {len(faltan)}, p. ej. {faltan[0]}' if faltan else ''))

print('== el corredor no promete más lenguas de las que invoca ==')
# Se DERIVA el numeral de lo que `--list` enumera, en vez de vetar una cadena
# concreta: vetar «las dos mitades» dejaría pasar «las cuatro lenguas» el día
# que entre una quinta, y además marcaría en rojo un comentario histórico que
# cita la frase vieja. El numeral derivado cae exactamente cuando el mensaje
# deja de corresponder al alcance real.
NUMERAL = {1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco'}
lenguas = {Path(f).suffix for f in lista}
exito = [l for l in CORREDOR.read_text(encoding='utf8').splitlines()
         if l.strip().startswith('echo "OK:')]
comprobar(len(exito) == 1, f'hay un solo mensaje de éxito ({len(exito)})')
esperado = NUMERAL.get(len(lenguas), str(len(lenguas)))
comprobar(bool(exito) and esperado in exito[-1],
          f'el mensaje de éxito dice «{esperado}» — hay {len(lenguas)} lengua(s) en el alcance')

print()
if fallos:
    print(f'FALLA: {len(fallos)} aserción(es) en rojo')
    sys.exit(1)
print(f'OK: alcance del corredor verificado ({len(lista)} archivos enumerados)')
