# Anulación de los comandos del sistema y la CA del upstream (F6a)

`systemCommands.ts` y `upstreamTrust.ts` en `src/packages/mitm/src/`, más su
uso en el proxy del inspector. Salida literal en `results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — la contraseña comparte stdin con el comando | los tres del plan en pasos y su respaldo |
| A2 — sin la bandera `THYROX_MITM_NO_SUDO` | los dos que quitan `sudo` por la bandera |
| A3 — el `.ps1` elevado no se borra | los dos del ciclo de vida del temporal |
| A4 — la CA configurada no se entrega | los dos `fetch` que la necesitan |
| A5 — el proxy del inspector no la usa | el reenvío a un upstream HTTPS |

A4 y A5 no tienen equivalente en la referencia: allí la CA va al despachador
global de undici, que en Bun no hace nada (H-THYROX-227,
`bun-undici-global-dispatcher-probe-*`).
