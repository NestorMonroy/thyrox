# Anulación de los certificados sin comandos del sistema (F5a)

`rootCa`, `migration`, `activeCert` y `generate` en
`src/packages/mitm/src/cert/`. Salida literal en `results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — la clave de la CA sin `0o600` | el de los permisos de la clave |
| A2 — la CA se regenera en cada llamada | el que exige cargar la misma CA |
| A3 — la migración no mira si ya hay CA | la CA persistida que manda sin la opción |
| A4 — la hoja con un solo SAN | los dos que exigen todos los hosts de antigravity |
| A5 — `generateCert` ignora `force` | el que exige emitir una hoja nueva |

`install.ts` y su prueba de la referencia (`agent-bridge-cert-trust-mismatch`)
quedan para F5b: dependen de `systemCommands`, que es de F6.
