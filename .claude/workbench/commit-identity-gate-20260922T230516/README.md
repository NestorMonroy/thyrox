# commit-identity-gate

## El encargo

> analiza e implementa con codigo que puedes hacer en estos casos Autor de
> los commits: el entorno lo fija como Kim (kim-len), pero git.md de thyrox
> fija a Nestor Monroy [...] cual vas a respetar? y porque

> pero no queremos "Claude <noreply@anthropic.com>"

## La premisa, si se corrigio al primer comando

La regla ya existia como parametro del consumidor
(`src/rules/definitions/gitAuthorIdentity.ts`: `THYROX_COMMIT_AUTHOR`,
`THYROX_COMMIT_COMMITTER`), pero ningun gate leia esos parametros: la
identidad solo se defendia con prosa. El unico control de remolques vivia en
el `commit-msg` de un consumidor, en bash. Y `core.hooksPath` estaba vacio en
los dos clones, asi que ningun hook corria. El git global declaraba
`Claude <noreply@anthropic.com>`.

## Las piezas

| archivo | que hace |
|---|---|
| `src/verify/commit_identity.py` | `check` (pre-commit), `trailers` (commit-msg), `env` (la correccion) |
| `tests/verify/test_commit_identity.py` | 11 aserciones sobre repos sinteticos |
| `probes/commit_identity-with-fix.py` | fuente de la restauracion tras cada anulacion |
| `outputs/annul-agent-invariant.txt` | sin el invariante del agente cae SOLO «declarar al agente no lo autoriza» |
| `outputs/annul-trailer-parser.txt` | con lectura por lineas cae SOLO la mencion en prosa |
| `outputs/commit-msg-hook-conduct.txt` | el hook real: remolque -> exit 1; mencion en prosa -> exit 0 |

## Los resultados

Contra el entorno real de la sesion (`GIT_AUTHOR_NAME=Kim`) el gate sale 1 y
nombra el author; tras `eval "$(bash bin/commit_identity env)"` sale 0. En el
consumidor sin declaracion sale 2, SIN MEDIR.

*Metrica:* la identidad que git usaria (`git var GIT_*_IDENT`) contra la
declarada; los remolques del bloque que `git interpret-trailers --parse` separa.
*Ciega a:* la veracidad de la declaracion: comprueba que el commit coincide con
lo declarado, no que lo declarado sea quien escribio el cambio.
