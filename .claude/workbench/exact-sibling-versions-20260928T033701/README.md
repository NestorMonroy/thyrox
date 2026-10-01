# Hermanos por versión exacta, no por `workspace:*` (#78)

**Pregunta:** ¿se puede declarar cada hermano del workspace por la versión que
él mismo declara, y qué comprueba Bun 1.3.11 cuando se hace?

**Medido (sonda de dos miembros, en `.claude/cache`, retirada después):**
- `"@t/a": "0.1.0"` con el miembro en 0.1.0 → Bun enlaza el miembro local
  (`node_modules/@t/a -> ../../../a`) y el import resuelve.
- Con `"0.2.0"` → `GET registry.npmjs.org/@t%2fa - 404`,
  `@t/a@0.2.0 failed to resolve`. El pin se comprueba al instalar; con
  `workspace:*` no hay pin que comprobar.

**En el árbol:** `probes/pin.py` sustituyó 354 especificadores `workspace:*`:
329 de `@thyrox/*` y 25 de miembros con nombre heredado (`@ant/*`,
`@anthropic/ink`).

**El lockfile (H-THYROX-225):** `bun install`, `--force` y `--lockfile-only`
dejan la sección `workspaces` de `bun.lock` con `workspace:*`. Regenerarlo
desde cero re-resuelve 120 paquetes externos, y esa deriva no se acepta.
`probes/pin_lock.py` lleva al lock los especificadores de los manifiestos.
`bun install --frozen-lockfile` NO lo valida: con un especificador mutado
sale 0 igual. Por eso lo mide la prueba.

**Prueba:** `tests/verify/exactSiblingVersions.test.ts`, en rojo antes del
cambio. Anulaciones:
- con un especificador del lock mutado cae exactamente el caso del lock;
- con un manifiesto en `9.9.9` es `bun install` el que falla.

**Suites:** app-host, cli, sibling_exports, single_workspace_root,
build_javascript, node-resolution, provider_refresh y package_typecheck, sin
fallos (`.claude/jobs/pin-siblings-*`).

**Lo que no cambia aquí:** el `default` de cada `exports` sigue apuntando al
fuente. Consumir el build JS es la otra mitad de #78 y depende de #81.
