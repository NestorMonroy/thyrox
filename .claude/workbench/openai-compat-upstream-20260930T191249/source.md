# TASK-THYROX-0661 — Add an OpenAI-compatible upstream to the local proxy

Análisis previo: `.claude/workbench/proxy-open-models-20260930T184131/README.md`
(léelo completo). Decisión: ADR-THYROX-007, Regla 5 (kaupamex-docs
`source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`).

## Qué falta

El proxy local (`src/packages/provider/bin/localProxy.ts`) conecta sólo el
upstream `claude-cli`. Los traductores Messages↔OpenAI existen en
`src/packages/provider/src/proxy/translators/` (`messagesToOpenAIRequest`,
`openaiToMessagesResponse`, y los de streaming) pero no tienen consumidor en
el proxy. El flujo pedido es:

`thyrox -p (Messages) → proxy local → upstream compatible con OpenAI → modelo abierto`

## Qué se pide (TDD)

1. Un forwarder de upstream compatible con OpenAI en
   `src/packages/provider/src/proxy/openaiCompat/` que: traduce la petición
   Messages a `/v1/chat/completions` con los traductores existentes (no los
   reescribas), reenvía a `baseUrl` declarado, y traduce la respuesta a
   Messages — con y sin streaming, incluidos `tool_use` en la salida y
   `tool_result` en la entrada siguiente (la continuación tras la herramienta).
2. `startServer.ts` acepta esa familia de upstreams por configuración, igual
   que acepta `claudeCli` y `cloud`, y enruta por el modelo declarado.
3. `localProxy.ts` lo conecta cuando se declara (una variable `THYROX_*` con la
   base URL y el modelo, declarada en `.env.example` y probada); sin
   declaración, el comportamiento actual no cambia.
4. Errores del upstream (conexión rechazada, 4xx/5xx, JSON inválido) se
   devuelven como error Messages con contexto (qué upstream, qué URL), nunca
   como una respuesta vacía.

## Controles

- Todo contra un servidor OpenAI falso en loopback (`Bun.serve` en puerto 0),
  en el estilo de `__tests__/fakeCliUpstream.ts`. Nada de red real ni Ollama.
- El recorrido de aceptación con el fake: petición con tools → el fake
  devuelve un `tool_calls` → el proxy entrega `tool_use` → el cliente manda
  `tool_result` → el fake recibe el mensaje `role: tool` con el mismo id y
  responde texto → el proxy entrega texto.
- Anulación: retirar la traducción de `tool_result` hace caer exactamente el
  caso de continuación; dilo con números.
- Ollama y su modelo NO se tocan: eso es TASK-THYROX-0662/0663.
