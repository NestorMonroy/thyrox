# `.env` fuera del árbol y `.env.example` como su declaración

`.env` deja de versionarse (va a `.gitignore`): es del consumidor y puede
llevar secretos, como `THYROX_STORAGE_ENCRYPTION_KEY`. `.env.example` es lo
que viaja, y el gate nuevo `src/verify/check_env_example_coverage.py`
(`bin/check_env_example_coverage`, registrado como `env-example-coverage`)
comprueba que cada clave de `.env` y `.env.local` figure en él, comparando
nombres y sin imprimir ningún valor.

## Control

`python3 tests/verify/test_env_example_coverage.py` — 9 de 9 en verde. El
árbol real: 19 claves en `.env`, 0 sin declarar.

Anulaciones (cada salida en `anulacion-<nombre>.txt`):

| Mitad de juicio retirada | Caídas |
|---|---|
| una clave comentada en el ejemplo cuenta como declarada | 2: todas declaradas, el árbol real |
| una clave comentada en el `.env` no cuenta | 1: comentario que menciona una clave |
| `.env.local` también se mide | 1: la sobreescritura local |
| `export CLAVE=` es una clave | 1: clave exportada |

La primera tanda dejó dos sin discriminar (`comentadas-env` y `export`): las
pruebas no ejercían esos casos. Se añadieron los casos y se repitió.

## Deuda que destapó

`tests/verify/test_env_contract_keys.py` estaba en rojo antes de este cambio:
11 claves `THYROX_*` leídas por el código y ausentes de `.env.example`, casi
todas de las fases recientes (`entrypoint.ts`, `modelCapabilities.ts`,
`fastMode.ts`, `subprocessEnv.ts`). Se declararon; el test vuelve a verde.
