# `cliproxyapi` — procedencia y para qué sirve

Creado: 2026-09-27T16:00:03
Origen: `https://github.com/router-for-me/CLIProxyAPI`, commit
`4a2c81864f31f39308e946c4c65e72147855da6e` (fecha del commit
2026-09-27T20:17:03+08:00), clonado con `git clone --depth 1` y sin su
`.git`.

## Qué es

Un proxy local en Go que expone endpoints compatibles con OpenAI, Gemini,
Anthropic y Grok, y reparte las peticiones entre varias credenciales de
varios proveedores (selección por prioridad, round-robin y enfriamiento
ante 429), traduciendo el formato de petición y respuesta entre protocolos.

## Por qué vive aquí

Es la referencia contra la que se porta el proxy de `@thyrox/provider`
(directiva del ejecutor 2026-09-27: *«tienes que integrar las
funcionalidades que se mencionan … como el proxy»*). Cada archivo del
porte cita su `file:line` en este árbol.

## Lo que NO se porta, y por qué

- **El «cloak» de OAuth de Claude** (`disable-claude-cloak-mode`): hace
  pasar las peticiones por el cliente oficial falsificando cabeceras. Es
  suplantación de un cliente ajeno, no un mecanismo de proxy.
- **Los inicios de sesión OAuth que reutilizan el `client_id` de otros
  CLIs** (Codex, Gemini, Grok, Antigravity, Kimi, Devin): la credencial
  que thyrox usa la declara el usuario, nunca se toma prestada.

## Licencia

MIT (`LICENSE` de este árbol).

## Redacción declarada

El árbol de origen incrusta el client ID y el secreto OAuth de Google que
usa su login de Antigravity, en tres archivos:
`internal/api/handlers/management/api_tools.go`,
`internal/auth/antigravity/constants.go` e
`internal/runtime/executor/antigravity_executor.go`. Son credenciales de un
cliente ajeno —la clase de login que este porte no toma— y el escaneo de
secretos de GitHub rehúsa publicarlas. Aquí valen
`REDACTED-GOOGLE-OAUTH-CLIENT-ID` y `REDACTED-GOOGLE-OAUTH-CLIENT-SECRET`;
nada más difiere del commit de origen. Los `sk-ant-*` de las pruebas Go son
marcadores descriptivos (`sk-ant-api-xxx`) y se conservan.
