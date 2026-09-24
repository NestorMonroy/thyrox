# cadena-validatepath-2-1-275

## El encargo

Llevar a cero los rojos de TypeScript. El bloqueo más grande, 10 archivos,
es `validatePath` de `@thyrox/permission/pathValidation`, que dependía de
funciones de `filesystem.ts` que el porte de ccnmt dejó fuera.

## La premisa, si se corrigio al primer comando

Se suponía que bastaban las seis funciones de `filesystem.ts` que nombra la
cabecera de `pathValidation.ts`. En 2.1.275, `isPathAllowed` (`$k`) depende
además de `OTe`, `yyt`, `hyt`, `Gge`, `hee` y `myt`, y todas viven en
`chunk-9apg35nm.js` (229 KB, 369 exports): el módulo de permisos entero.
ccnmt no está en el disco, así que la única fuente es el binario minificado.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/binario/*.js` | la primera porción de cada función de la cadena, extraída de su chunk. `_a.js` sale de `chunk-9apg35nm.js`: el primer `_a` que devuelve un grep es el del modo vim, porque los nombres minificados se repiten entre chunks |
| `outputs/models-2.1.275.jsonl` | el catálogo de modelos extraído del volcado 2.1.275, copiado a `src/packages/agent/models.jsonl` |
| `outputs/suites-catalogo.txt` | las suites que leen el catálogo |

## Los resultados

- `isPathInSandboxWriteAllowlist` ya está portada (`$qn`).
- El catálogo de 2.1.275 respecto del de 2.1.258: `claude-fable-5-1` gana
  `per_turn_effort`, y el índice de coste de esfuerzo de Fable 5.1 y
  Mythos 5.1 baja (`max` 1.91 → 1.74).
- Sigue pendiente la cadena: `_a`, `myt`, `OTe`, `yyt`/`hee`, `Gge`, `$k`,
  `mTo`, `bTo`/`STo`, y la puerta de auto mode de `permissions.ts`.

*Metrica:* funciones nombradas en el cuerpo de `$k` y su chunk de definición.
*Ciega a:* las dependencias de segundo nivel de cada una, que no se midieron.
