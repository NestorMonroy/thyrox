# Ninguna arista de paquete resuelve: 0 de 10

Fecha: 2026-09-07T18:25:32 (`date -u`).
Origen: la derivación de subpaths reportó 10 sin resolver tras aterrizar
`ide` y `server`. Antes de añadir entradas al `exports` de la raíz medí si el
especificador resuelve — y no resuelve **ninguno**, ni siquiera los que su
propio sub-paquete ya declara.

## Lo que creí, y por qué era falso

`cli/package.json` declara `"./print": "./src/print.ts"` y el archivo existe.
Concluí que la derivación daba un falso positivo: medía el mapa de la RAÍZ y el
sub-paquete lo declaraba por su cuenta. Es la hipótesis correcta de forma y
falsa de hecho — `@thyrox/cli/print` no resuelve **porque `@thyrox/cli` no
resuelve**. No falta la entrada del subpath: falta la arista del paquete.

Iba a corregir un mapa que ya estaba bien. Medir la resolución en vez de la
presencia en el mapa es lo que lo impidió — el sub-patrón C de
`metrica-decide-la-conclusion.md`, esta vez detenido antes de la conclusión.

```
  NO RESUELVE   @thyrox/cli/print
  NO RESUELVE   @thyrox/cli/secureStorage/keychainPrefetch
  NO RESUELVE   @thyrox/cli/structuredIOHelper
  NO RESUELVE   @thyrox/headless-sdk/agentSdkTypes
  NO RESUELVE   @thyrox/headless-sdk/controlTypes
  NO RESUELVE   @thyrox/mcp-runtime/envExpansion
  NO RESUELVE   @thyrox/mcp-runtime/types
  NO RESUELVE   @thyrox/output/utils/stringUtils
  NO RESUELVE   @thyrox/repl/components/IdeOnboardingDialog
  NO RESUELVE   @thyrox/repl/doctorDiagnostic

0 de 10 resuelven
```

Ni los bare: `@thyrox/cli`, `@thyrox/output`, `@thyrox/storage` y
`@thyrox/ide` fallan los cuatro. `node_modules/@thyrox/` está vacío.

## Qué sostiene la suite entonces

Symlinks **ad-hoc por paquete** — `<pkg>/node_modules/@thyrox/<hermano>` —
que nadie declaró y que `bun install` no recrearía, porque install sólo enlaza
lo que `dependencies` declara.

## La precondición de #239, medida

`src/packages/package.json` **ya declara `workspaces`** con 24 entradas. Lo que
falta son cuatro dirs (bridge, daemon, ide, server) y **14 dependencias de
hermano importadas y no declaradas**:

```
app-host      cli headless-sdk memory permission provider
bridge        headless-sdk local-observability
ide           permission tool-registry
mcp-runtime   agent
server        headless-sdk tool-registry
storage       cli
tools         provider

28 paquetes · 14 dependencias de hermano importadas y no declaradas
```

Correr `bun install` **antes** de declararlas borraría los symlinks ad-hoc y
dejaría el árbol peor que ahora: la suite pasa hoy gracias a ellos. Las dos de
`tool-registry` no se pueden declarar todavía — el paquete no existe (#234).

*Métrica:* `Bun.resolveSync` sobre cada especificador desde `src/packages`, y
`from '@thyrox/<x>'` por AST-lite contra las `dependencies` de cada manifiesto.
*Ciega a:* el import dinámico compuesto en tiempo de ejecución, y al
`require()` diferido que los portes usan como punto de inyección — ninguno de
los dos aparece como `from '@thyrox/…'`.
