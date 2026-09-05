#!/usr/bin/env python3
"""Censo de los sobres con que el ejecutable envuelve un mensaje entre agentes.

El sobre es la frontera léxica entre lo que dice el harness y lo que dice un
par. `bash-background-tasks.md` cita su forma como evidencia medida, y esa
forma es propiedad de la build: cuando el contenedor actualiza el ejecutable,
la cita queda atrás sin que nadie lo note (ya ocurrió — H-DOCS-455).

El atributo se reporta en TRES estados, no en dos. El ejecutable está
minificado y arma el sobre por interpolación —``<${Aq} teammate_id="…"``—, así
que el atributo no es adyacente al literal de la etiqueta. Un veredicto binario
leería esa distancia como ausencia: el instrumento mediría adyacencia y
concluiría sobre el contrato del sobre.

Métrica: literales del sobre, y el estado de su atributo — adyacente al
literal, interpolado sobre la variable que aloja la etiqueta, o ausente.
Ciega a: si el formateador ESCAPA el cuerpo. La presencia de la etiqueta de
cierre como constante no prueba ni refuta el escape — eso exige una sonda de
conducta, no de literal. Es el sub-patrón C de `metrica-decide-la-conclusion`.
Y ciega a cuál de las definiciones homónimas del binario minificado resuelve
cada llamada: `strings` no da alcance léxico.
"""
import re
import subprocess
import sys

# El universo se declara aquí, y el reporte lo publica: un conteo sin
# denominador no distingue «no hay» de «no lo busqué».
UNIVERSO = {
    'teammate-message': 'teammate_id',
    'agent-message': 'from',
    'cross-session-message': 'from',
}


def leer_cadenas(ruta):
    """Las cadenas imprimibles del binario, vía `strings`."""
    try:
        salida = subprocess.run(
            ['strings', '-n', '4', ruta],
            capture_output=True, text=True, errors='ignore', check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f'ERROR — no se pudo leer {ruta}: {exc}', file=sys.stderr)
        raise SystemExit(2)
    return salida.stdout


def censar(texto):
    """Por sobre presente: sus formas literales y el estado de su atributo."""
    hallado = {}
    for sobre, atributo in UNIVERSO.items():
        formas = sorted(set(re.findall(
            r'[A-Za-z_<>/"= .-]{0,40}' + re.escape(sobre) + r'[A-Za-z_<>/"= .-]{0,40}',
            texto,
        )))
        if not formas:
            continue
        hallado[sobre] = {
            'formas': formas,
            'atributo': atributo,
            'estado': estado_del_atributo(texto, sobre, atributo, formas),
        }
    return hallado


def estado_del_atributo(texto, sobre, atributo, formas):
    """`adyacente` · `interpolado` · `indecidible` · `ausente`.

    El atributo se busca dentro de la **ventana de captura** de `censar()` —los
    40 caracteres a cada lado del literal del sobre— y no en todo el binario:
    `from` aparece suelto en cualquier parte del ejecutable y su presencia no
    probaría nada sobre este sobre en concreto.

    Esa ventana basta cuando el sobre se emite como literal completo. No basta
    cuando el minificador aloja la etiqueta en una variable y compone el sobre
    con un template literal —``<${Aq} teammate_id="…"``—: ahí el atributo queda
    fuera de la ventana sin que el contrato del sobre cambie. Medir la distancia
    y concluir sobre el contrato es el sub-patrón C de
    `metrica-decide-la-conclusion.md`.

    El alias de esa variable NO es recuperable con `strings`, que no da alcance
    léxico: medido, `Aq="teammate-message"` devuelve 0 y el literal se declara
    bajo otro nombre. Por eso la atribución de un template literal a un sobre
    concreto sólo se sostiene cuando el atributo es exclusivo de ese sobre
    dentro del universo. Si lo comparten dos —el caso de `from`— el instrumento
    no puede atribuirlo, y lo declara: `indecidible` no es `ausente`.
    """
    if any(atributo in f for f in formas):
        return 'adyacente'
    if not re.search(r'<\$\{[A-Za-z_$][A-Za-z0-9_$]{0,3}\}\s*'
                     + re.escape(atributo) + r'=', texto):
        return 'ausente'
    comparten = [s for s, a in UNIVERSO.items() if a == atributo and s != sobre]
    return 'indecidible' if comparten else 'interpolado'


def main(argv):
    quieto = '--quiet' in argv
    rutas = [a for a in argv[1:] if not a.startswith('--')]
    if len(rutas) != 1:
        print('uso: censo_sobres_mensaje.py [--quiet] <ruta-al-binario>',
              file=sys.stderr)
        return 2

    hallado = censar(leer_cadenas(rutas[0]))

    if quieto:
        print(len(hallado))
    else:
        print(f'censo de sobres — universo buscado: {len(UNIVERSO)} '
              f'({", ".join(sorted(UNIVERSO))})')
        print(f'presentes: {len(hallado)}')
        for sobre, dato in sorted(hallado.items()):
            print(f'\n  {sobre} — atributo {dato["atributo"]}: '
                  f'{dato["estado"]}')
            for f in dato['formas']:
                print(f'      {f}')

    # Cero sobres NO es un resultado: o el binario no es el que se cree, o el
    # universo quedó atrás. Rehusar es más honesto que publicar un 0 tranquilo.
    return 2 if not hallado else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
