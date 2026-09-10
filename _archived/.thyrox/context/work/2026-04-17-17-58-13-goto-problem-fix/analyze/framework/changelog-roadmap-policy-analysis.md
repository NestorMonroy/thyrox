```yml
created_at: 2026-04-17 23:17:43
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Política de CHANGELOG, ROADMAP y archivos raíz

> Análisis de cómo deben gestionarse `CHANGELOG.md`, `ROADMAP.md`, `CHANGELOG-archive.md`,
> `ROADMAP-history.md` y `CONTRIBUTING.md` en el proyecto THYROX.
> Disparado por observación en Stage 11: los archivos `-history` violan I-002 (Git as persistence).

---

## Problema identificado

El proyecto tiene actualmente 5 archivos en raíz relacionados con historial:

| Archivo | Líneas | Propósito declarado | Problema |
|---------|--------|---------------------|---------|
| `CHANGELOG.md` | 260 | Historial semántico desde v2.0.0 | OK si se actualiza solo en releases |
| `CHANGELOG-archive.md` | 475 | v0.x / v1.x archivados (split FASE 29) | **Viola I-002** — git tiene ese historial |
| `ROADMAP.md` | 267 | Estado de ÉPICAs activas | OK si se actualiza en milestones |
| `ROADMAP-history.md` | 921 | FASEs 1-26 archivadas (split FASE 29) | **Viola I-002** — git tiene ese historial |
| `CONTRIBUTING.md` | 167 | Guía de contribución | OK — estándar de proyecto |

Los archivos `-history` y `-archive` nacieron de `REGLA-LONGEV-001` (archivo >25KB → split). La regla resolvió un síntoma (archivo grande) sin atacar la causa raíz: ¿para qué sirve ese historial si git lo tiene?

---

## Cómo lo hacen las grandes empresas

### Patrón dominante: Release-driven, tooling-generated

**Kubernetes, Node.js, React, Angular, Vue, Linux kernel:**

```
feature branch / WP
  └─ changelog entries en PR description o WP artifact
       ↓  merge to main
  git tag vX.Y.Z  →  CHANGELOG.md root  ←  generado automáticamente
                                              desde commit messages
                                              (conventional-changelog,
                                              release-please, semantic-release)
```

**Principio clave:** El root `CHANGELOG.md` **no lo toca un humano** — lo genera el tooling en el momento del release. El historial granular vive en los commits y PRs.

### Ejemplos concretos

| Proyecto | Herramienta | Frecuencia de update |
|---------|------------|---------------------|
| Angular | `conventional-changelog` | En cada release tag |
| Vue.js | Manual con release notes | En cada release tag |
| Node.js | `github/release-drafter` | En cada release tag |
| Kubernetes | Release notes auto desde commits | En cada milestone |
| npm packages | `semantic-release` | Automático en CI |

**Lo que NO hacen:**
- Actualizar CHANGELOG.md por cada commit o sesión de trabajo
- Mantener archivos `-history` o `-archive` al lado del CHANGELOG activo
- Duplicar en archivo lo que git log ya provee

### Patrón para proyectos de framework/tooling (más cercano a THYROX)

```
WP en ejecución:
  └─ {wp}-changelog.md  ←  se llena en Stage 12 STANDARDIZE

Release (bump de versión):
  └─ root CHANGELOG.md  ←  consolida los {wp}-changelog.md
                             del ciclo de release
                             Formato: Keep a Changelog + SemVer
```

---

## Diagnóstico del estado actual de THYROX

### Lo que está bien ✅

- `CHANGELOG.md` raíz con formato Keep a Changelog ✓
- Versiones desde v2.0.0 en adelante bien documentadas ✓
- WP changelogs en Stage 12 (`{wp}-changelog.md`) ✓
- `CONTRIBUTING.md` estándar de proyecto ✓
- `ROADMAP.md` como estado de ÉPICAs activas ✓

### Lo que viola las propias reglas del framework ❌

- `CHANGELOG-archive.md` — 475 líneas de v0.x/v1.x que git ya tiene
  - `git log --oneline --follow CHANGELOG.md` muestra ese historial completo
  - Origen: `REGLA-LONGEV-001` split (FASE 29) — workaround que creó deuda
- `ROADMAP-history.md` — 921 líneas de FASEs 1-26 que git ya tiene
  - `git log --oneline ROADMAP.md` muestra cada estado por FASE
  - Origen: mismo split de FASE 29

### Antipatrón de fondo

`REGLA-LONGEV-001` ("si el archivo supera 25KB, splitear") es una regla de **síntoma** que contradice I-002. El límite de tamaño correcto para evitar archivos monstruosos no es "split en archivo -archive", sino "no acumular historial en archivos cuando git es la fuente de verdad".

---

## Recomendación

### Política simplificada (3 reglas)

**R-1: WP changelog → `{wp}-changelog.md` en Stage 12 (ya existe)**

Cada WP produce su changelog propio al cerrar. No requiere cambio.

**R-2: Root `CHANGELOG.md` → solo en releases con bump de versión semántico**

```
Cuándo actualizar CHANGELOG.md raíz:
  ✓ git tag v2.9.0  (MINOR: nueva feature estable)
  ✓ git tag v3.0.0  (MAJOR: breaking change)
  ✗ sesión de trabajo  (NO)
  ✗ cierre de WP       (NO — eso va en {wp}-changelog.md)
  ✗ Stage 12           (NO — excepto si el WP es un release completo)
```

**R-3: Archivos `-history` y `-archive` → eliminar (git es el historial)**

```bash
git rm CHANGELOG-archive.md ROADMAP-history.md
git commit -m "chore: remove -archive and -history files — git log is the history (I-002)"
```

El historial de v0.x/v1.x y FASEs 1-26 está íntegro en `git log`. Cualquier búsqueda:
```bash
git log --oneline --follow -- CHANGELOG.md   # historial de versiones
git log --oneline --follow -- ROADMAP.md     # historial de FASEs
git show HEAD~30:ROADMAP.md                  # estado en cualquier punto
```

### Qué hacer con `CONTRIBUTING.md`

Mantener. Es el documento estándar para onboarding de contribuidores — no tiene historial acumulativo, no viola ninguna regla. Único mantenimiento: actualizarlo cuando cambie el workflow de contribución.

### Revisión de `REGLA-LONGEV-001`

La regla original: "si el archivo supera 25KB, splitear en archivo -archive".

**Corrección propuesta:**

> **REGLA-LONGEV-001 (revisada):** Si un archivo de estado activo supera 25KB, evaluar qué porción es historial vs. estado actual. El historial se elimina del archivo activo — no se mueve a un archivo `-archive`. El historial vive en git.
>
> **Excepción:** Si el historial necesita ser navegable sin git (e.g., proyecto sin acceso a git log, documentación publicada), se puede mantener un `-archive`. THYROX no tiene este caso.

---

## Action Plan

### P1 — Eliminar archivos `-history` y `-archive`

- [ ] `git rm CHANGELOG-archive.md ROADMAP-history.md`
- [ ] Commit: `chore(root): remove -archive/-history files — git is the history (I-002)`
- [ ] Verificar: `git log --follow -- CHANGELOG.md | head -20` muestra historial completo

### P2 — Codificar política en CLAUDE.md o references/

- [ ] Agregar en `CLAUDE.md` sección "Archivos raíz" o en `references/conventions.md`:
  - Política de actualización de `CHANGELOG.md` raíz (solo en releases)
  - Prohibición explícita de archivos `-history` y `-archive` (I-002)
  - Corrección de REGLA-LONGEV-001

### P3 — Revisar REGLA-LONGEV-001 formalmente

- [ ] Buscar dónde está documentada REGLA-LONGEV-001 y actualizar definición
- [ ] Si está en un ADR: agregar addendum con la corrección
- [ ] Verificar que session-start.sh u otros scripts no referencien el comportamiento viejo

---

## Nota sobre este WP como caso de estudio

Este WP (`2026-04-17-17-58-13-goto-problem-fix`) es un ejemplo de cómo un WP puede crecer orgánicamente durante Stage 11:

- 2 task plans (original + remediación)
- 7 domain subdirectories en `analyze/`
- 12+ artefactos de análisis (cobertura, naming, proceso, framework, templates, readme, audit)
- 1 execution-log retroactivo
- 1 audit-report con 2 versiones
- Análisis de: setup-template, PAT-004, audit skill, catalog placement, BA vs RM triggers, agent naming, CHANGELOG policy

La regla "un WP puede contener múltiples análisis, planes y perspectivas" ya está implícita en I-011 (WP se cierra solo cuando el ejecutor lo ordena explícitamente). Este artefacto lo hace explícito como patrón.
