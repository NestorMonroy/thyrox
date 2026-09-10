```yml
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
created_at: 2026-04-17 18:05:00
updated_at: 2026-04-17 18:05:00
current_phase: Phase 1 — DISCOVER
open_risks: 5
mitigated_risks: 0
closed_risks: 0
author: NestorMonroy
```

# Risk Register: goto-problem-fix (ÉPICA 41)

## Propósito

Riesgos para ÉPICA 41: corrección del GO-TO problem (scripts de sesión + README). Scope iterativo — nuevos riesgos pueden agregarse conforme se expande el alcance.

---

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado | Dueño |
|----|-------------|:------------:|:-------:|:---------:|--------|-------|
| R-001 | Modificar session-start.sh rompe el hook de sesión | media | alto | alta | abierto | NestorMonroy |
| R-002 | close-wp.sh con sed -i falla en macOS (BSD sed vs GNU sed) | alta | medio | alta | abierto | NestorMonroy |
| R-003 | README fix parcial deja instrucciones contradictorias | media | alto | alta | abierto | NestorMonroy |
| R-004 | Scope creep: análisis externo incorpora cambios fuera de ÉPICA 41 | alta | medio | alta | abierto | NestorMonroy |
| R-005 | session-start.sh supera 120 líneas después del fix | baja | bajo | baja | abierto | NestorMonroy |

---

## Detalle de riesgos

### R-001: Modificar session-start.sh rompe el hook de sesión

**Descripción**

`session-start.sh` se ejecuta como hook de Claude Code en cada inicio de sesión. Un error de sintaxis bash o cambio en la lógica de output puede hacer que el hook falle silenciosamente o muestre output malformado que Claude malinterprete.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-17 18:05:00

**Señales de alerta**

- El hook no produce output al inicio de sesión
- Claude reporta "Sin WP activo" cuando hay uno activo
- Error `bash: syntax error` en el output del hook

**Mitigación**

- Probar el script con `bash -n session-start.sh` antes de guardar
- Ejecutar `bash .claude/scripts/session-start.sh` manualmente y verificar output
- El cambio es quirúrgico (eliminar bloque `else` del fallback), no refactor completo

**Plan de contingencia**

- `git revert` al commit anterior si el hook falla
- El hook falla silenciosamente: Claude sigue funcionando, solo sin el contexto de sesión

---

### R-002: close-wp.sh con sed -i falla en macOS (BSD sed vs GNU sed)

**Descripción**

`close-wp.sh` usa `sed -i -e "s|...|...|"`. La restricción documentada en el análisis es "solución bash pura, sin python3". En macOS BSD sed, `-i` requiere argumento de extensión (`sed -i '' ...`). Si el fix de `now.md` body también usa `sed -i`, puede fallar.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-17 18:05:00

**Señales de alerta**

- `sed: 1: "...": extra characters at the end of l command` en macOS
- `now.md` body no se limpia después de cerrar WP

**Mitigación**

- Usar `sed -i'' -e` (compatible GNU y BSD) o heredoc + `cat > file` para reescribir secciones
- Verificar en el entorno de desarrollo (Linux) y documentar la limitación macOS

**Plan de contingencia**

- Alternativa: `printf '...' > tmp && mv tmp file` para reescribir la sección del body
- Mantener el fix YAML con sed y el body clear con printf/cat

---

### R-003: README fix parcial deja instrucciones contradictorias

**Descripción**

Si el scope del README fix se acota demasiado (solo sección coordinators, sin tocar setup-template.sh ni pm-thyrox), el README puede quedar en estado inconsistente: con una sección nueva "Coordinators" pero referencias rotas en otras secciones. Un usuario que lea linealmente encontrará instrucciones que funcionan y otras que fallan, sin saber cuáles son cuáles.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-17 18:05:00

**Señales de alerta**

- README tiene "pm-thyrox" Y "thyrox" en la misma versión
- Setup section aún referencia `setup-template.sh` después del fix
- Sección nueva de coordinators pero Quick Start sigue roto

**Mitigación**

- Definir un "mínimo viable README" en Stage 3 DIAGNOSE: lista de secciones que DEBEN estar correctas para publicar
- Fix en conjunto: Quick Start + Setup + pm-thyrox → thyrox + nueva sección coordinators

**Plan de contingencia**

- Si el scope se acota por tiempo: marcar secciones problemáticas con `> ⚠️ Esta sección está desactualizada — ver [...]` como stopgap temporal

---

### R-004: Scope creep — análisis externo incorpora cambios fuera de ÉPICA 41

**Descripción**

El usuario indicó que el alcance se irá descubriendo y pasará análisis externos adicionales. Hay riesgo de que ÉPICA 41 absorba trabajo que corresponde a ÉPICA 42 (coordinator guides, ARCHITECTURE.md, índice de ADRs), inflando el WP y dificultando el cierre.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-17 18:05:00

**Señales de alerta**

- El task plan supera 30 tareas con heterogeneidad alta (scripts + docs + arquitectura)
- Se pide crear coordinator guides individuales en este WP
- Se pide reescribir ARCHITECTURE.md completamente

**Mitigación**

- Stopping Point Manifest documentado con SP-02 (gate-decision de scope 41 vs 42) antes de Stage 3
- Criterio explícito en análisis: Sección 8 "Fuera de alcance" lista lo que NO entra en ÉPICA 41

**Plan de contingencia**

- Crear `goto-problem-fix-scope-decision.md` para registrar ítems desviados a ÉPICA 42
- Si el WP escala >30 tareas: proponer split en ÉPICA 41a y 41b

---

### R-005: session-start.sh supera 120 líneas después del fix

**Descripción**

La restricción documentada es `session-start.sh ≤120 líneas`. El fix elimina el bloque fallback (reduce líneas), pero si se agregan mejoras adicionales puede acercarse al límite.

**Probabilidad**: baja
**Impacto**: bajo
**Severidad**: baja
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-17 18:05:00

**Señales de alerta**

- `wc -l session-start.sh` > 115 después de editar

**Mitigación**

- El fix propuesto es eliminar el bloque else/fallback: neto de líneas es negativo
- Verificar con `wc -l` antes de commitear

**Plan de contingencia**

- Extraer helper functions a un script separado si se acerca al límite

---

## Riesgos cerrados

*(ninguno al momento de creación)*

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia (no solo mitigación)
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en `context/errors/ERR-NNN.md`
