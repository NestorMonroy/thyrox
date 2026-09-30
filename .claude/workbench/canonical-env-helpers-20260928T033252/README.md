# Retirar las copias locales de isEnvTruthy / isBareMode (#53)

**Pregunta:** ¿cuántos paquetes redeclaran los helpers de entorno cuyo hogar
es `@thyrox/config: env/utils.ts`, y puede cada uno importarlos?

**Medido:** `tests/verify/canonicalEnvHelpers.test.ts` en rojo nombró 21
declaraciones en 11 paquetes, más `isEnvDefinedFalsy` en `config/plugin/_deps.ts`.
`env/utils.ts` sólo depende de `configHome`, así que es hoja: importarlo no
abre ciclo de carga. Dos paquetes (`ink`, `bridge`) no declaraban
`@thyrox/config`; se añadió.

**Divergencia que existía:** la copia de `ink` sólo aceptaba `1`/`true`; el
canónico acepta también `yes`/`on`.

**Mecanismo:** `probes/retire.py` borra la definición (con su JSDoc) y deja un
`import` si era privada o un reexport si era exportada.

**Anulación:** una copia temporal en `swarm/src/` hace caer exactamente el
caso 2 del test; retirada, 2/2.

**Suites:** los 11 paquetes desde su directorio, 0 fail
(`.claude/jobs/env-canon-*`).
