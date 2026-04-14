```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Proyecto referencia: github.com/zejzl/grokputer
```

# Análisis de Errores: grokputer

## Qué es grokputer

Sistema de control de computadora con IA basado en xAI Grok. Arquitectura de 9 agentes ("Pantheon"), multi-provider AI collaboration (MAF), modo daemon autónomo, Docker. ~2,093 archivos, 384 markdown, proyecto iniciado Nov 2025.

---

## 23 Errores Identificados

### CRÍTICOS (5) — El proyecto está comprometido

| ERR | Error | Evidencia | THYROX lo previene con |
|-----|-------|-----------|----------------------|
| G01 | **Archivos basura en root** — `Dict[str` (0 bytes, tipo Python como filename), `-a` (12KB, output de shell), `e` (2KB) | Archivos creados por errores de shell, committed | ADR-008: Git as persistence, zero backup files |
| G02 | **Backup files en git** — `main.py.backup`, `main.py.backup2`, `grok_client.py.backup`, `requirements.txt.backup.*` | `.gitignore` usa `backup_*` pero archivos usan `.backup` suffix — patrón equivocado | ADR-008: Git history IS the backup |
| G03 | **8 archivos vacíos** — `test_kg_integration.py`, `messagebus.log`, `i think its running.txt`, `tree_of_life.md` | 0 bytes, committed sin contenido | ADR-001: Markdown only + review |
| G04 | **Binarios en repo** — 18 archivos: `.jpg`, `.PNG`, `.bmp`, `.mp4`, `.msi` (2.5MB), `.rar`, `.pdf` (4.6MB), `.xlsx`, `.lnk`, carpeta `memes for xai/` | Sin política de archivos, todo commiteado | ADR-001: Markdown only |
| G05 | **3 CLAUDE.md conflictivos** — root (17KB técnico), `docs/CLAUDE.md` (36KB, guía genérica de AI), `community/docs/CLAUDE.md` | Tres archivos con propósitos diferentes, Claude Code solo lee root | Single CLAUDE.md en [CLAUDE](.claude/CLAUDE.md) |

### ALTOS (6) — Workflow roto

| ERR | Error | Evidencia | THYROX lo previene con |
|-----|-------|-----------|----------------------|
| G06 | **Session summaries referenciados no existen** — 7 archivos (`11_11.md`, `12_11.md`, etc.) mencionados en CLAUDE.md, todos borrados | Commit `b4d9343 chore: Archive old sessions` borró archivos pero no actualizó CLAUDE.md | Work packages con timestamp — archivos organizados, no borrados |
| G07 | **Sin session state** — No focus.md, no now.md, no equivalente | "Next Steps" en CLAUDE.md estático desde Ene 2026, último commit Mar 2026 | `context/focus.md` + `context/now.md` |
| G08 | **Sin decision records** — 0 ADRs, decisiones dispersas en 83+ markdown files | Arquitectura decidida sin registro, no se sabe por qué se eligió X sobre Y | `context/decisions/` con 12 ADRs |
| G09 | **Sin error tracking** — 20 scripts de "fix" en root (`fix_annotations.py`, `precise_fix.py`, `ultimate_fix.py`, `final_fix_single.py`) | Mismo error re-intentado con diferentes scripts porque no hay registro de qué falló y por qué | `context/errors/` con 16 ERRs + template con "Prevención" |
| G10 | **`.gitignore` ignora `*.md` excepto README** — `*.md` + `!README.md` | 83+ markdown files en repo contradicen gitignore — force-added? Estado confuso | Markdown es first-class citizen |
| G11 | **20 fix scripts one-off en root** — `fix_`, `precise_`, `robust_`, `ultimate_`, `final_`, `direct_` | Scripts de un solo uso nunca eliminados, polución del root | ADR-008 + scripts/ con responsabilidad única |

### MEDIOS (7) — Calidad degradada

| ERR | Error | Evidencia | THYROX lo previene con |
|-----|-------|-----------|----------------------|
| G12 | **Document bloat sin indexing** — `COLLABORATION.md` (68KB), `DEVELOPMENT_PLAN.md` (74KB), `docs/toon.md` (82KB), `docs/ocr_instruct.md` (48KB) | 500KB+ en archivos individuales sin TOC ni cross-referencing | References modulares (<500 líneas) + TOC en >300 |
| G13 | **Duplicados** — `COLLABORATION.md` en 3 lugares, `DEVELOPMENT_PLAN.md` en 2, `about.md` duplicado | Sin canonical location per file | Single skill + ADR-004 |
| G14 | **Commits inconsistentes** — Mix de `chore: sync game logs` con `Server prayer task: new hero save` y `EOD sync Mar 5: save files` | Sin convención enforceada | ADR-003 + commit-msg-hook.sh |
| G15 | **GG Framework documentado como "completo" pero parcial** — CLAUDE.md lista 13 archivos en `src/workflow/`, solo 10 existen | Status no refleja realidad | ROADMAP.md con checkboxes actualizado por sesión |
| G16 | **Status contradictorio** — "MAF Coverage: 37%" y "121/121 tests passing - 100%" en mismo doc. "Phase 2: 90%" estático por 4+ meses | Nadie actualiza el status | `project-state.md` + `validate-session-close.sh` |
| G17 | **`.grok/settings.md` es una cover letter** — 25KB de pitch para xAI almacenado como "settings" | Archivo no es lo que el nombre dice | Anatomía oficial: cada directorio tiene propósito definido |
| G18 | **15 collaboration plans timestamped sin consolidar** — `collaboration_plan_20251109_002232.md` hasta `20260111_123638.md` | Point-in-time dumps sin archival strategy | Work packages en `context/work/` con lifecycle |

### BAJOS (5) — Ruido

| ERR | Error | Evidencia | THYROX lo previene con |
|-----|-------|-----------|----------------------|
| G19 | `node_modules/` committed | 77 subdirectorios de deps | .gitignore adecuado |
| G20 | `.coverage` committed pese a .gitignore | 53KB de coverage data | .gitignore que funciona |
| G21 | **Naming inconsistente** — `actor.py` + `actor_agent.py`, `imrover_agent.py` (typo) | Sin convención de naming | `conventions.md` + naming en SKILL.md |
| G22 | **"Recent Updates" estático** — Cubre Ene 2026, último commit Mar 2026 (2 meses sin actualizar) | Status no se mantiene | `validate-session-close.sh` detecta focus.md desactualizado |
| G23 | **`settings.local.json` con commit message entero** — Mensaje de commit completo en el allowlist de permisos | Ruido cargado cada sesión | Settings limpios |

---

## Análisis de Flujo: ¿Por qué grokputer falla?

### El flujo implícito (no documentado)

```
Start session
    ↓
Read CLAUDE.md (525 líneas — TODA la info cargada cada vez)
    ↓
Work on whatever seems important (sin focus.md)
    ↓
Maybe commit (sin convención)
    ↓
Maybe update docs (usualmente no)
    ↓
Session ends (sin state saved)
```

### Dónde se rompe vs THYROX

| Punto de fallo | Grokputer | THYROX |
|---------------|-----------|--------|
| **Inicio de sesión** | 525 líneas de CLAUDE.md (bloat, L-0002) | 52 líneas CLAUDE.md → lee focus.md + now.md |
| **¿Qué hacer?** | "Next Steps" estático desde Ene 2026 | focus.md actualizado cada sesión + ROADMAP.md |
| **¿Dónde estoy?** | Sin session state | now.md con phase, current_work, blockers |
| **¿Qué decidimos?** | Disperso en 83+ archivos | context/decisions/adr-NNN.md |
| **¿Qué falló antes?** | 20 fix scripts, mismos errores recurren | context/errors/ERR-NNN.md con Prevención |
| **¿Cómo organizar?** | 200+ archivos en root | Work packages timestamped en context/work/ |
| **¿Cómo commitear?** | Mix de estilos | ADR-003 + hook enforceado |
| **Cierre de sesión** | Nada | focus.md + now.md + validate-session-close.sh |

---

## Patrón más destructivo: Fix-script cycling

El error más revelador de grokputer es el **ciclo de fix scripts**:

```
Bug aparece → fix_X.py → no funciona → precise_fix.py → no funciona
→ robust_fix.py → no funciona → ultimate_fix.py → no funciona
→ final_fix_single.py → no funciona → direct_replace_single.py
```

6 intentos del mismo bug sin documentar qué falló en cada uno. Esto es exactamente lo que ERR-006 de THYROX documenta: **errores que recurren porque no hay feedback loop de prevención**.

La solución de THYROX (campo "Prevención" obligatorio en error-report.md.template) impide exactamente este ciclo.

---

## Métricas comparativas

| Métrica | grokputer | THYROX |
|---------|-----------|--------|
| CLAUDE.md líneas | 525 | 52 |
| Copias de CLAUDE.md | 3 | 1 |
| Archivos en root | 200+ | 10 |
| Binarios en repo | 18 | 0 |
| Backup files | 4+ | 0 |
| Archivos vacíos | 8 | 0 |
| Fix scripts one-off | 20 | 0 |
| ADRs | 0 | 12 |
| Error records | 0 | 16 |
| Session state files | 0 | 2 (focus + now) |
| Metodología | Ninguna | 7 fases SDLC |
| Commit convention | Mix | Enforced (hook + CI) |

---

## Conclusión

**Cada error de grokputer mapea a un mecanismo de THYROX que lo previene.** Los mecanismos más efectivos son:

1. **ADR-008 (git as persistence)** → previene G01, G02, G03, G11
2. **ADR-001 (markdown only)** → previene G04
3. **Session flow (focus + now)** → previene G07, G22
4. **Error catalog con Prevención** → previene G09 (fix-script cycling)
5. **ADR system** → previene G08
6. **Single canonical location** → previene G05, G13
7. **SKILL.md 7 fases** → previene el caos sin metodología
8. **L-0002 (<100 líneas CLAUDE.md)** → previene G12 (document bloat)

**THYROX no tiene ninguno de estos problemas.** El error más cercano en THYROX es ERR-028 (delayed commits), que es una versión mucho más leve de la falta total de disciplina de commits de grokputer.
