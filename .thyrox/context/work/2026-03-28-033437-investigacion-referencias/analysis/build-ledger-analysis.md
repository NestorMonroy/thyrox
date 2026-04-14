```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia profundo (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/build-ledger/
```

# Análisis: build-ledger — Governance ledger para multi-agente

## Qué es

Un **ledger de gobernanza** para coordinar múltiples agentes AI trabajando en un ecosistema de 18 repos, 2 máquinas y un VPS. Nació después de que 75 agentes se lanzaron simultáneamente sin coordinación ("the stampede of 2026-03-08").

No es un framework ni un agente — es un **sistema de coordinación y toma de decisiones** para trabajo multi-agente.

---

## Los conceptos únicos

### 1. LOG.md — Ledger append-only

```
[2026-03-08 04:50] Echo Pro :: CLAIM: ~/Phoenix_Local/_GATEWAY
[2026-03-08 05:07] Echo Pro :: RELEASE: ~/Phoenix_Local/_GATEWAY - symlink switched
```

**Reglas:**
- Append-only (nunca editar, nunca borrar)
- Cada entry tiene timestamp + nombre del agente + mensaje
- `bash ledger.sh log "NAME" "MESSAGE"` → pull + append + commit + push en un comando
- "Si no está en el LEDGER, no pasó"

**Para THYROX:** Esto es lo que debería ser un work-log — un registro INMUTABLE de acciones, no un documento narrativo que se edita.

### 2. Research "Truths" — Hechos verificados, no opiniones

6 "truths" investigadas y verificadas con pruebas reales:

| Truth | Hallazgo | Impacto |
|-------|----------|---------|
| Path Truth | `_GATEWAY (1)` es la raíz canónica, no `_GATEWAY` | Resuelve split-brain |
| Sync Truth | OneDrive NO es seguro para coordinación en tiempo real | Bloquea ciertos diseños |
| Concurrency Truth | Archivos per-agente elimina contención de escritura | Define modelo de concurrencia |
| Hook Truth | Hooks locales por máquina, NO sincronizar entre máquinas | Define estrategia de hooks |
| Wake Truth | Gauntlet broadcast es el método correcto de wake | Define comunicación |
| Rollback Truth | `ln -sfn` es atómico, rollback < 30 segundos | Habilita ejecución segura |

**Lo que las hace "truths":**
1. Probadas en infraestructura real (no teórico)
2. Verificadas por múltiples agentes independientemente
3. Una vez establecidas, son LEY (no cambian sin re-testing)
4. Firmadas por todos los agentes votantes
5. Bloquean o desbloquean ejecución directamente

**Para THYROX:** Nuestros "análisis" mezclan hallazgos con opiniones. build-ledger separa HECHOS VERIFICADOS (truths) de DECISIONES (votes). Un truth no es negociable — es evidencia.

### 3. CLAIM/RELEASE — File locking por protocolo

```bash
bash ledger.sh log "Echo Pro" "CLAIM: ~/Phoenix_Local/_GATEWAY"
# ... trabajo ...
bash ledger.sh log "Echo Pro" "RELEASE: ~/Phoenix_Local/_GATEWAY"
```

Claims > 1 hora pueden ser desafiados (probablemente el agente crasheó).

**Para THYROX:** No tenemos locking. Nada impide que dos procesos editen el mismo archivo.

### 4. Handoffs estructurados (10 secciones)

Cada handoff tiene:
1. Header (agente, máquina, fecha)
2. QUÉ SE HIZO esta sesión
3. QUÉ ESTÁ EN PROGRESO
4. QUÉ ESTÁ BLOQUEADO (y por qué)
5. ESTADO DE BRANCHES (tabla: repo, branch, clean?, pushed?)
6. PATHS CLAVE (directorio, ledger, gateway)
7. CONTEXTO DE EQUIPO (tiers, roles, reglas)
8. ASIGNACIÓN PRÓXIMA SESIÓN (trabajo específico)
9. REGLAS APRENDIDAS
10. (Para nuevos agentes) BOOTSTRAP (quién eres, quién soy, qué construimos)

**Para THYROX:** Nuestro work-log de 150 líneas intenta hacer todo esto pero sin estructura. build-ledger tiene 10 secciones estándar que cada handoff cumple.

### 5. Tiered authority + Unanimous consensus

| Tier | Rol | Poder |
|------|-----|-------|
| Tier 3 | Árbitro (Shane) | STOP ALL, veto absoluto |
| Tier 2 | Reviewers | Pueden bloquear cambios de arquitectura |
| Tier 1 | Builders/Proposers | Proponen, necesitan aprobación |

**Regla:** Unanimidad (4/4 o 3/3). Un solo agente bloqueando = decisión bloqueada.

### 6. Conflict Manifest — Desacuerdos como evidencia

```markdown
CONFLICT-002: Echo Studio Unilateral Edits
Priority: CRITICAL
Files: MEMORY.md (6 edits), ECHO.md (1 major edit)
Why: VPS→Studio host changes without consensus
Status: Treated as draft proposals, not truth
```

**Principio:** Los conflictos NO son fallos. Son evidencia de deliberación rigurosa.

### 7. Swarm Launch Plan — Escalar sin caos

Después del "stampede" de 75 agentes:
- Máximo 7 agentes simultáneos
- Teams (3+2+2), cada uno con scope asignado
- Audit cada 10 minutos antes de escalar
- Kill switch: `STOP ALL` = halt inmediato

### 8. Naming Authority — Gobernanza de nombres

```
<class>__<scope>__<subject>__<yyyymmdd>.<ext>
```

17 clases aprobadas (runbook, ledger, handoff, report, spec, reference, template, script, config, data, archive...). Violaciones flaggeadas, creador renombra, re-commit.

### 9. Audits numerados (00-10)

11 deliverables secuenciales:
```
00_MISSION_LEDGER → 01_REPO_MANIFEST → 02_DUPLICATE_MAP
→ 03_CONTAMINATION_REPORT → 04_CONSOLIDATION_PLAN
→ 05_ADVERSARIAL_VERDICT → 06_CONTAMINATION_EDIT_PLAN
→ 07_REFERENCE_UPDATE_MAP → 08_ARCHIVE_MANIFEST
→ 09_REPO_GOVERNANCE → 10_INTEGRATION_GATE_VERDICT
```

Cada deliverable tiene scope específico. El audit termina con CONDITIONAL GO / GO / NO-GO.

---

## Comparación con los 9 proyectos anteriores

| Aspecto | Proyecto más similar | build-ledger | THYROX |
|---------|---------------------|-------------|--------|
| **Decision log** | oh-my-claude (save/load) | LOG.md append-only | decisions/ (vacío) |
| **Research** | trae-agent (trajectory) | "Truths" verificadas | analysis/ (opiniones) |
| **Handoffs** | conv-temp (transcripts) | 10-sección estándar | work-logs (vacíos) |
| **Conflicts** | Ninguno | CONFLICT_MANIFEST | errors/ (auto-errores) |
| **Authority** | Cortex (KERNEL zones) | 3-tier voting | Ninguna |
| **Naming** | clawpal (YYYY-MM-DD) | class__scope__subject | kebab-case (informal) |
| **Audit** | spec-kit (analyze) | 11 deliverables numerados | Ninguno |
| **Scaling** | Cortex (BSI claims) | Swarm launch (7 max) | Ninguno |

---

## Lecciones para THYROX

### Adoptar

1. **Append-only log** — Un LOG.md que solo crece, nunca se edita. Cada acción registrada con timestamp. Es más útil que work-logs narrativos.

2. **Research vs Decision separation** — Hallazgos verificados (truths) son diferentes de decisiones (votes). No mezclar en el mismo documento.

3. **Handoff structure (10 secciones)** — Si vamos a tener handoffs, deben ser estructurados, no narrativos. Qué se hizo, qué falta, qué está bloqueado, paths clave.

4. **Conflict tracking explícito** — Nuestro errors/ solo documenta auto-errores de Claude. No hay lugar para desacuerdos entre stakeholders.

### Evaluar

5. **Tiered authority** — Para equipos, no para un solo developer. Pero el concepto de "quién puede aprobar qué" es útil.

6. **Naming authority** — `class__scope__subject__date.ext` es más rígido que kebab-case. ¿Vale la pena para THYROX?

7. **Audits numerados** — Para proyectos grandes. Nuestro validate-phase-readiness.sh es una versión simple de esto.

### No adoptar

8. **CLAIM/RELEASE** — Solo para multi-agente simultáneo. THYROX es single-session.

9. **Swarm launch** — Solo si THYROX gestiona múltiples agentes simultáneos.

10. **Voting system** — Overhead para un solo developer con Claude.

---

## La reflexión

build-ledger resuelve un problema que ningún otro proyecto aborda: **¿cómo coordinan múltiples agentes AI sin un supervisor humano constante?**

La respuesta: **constrainted autonomy** — agentes actúan dentro de reglas transparentes, cada acción loggeada, humano puede parar todo en cualquier momento.

Los conceptos más transferibles para THYROX no son los de multi-agente, sino los de **gobernanza**: append-only logs, research vs decisions, structured handoffs, conflict tracking. Estos aplican a cualquier proyecto, no solo a swarms.

---

**Última actualización:** 2026-03-28
