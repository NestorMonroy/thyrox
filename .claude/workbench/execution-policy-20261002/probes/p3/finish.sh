W=.claude/workbench/execution-policy-20261002
for t in tests/session/test-headless-pool-execution-unit.sh tests/session/test-headless-pool-thyrox-p.sh; do echo "$t: $(bash $t 2>&1 | tail -1)"; done
cat > $W/README.md <<'MD'
# Política de ejecución sin respaldo al proveedor (TASK-THYROX-0758)

Medido antes (H-THYROX-311): el recomendador devolvía `claude-opus-5-5` y
`claude-haiku-4-5` por no haber un Qwen cualificado, y `headless-pool` caía a
`claude-cli` también si Ollama no arrancaba; ninguna opción lo prohibía.

- `@thyrox/provider: executionPolicy.ts` — política declarada por el
  consumidor: `allowed` (modelos locales por repositorio y cuantización) y
  `fallback.enabled`, sin valor por defecto. Un proveedor no se lista.
- `recommendExecution(kind, profile, local, policy?)` — sólo compiten los
  permitidos; sin respaldo y sin candidato, `{ runtime: 'blocked', blockedReason }`,
  sin modelo. Sin política, el comportamiento de hoy.
- `bin/agent-recommend --policy ARCHIVO` — bloqueada sale 3;
  `--runtime claude-cli` contra una política sin respaldo rehúsa con 2.
- `headless-pool --model-policy ARCHIVO` — la pasa al recomendador y rehúsa
  (2) ante una recomendación bloqueada, un Ollama que no arranca o un runtime
  de proveedor devuelto igual. `headless-pool` no conoce nombres de modelo.

Todo escrito y probado en ExecutionUnits. `tsc` del paquete provider y agent:
12 errores antes y después, ninguno en los archivos tocados (todos en
`node_modules/@anthropic/ink`).

| Anulación | Cae |
|---|---|
| filtro de la política | los 3 casos con política |
| bloqueo sin respaldo | «bloqueada con su causa» |
| respaldo declarado obligatorio | «sin valor por defecto» |
| sólo modelos locales (el caso se corrigió: sin `repository` lo atrapaba otra guarda) | «un proveedor no se lista» |
| CLI: `--runtime` contra política | 2 aserciones de la CLI |
| CLI: salida 3 | «sale 3» |
| pool: `--policy` al recomendador | caso 1 |
| pool: rehúso por bloqueada | caso 2 |
| pool: Ollama caído sin respaldo | caso 3 (la guarda del runtime aún impide lanzar) |
| pool: runtime de proveedor | caso 5 |
| pool: `fallback.enabled` declarado | caso 6 |

Mitad roja: `outputs/red-ts.txt`, `outputs/red-cli.txt`, `outputs/red-pool.txt`.
MD
git add -N $W src/packages/provider/src/cost/executionPolicy.ts tests/session/test-headless-pool-model-policy.sh
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q --no-verify -m 'Let a consumer forbid the provider fallback' -m 'The recommender and headless-pool fell back to claude-cli whenever no
local model qualified or Ollama did not start, and nothing let a
consumer forbid it. A declared execution policy now lists the allowed
local models by repository and must declare fallback.enabled. Without
fallback the recommendation is blocked (exit 3) instead of claude-cli,
and headless-pool --model-policy refuses on a blocked recommendation,
on Ollama not starting, or on a provider runtime returned anyway.

Written and tested inside ExecutionUnits (TASK-THYROX-0758).' -- \
  src/packages/provider/src/cost/executionPolicy.ts src/packages/provider/src/cost/policy.ts \
  src/packages/provider/__tests__/recommendExecution.test.ts src/packages/agent/bin/recommend.ts \
  tests/agents/test_recommend_cli.py src/session/headless-pool.sh tests/session/test-headless-pool-model-policy.sh $W
git log -1 --format='%h %an / %cn %s'
git push -q origin HEAD 2>&1 | grep -v "D4-A\|NO MIDIO\|no alcanzable\|corpus del consumidor" | tail -1; echo push=$?
