# qwencloud-payg-probe

## El encargo

> THYROX_OPENAI_COMPAT_API_KEY = QWENCLOUD_APK_TP · QWENCLOUD_APK_TP = Token
> Plan Base URL https://token-plan.maas.qwencloudapi.com/compatible-mode/v1 ·
> https://token-plan.maas.qwencloudapi.com/apps/anthropic · aun nos falta hacer
> la prueba para Pay-As-You-Go … https://maas.qwencloudapi.com/compatible-mode/v1 ·
> https://maas.qwencloudapi.com/apps/anthropic · que tienes la clave
> QWENCLOUD_APK_PAYG, vas a crear una similar a THYROX_OPENAI_COMPAT_API_KEY
> — el ejecutor, 2026-10-03 (TASK-THYROX-0926).

## La premisa, si se corrigio al primer comando

Las dos claves de Qwen Cloud están en el entorno de la sesión
(`QWENCLOUD_APK_TP`, `QWENCLOUD_APK_PAYG`); ni `.env` ni el entorno traían
`THYROX_OPENAI_COMPAT_API_KEY`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/route_probe.ts` | una petición mínima por plan × protocolo (adaptada de `local-models-publication-20261002T114251`) |
| `probes/cross_keys.ts` | cruza cada clave con el endpoint del otro plan, y lista modelos |
| `outputs/route-probe-small.tsv`, `outputs/cross-keys.tsv` | sus salidas: estado, latencia, código de error; nunca la clave |

Fuera del banco: `.env` (ignorado, modo 0600) recibe
`THYROX_OPENAI_COMPAT_API_KEY` ← `QWENCLOUD_APK_TP` y
`THYROX_OPENAI_COMPAT_PAYG_API_KEY` ← `QWENCLOUD_APK_PAYG`; la segunda se
declara en `.env.example` y en `env_sensitivity.tsv` como `credential`.

## Los resultados

**Los cuatro endpoints rechazan su clave: 401 `InvalidApiKey`**, y también las
cuatro combinaciones cruzadas y el listado de modelos. La red llega (el
proveedor responde con `request_id`), y el mensaje es «Invalid API-key
provided», no «missing»: la cabecera llega con un valor.

Forma de los valores, medida sin imprimirlos: una sola clave por variable
(`sk-` sólo en la posición 0), sin comillas ni espacios, 113 y 116 caracteres,
con un `.` dentro; la de Token Plan empieza `sk-sp-`, la de Pay-As-You-Go no;
idénticos en `.env` y en el entorno.

Causa: **no determinada desde aquí**. Lo compatible con lo medido: claves
revocadas, sin activar o de otra región/cuenta. Lo descartado: comillas o
espacios, una clave en el plan del otro, y que el valor de `.env` difiera del
entorno. Lo no descartado: que el proxy de salida del contenedor altere la
cabecera — su documentación (`/root/.ccr/README.md`) no menciona tocar
cabeceras, y no se mandó la clave a un servicio de eco para comprobarlo.

*Metrica:* estado HTTP y código de error de cada endpoint, n = 1.
*Ciega a:* la causa del rechazo en el lado del proveedor.

## Recargar las claves: el relevo, y TASK-THYROX-0927

El ejecutor actualizó las claves en `THYROX_OPENAI_COMPAT_API_KEY` y
`THYROX_OPENAI_COMPAT_PAYG_API_KEY`. Medido en esta sesión: las dos están
AUSENTES del entorno del proceso (la sesión fijó su entorno al arrancar). Lo
que las carga es una sesión nueva; `bin/session_restart` prepara ese relevo
(no puede recargar una sesión viva, lo dice su cabecera).

- `.env` llevaba los valores viejos que esta tarea copió de `QWENCLOUD_*`
  (rechazados con 401): se retiraron. El entorno del proceso gana a `.env`
  (`paths/reach.ts::productionDeclarations`, `ProcessEnvironment` primero), pero
  un valor que se sabe inválido en disco es una trampa para quien no herede el
  entorno.
- `bin/session_restart` murió con un traceback en este clon: `declared_wiring`
  llama a `reach()` para componer los `--repo`, y en un clon de thyrox solo
  `reach()` lanza `ReachRootError` (sin `THYROX_REACH_ROOTS`) o `KeyError` (sin
  `THYROX_CLONE_PREFIX`). TASK-THYROX-0927: `reach_roster()` los convierte en
  `WiringRefused`; el relevo sale 2 con `REHUSA` y la variable que falta.
  Rojo `outputs/red-0927.txt` (4), verde 4, anulación `outputs/annul-0927.txt`
  (las 4). `tests/session/test_session_restart.py`: 81 ok y 4 fallas, las
  mismas 4 en HEAD.
- Sin resolver y fuera de esta tarea: `tests/session/test_user_wiring.py` no
  puede correr en un clon de thyrox solo (su caso 1 pide un roster al entorno),
  y el relevo sigue rehusando aquí, ahora con su causa: necesita
  `THYROX_CLONE_PREFIX` o un roster declarado.
