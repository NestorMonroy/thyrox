```yml
project: THYROX
Work package: 2026-04-15-08-29-58-plugin-distribution
created_at: 2026-04-15 08:29:58
updated_at: 2026-04-16 17:24:02
current_phase: Phase 11 — TRACK/EVALUATE
open_risks: 2
mitigated_risks: 2
closed_risks: 2
author: NestorMonroy
```

# Risk Register: Plugin Distribution

---

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado | Dueño |
|----|-------------|:------------:|:-------:|:---------:|--------|-------|
| R-001 | SessionStart hook no idempotente — crea estado duplicado | media | alto | alta | **cerrado** | NestorMonroy |
| R-002 | Safety invariant bloquea escritura de `.thyrox/` desde hook | media | alto | alta | **abierto** | NestorMonroy |
| R-003 | Marketplace no disponible / cambio de API de plugins | baja | alto | alta | **abierto** | NestorMonroy |
| R-004 | compound-engineering usa mecanismo no documentado — difícil de replicar | alta | medio | alta | **mitigado** | NestorMonroy |
| R-005 | Tech skills proyecto-específicos incluidos en plugin por error | alta | medio | alta | **cerrado** | NestorMonroy |
| R-006 | `hooks/hooks.json` migración rompe hooks existentes en usuarios template | media | medio | media | **mitigado** | NestorMonroy |

---

## Detalle de riesgos

### R-001: SessionStart hook sin idempotencia crea estado duplicado

**Descripción**

El SessionStart hook corre en CADA sesión, no solo al instalar. Si el script
`thyrox-init.sh` no verifica si `.thyrox/context/` ya existe antes de crear
archivos, sobrescribirá `now.md` y `focus.md` en sesiones subsiguientes,
perdiendo el estado del WP activo.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- `now.md` se resetea a `current_work: null` al inicio de sesión
- WP activo desaparece del hook display tras reiniciar Claude Code

**Mitigación**
- Script `thyrox-init.sh` verifica: `[ -f .thyrox/context/now.md ] && exit 0`
- Crear solo archivos que no existen, nunca sobreescribir

**Plan de contingencia**
- Si ocurre: recuperar estado desde git log (`.thyrox/context/` está bajo git)
- Agregar test de idempotencia en functional evals

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado | NestorMonroy |

---

### R-002: Safety invariant bloquea escritura de `.thyrox/` desde hook del plugin

**Descripción**

La safety invariant de Claude Code bloquea escrituras en `.claude/` con prompt
de confirmación. Se desconoce si `.thyrox/` (fuera de `.claude/`) tiene la misma
restricción cuando el write proviene de un hook de plugin (no del LLM directamente).
FASE 35 migró a `.thyrox/` para evitar esta fricción, pero un hook bash ejecutado
por el binario puede tener reglas distintas.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- Hook SessionStart falla con error de permisos al crear `.thyrox/context/`
- Prompt de confirmación inesperado al instalar el plugin

**Mitigación**
- Probar en sandbox: crear `.thyrox/context/` desde un SessionStart hook antes de implementar
- Revisar documentación de permisos de hooks en `.claude/references/permission-model.md`

**Plan de contingencia**
- Si `.thyrox/` está bloqueado: usar `/thyrox:init` como skill explícito (el usuario lo corre una vez)
- Documentar como requisito de onboarding si no se puede automatizar

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado | NestorMonroy |

---

### R-003: Marketplace no disponible o cambio de API de plugins

**Descripción**

El sistema de plugins de Claude Code puede estar en beta o cambiar breaking changes.
Si `claude plugin install thyrox@nestormonroy` requiere un marketplace configurado
que no existe o cambia su API, la distribución falla y los usuarios siguen dependiendo
del modelo git clone.

**Probabilidad**: baja
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- CLI retorna error al instalar desde GitHub URL
- Documentación oficial cambia el formato de `plugin.json`

**Mitigación**
- Mantener `setup-template.sh` actualizado como fallback hasta confirmar estabilidad del plugin system
- Probar instalación vía `--plugin-dir` (local) primero antes de publicar

**Plan de contingencia**
- Fallback: distribuir vía git clone con `setup-template.sh` corregido (Option A del WP)
- El trabajo de corregir `setup-template.sh` (paths + naming) tiene valor independiente

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado | NestorMonroy |

---

### R-004: Mecanismo de compound-engineering no documentado

**Descripción**

El único precedente de plugin que crea estructura fuera de `.claude/` es
`compound-engineering` de Every.to. La documentación solo dice que "drops the full
structure into your project" sin explicar si usa SessionStart, un command explícito,
o algo más. Si el mecanismo no es replicable con las primitivas documentadas,
la arquitectura propuesta puede ser inviable.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- No se puede implementar creación de `.thyrox/` con SessionStart + bin/ únicamente
- El repo de compound-engineering tiene código no documentado en referencias

**Mitigación**
- Investigar el repo público de compound-engineering antes de Phase 2 (SP-06)
- Probar SessionStart + bin/ en sandbox antes de comprometerse con la arquitectura

**Plan de contingencia**
- Fallback: `/thyrox:init` como skill explícito que el usuario corre una vez post-instalación
- Este approach es más transparente y no depende de mecanismos undocumented

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado | NestorMonroy |

---

### R-005: Tech skills proyecto-específicos incluidos en plugin por error

**Descripción**

Los 7 tech skills (`backend-nodejs`, `db-mysql`, etc.) son generados por
`registry/_generator.sh` para el stack del usuario. Si se incluyen en el plugin,
todos los proyectos que instalen THYROX tendrían skills de Node.js, React, MySQL
aunque no los usen. Contamina el autocomplete y el contexto de sesión.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- Plugin incluye skills que generan guidelines de tech irrelevante para el proyecto

**Mitigación**
- Separar explícitamente: plugin incluye solo `thyrox/` + `workflow-*/` + agents
- Tech skills los genera el usuario con `/thyrox:init` tras la instalación

**Plan de contingencia**
- Si ya se incluyeron: agregar `.pluginignore` o flag en `plugin.json` para skills opcionales

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado en audit interno | NestorMonroy |

---

### R-006: Migración de hooks rompe setup en repos que usaron template

**Descripción**

Usuarios actuales que clonaron el template tienen los hooks en `.claude/settings.json`.
Al migrar a plugin, los hooks migran a `hooks/hooks.json`. Si un usuario instala el plugin
Y tiene el template, los hooks duplicados pueden causar ejecución doble.

**Probabilidad**: media
**Impacto**: medio
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-15 08:29:58

**Señales de alerta**
- `session-start.sh` se ejecuta dos veces al inicio de sesión
- Output duplicado en mensajes de contexto

**Mitigación**
- Documentar migration guide para usuarios existentes
- `bin/thyrox-init.sh` detecta si ya hay hooks en `.claude/settings.json` y omite duplicar

**Plan de contingencia**
- Agregar deduplication check en `session-start.sh`

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-15 08:29:58 | Phase 1 | Identificado en audit interno | NestorMonroy |

---

## Riesgos cerrados

### R-001: SessionStart hook sin idempotencia — CERRADO

Guard `[ -d .thyrox/context ] && exit 0` implementado en `bin/thyrox-init.sh`. T-014 confirmó idempotencia: segunda ejecución sale inmediatamente sin tocar ningún archivo.

### R-005: Tech skills incluidos en plugin por error — CERRADO

`plugin.json` apunta a `../.claude/skills/` donde solo viven `thyrox/` y `workflow-*/`. Los tech skills generados por `registry/_generator.sh` viven en el proyecto destino, no en el plugin. Separación implementada por diseño.

### R-004: compound-engineering usa mecanismo no documentado — MITIGADO

No fue necesario replicar el mecanismo exacto. `hooks/hooks.json` + `bin/thyrox-init.sh` son primitivas documentadas que logran el mismo resultado. La arquitectura no depende de mecanismos no documentados.

### R-006: Migración de hooks rompe repos template — MITIGADO

`bin/thyrox-init.sh` solo crea `.claude/settings.json` si no existe. Repos que ya tienen el archivo (usuarios template) no son afectados.

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia (no solo mitigación)
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en `context/errors/`
