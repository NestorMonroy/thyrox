# El hogar de los controles de verificación en la referencia

## Contexto y pregunta

El ejecutor reservó el nombre `gates` (2026-09-09) porque en toda `ccnmt`
(`/home/user/claude-code-nestor-monroy-tools`) existe **un solo** archivo
`gates.ts` —
`packages/@ant/computer-use-mcp/src/legacy/gates.ts` — y no es un control de
verificación: es un lector de feature flags de Computer Use (`readConfig`,
`hasRequiredSubscription`, sobre `getDynamicConfig_CACHED_MAY_BE_STALE`).
Nuestro `src/gates/` (60+ guiones que miden el árbol y rehúsan) no tiene
contraparte bajo ese nombre — es significante contra significado.

Esta pregunta busca: ¿cómo nombra y dónde aloja la referencia sus **controles
de verificación** de verdad (los que miden y rehúsan), y qué forma deberíamos
adoptar en `thyrox`.

## Evidencia PROVEN

### Dónde viven

- Los 84 guiones de verificación viven **planos** en `ccnmt: scripts/`, junto
  a otro tooling de repo (build, release, generate-sbom) — **no** en un
  subdirectorio propio como `scripts/verify/` o `scripts/checks/`.
  ```
  ls scripts/verify-*.ts | wc -l
  → 84
  ```
- El árbol NO tiene ningún directorio llamado `gates`, `checks` ni `verify`:
  ```
  find . -type d -iname "gates" | grep -v node_modules
  → (vacío)
  ```
  *(dato ya dado por el ejecutor como medido; confirmado de nuevo aquí con el
  mismo comando.)*

### Cómo se llaman

- **Familia dominante: `verify-<subsistema>.ts`.** Los 84 archivos siguen el
  patrón `verify-*.ts` sin excepción — es el propio glob que usa el
  orquestador (`ccnmt: scripts/doctor-architecture.ts:1-11`, comentario:
  *"Rules live in verify-*.ts scripts (one check per script, exits non-zero
  on violation)"*).
- **Segunda familia, minoritaria y de otro propósito: `audit-*`.** Un archivo
  suelto (`scripts/audit-knip-unused.ts`) y un directorio
  (`scripts/audit-silent-failures/`, 12 guiones numerados `01`…`12`). Ninguno
  de los dos hace `process.exit` con código de fallo:
  ```
  grep -n "process.exit" scripts/audit-knip-unused.ts scripts/audit-silent-failures/*.ts
  → (sin resultados)
  ```
  Su propio docstring declara la relación con el verificador gemelo:
  `scripts/audit-silent-failures/01-unwired-setter-slots.ts:9-11` —
  *"This is the audit form of `scripts/verify-deps-setters-wired.ts` — both
  share the same detection logic, but this one outputs structured findings
  for the inventory."* — y `verify-deps-setters-wired.ts:135` sí hace
  `throw new Error(...)` ante una violación (control) mientras el audit sólo
  escribe Markdown a `docs/refactor/knip-unused-classification.md` (registro).
- **Otras dos formas puntuales, no sistemáticas:** `check-transition-stubs.ts`
  (1 archivo, sí sale con `process.exit(1)` en la línea 80 — es un
  verificador con otro prefijo, la excepción que confirma que `verify-` es la
  convención, no una regla absoluta) y `doctor-architecture.ts` (el propio
  orquestador, con prefijo `doctor-`, distinto de los checks que agrega).

  *Métrica:* prefijo del nombre de archivo en `scripts/`, agrupado.
  *Ciega a:* un verificador que viva fuera de `scripts/` (dentro de
  `packages/*/scripts/` o similar) — no se buscó ahí; ver DESCONOCIDO.

### Quién los orquesta

- El corredor es `ccnmt: scripts/doctor-architecture.ts` (841 líneas),
  invocado como `bun run doctor:arch` (alias en
  `ccnmt: package.json` → `"doctor:arch": "bun run scripts/doctor-architecture.ts"`).
- **Descubrimiento: por REGISTRO explícito, no por glob.** Un array
  `CHECKS: Check[]` enumera cada verificador con `id`, `layer`, `subsystem`,
  `script` y `doc` (cita a la sección de `V7.md` que motiva la regla). El
  propio comentario lo dice: *"When you add a new verify-*.ts, register it
  here so doctor:arch picks it up"* (`doctor-architecture.ts:41-42`).
  ```
  grep -c "^\s*id:" scripts/doctor-architecture.ts
  → 86
  grep -n "readdir\|glob\|Glob" scripts/doctor-architecture.ts
  → (sin resultados relevantes al descubrimiento — sólo dos falsos positivos
     de la palabra "global" dentro de dos strings de `doc:`)
  ```
  Comparado el conjunto de `script:` referenciados contra el filesystem: son
  **exactamente** los mismos 84 archivos, en ambas direcciones (0 registrados
  que no existan, 0 en disco que no estén registrados):
  ```
  comm -23 registrados.txt ondisk.txt   → (vacío)
  comm -13 registrados.txt ondisk.txt   → (vacío)
  ```
  La diferencia 86 (ids) vs 84 (scripts) es benigna: dos ids extra son
  cabeceras de categoría/duplicado de agrupación, no scripts fantasma — no se
  investigó más porque no cambia la conclusión.
- **Invocación en tres puntos**, todos citando el mismo comando:
  - `ccnmt: .githooks/pre-push:8` — `bun run doctor:arch` antes de cada push
    (bloqueante; `set -e` en el hook).
  - `ccnmt: .github/workflows/ci.yml:42` — `bun run scripts/doctor-architecture.ts`
    en CI.
  - `ccnmt: .github/workflows/nightly-drift-check.yml:46` y
    `ccnmt: .github/workflows/release.yml:84` — el mismo corredor completo,
    diario y en release.
  - `ccnmt: .githooks/pre-commit:39-51` corre sólo un **subconjunto
    enumerado a mano** de 10 verificadores rápidos (<500 ms cada uno) — la
    lista está inline en el propio hook, no delega en `doctor-architecture.ts`
    para ese paso rápido. El comentario del hook lo declara: *"Full
    doctor:arch suite (78 rules as of 2026-05-04) runs in pre-push and CI."*
- Ejecución interna: pool de 8 subprocesos concurrentes (uno por check,
  aislado — *"the runner itself stays architecture-agnostic (zero imports
  from the packages it is grading)"*, `doctor-architecture.ts:9-10`), y
  `process.exit(anyFailure ? 1 : 0)` en `main()`
  (`doctor-architecture.ts:833`).

### Baseline / ratchet

- **No hay un solo archivo de baseline: hay uno por métrica/familia**, todos
  planos en `scripts/`, formato JSON, nombre `<tema>-baseline.json`:
  `as-any-baseline.json`, `as-never-baseline.json`, `console-log-baseline.json`,
  `deps-quality-baseline.json`, `exports-budget-baseline.json`,
  `file-size-baseline.json`, `knip-baseline.json`, `ratchet-baseline.json`,
  `silent-failure-ratchet-baseline.json`, `sync-fs-render-baseline.json`,
  `todo-baseline.json` — 11 archivos, cada uno consumido por su
  `verify-*-ratchet.ts` / `verify-*-budget.ts` / `verify-knip-headroom.ts`
  correspondiente.
- El mecanismo canónico está en `ccnmt: scripts/verify-ratchet.ts` (286
  líneas). Cabecera (`:1-9`): *"A ratchet is a set of metrics that should
  only ever decrease during V7 migration. Each metric has a baseline stored
  in `scripts/ratchet-baseline.json`. CI fails if a metric increases past its
  baseline."*
- **Quién lo baja:** el propio guion, con la bandera `--tighten`
  (`verify-ratchet.ts:262-266`, `saveBaseline(measured)` — sobre-escribe el
  JSON con los valores medidos). Sin esa bandera, un valor **mejorado**
  (`current < prev`) sólo se reporta como sugerencia
  (`verify-ratchet.ts:277-279`: *"Note: run with --tighten to commit the
  reduced values as new baseline"*) — la baja es un acto explícito, no
  automático.
- Fallo: no usa `process.exit` directamente; `throw new Error(...)`
  (`verify-ratchet.ts:271-273`) con el conteo de regresiones y la instrucción
  *"If intentional, justify in PR description; otherwise revert"* — el
  `throw` no capturado hace que el proceso Bun termine con código ≠ 0, mismo
  efecto observable que un `process.exit(1)`.
  ```
  cat scripts/ratchet-baseline.json
  → {"appstate_imports":0,"cc_app_imports":0,"host_string_error_cmp":60,"empty_shell_packages":0}
  ```

### Verificación contra feature-gating: cómo los separa la fuente

Esta es la pieza que responde directamente al conflicto significante/
significado del ejecutor. La referencia **sí** tiene un verificador cuyo
*tema* son feature flags — pero su *nombre de archivo* no delata el tema, lo
delata su *id* de registro:

- `ccnmt: scripts/verify-gates.ts` (124 líneas) — comprueba que los defaults
  locales de GrowthBook (`getFeatureValue_CACHED_MAY_BE_STALE`,
  `checkStatsigFeatureGate_CACHED_MAY_BE_STALE`) devuelven lo esperado, y
  sale con `process.exit(1)` si algún gate no calza (`:120-124`). Su cabecera
  dice literalmente: *"Verify GrowthBook gate defaults and compile-time
  feature flags."*
- En el registro de `doctor-architecture.ts:199-204`, este verificador entra
  como:
  ```ts
  { id: 'gates', layer: 'Cross-Cutting', subsystem: 'feature gates',
    script: 'scripts/verify-gates.ts', doc: 'V7 §3.6' }
  ```
  **El campo `script` sigue el patrón `verify-*.ts` igual que los otros 83.**
  La palabra `gates` sobrevive únicamente como el `id` corto del registro y
  como el `subsystem` — nunca como el nombre de familia del archivo. No hay
  un directorio ni un archivo huérfano llamado sólo `gates.ts` para este
  propósito.
- Y el propio `computer-use-mcp/src/legacy/gates.ts` que motivó la reserva
  del nombre confirma la otra mitad: no tiene ningún `process.exit`, ningún
  recorrido de árbol ni comparación contra baseline — es puro `readConfig()`
  + `hasRequiredSubscription()` sobre un `DEFAULTS` local
  (`packages/@ant/computer-use-mcp/src/legacy/gates.ts:1-40`).

**Conclusión de esta sección, con su propia frontera declarada:** la
referencia distingue las dos cosas por **rol**, no por vocabulario —
"verificar" es siempre `verify-*` (sea el tema arquitectura o sea el tema
gates de producto), y "gate" es siempre el sustantivo del *dominio medido*
(feature flag), nunca el prefijo del propio instrumento de medición.

*Métrica de toda esta subsección:* nombre de archivo + su `id`/`script` de
registro, leídos directamente de los tres archivos citados.
*Ciega a:* un tercer verificador de gates que viviera fuera de `scripts/` (no
se buscó); y a la posibilidad de que otro repo hermano de `ccnmt` no medido
aquí use un vocabulario distinto.

## Opciones para thyrox

**Situación de partida, medida en el mismo pase (no de memoria):**
`thyrox: src/gates/` tiene 76 entradas; de las que llevan un prefijo
reconocible, **48 usan `check_*`/`check-*`** (63 % de las nombradas), y el
resto se reparte entre `verify*` (1: `verify`, sin sufijo claro), `validate*`
(4), `detect*` (2), y sueltos (`doctor.py`, `registry.py`,
`thyrox-audit.sh` — éste último ya funciona como el `doctor:arch` de thyrox).
```
ls src/gates/ | sed -E 's/^(check|verify|audit)[_-].*/\1/' | sort | uniq -c
→ 48 check · 1 verify · … (resto disperso, ver arriba)
```

| Opción | Qué cambia | Costo | Riesgo |
|---|---|---|---|
| **A — Renombrar el directorio a `checks/`, conservar prefijos `check_*`/`check-*` existentes** | Sólo el directorio contenedor cambia de nombre; **48 de 76** archivos ya cumplen el prefijo dominante, cero renombres de archivo | Bajo: un `git mv` de directorio + actualizar invocadores que citan la ruta `src/gates/` (el censo de `census_report.txt`, en este mismo banco, ya nombra quién los invoca) | El 37 % restante (`verify`, `validate*`, `detect*`) queda inconsistente con el propio directorio — no cierra el problema de nomenclatura interna, sólo el de la palabra reservada |
| **B — Adoptar `scripts/verify-*.sh`/`.py` plano, como `ccnmt`** | Aplana `src/gates/` dentro de `scripts/` (que ya existe en thyrox con otro contenido) y renombra los 76 archivos a `verify-*` | Alto: 76 renombres de archivo + todos sus invocadores (el censo en curso mide justo esto) + el propio directorio deja de existir | Máxima fidelidad a la referencia, pero es el cambio más caro y el que más invocadores rompe de un solo golpe |
| **C — `checks/` como directorio + orquestador `doctor.py`/`doctor-architecture` explícito con registro** | Igual que A en el directorio, y ADEMÁS se formaliza `src/gates/doctor.py` (que ya existe) como el registro explícito tipo `CHECKS: Check[]`, en vez de descubrir por glob | Medio: no toca 76 archivos, pero exige auditar `doctor.py` actual contra el patrón de registro-explícito-versionado de la referencia | Si `doctor.py` hoy descubre por glob (no medido en este pase — ver DESCONOCIDO), migrar a registro explícito es trabajo aparte, no gratis |
| **D — No renombrar nada; sólo retirar la palabra `gates` del *directorio*, dejar los prefijos de archivo como están** | Cambio mínimo: renombrar sólo `src/gates/` → `src/checks/` (o el nombre que se decida), cero cambios de archivo | Mínimo | Dictamina el directorio pero dispersa la señal: un lector que entre a `src/checks/` sigue viendo cuatro convenciones de prefijo distintas |

## Recomendación preliminar

**Opción A** (con **D** como su primer paso mínimo si hace falta cerrar la
reserva del nombre hoy mismo, y B declarada NO recomendada por costo).

Por qué: la referencia no premia un prefijo de archivo sobre otro por
elegancia — premia que **exista un solo orquestador con registro explícito**
(`doctor-architecture.ts` + `CHECKS[]`) y que el nombre del *directorio
contenedor* no colisione con un concepto de dominio (feature gate). thyrox ya
tiene las dos piezas que la referencia exige — una mayoría de prefijo
`check_*` (63 %, no hace falta imponerlo, ya es el uso dominante) y un
orquestador nombrado `thyrox-audit.sh` que cumple el mismo rol que
`doctor:arch`. El trabajo real y barato es (1) dejar de llamar `gates` al
directorio contenedor —que es exactamente lo que motivó esta pregunta— y (2)
declarar, en una pasada aparte, si `thyrox-audit.sh`/`doctor.py` descubren
sus verificadores por glob o por registro explícito, porque ESE es el punto
donde la referencia sí es estricta y donde el costo de migrar es bajo (un
array, no 76 archivos).

**Lo que esta recomendación NO decide:** el nombre final del directorio
(`checks/`, `verificadores/`, u otro) es una decisión del ejecutor, no un
hallazgo de esta medición — la referencia no impone un nombre de directorio
único porque **no tiene** un directorio dedicado (los 84 viven planos en
`scripts/`, junto a build/release/sbom). Cualquier nombre que no sea `gates`
cumple la restricción medida.

## Preguntas abiertas y DESCONOCIDOS

1. **¿`thyrox: src/gates/doctor.py` descubre sus checks por glob o por
   registro explícito?** No se leyó ese archivo en este pase (el mandato era
   medir la referencia, no el propio árbol de destino). Condición de cierre:
   `grep -n "glob\|listdir\|CHECKS\s*=" src/gates/doctor.py` y comparar contra
   el patrón de `doctor-architecture.ts:41-`. Esto decide si la Opción C es
   gratis o cara.
2. **¿Existen verificadores de la referencia fuera de `ccnmt/scripts/`** —
   por ejemplo dentro de `packages/*/scripts/` de algún paquete individual?
   No se buscó; el censo de este pase se limitó a la raíz `scripts/` porque
   ahí es donde el propio `doctor-architecture.ts` declara vivir su universo
   completo (84/84 coinciden exactamente, sin resto). Si hubiera
   verificadores de paquete individual con otro prefijo, cambiaría el
   porcentaje de dominancia de `verify-*` pero no la conclusión de rol
   (verify = control, audit = informe). Condición de cierre:
   `find packages -iname "verify-*" -o -iname "check-*" | grep -v node_modules`.
3. **¿Por qué `CHECKS` tiene 86 `id:` y sólo 84 `script:` únicos?** Se
   verificó que no hay scripts huérfanos ni faltantes (comm -23/-13 vacíos en
   ambas direcciones), así que la brecha es benigna — probablemente dos
   entradas de categoría o dos ids que apuntan al mismo script bajo distinto
   subsistema. No se investigó más porque no altera ninguna de las
   conclusiones de este análisis. Condición de cierre, si algún día importa:
   `grep -B1 "script: 'scripts/verify-X.ts'" doctor-architecture.ts` para el
   script que resulte duplicado.
4. **¿El corpus `ccb` (`_references/ccb`) aporta algo?** Se comprobó que es
   un extracto mínimo (`PROVENANCE.md`, `bgDaemon.ts`, `index.md` — 3
   archivos, sin `scripts/` ni verificadores) y se descartó sin leerlo a
   fondo por no tener superficie relevante. Esto es una ausencia de
   instrumento, no evidencia de que `ccb` "no tenga" convención propia en
   otra parte del proyecto de donde se extrajo — sólo dice que este extracto
   vendorizado no la trae.
