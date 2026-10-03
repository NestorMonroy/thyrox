> **ANULADO (política incorrecta).** Este resultado trató `credential_pending_rotation` como
> indisponibilidad. La corrección del ejecutor está en `template.md` («Corrección de la política de
> credenciales») y su control en `outputs/cutover-credential-state.log`. Se conserva como evidencia.

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

## Bootstrap real (tras la corrección de la política de credenciales)

Dentro de una ExecutionUnit, con `THYROX_OPENAI_COMPAT_API_KEY` montada como `ExecutionSecret`
(`--secret-from-env`, nunca argv/`--env`/evidencia), `rotationStatus = pending`, autenticación aceptada.

| Criterio | qwen3.8-flash | deepseek-v4.1-flash |
|---|---|---|
| 1 secreto visible · 2 autenticación · 3 respuesta simple | sí | sí |
| 4 contexto (~8k tokens, dos veces) | sí, pero no respeta «responde sólo el nombre» | sí, respuesta exacta |
| caché del proveedor en la segunda petición | 7168 de 7360 | 7936 de 7989 |
| 5 tool call estructurado | sí | sí |
| 6 lectura · 7 modificación controlada (diff exacto) · 8 resultado parseable (`thyrox -p`) | sí | sí |
| 10 invocaciones de Claude | 0 | 0 |

`-v1` conserva la primera ejecución: el sondeo pedía 16/32 tokens de salida y un modelo con
razonamiento los gastó razonando (respuesta vacía); y «respuesta simple» aprobaba un contenido vacío.
Ambos defectos eran del sondeo, se corrigieron y la segunda ejecución es la que cuenta.

Uso experimental autorizado para continuar TASK-THYROX-0743; no es cualificación productiva.
Candidato para el juicio delegado de P2: **deepseek-v4.1-flash** (instrucciones exactas y mayor
proporción de caché); **qwen3.8-flash** queda permitido como alternativa. Sin respaldo a Claude.
