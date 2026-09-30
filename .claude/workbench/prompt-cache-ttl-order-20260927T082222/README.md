# El orden del TTL de caché: `SPt` en 2.1.283

`bin/binary literal FORCE_PROMPT_CACHING_5M --root <2.1.283>` da 4
declaraciones; la función que decide es `SPt` (`chunk-csayct82.js`),
extraída con `bin/binary symbol` a `symbol-SPt.txt`. Es el mismo cuerpo que
`QCt` en 2.1.282:

1. `FORCE_PROMPT_CACHING_5M` → 5m (`force_5m_env`);
2. `CLAUDE_CODE_PROMPT_CACHE_TTL` (o la de subagente) → `env`;
3. el ajuste `promptCacheTtl` → `setting`;
4. el frontmatter del agente, salvo 1h en excedente → `agent_frontmatter`;
5. `ENABLE_PROMPT_CACHING_1H`, **o** Bedrock con
   `ENABLE_PROMPT_CACHING_1H_BEDROCK` → 1h (`enable_1h_env`).

`@thyrox/agent: promptCacheTtl.ts` porta las cinco reglas. El pool porta
1, 2, la opción `--cache-ttl` en el lugar del ajuste, y 5 — a la que le
faltaba la mitad Bedrock. Añadida con dos aserciones que caen sin ella (la
ejecución roja fue la anulación: 98 de 100) y una de control que ya pasaba:
sin Bedrock la variable Bedrock no decide.
