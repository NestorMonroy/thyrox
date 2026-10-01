# Bootstrap del proveedor — resultado

Criterios mínimos (directiva del ejecutor): autenticación, respuesta simple, contexto, tool call
estructurado, lectura de archivo, modificación controlada en unidad, resultado parseable, cero Claude.

Estado: **no evaluado — fallo cerrado antes de la autenticación.** La única credencial disponible está
marcada para rotación y no se usa como sana. No hay otra. Ningún criterio se marca aprobado.

Vía preparada para cuando exista una credencial sana, sin código nuevo: `thyrox -p` dentro de una
unidad → proxy local → upstream OpenAI-compatible (`openaiCompat/forwarder.ts`), con la clave
entregada como `ExecutionSecret` (montaje `--secret`, nunca argv ni `--env`).

Para desbloquear: rotar la clave en la consola del proveedor y escribir el valor nuevo en `.env`
(`THYROX_OPENAI_COMPAT_API_KEY`), junto con `THYROX_OPENAI_COMPAT_BASE_URL` y
`THYROX_OPENAI_COMPAT_MODEL`. El banco registra sólo el nombre y si autenticó.
