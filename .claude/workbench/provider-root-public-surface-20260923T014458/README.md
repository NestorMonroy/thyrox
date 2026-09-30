# Superficie pública raíz de provider

## Pregunta

¿Las ocho aristas `TS2305` de `@thyrox/provider` representan implementaciones
ausentes o adaptadores canónicos no publicados por el barrel raíz?

## Evidencia

El cliente Anthropic, las conversiones y stream adapters de Gemini/OpenAI, sus
model resolvers y `ProviderThinkingConfig` ya existen en módulos canónicos. La
prueba roja falló primero por `adaptGeminiStreamToAnthropic` ausente del barrel.

## Implementación

El barrel publica por nombre esas implementaciones y el tipo compartido. No usa
stubs ni duplica los adaptadores de protocolo.

## Resultado

La prueba pública pasa. El gate por paquete nuevo de `feature/thyrox-l4` midió
138 errores propios del provider y 2 269 de hermanos, separando responsabilidad
de cierre. El typecheck global hoisted bajó de 4 919 diagnósticos en 936 archivos
a 4 917 en 933; TS2305 bajó de 495 a 486 y las ocho aristas atribuidas a
`@thyrox/provider` quedaron en cero. El delta total es -2 porque resolver esas
importaciones expuso siete diagnósticos aguas abajo de otras familias.

*Métrica:* aristas TS2305 del provider, gate propio por paquete y cabeceras
TypeScript globales.
*Ciega a:* llamadas de red reales; este control mide el contrato público.

El typecheck completo vive únicamente en
`.claude/jobs/ts2305-provider-green-20260923T014734/outputs/salida.log`.
