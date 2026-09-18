# python-reds

## Que se lanzo

```
bash tests/run.sh --python-only
```

## Que se preguntaba

Cuales de las suites de Python del arbol estan en rojo, y —la mitad que el
conteo agregado no da— cuantas caen por un defecto del sujeto y cuantas
porque su instrumento no encontro con que medir.

## Que se recogio

`157 suite(s) de Python, 10 en rojo`, exit 1. Las diez se triaron una a una;
su salida individual vive en `.claude/workbench/triar-rojos-de-python-20260917T111331/outputs/`.

Dos de los diez rehusaban con **exit 2** —«no habia con que medir»— y el
corredor los publicaba como rojo. Los dos rehusos eran **falsos**: si habia
sujeto, y el instrumento no lo alcanzaba. Ese es el hallazgo del pase
(H-THYROX-45): un rehuso es una afirmacion sobre el mundo y por tanto puede
ser falsa, asi que simetrizar el corredor ANTES de triarlos habria convertido
los dos defectos en `SIN MEDIR` y el arbol entero en verde.

*Metrica:* codigo de salida de cada `tests/**/*.py` descubierto por el
corredor, agregado por lengua.
*Ciega a:* la razon del rojo. El corredor colapsaba exit 2 con exit 1 en su
mitad de Python —su mitad de shell ya los separaba desde la primera version—,
asi que este conteo no distingue «hay defecto» de «no habia con que medir».
Esa asimetria se cerro en TASK-THYROX-0073, despues del triaje y con un
sujeto sintetico como control.
