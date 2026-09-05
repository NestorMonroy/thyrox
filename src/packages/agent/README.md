# @kaupamex/agent

La definición de nuestros agentes, en TypeScript. **El markdown dejó de ser la
fuente** (directiva del ejecutor, 2026-08-29): `.claude/agents/*.md` es ahora
un **artefacto derivado** que este paquete emite.

## Por qué TS y no markdown

El cliente admite tres vías para la misma definición, medidas en H-DOCS-502
contra el ejecutable 2.1.250 vendorizado:

| Vía | Quién construye el objeto | ¿SDK? |
|---|---|---|
| `.claude/agents/<name>.md` | el filesystem, frontmatter YAML | no |
| `--agents '<json>'` | cualquier proceso que invoque el CLI | no |
| `request.agents` por stdin | el SDK, por *control request* | sí |

Las tres consumen **las mismas claves**. Ninguna es más expresiva que la otra,
así que la pregunta no es cuál soporta más, sino **cuál admite tipos, tests y
un solo lugar donde cambiar**. Con el markdown como fuente, emitir el JSON de
`--agents` exigiría parsear YAML y confiar en que el frontmatter no derivó;
con el objeto como fuente, las dos codificaciones se derivan de él y el
emisor las mantiene en fase.

## Anatomía

```
src/types.ts                     el contrato, con los nombres de clave del cliente
src/definitions/<agent>.ts       LA FUENTE de cada agente
src/definitions/<agent>.prompt.md  su prosa; no declara nada
src/emit/markdown.ts             deriva .claude/agents/<name>.md
src/emit/agentsJson.ts           deriva el objeto de --agents y del SDK
bin/emit.ts                      escribe, o compara con --check
__tests__/                       la suite
```

El prompt vive en su propio `.md` porque son 12 KB de prosa con 67 backticks
medidos: dentro de un template literal habría que escapar los 67, y uno sin
escapar rompe el parseo del módulo entero. Ese archivo **no lleva frontmatter
y no declara nada** — sólo transporta texto.

## Uso

```bash
bun run .claude/packages/agent/bin/emit.ts            # escribe los artefactos
bun run .claude/packages/agent/bin/emit.ts --check    # exit 1 si el disco difiere
cd .claude/packages/agent && bun test                 # la suite
```

`--check` es lo que consume el gate: mismo criterio que `makemigrations
--check`. Si alguien edita el `.md` a mano, el disco y la definición divergen
y el gate lo dice antes del commit.

## El catálogo de modelos — el agente se nombra por identificador, no por alias

Directiva del ejecutor (2026-09-02): *«nosotros no nombramos los agentes por
alias porque se manejan en diferentes tiers; no es lo mismo un Opus 5 que un
Opus 4»*. El alias resuelve **según el proveedor** —`sonnet` es
`claude-sonnet-5` (tier_2_10, ventana 1 M) en first-party y
`claude-sonnet-4-5` (tier_3_15, 200 k) en Bedrock, Vertex, Foundry y
Mantle—, así que una definición con alias no fija ni su tier ni su ventana.

`src/models.ts` carga `src/models.json`, que **no se escribe a mano**: lo
deriva `bin/extract_model_registry.py --stdout` del volcado vendorizado
(`_references/claude-code-bin/2.1.258/claude_strings.txt`), y la suite exige que el
archivo vendorizado sea byte a byte lo que el extractor produce hoy. Ese es el
control que faltó cuando el extractor leyó `!0` como `false` y publicó los 63
booleanos del catálogo invertidos (H-DOCS-1003).

```bash
python3 bin/extract_model_registry.py ../../../_references/claude-code-bin/2.1.258/claude_strings.txt --stdout > src/models.json
```

Lo que expone: `MODELS` (19 registros con su tier resuelto a seis precios),
`resolveModel(alias, proveedor)`, `isModelId`, `usageCostUsd(modelo, consumo,
ttl)` y `effortCostIndex`. Y `registry.ts` **rehúsa** un `model` que no sea
identificador del catálogo o `inherit`, nombrando a qué resolvería el alias.

*Métrica:* igualdad byte a byte entre `src/models.json` y la extracción.
*Ciega a:* si el cliente resuelve el identificador completo igual que el
alias en cada proveedor — el catálogo declara `provider_ids`, no se ejercitó.

## Cómo se prueba

El control positivo **es real y del repo**, no fabricado: el test compara la
salida del emisor contra el `.claude/agents/migration-porter.md` que el
cliente ya lee, byte a byte. Y hay control negativo — un caso que altera la
definición y exige que el resultado difiera —, porque un emisor que devolviera
el archivo leído del disco pasaría el positivo sin hacer nada.

*Métrica:* igualdad byte a byte entre `toMarkdown(definición, updated_at)` y
el archivo en disco.
*Ciega a:* si el **cliente** acepta lo que el emisor produce. Eso sólo lo
prueba un despacho real del agente; el test mide fidelidad de codificación, no
aceptación del consumidor.

## De dónde sale el contrato — y por qué cambió de fuente

El esquema NO se copia de un corpus de terceros. Se **deriva del ejecutable
vendorizado** `_references/claude-code-bin/2.1.250/claude_strings.txt`, delimitado
por balanceo de llaves en
`.claude/eventos/implementar-agent-ts-20260829T001415/`.

La primera versión de este paquete sí copió de un corpus del scratchpad, y el
scratchpad se recicló al día siguiente. El conteo que traía era de **15**
claves; el ejecutable declara **18** — faltaban `observer`, `observerMessage`
y `observeSubagents`. Ver `H-DOCS-503`.

```bash
python3 ../../../.claude/eventos/implementar-agent-ts-20260829T001415/extract_agent_schema.py \
    ../../../_references/claude-code-bin/2.1.250/claude_strings.txt
```

## Anatomía

| Módulo | Qué es |
|---|---|
| `src/types.ts` | los tipos de la definición; re-exporta los enums de `schema.ts` |
| `src/schema.ts` | **el contrato medido** — 18 claves en `zod`, y `parseAgentJson()` |
| `src/registry.ts` | de una lista de definiciones al registro por nombre, con el post-check del guion medio |
| `src/emit/markdown.ts` | la vía `.claude/agents/*.md` (frontmatter + cuerpo) |
| `src/emit/agentsJson.ts` | la vía `--agents '<json>'`; **valida antes de emitir** |
| `src/definitions/*.ts` | una definición por archivo; el prompt largo vive en su `.md` hermano |

## Librerías

`zod` (^4.3.6, resuelto a 4.5.2) — la misma con que el cliente declara este
objeto. Validar con otra cosa sería reimplementar su semántica.

## Coste (`src/cost/`)

- `cacheBreak.ts` — las causas de ruptura de caché que la referencia rastrea
  (`ccb: packages/provider/src/promptCacheBreakDetection.ts`) y
  `sharesPromptCache(a, b)`: si dos definiciones pueden releer la misma caché.
- `policy.ts` — `switchCost` (cambiar de modelo o esfuerzo reescribe el
  contexto), `chooseCacheTtl` (la prima de 1 h contra la caducidad de 5 m),
  `recommend` (`TASK_REQUIREMENTS`: rango y esfuerzo por tipo de tarea, evaluando
  los 19 registros del catálogo, con `ranked` y `excluded`), y
  `dispatchPlan` (agrupar por modelo·esfuerzo·TTL y valorar el ahorro).
- `bin/preModelSwitch.ts` — hook `PreModelSwitch` (`settings.json`): con la
  caché viva responde `permissionDecision: "ask"` y pone en el diálogo del
  cliente la reescritura en USD contra la lectura cacheada. Nunca deniega.
  Con `source: "sdk"`, `"auto"` o `"resume"` (Remote Control, IDE, SDK: la
  sesión no puede preguntar y el cliente bloquea un `ask`) responde `allow` y
  deja la cifra como `systemMessage` (H-DOCS-1012).

```bash
bun test                                   # 73 aserciones, incluidas las de coste
bun run pre-model-switch < payload.json    # el hook, a mano
```
