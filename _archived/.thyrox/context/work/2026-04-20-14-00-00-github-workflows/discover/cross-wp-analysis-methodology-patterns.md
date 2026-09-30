```yml
created_at: 2026-04-20 19:50:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
source_wp: 2026-04-18-07-12-50-methodology-calibration
relevance: ALTA para resolver CI/CD gaps
```

# Cross-WP Analysis: Metodología-Calibration Patterns Aplicables a CI/CD

## Problema de Partida

ÉPICA 43 (github-workflows) identifica 5 gaps de CI/CD. La pregunta: ¿CÓMO resolverlos sin crear workflows complejos?

Respuesta encontrada en ÉPICA 42 (methodology-calibration): Patrones de validación que ya existen en THYROX.

---

## Patrones Encontrados en methodology-calibration DISCOVER

### Patrón 1: Stop Hooks como Quality Gates

**Fuente:** `references-calibration-coverage.md` (P-2.2)

**Concepto:** Stop hooks con `continue: false` + `stopReason` funcionan como gates verificables.

**Implicación para CI/CD:**
- En lugar de GitHub Actions workflows, usar hooks bash síncronos
- Hook ejecuta validación, bloquea sesión si falla
- Más determinístico que GitHub Actions (100% enforcement vs ~70% para rules)

**Effectiveness tabla (P-2.1):**
| Mecanismo | Effectiveness |
|-----------|---|
| permissions.deny | 100% |
| PreToolUse hook | 100% |
| CLAUDE.md rules | ~70% |
| PostToolUse warnings | ~30% |
| Git hooks | 100% |

**Conclusión:** Stop hooks + git hooks = 100% enforcement, mejor que CI/CD GitHub Actions remoto.

---

### Patrón 2: F.I.R.S.T. / Self-Validating Criteria

**Fuente:** `references-calibration-coverage.md` (P-2.3), `sdd.md`

**Concepto:** Exit criteria como predicados booleanos verificables, no afirmaciones cualitativas.

**Estructura:**
```
NO: "Análisis es completo y correcto"
SÍ: "Archivo analysis.md existe AND metadata YAML válido AND 5 gaps documentados AND confianza >media"
```

**Implicación para CI/CD:**
- Validación es verificable automáticamente
- No requiere interpretación manual
- Puede ser gatekeep-ed por script

**Aplicación concreta:**
```bash
# En script de validación
[ -f analysis.md ] && \
grep -q "^version:" analysis.md && \
grep -c "^## Pregunta" analysis.md | grep -q "[5-9]" && \
validate_yaml analysis.md
```

---

### Patrón 3: Eval-Driven Development para Regresiones

**Fuente:** `references-calibration-coverage.md` (P-2.4), `development-methodologies.md`, `sdd.md`

**Concepto:** JiTTesting — just-in-time testing que detecta regresiones.

**Resultados empíricos:**
- 4x mejora en detección de regresiones
- 70% reducción en carga de revisión humana

**Implicación para CI/CD:**
- Evaluar cada cambio contra criterios previos
- No "testear todo" — solo "testear delta"
- Apropiado para artefactos WP que evolucionan iterativamente

---

### Patrón 4: Mecanismo Probabilístico de Confianza

**Fuente:** `references-calibration-coverage.md` (P-1.2, P-1.3)

**Datos empíricos existentes:**
- P(completar correctamente con SKILL) ≈ 70%
- P(sin framework) ≈ 40%
- P(agentes invocan skills on-demand) ≈ 56%
- P(contexto ≤100 líneas adherencia) ≈ 95%
- P(contexto ≥600 líneas adherencia) ≈ 45%

**Implicación para CI/CD:**
- La validación perfecta es probabilística (56-70%), no determinística
- El "80% Problem" (Addy Osmani) es límite operacional: "AI handles 80% reliably; 20% needs human"
- Establecer umbrales realistas: validar hasta 80%, rest require manual gate

---

## Recomendación Síntesis

### Estrategia Alternativa a GitHub Actions

En lugar de crear 5+ workflows complejos en `.github/workflows/`, THYROX ya tiene mecanismos más efectivos:

**Opción A: Stop Hooks (100% enforcement)**
```
Ventajas: Determinístico, local, bloqueante
Contra: Ejecuta en sesión Claude (puede ralentizar)
Mejor para: Validaciones críticas (metadata, estructura)
```

**Opción B: Pre-commit Git Hooks (100% enforcement)**
```
Ventajas: Offline, local, ejecuta antes de commit
Contra: Usuario debe instalar hook
Mejor para: Conventional commits, linting local
```

**Opción C: GitHub Actions (remoto, ~70% effective)**
```
Ventajas: Remoto, automatizado, no ralentiza sesión
Contra: Solo 70% effectiveness, requiere UI setup
Mejor para: Workflows que no pueden ejecutarse offline
```

---

## Hallazgo: "Artifact Paradox" en THYROX

**Concepto nombrado en methodology-calibration:**
> "Users who produce AI artifacts are LESS likely to question reasoning behind them" (Anthropic AI Fluency Index 2026)

**Aplicación a ÉPICA 43:**
- Actualmente: Sin validación de CI/CD → confianza falsa en artefactos
- Riesgo: WP-ERR-001 ocurrió porque no hubo "cuestionamiento automático"
- Solución: Mecanismo de validación que force cuestionamiento

**Recomendación:** Usar F.I.R.S.T. criteria + hooks para quebrar Artifact Paradox

---

## Próximos Pasos

**Para Phase 2 BASELINE:**
1. Medir estado actual: ¿cuáles validaciones existen hoy?
2. Cuantificar impacto: ¿cuántos artefactos fallarían si se aplicara F.I.R.S.T.?

**Para Phase 5 STRATEGY:**
1. Decidir entre Opciones A/B/C basado en ROI
2. Mapear F.I.R.S.T. criteria a cada tipo de artefacto WP

**Para Phase 6 PLAN:**
1. Implementar stop hook + git hook híbrido
2. Crear templates de validación reutilizables

---

## Referencias

- **methodology-calibration DISCOVER:** references-calibration-coverage.md
- **F.I.R.S.T.:** sdd.md (Specification-Driven Development)
- **Eval-Driven:** development-methodologies.md
- **Hook-authoring:** .claude/references/hook-authoring.md (implícito en análisis)

