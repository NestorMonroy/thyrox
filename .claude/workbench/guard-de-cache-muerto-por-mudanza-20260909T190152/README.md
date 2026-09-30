# guard-de-cache-muerto-por-mudanza

## El encargo

> «quiero que revises bien lo de roster, es de maxima prioridad, junto con lo
> del cache y lo de las reglas»

## Lo que se midió

El único `PreModelSwitch` que el harness carga en esta sesión vive en
`/home/user/.claude/settings.local.json` —el settings del cwd— y su comando es:

```
bun run /home/user/kaupamex-docs/.claude/packages/agent/bin/preModelSwitch.ts
```

**Ese archivo no existe.** El paquete se mudó a `thyrox/src/packages/agent/` y
el cableado se quedó atrás. Invocado a mano:

```
error: Module not found ".../kaupamex-docs/.claude/packages/agent/bin/preModelSwitch.ts"
```

El mismo payload por la ruta viva emite el veredicto completo: cambiar de
`claude-fable-5-1` a `claude-opus-5` con 508 503 tokens de contexto reescribe
esos tokens como escritura de caché, **equivalente a 10 170 060 tokens de
lectura**.

Que ese archivo de settings está vivo no es supuesto: sus otros cinco hooks
existen, y `register_agent_session.py` ha escrito **1301 filas** en el store.
Sólo el sexto —el de caché— apunta al vacío.

`kaupamex-docs/.claude/settings.json` **sí** apunta a la ruta viva
(`../thyrox/src/packages/agent/bin/preModelSwitch.ts`), pero un settings de
proyecto sólo aporta hooks cuando ese repo es el cwd, y el cwd es `/home/user`.

## Por qué NO se aplica el arreglo aquí

La ironía es exacta, y decide la acción: **editar `settings.local.json` ahora
costaría lo que el guard existe para evitar.** Medido y ya registrado en
H-DOCS-1012 — la recarga de settings que añadió `advisorModel` fue seguida por
un turno que leyó **0** y escribió **778 297** tokens.

Así que el arreglo es de una línea y su **momento** es la decisión:

```
"command": "bun run /home/user/thyrox/src/packages/agent/bin/preModelSwitch.ts"
```

Se aplica al arrancar una sesión, o justo después de una compactación —cuando
el contexto ya es pequeño—, nunca con cientos de miles de tokens cacheados. Y
el archivo es del ejecutor, fuera de los cinco repos, como
`stop-hook-git-check.sh`.

## Los resultados

*Métrica:* existencia del archivo que cada comando de hook nombra, y salida de
invocar el de caché por sus dos rutas.

*Ciega a:* si el harness llegó a invocarlo —se mide la ruta, no una traza; un
hook que revienta no deja rastro que este instrumento vea—; y a cuánto costó de
verdad su ausencia, porque no hay contador de cambios de modelo sin guardar.
