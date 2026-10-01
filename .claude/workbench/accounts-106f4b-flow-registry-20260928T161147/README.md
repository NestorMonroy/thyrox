# 106f-4b — registro de flujos y `thyrox providers login <provider>`

Qué se construyó:

- `provider: src/accounts/oauth/flowRegistry.ts` — los 25 proveedores de
  `omniroute: src/lib/oauth/providers/index.ts`, en su orden, con la
  configuración leída del entorno (client id sólo de `THYROX_*`). Los alias
  `amazon-q`, `clinepass` y `devin-cli` comparten el objeto de flujo;
  `agy` es un flujo aparte con perfil de cliente `cli`.
- `cli: src/commands/providers/loginVerb.ts` — opciones del verbo
  (`--no-browser`, `--timeout`, `--connection`, `--json`) y código de salida
  (0, 124 al vencer el plazo, 1 en otro fallo, 2 de uso).
- `cli: src/commands/providers/oauthLogin.ts` — el corredor real: flujos,
  servidor de retorno, navegador del sistema y lectura del token (oculta en
  terminal, stdin si no la hay).
- `providers-commands.ts` despacha `login` con el store abierto.
- `OAuthConnectionWriter` (`list`/`create`/`update`) estrecha lo que el
  corredor exige del store.

Rojo persistido: `red-106f4b-registry.txt`, `red-106f4b-verb.txt`,
`red-106f4b-dispatch.txt`.

Anulación (`annul-106f4b.sh`, resultado en `results-106f4b.txt`): diez
retiradas. Dos sobrevivieron en la primera pasada —el perfil de `agy` y la
ruta declarada del id de dispositivo de Kimi— porque ninguna prueba las
preguntaba. Se añadieron dos pruebas (perfil vía `mapTokens`, cabecera
`X-Msh-Device-Id` con el id del archivo) y la repetición
(`rerun-106f4b.sh`, `rerun-106f4b.txt`) tumba las dos.

Divergencias respecto de la referencia:

- El client id no tiene valor incrustado: sin su variable `THYROX_*` el flujo
  rehúsa al usarse, no al construirse.
- El id de dispositivo de Kimi se persiste en el hogar de proveedores de
  thyrox (`THYROX_PROVIDERS_DATA_DIR`), no en el de la referencia.
- El verbo no acepta el secreto por argumento; el token importado se lee
  oculto o por stdin.
