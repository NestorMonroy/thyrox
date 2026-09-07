/**
 * Puerto de `ccnmt: packages/agent/yaml.ts` (4 líneas) — forward shim: la
 * fuente movió la implementación real a `config/yaml.ts` para romper el
 * ciclo de imports agent → config → agent que forzaba fallbacks lazy-require
 * en `config/plugin/_deps.ts`. El código nuevo, dice la fuente, debería
 * importar directo de `@claude-code-how-works/config/yaml`; este archivo es
 * sólo compatibilidad hacia atrás para callers existentes.
 *
 * DIVERGENCIA DE ALCANCE, declarada: `@thyrox/config` existe como paquete en
 * este árbol, pero no expone `yaml.ts` — medido:
 * `find src/packages/config -iname "*yaml*"` → vacío
 * (`Bun.resolveSync('@thyrox/config/yaml.js', …)` falla). Portar ese módulo
 * es tarea de quien porte `config` (fuera de mis rutas: `src/packages/config/**`).
 *
 * Se defiere con `require()` para que ESTE archivo siga siendo importable —
 * la resolución real de `@thyrox/config/yaml.js` sólo falla cuando alguien
 * invoca `parseYaml()`, no al cargar el módulo. Mismo criterio que
 * `app-host: src/runtime/installPluginBindings.ts` aplica a sus 95 slots de
 * `config/plugin/_deps`.
 */
export function parseYaml(input: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/yaml.js') as { parseYaml: (input: string) => unknown }
  return mod.parseYaml(input)
}
