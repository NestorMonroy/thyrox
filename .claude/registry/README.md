# Tech Skill Registry

Fuente de verdad para templates de tech skills. Cada template produce dos artefactos
cuando se instancia en un proyecto via `_generator.sh`:
- `.claude/skills/{layer}-{framework}/SKILL.md` — guía fase-por-fase
- `.claude/guidelines/{layer}-{framework}.instructions.md` — reglas siempre-on

---

## Estructura

```
registry/
├── README.md              ← Este archivo
├── _generator.sh          ← Instanciador de templates
├── frontend/
│   └── react.template.md
├── backend/
│   └── nodejs.template.md
└── db/
    └── postgresql.template.md
```

## Capas válidas

| Capa | Ejemplos de frameworks |
|---|---|
| `frontend` | react, vue, angular, nextjs, svelte |
| `backend` | nodejs, python, go, java, ruby |
| `db` | postgresql, mysql, mongodb, redis |
| `infra` | docker, kubernetes, terraform |
| `mobile` | reactnative, flutter |
| `testing` | cypress, playwright, jest |

## Formato de un template

Cada archivo `.template.md` contiene DOS secciones separadas por marcadores:

```markdown
<!-- SKILL_START -->
# {{LAYER_TITLE}} {{FRAMEWORK_TITLE}} — SKILL
...contenido del SKILL.md (guía por fase)...
<!-- SKILL_END -->

<!-- INSTRUCTIONS_START -->
# {{LAYER_TITLE}} {{FRAMEWORK_TITLE}} — Guidelines
...reglas siempre-on para Claude...
<!-- INSTRUCTIONS_END -->
```

## Placeholders obligatorios

Todos los templates deben incluir estos placeholders — `_generator.sh` los reemplaza:

| Placeholder | Reemplazado por |
|---|---|
| `{{PROJECT_NAME}}` | Nombre del proyecto destino |
| `{{LAYER}}` | Capa en minúscula (ej: `frontend`) |
| `{{FRAMEWORK}}` | Framework en minúscula (ej: `react`) |
| `{{LAYER_TITLE}}` | Capa con mayúscula inicial (ej: `Frontend`) |
| `{{FRAMEWORK_TITLE}}` | Framework con mayúscula inicial (ej: `React`) |

## Criterio de calidad para INSTRUCTIONS

Cada regla en la sección INSTRUCTIONS debe ser:
- **Específica:** "Usa PascalCase para componentes React" — no "usa buenas prácticas"
- **Verificable:** se puede revisar si se cumple o no con un grep/linter
- **Con ejemplo:** código bueno Y código malo en el mismo bloque

Mínimo 5 reglas por template. Sin ejemplos, la regla no cuenta.

## Cómo agregar un nuevo template

1. Crear `registry/{capa}/{framework}.template.md`
2. Incluir ambas secciones con marcadores
3. Incluir todos los placeholders obligatorios
4. Escribir mínimo 5 reglas en INSTRUCTIONS con ejemplos
5. Testear: `_generator.sh {capa} {framework} test-project`
6. Verificar que los archivos generados son coherentes
7. Commit: `feat(registry): add {capa}-{framework} template`

## Cuándo regenerar skills en un proyecto

```bash
# Actualizar un skill con la versión más reciente del template
.claude/registry/_generator.sh frontend react --force

# Ver qué se generaría sin crear archivos
.claude/registry/_generator.sh frontend react --dry-run
```
