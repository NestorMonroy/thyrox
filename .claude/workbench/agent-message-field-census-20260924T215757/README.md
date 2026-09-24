# Censo de lecturas de AgentMessage

Pregunta: que campos de `AgentMessage` lee realmente el bucle, en thyrox y en
la fuente (`ccnmt`), para darle su forma precisa sin unificarlo con `Message`.

Instrumento: `probes/census.ts`, sobre el type checker de TypeScript. Por cada
cadena de acceso a propiedad busca el primer prefijo real del AST cuyo tipo
lleva alias objetivo (`CENSUS_TARGET`, por defecto `AgentMessage` y
`AgentAssistantMessage`) y registra la ruta leida desde ahi.

Salidas:

- `outputs/thyrox.tsv`, `outputs/ccnmt.tsv`: `conteo, archivo, alias, ruta`.
- `outputs/*.paths`: rutas distintas, para comparar con `comm`.
- `outputs/core.tsv`: el mismo censo con `CENSUS_TARGET=CoreMessage,...`
  sobre `core/AgentCore.ts` y `core/AgentLoop.ts`.

Resultado: 30 rutas en comun, 0 solo en thyrox, 3 solo en ccnmt
(`.attachment.hookEvent`, `.data`, `.toolUseID`). `QueryEngine.ts` y
`query.ts` concentran 95 de las 99 lecturas de thyrox. Dos declaraciones
contradicen a sus lectores: `message.content` (declarado `unknown[]`, leido
tras `typeof === 'string'`) y `message.usage` (declarado
`{[k]: number}`, su lector lo castea). `AgentLoop` lee `CoreMessage` en las
dos formas, plana y anidada (`.content` y `.message.content`).

Metrica: accesos a propiedad (`a.b.c`) con raiz tipada por el alias.
Ciega a: accesos por indice con cadena (`m['x']`), desestructuracion y
lecturas a traves de funciones que reciben el mensaje como `unknown`.
