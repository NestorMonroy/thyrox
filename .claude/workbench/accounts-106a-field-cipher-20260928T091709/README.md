# #106a — cifrado en reposo de las credenciales de una conexión

Porte de `omniroute: src/lib/db/encryption.ts` y de sus pruebas
`tests/unit/db-encryption.test.ts` y `tests/unit/encryption.spec.ts` (MIT) a
`provider: src/accounts/fieldCipher.ts`.

- AES-256-GCM, formato `enc:v1:<iv>:<cifrado>:<tag>`, tag de 16 bytes fijo
  (un tag truncado se rechaza en vez de verificarse debilitado).
- Clave: `THYROX_STORAGE_ENCRYPTION_KEY`, derivada con scrypt y la **sal de
  OmniRoute**. Es deliberado: con la misma clave, este store lee lo que el de
  OmniRoute cifró. Una prueba lo demuestra cifrando a mano con esa sal.
- Sin clave, el texto pasa tal cual y se avisa **una** vez por cifrador.
- Un valor cifrado que no se descifra vuelve `null`;
  `decryptConnectionFields` marca la fila con `credentialDecryptFailed` y avisa
  una vez por estado de la fila; `decryptQuiet`, una vez por credencial.
- `migrateLegacyEncryptedString` re-cifra lo guardado con la sal derivada de
  versiones anteriores de OmniRoute.

## Divergencias

| Referencia | Aquí | Por qué |
|---|---|---|
| Estado de módulo: claves derivadas en caché global y un `Set` de avisos global; `importFresh` en las pruebas para cambiar de clave | Un cifrador por clave (`createFieldCipher`), con su canal de aviso inyectado; `fieldCipherFromEnv` lee la variable | Cambiar de clave es crear otro cifrador; las pruebas no recargan módulos |
| `ensureSecretLoaded` busca la clave en `.env` del directorio de datos, del cwd y de `~/.hermes/.env` | Sólo la variable | La carga de `.env` es de la configuración de thyrox, no de este módulo; `~/.hermes` es de otro producto |
| `console.warn`/`console.error` | Un `report(message)` que por defecto escribe en stderr | El store decide dónde van los avisos |
| Si el cifrado falla, guarda en claro | No hay rama: con una clave válida `createCipheriv` no falla | Guardar en claro en silencio ante un error sería peor que el error |

## Lo que queda para #106b

`provider: src/connections.ts` ya trae un modelo de conexión (porte de
`ccnmt`: protocolo, endpoint, auth por tipo, en la config global). Las
`provider_connections` de OmniRoute son otra cosa: cuentas por proveedor con
tokens OAuth, salud, backoff y prioridad. #106b tiene que decidir, midiendo
los consumidores de los dos, si la tabla nueva alimenta a `connections.ts` o
vive al lado.

Rojo persistido en `red-106a.txt`. Anulaciones: `annul-106a.sh`,
`results-106a.txt`.
