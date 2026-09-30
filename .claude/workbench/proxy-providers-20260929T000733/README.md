# ¿Qué upstream tiene hoy el proxy local?

Pregunta del ejecutor: ¿se pueden hacer tareas vía el proxy con el único
provider que tenemos?

| Fuente | Estado medido |
|---|---|
| store `provider_connections` | una conexión, `openai` 70913bb3, en `error` (`providers-list.txt`) |
| esa conexión, probada | no descifra su apiKey con la `THYROX_STORAGE_ENCRYPTION_KEY` actual (`providers-test.txt`) |
| credencial en el entorno | ninguna: la cadena de `resolveCredential` da `none` |
| entorno claude (`claude -p`) | autentica solo, pero el proxy no tiene upstream que lo use |

Conclusión: hoy el proxy no tiene ningún upstream utilizable. El único
provider que responde es el entorno claude, y llegar a él desde el proxy es
la tarea C5: primero sólo texto (C5a) y después `tool_use` de ida y vuelta
(C5b y C5c). Un ítem que lee o escribe archivos necesita C5b y C5c.

*Métrica:* `thyrox providers list` y `providers test` sobre el store local.
*Ciega a:* credenciales que existieran fuera del store y del entorno de este
proceso.
