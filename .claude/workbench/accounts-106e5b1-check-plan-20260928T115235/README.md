# #106e-5b-1 — la decisión del refresco proactivo

La parte sin efectos de `checkConnection` de `omniroute: src/lib/tokenHealthCheck.ts`,
en `src/accounts/refresh/health/checkPlan.ts`: qué hacer con una conexión
antes de llamar a nadie, si un error fue de red, y cómo se escriben un
refresco que funcionó y un refresh token muerto.

| Archivo | Qué |
|---|---|
| `red-106e5b1.txt` | la mitad roja |
| `annul-106e5b1.sh` | 48 anulaciones |
| `rerun-106e5b1.sh` | la re-medida tras afinar |
| `results-106e5b1.txt` | veredicto |

## Veredicto de las anulaciones

42 de 48 discriminaron a la primera; la 31 apuntaba a un texto de otro
módulo (`connectionExpiry.ts`, medido en #106e-5a) y se retiró del guion.

- **1** (sin id) y **2** (proveedor excluido): los casos probados ya los
  descartaba una guarda posterior. Ahora llevan todo lo que haría falta para
  refrescarlos.
- **22** (agotada sin desactivar): sólo se alcanza con una conexión de GitHub
  expirada sin refresh token que, aun así, trae uno. La mitad `SKIP` del
  ternario era código muerto: una inactiva sin reintentos ya se saltó en la
  guarda de inactivas. Se retiró y la prueba tiene el caso alcanzable.
- **33** (sin la causa del error): el caso probado traía también el código.
  Ahora hay una causa sólo con mensaje.
- **40** (circuito sin limpiar): la anulación dejaba un `else` suelto; el
  error de sintaxis tumbaba la prueba entera y el resumen, que contaba líneas
  `(fail)`, lo leía como cero. Se reescribió con `if (false)`, y el resumen
  cuenta ahora el total `N fail`.

## Divergencias declaradas

- **La decisión es una función pura** (`planConnectionCheck`) que devuelve
  qué hacer; los efectos van en `connectionHealthCheck.ts` (#106e-5b-2). En
  la referencia la decisión y las escrituras van mezcladas en una función de
  380 líneas.
- **La escritura de un refresco no incluye `expiredRetryCount: null` ni
  `expiredRetryAt: null`**: esas columnas no existen en este almacén, y los
  reintentos viven en los datos de la conexión, donde `clearRefreshCircuit`
  ya los borra.
- `isTransientRefreshError` es la clasificación que la referencia hace en
  línea dentro del `catch`, con las mismas expresiones.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes, tras sustituir dos conversiones de unión en la prueba (TS2352) por un ayudante `updateOf` (tsc-106e5b-2).
