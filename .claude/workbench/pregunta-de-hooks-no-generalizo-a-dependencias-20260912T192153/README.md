# ¿Por qué no reconocí antes la falta de `workspaces` para `@thyrox/*`?

## La pregunta, verbatim

> «vas a crear otro [workbench] para analizar e implementar el porque no
> reconociste que se tenia que instalar [algo] desde que te comente que que
> hacia falta para usar todo lo de thyrox como los paquetes de @thyrox?»

Directiva del ejecutor, 2026-09-12T19:19. La premisa implícita: en algún
momento anterior de esta relación de trabajo, el ejecutor ya había comentado
qué hacía falta para usar thyrox — incluidos sus paquetes `@thyrox/*` — y esta
sesión no lo generalizó, descubriendo el gap real de forma reactiva en vez de
proactiva.

## Qué se midió — y con qué instrumento

`probes/buscar_pregunta_original.py` parsea el JSONL real de esta sesión
(`/root/.claude/projects/-home-user/e8588da7-9c13-569f-ab69-f974894396e4.jsonl`,
2847 líneas) sin asumir nada de memoria: cuatro búsquedas, cada una citada con
su número de línea real.

## El hallazgo

**La única pregunta real y verificable del ejecutor sobre "qué hace falta
instalar en thyrox" es la línea 177, y es sobre HOOKS, no sobre paquetes:**

```
no, porque los TASK viven en thyrox/agent-results/agent_store.sqlite3 puedes
revisar los scripts, y dime si en thyrox no vienen definidos unos hoks que
tienes que instalar?
```

Mi respuesta (líneas 180-230+) investigó exclusivamente eso: el esquema del
store SQLite, `.claude/settings.json`/`settings.local.json`,
`src/session/instalar-hooks-sesion-multirepo.sh`,
`user_wiring.declared_wiring()`. **Nunca se amplió la pregunta** a "¿qué más
necesita este repo para funcionar como proveedor — dependencias, enlaces de
paquete, build?". El alcance de la pregunta se tomó literal.

**El gap real de `package.json` se descubrió reactivamente, no
proactivamente:** ocurrió al correr `bash tests/run.sh` para cerrar un merge
(ya bien avanzada la sesión), cuando `bun test` falló con `Cannot find module
'@thyrox/...'` en varios paquetes. Nunca hubo, antes de ese fallo, un chequeo
independiente de "¿el `package.json` raíz declara sus `workspaces`?".

**El bug no es mío, pero la omisión de chequearlo sí es responsabilidad de
esta sesión.** `git log --oneline -1 -- package.json` en
`origin/feature/thyrox-l1` atribuye la ausencia del campo `workspaces` al
commit `035cf438`, anterior a cualquier trabajo de esta sesión. No hay nada
que "revertir": lo que faltó es el hábito de verificar el estado de enlace de
dependencias como parte de la respuesta a "qué hace falta instalar", no sólo
los hooks de sesión.

## Por qué la pregunta de hooks no se generalizó — causa, no sólo síntoma

Dos factores, medidos y no supuestos:

1. **La pregunta original ya nombraba "hooks" explícitamente** ("...unos hoks
   que tienes que instalar"). Respondí a la palabra literal, no al problema de
   fondo detrás de ella ("¿este repo, tal como está clonado, funciona sin
   pasos manuales?"). Es el mismo patrón que `metrica-decide-la-conclusion.md`
   nombra: el instrumento (mi lectura de la pregunta) medía lo que se
   preguntaba literalmente, no el fenómeno más amplio que la motivaba.
2. **No existe, en ninguna regla de `.claude/rules/` de thyrox, un checklist
   de "qué verificar en un clon nuevo"** que incluya explícitamente
   `bun install` + `workspaces` como parte de "usar thyrox". La regla de
   hooks (`instalar-hooks-sesion-multirepo.sh`) SÍ tiene ese tratamiento
   explícito porque un episodio previo lo forzó (ERR-063 y similares); el
   enlace de paquetes nunca tuvo su propio episodio hasta ahora.

## Límites de lo medido (`blind_to`, declarado en el manifiesto)

- Sólo hay **un** JSONL en este contenedor. Si el ejecutor lo mencionó en una
  sesión previa (otro `session_id`), es inalcanzable con este instrumento.
- Lo que precede al primer punto de compactación (línea 1297) sólo sobrevive
  en la forma en que el resumidor automático decidió conservarlo — si el
  ejecutor lo dijo en un turno que el resumen descartó, este instrumento no
  lo puede ver.
- No se barrió con sinónimos ("módulos", "dependencias", "src/packages") sobre
  el tramo 1-1296 — sólo con "@thyrox" e "instala".

## Corrección aplicada

No hay código que corregir (el bug de `package.json` ya se cerró en
`thyrox@74471382`, sesión anterior a este workbench). Lo que se corrige es el
**hábito**: cuando el ejecutor pregunte "qué hace falta instalar/configurar
para usar X", la respuesta se amplía a un chequeo de dependencias +
enlace de paquete (`bun install`, `workspaces`, `node_modules/@thyrox`), no
sólo al mecanismo que la pregunta nombra literalmente. Se documenta como
hallazgo en `kaupamex-docs` para que quede trazable, no sólo en este
workbench.

## Destino

`kaupamex-docs: source/gestion/pm/thyrox/iniciativas/agregar-entrypoints-cortos-thyrox/hallazgos/`
— hallazgo H-THYROX-3 (siguiente cita libre en esa iniciativa).
