# #106e-5a — estado y circuito del refresco proactivo

Primera parte del refresco proactivo de `omniroute: src/lib/tokenHealthCheck.ts`:
lo que se lee y se escribe en una conexión, sin barrido ni reloj.

| Módulo | Qué |
|---|---|
| `refresh/health/connectionExpiry.ts` | caducidad del token, reintentos de una conexión expirada, forma de las conexiones de Copilot |
| `refresh/health/refreshCircuit.ts` | la escalera de espera tras un fallo, el reintento corto de red, y qué proveedores descartan un refresh token muerto |

| Archivo | Qué |
|---|---|
| `red-106e5a.txt` | la mitad roja |
| `annul-106e5a.sh` | 32 anulaciones |
| `rerun-106e5a.sh` | la re-medida tras afinar |
| `results-106e5a.txt` | veredicto |

## Veredicto de las anulaciones

30 de 32 discriminaron a la primera. En las otras dos la prueba no ponía el
caso delante:

- **8** (la columna vieja gana al dato nuevo): la prueba nunca tenía las dos
  fuentes a la vez. Ahora sí.
- **22** (una espera que no es texto cuenta): el número probado ya era
  pasado. Ahora se prueba también un instante futuro en número, que tampoco
  cuenta: el circuito sólo guarda texto.

## Divergencias declaradas

- **`tokenRefreshCircuit.ts` y las funciones de estado viven juntas.** En la
  referencia el circuito se separó sólo para no arrastrar el planificador,
  que arranca temporizadores al importarse; aquí nada arranca al importar, y
  la separación es por responsabilidad: lo que se lee de la conexión y el
  circuito.
- **Las funciones privadas de la referencia se exportan** (caducidad
  efectiva, reintentos, base de Copilot): las usan el barrido y las
  comprobaciones por proveedor de las fases siguientes.
- **El respaldo `existingCircuit?.until ?? transientUntil` no existe:** sólo
  se alcanzaba cuando la espera guardada es más larga que la de red, y eso
  exige que exista.
- Los nombres cambian a la forma de este árbol: `getRefreshBackoffUntil` →
  `refreshBackoffUntil`, `getCopilotTokenBaseUrl` → `copilotTokenBaseUrl`,
  `isGitHubAccessTokenOnlyConnection` → `isGithubAccessTokenOnlyConnection`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 445 tests, 0 fail (tsc-106e5a).
