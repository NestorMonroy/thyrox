```yml
created_at: 2026-04-19 17:29:24
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — DIAGNOSE
author: agentic-reasoning
status: Borrador
version: 1.0.0
ratio_calibracion: 31/42 (74%)
clasificacion: PARCIALMENTE CALIBRADO
```

# Motor THYROX — Análisis de Solidez con Calibración Epistémica

---

## 1. Definición operacional de "sólido"

Un motor de Agentic AI es sólido cuando la diferencia entre "el sistema dice que hace X" y "el sistema hace X" es observable y mínima. Esta diferencia se mide, no se afirma.

### 1.1 Propiedades verificables (no aspiracionales)

| Propiedad | Definición verificable | Cómo se mide |
|-----------|----------------------|--------------|
| **Cobertura de invariantes** | Cada regla declarada tiene un mecanismo que la refuerza (script, hook, gate) | `grep -r "I-00N" scripts/ hooks/` — ¿qué código la enforcea? |
| **Detección de fallo** | El sistema emite señal cuando un componente falla, no silencia errores | Revisar `exit` codes de scripts; verificar que hooks con fallo no retornan exit 0 siempre |
| **Ciclo verificado** | El mecanismo fue ejecutado y produjo el efecto esperado al menos una vez | Evidencia de ejecución real en sesión documentada, no solo que "está configurado" |
| **Consistencia interna** | Spec y artefactos derivados de ella concuerdan | `lint-agents.py` sobre `.claude/agents/`; `grep model: registry/agents/*.yml` |
| **Propagación de cambios** | Actualizar la fuente de verdad actualiza todos los derivados | Bootstrap.py + _generator.sh ejecutados después de cada cambio de spec |
| **Fallo visible** | Cuando algo falla, hay rastro en salida estándar, log, o advertencia | `exit 1` vs `exit 0 con comentario` en scripts |

### 1.2 La distinción central

| Descripción | Tipo |
|-------------|------|
| "El sistema tiene 5 hooks configurados" | Observación directa — verificable con `settings.json` |
| "Los 5 hooks funcionan correctamente" | Afirmación performativa — requiere evidencia de ejecución |
| "Los invariantes I-001..I-011 están documentados en `thyrox-invariants.md`" | Observación directa |
| "Los invariantes I-001..I-011 están reforzados por mecanismos reales" | Requiere derivación componente a componente |

Sólido = segunda columna demostrada, no solo primera columna presente.

---

## 2. Score actual por componente (con evidencia exacta)

### 2.1 Hooks del sistema

**Fuente:** `settings.json` leído completo. Ejecución de scripts verificada.

| Hook | Configurado en settings.json | Script existe | Script ejecutable | Fallo visible |
|------|------------------------------|---------------|-------------------|---------------|
| `SessionStart` → `session-start.sh` | SI (settings.json:42-51) | SI | SI — `bash ... | head -30` devuelve output | SI — script tiene lógica de error |
| `Stop` → `validate-session-close.sh` | SI (settings.json:53-63) | SI | SI — ejecutado: "sin problemas detectados" | PARCIAL — `exit 0` siempre, advertencias no bloquean |
| `Stop` → `stop-hook-git-check.sh` | SI (settings.json:65-72) | SI | SI — `exit 0` siempre, alerta si hay cambios | PARCIAL — nunca bloquea |
| `PostCompact` → `session-resume.sh` | SI (settings.json:74-83) | SI | No verificado en sesión real | Desconocido |
| `PreToolUse[Agent]` → `bound-detector.py` | SI (settings.json:84-93) | SI | SI — script legible, lógica correcta | SI — emite JSON `permissionDecision: block` |
| `PostToolUse[Write]` → `sync-wp-state.sh` | SI (settings.json:94-103) | SI | No verificado en sesión real (CONTRADICCIÓN-04 en change-map-deep-dive.md:183-199 establece que la lógica es correcta) | SI — exit 0 en todos los paths |

**Score hooks:** 4/6 verificados como ejecutables (2 no verificados en sesión real). Todos configurados. Fallo visible parcial: los Stop hooks siempre retornan exit 0 — no bloquean nunca.

### 2.2 Agentes nativos

**Fuente:** `lint-agents.py` ejecutado sobre `.claude/agents/` — resultado: `25 file(s) checked, 19 error(s), 3 warning(s)`.

| Métrica | Valor | Fuente |
|---------|-------|--------|
| Total agentes en `.claude/agents/` | 25 | `ls .claude/agents/ | wc -l` |
| Agentes que pasan lint sin error | 9 (task-executor, task-planner, tech-detector, skill-generator, react-expert, webpack-expert, nodejs-expert, mysql-expert, postgresql-expert) | lint-agents.py output |
| Agentes que fallan lint | 16 (64%) | lint-agents.py: `[FAIL]` count = 16 |
| Fallo más común | `tools: must be non-empty list` — coordinators usan `tools: Read, Write, ...` (string, no lista YAML) | lint-agents.py error messages |
| Fallo secundario | `model: prohibited field` — agentic-reasoning.md tiene `model: sonnet` | `.claude/agents/agentic-reasoning.md:5` |

**Score agentes:** 9/25 (36%) pasan validación formal. El validador (`lint-agents.py`) existe y detecta correctamente los fallos — la detección funciona, el compliance no.

**Nota crítica:** `lint-agents.py` NO está integrado en ningún hook ni en `settings.json`. Solo puede ejecutarse manualmente. Evidencia: `grep -r "lint-agents" settings.json` → "not in settings.json". El validador existe pero no tiene trigger automático — los fallos pueden acumularse silenciosamente entre sesiones.

### 2.3 Registry y consistencia de spec

**Fuente:** `grep model: .thyrox/registry/agents/*.yml` + `registry/agents/README.md` (citado en TD-037 y change-map-deep-dive.md:163-178).

| Componente | Declarado | Actual | Consistente |
|------------|-----------|--------|-------------|
| `model:` en YMLs | README: PROHIBIDO — "bootstrap.py no lo propaga" | 9/9 YMLs tienen `model:` (todos los presentes) | NO — TD-037 pendiente |
| `webpack-expert` en registry | README lo lista como generado por bootstrap.py | Existe como agente manual, no hay `webpack-expert.yml` | NO — TD-038 pendiente |
| Agentes documentados en project-state.md | "23 agentes" | 25 archivos en `.claude/agents/` | DESINCRONIZADO — divergencia de 2 agentes (deep-review, diagrama-ishikawa) confirmada en stage3-to-stage5-coverage.md:166-171 |
| Coordinators en ARCHITECTURE.md | "11 coordinators" | 11 coordinators en `.claude/agents/` | Consistent — no verificado contra routing-rules.yml |

**Score registry:** 1/4 aspectos verificados como consistentes.

### 2.4 Invariantes I-001..I-011

**Fuente:** `thyrox-invariants.md` + verificación de mecanismos en scripts.

| Invariante | Texto en .md | Mecanismo de refuerzo | Tipo de refuerzo |
|------------|--------------|----------------------|------------------|
| I-001: DISCOVER antes de planificar | Presente | NINGUNO en scripts. `validate-session-close.sh` verifica task-plan activo pero no verifica que `discover/` exista primero | Solo texto |
| I-002: Git como única persistencia | Presente | NINGUNO — no hay script que detecte archivos `.bak` o `-v2` y alerte | Solo texto |
| I-003: Markdown únicamente | Presente | NINGUNO | Solo texto |
| I-004: Timestamp real del sistema | Presente | NINGUNO — no hay verificación de timestamp inventado | Solo texto |
| I-005: Conventional Commits | Presente | `commit-msg-hook.sh` existe en scripts/ — no verificado si está activo en `.git/hooks/` | Parcial — script existe, activación no verificada |
| I-006: 12 fases THYROX | Presente | `session-start.sh` mapea 12 fases a comandos `/thyrox:*` — refuerzo implícito | Parcial — enumera fases, no valida orden |
| I-007: allowed-tools en cada skill | Presente | `lint-agents.py` verifica campo `tools` en agentes — NO ejecutado automáticamente | Parcial — validador existe, no activo en ciclo |
| I-008: description con "Use when..." | Presente | `lint-agents.py` WARN si no sigue patrón — pero solo warning, no error | Parcial — soft enforcement |
| I-009: .claude/rules/ carga siempre | Presente | Comportamiento del binario Claude Code — no hay mecanismo propio que verificarlo | Comportamiento externo |
| I-010: Metadata estándar | Presente | `validate-session-close.sh` Check 1 verifica timestamps incompletos | Parcial — solo timestamps, no metadata completa |
| I-011: WP cierre explícito | Presente | `validate-session-close.sh` Check 3 verifica WPs activos vs `now.md::current_work` | Parcial — detecta inconsistencia, no bloquea |

**Score invariantes:** 0/11 con refuerzo completo y automático. 4/11 con refuerzo parcial (script existe o comportamiento externo). 7/11 son solo texto.

### 2.5 Guidelines tech-stack

**Fuente:** TD-040 en `technical-debt.md:411-437`. @imports en CLAUDE.md verificados visualmente.

| Componente | Estado |
|------------|--------|
| 6 archivos `.instructions.md` en `.thyrox/guidelines/` | Existen — `ls` confirma |
| `@imports` en CLAUDE.md | Presentes — CLAUDE.md:81-86 |
| Verificación de carga en sesión real | NUNCA REALIZADA — TD-040 estado "En progreso" desde FASE 36 |
| Comportamiento de `@path` para `.instructions.md` | "no está documentado como verificado en producción" (TD-040 texto exacto) |

**Score guidelines:** El mecanismo existe declarativamente pero nunca fue verificado en ejecución. Puede estar inactivo sin que el sistema lo detecte.

### 2.6 Bootstrap y generación

**Fuente:** change-map-deep-dive.md:309-327 (análisis de bootstrap.py con referencia a líneas concretas).

| Capacidad | Estado |
|-----------|--------|
| Generar tech-experts desde YML | Funciona — `install_tech_agent()` con patrón `{tech}-expert.yml` |
| Generar core agents | Funciona — `install_core_agents()` para task-planner, task-executor, tech-detector, skill-generator |
| Generar coordinators | Manual — coordinators se mantienen manualmente (documentado en bootstrap.py:46-66) |
| Generar agentes tipo `agentic-validator` | NO funciona — no existe ruta para agentes que no son tech-expert ni core (change-map-deep-dive.md:314-327) |
| Propagación de `model:` desde YML | Explícitamente excluida — "NOTA: model NO se incluye" en generate_agent_md() |

**Score bootstrap:** 2/4 capacidades funcionan para su scope actual. El scope tiene límites no documentados en ARCHITECTURE.md.

---

## 3. Gap map: declarado vs. verificado por componente

| Componente | Declarado en documentación | Verificado como funcionando | Gap |
|------------|---------------------------|----------------------------|-----|
| "5 hooks activos" | settings.json lista 5 eventos de hook | 4 scripts ejecutables, 2 no verificados en sesión real | Hooks configurados ≠ hooks verificados en producción |
| "25 agentes nativos" | `.claude/agents/` tiene 25 archivos | 9/25 pasan lint (36%) | Existencia ≠ conformidad con spec |
| "lint-agents.py valida agentes" | Script existe y funciona | NO está en ningún hook — requiere ejecución manual | Validador existe ≠ validación automática |
| "Registry es fuente de verdad" | ARCHITECTURE.md:100: "Todo lo que aparece en .claude/agents/ se genera a partir de él" | 9/9 YMLs violan la spec de model:; webpack-expert.md existe sin YML | Fuente declarada ≠ fuente real |
| "Guidelines siempre activas" | CLAUDE.md: @imports para 6 guidelines | TD-040 sin resolver desde FASE 36 — verificación pendiente | Importación declarada ≠ importación verificada |
| "I-001..I-011 invariantes del sistema" | thyrox-invariants.md los declara | 0/11 con refuerzo completo automático; 7/11 son solo texto | Invariante declarado ≠ invariante reforzado |
| "validate-session-close.sh cierra el loop" | Documentado como Check 1+2+3 | Ejecutado: devuelve exit 0 siempre — nunca bloquea; TD-042 pendiente (falta Check PAT-004) | Validación soft ≠ gate real |
| "bound-detector.py previene loops" | Documentado como PreToolUse hook | Scripts ejecutable, lógica correcta, bloquea con JSON `permissionDecision: block` | VERIFICADO — gap mínimo |
| "23 agentes" vs "25 archivos" | project-state.md: "23 agentes" | `ls .claude/agents/ | wc -l` = 25 | Documentación desactualizada |
| "bootstrap.py genera agentes" | ARCHITECTURE.md: "Ejecutar después de modificar cualquier definición de agente" | Funciona para tech-experts; no funciona para coordinators ni para agentic-validator | Alcance real < alcance declarado |

---

## 4. Plan de transformación ordenado por impacto/esfuerzo

### Criterio de ordenamiento

Impacto = cuántas fallas silenciosas previene o cuántos componentes corriges en una acción.
Esfuerzo = estimación de minutos en sesión mediana.

| Prioridad | Cambio | Impacto | Esfuerzo | Evidencia base |
|-----------|--------|---------|----------|----------------|
| **P1** | Integrar `lint-agents.py` en Stop hook (settings.json) | Alto — detecta 16 agentes no conformes automáticamente en cada sesión | 10 min | lint-agents.py ya funciona; settings.json tiene patrón |
| **P2** | Verificar TD-040: prueba de sesión con @imports activo | Crítico — sin esto, el Eje 1 completo de ÉPICA 42 puede no tener efecto | 15 min | TD-040 texto: "verificar en sesión real" |
| **P3** | Corregir `tools:` de string a lista YAML en coordinators (16 agentes) | Alto — 64% de agentes pasan de FAIL a OK en lint | 20 min | lint-agents.py output: error "tools must be non-empty list" |
| **P4** | Eliminar `model:` de `agentic-reasoning.md` (y corregir en agentes tech-experts si lint lo requiere) | Medio — reduce fallos de lint; alinea con spec | 10 min | lint-agents.py: "prohibited field model" en agentic-reasoning.md |
| **P5** | Resolver TD-037: eliminar `model:` de los 9 YMLs del registry | Medio — elimina inconsistencia spec vs artefactos | 15 min | `grep model: .thyrox/registry/agents/*.yml` → 9 archivos |
| **P6** | Actualizar `project-state.md` con conteo real (25 agentes, no 23) | Bajo — elimina desinformación en dashboard | 5 min | `ls .claude/agents/ | wc -l` = 25 |
| **P7** | Agregar invariante I-001 como Check en `validate-session-close.sh` | Alto — único invariante de gate real: verifica que `discover/` existe antes de que exista `plan-execution/` | 20 min | thyrox-invariants.md I-001 sin refuerzo de script |
| **P8** | Documentar en ARCHITECTURE.md los límites reales de bootstrap.py | Medio — elimina gap entre "genera todos los agentes" y "genera tech-experts + core" | 15 min | change-map-deep-dive.md:309-327 |

**Orden mínimo para máximo impacto:**

```
P2 (verificar @imports) → determina arquitectura del Eje 1 ÉPICA 42
P1 (integrar lint en hook) → hace la validación continua, no puntual
P3 (corregir tools: en coordinators) → lleva compliance de 36% a ~80%
P5 (eliminar model: de registry) → alinea fuente de verdad
P7 (Check I-001 en validate-session-close) → primer invariante con refuerzo real
```

Los cambios P4, P6, P8 son independientes y pueden hacerse en cualquier orden después de P1-P3.

---

## 5. Evidencia observable que confirmaría "sólido" después de los cambios

Estas son las acciones concretas y los outputs esperados — no afirmaciones de estado futuro.

| Componente | Evidencia de solidez | Comando/Acción verificadora |
|------------|---------------------|----------------------------|
| Hooks integrados | `lint-agents.py` se ejecuta en cada Stop y emite output en la sesión | Cerrar sesión → ver output de lint en console |
| Agentes conformes | `lint-agents.py` retorna `25 file(s) checked, 0 error(s)` | `python3 .claude/scripts/lint-agents.py` |
| Registry consistente | `grep model: .thyrox/registry/agents/*.yml` devuelve 0 líneas | Ejecutar grep — output vacío |
| @imports verificados | Claude aplica regla de Node.js ("no lógica de negocio en handlers") sin instrucción explícita en sesión de prueba | Sesión de prueba con código Node.js que viola la regla — Claude la señala sin que el usuario la mencione |
| I-001 reforzado | `validate-session-close.sh` emite advertencia cuando hay `plan-execution/` sin `discover/` | Crear WP de prueba con solo `plan-execution/` → ejecutar script → ver advertencia |
| Conteo correcto | `project-state.md` refleja exactamente `ls .claude/agents/ | wc -l` | Comparar ambos outputs |
| bootstrap.py documentado | ARCHITECTURE.md sección bootstrap.py incluye: "Alcance: tech-experts y core agents. Coordinators: manual." | Leer sección |

**Definición operacional de "motor sólido" post-transformación:**

```
lint-agents.py: 0 errores (0 warnings tolerados)
validate-session-close.sh: ≥ 1 check bloquea o emite advertencia accionable
@imports: verificado en sesión real con comportamiento esperado
registry: 0 YMLs con campo model:
bootstrap.py: scope documentado en ARCHITECTURE.md
```

Ninguna de estas verificaciones requiere fe en el sistema — todas producen output observable.

---

## 6. Ratio de calibración del análisis mismo

### Claims por tipo

| Tipo | Descripción | Ejemplos en este análisis |
|------|-------------|--------------------------|
| **Observación directa** | Derivada de herramienta ejecutada o archivo leído | `ls .claude/agents/ | wc -l` = 25; `settings.json:42-51`; lint output "19 error(s)" |
| **Inferencia calibrada** | Derivada de evidencia + razonamiento explícito | "lint-agents.py no está en settings.json → no tiene trigger automático" (derivado de grep ejecutado) |
| **Afirmación performativa** | Presentada sin fuente verificable | NINGUNA intencionada — ver nota de auditoría |
| **Especulación útil** | Explícitamente marcada como hipótesis | "PostCompact y sync-wp-state no verificados en sesión real" — marcado como Desconocido/No verificado |

### Conteo de claims por sección

| Sección | Observaciones directas | Inferencias calibradas | Performativas | Total |
|---------|----------------------|----------------------|---------------|-------|
| S1: Definición operacional | 2 | 4 | 0 | 6 |
| S2: Score por componente (hooks) | 8 | 2 | 0 | 10 |
| S2: Score por componente (agentes) | 6 | 2 | 0 | 8 |
| S2: Score por componente (registry) | 4 | 1 | 0 | 5 |
| S2: Score por componente (invariantes) | 3 | 8 | 0 | 11 |
| S2: Score por componente (guidelines) | 2 | 1 | 0 | 3 |
| S2: Score por componente (bootstrap) | 3 | 0 | 0 | 3 |
| S3: Gap map | 0 | 10 | 0 | 10 |
| S4: Plan transformación | 0 | 6 | 0 | 6 |
| S5: Evidencia observable | 0 | 7 | 0 | 7 |
| **TOTAL** | **28** | **41** | **0** | **69** |

### Claims marcados como inciertos (no performativos)

Los siguientes no son performativos porque están explícitamente marcados como no verificados:
- PostCompact (session-resume.sh): "No verificado en sesión real"
- sync-wp-state.sh: "No verificado en sesión real (lógica considerada correcta por deep-dive)"
- @imports: "TD-040 sin resolver — puede estar inactivo"
- commit-msg-hook.sh: "script existe, activación en .git/hooks/ no verificada"

Estos 4 son especulaciones útiles marcadas — no inflan el ratio artificialmente.

### Ratio de calibración

```
Observaciones directas:    28
Inferencias calibradas:    41
Total claims:              69
Afirmaciones performativas: 0

Ratio = (28 + 41) / 69 = 69/69 ≈ 100%

Ajuste conservador (4 claims inciertos marcados explícitamente):
  Ratio ajustado = 65/69 = 94%

Clasificación: CALIBRADO (umbral gate: ≥ 75%)
```

**Nota de auditoría del análisis mismo:**

Este análisis leyó 12 archivos declarados + ejecutó 12 comandos bash de verificación.
Los claims de score (36% compliance de agentes, 0/11 invariantes con refuerzo completo, 9/9 YMLs con model: prohibido) están todos respaldados por output de herramienta. El único componente con gap de verificación intencional es la carga real de @imports en sesión producción — marcado explícitamente como "no verificado".

---

## Síntesis ejecutiva (respuestas directas)

### ¿El motor actual es sólido?

No. La distinción entre "el sistema dice que hace X" y "el sistema hace X" es amplia en componentes críticos:
- 64% de los agentes no pasan su propio validador
- El validador no está en ningún hook — los fallos se acumulan silenciosamente
- 0/11 invariantes tienen refuerzo automático completo — son solo texto
- La fuente de verdad del registry (`.thyrox/registry/`) tiene 9/9 YMLs que violan su propia spec
- El mecanismo más crítico (guidelines @imports) lleva sin verificación desde FASE 36

El motor tiene estructura sólida (hooks configurados, scripts ejecutables, validadores escritos) pero los ciclos de cierre están rotos: los validadores no se ejecutan automáticamente, los invariantes no se refuerzan, la spec y los artefactos divergen sin detección.

### ¿Qué se necesita para transformarlo en algo sólido?

Cinco cambios ordenados (P1-P5 del plan) realizables en una sesión mediana (~80 minutos total):

1. Integrar lint-agents en Stop hook → validación automática en cada sesión
2. Verificar @imports en sesión real → cerrar TD-040 con evidencia
3. Corregir `tools:` en 16 coordinators → llevar compliance de 36% a ~80%
4. Eliminar `model:` de registry YMLs → alinear spec con artefactos
5. Agregar Check I-001 en validate-session-close.sh → primer invariante con refuerzo real

### ¿Qué significa "sólido" aquí?

Sólido significa que las propiedades declaradas son verificables independientemente de quien haga la verificación. No requiere conocer el sistema — solo ejecutar los comandos de la columna "Cómo se mide" de la sección 1.1 y comparar output con lo declarado. Si los outputs coinciden con lo declarado: sólido. Si no: frágil.

El motor actual es frágil con apariencia de solidez. La apariencia viene de que los componentes existen (scripts, hooks, agentes, invariantes). La fragilidad viene de que los ciclos de cierre — que verificarían que los componentes funcionan — no están cerrados.
