```yml
id: WP-ERR-004
created_at: 2026-04-20 18:30:30
phase: Phase 1 — DISCOVER
severity: media
recurrence: primera
```

# WP-ERR-004: Weak Branch Protection Rules

## Qué pasó

No existe configuración explícita de branch protection en main. Esto significa:

1. Un PR sin approval puede mergearse
2. Un PR sin pasar CI checks puede mergearse
3. Force push a main es técnicamente posible
4. Commit history puede reescribirse

Riesgos concretos: un usuario con write access podría mergear un WP incompleto o un cambio que rompa coordinators.

## Por qué

Branch protection requiere setup en GitHub UI (Settings > Branches) o IaC. Como proyecto small, la asunción fue "el mantenedor es cuidadoso". Esto no escala cuando hay múltiples branches feature/ activas.

## Prevención

Dos acciones:

1. Configurar GitHub branch protection en UI:
   - Require PR review: 1 approval
   - Require status checks to pass (validate.yml, tests.yml, lint.yml)
   - Dismiss stale PR reviews
   - Require conversation resolution

2. Documentar en `.github/BRANCH_PROTECTION.md` (plantilla IaC para futuros repos)

## Insight

Branch protection es el difusor de CI/CD. Sin él, ningún workflow importa: cambios rotos pueden mergearse igual. Es el primer paso, no el último.
