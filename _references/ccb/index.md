# `ccb` — supervisor de trabajos en segundo plano

Creado: 2026-08-13T18:06:49

## Qué es, y por qué está aquí

Implementación de un daemon supervisor de trabajos en segundo plano que
**refleja** el camino `bg` de Claude Code: liga el socket de control, adopta
los trabajadores que ya corrían, y atiende las operaciones RPC del CLI. Sus
comentarios citan los módulos del binario de Anthropic por identificador
(`ant 5170.js iFK:219`, `ant 4644.js iw6`) — es decir, quien lo escribió
tenía el paquete minificado delante y produjo una implementación paralela.
Quién sea ese autor y bajo qué derechos es justo lo que
[PROVENANCE.md](PROVENANCE.md) declara **no resuelto**.

**Procedencia y derechos: sin licencia declarada.** Leer
[PROVENANCE.md](PROVENANCE.md) **antes** de reusar o redistribuir nada de
aquí. La ausencia de `LICENSE` es deliberada: el repositorio de origen no
declara licencia y su paquete raíz está marcado `UNLICENSED`, así que rige
el copyright por defecto.

## Cómo se cita — alias `ccb:`

```
ccb: bgDaemon.ts:462-469   →  .claude/references/ccb/bgDaemon.ts
```

Mismo criterio que `hccw:` y que los alias de `odoo-tools`: se cita el alias,
no la ruta larga, para que un movimiento de directorio cueste una fila de
convención en vez de decenas de citas.

## Su rango como fuente — por encima de `hccw`, por debajo del binario

La tabla de autoridad de
[how-claude-code-works/index.md](../how-claude-code-works/index.md) ordena las fuentes
por rango. `ccb:` entra **dentro del rango 3** (no es documentación oficial de
Anthropic ni nuestro binario), pero es **mejor evidencia que un capítulo de
ingeniería inversa** para una pregunta concreta: *¿bajo qué condición dispara
este mecanismo?*

Lo demostró en su primer uso. El capítulo 21 de `hccw` infirió del nombre que
`_respawn_unconfirmed_bail` significaba "confirmar la muerte antes de
respawnear"; `bgDaemon.ts:462-469` muestra que dispara cuando el trabajo
**muere antes de confirmar que arrancó**, para que quien espera reciba el error
real en vez de un timeout. El capítulo había declarado exactamente esa ceguera:
*"los nombres se leen verbatim de las cadenas … pero bajo qué condiciones
dispara cada evento no tiene una sola línea de fuente que lo respalde"*.

Corrección registrada en [H-DOCS-140](../../../source/gestion/pm/docs/iniciativas/integrar-referencia-how-claude-code-works/hallazgos/hallazgo-H-DOCS-140-tres-mecanismos-colapsados-en-un-nombre.rst). Es la razón por la que este corpus
merece estar versionado y no sólo citado.

## Lo que este código NO es

**No es el binario que corremos.** Refleja el camino `bg` de Claude Code, pero
nuestro CLI (`2.1.42`) no ejecuta nada de esto. Aplica la misma regla que con
la referencia Odoo: **gobierna sin ejecutarse**. Una cita de aquí funda un
diseño nuestro; **nunca** funda una afirmación sobre lo que nuestra sesión hace.

## Coste en el piso de contexto

Cero. `.claude/references/` es on-demand — no se carga en cada sesión, a
diferencia de `.claude/rules/` (I-009). Se lee con `Read`/`grep` cuando hace
falta.

## Qué consumió este corpus hasta hoy

| Fragmento | Qué fundó |
|---|---|
| `:462-469` `respawn_unconfirmed_bail` | `.claude/scripts/session/esperar-marcador.sh` — abortar con el error real en vez de agotar el timeout |
| `:599-604` `respawn-stalled` + `EGAVEUP` | el ledger de intentos de `reconciliar-agentes.sh` — un solo relanzamiento por id |
| `:638-642` `respawn_stale` | el guard de `--confirmar-muerte` — anti-duplicación por comparación de pid |
| `:357-414` retiro por memoria baja | **no adoptado**, DESCONOCIDO declarado en [H-DOCS-140](../../../source/gestion/pm/docs/iniciativas/integrar-referencia-how-claude-code-works/hallazgos/hallazgo-H-DOCS-140-tres-mecanismos-colapsados-en-un-nombre.rst) |
| `:148-195` pool de repuestos | **no aplica** — presupone que nosotros lanzamos los procesos |
