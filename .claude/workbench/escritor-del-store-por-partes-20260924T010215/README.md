# Qué suite reescribe el store versionado

Condición de cierre de H-THYROX-164: correr la suite por partes y comparar el
sha1 de `agent-results/agent_store.sqlite3` después de cada una.

`bisecar.sh` recorre las suites de Python y de shell en serie, con el entorno
de `tests/run.sh`, y restaura el store tras cada cambio. Resultado
(`.claude/jobs/bisecar-store-20260924T010216/`): **una sola** suite lo cambia,
`tests/agents/test-carrete-store.sh`.

Causa: su caso 9 desvía el hook de cierre de turno con
`AGENT_STORE_CLAUDE_DIR`, que respetan `drain_spool.py` y `reconcile_store.py`;
el tercer paso, `backfill_findings_history.py`, no la leía y escribía en el
store del proveedor.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `tests/corpus/test_backfill_store_destination.py` sin la corrección: el destino desviado no recibe nada y el store real cambia |
| `verde.txt` | con la corrección: OK; el store real no cambia tras la suite ni tras `test-carrete-store.sh` |

*Métrica:* sha1 del store antes y después de cada suite, en serie.
*Ciega a:* las suites de TypeScript, que no se recorrieron aquí (su preload
ya aísla el store, H-THYROX-164).
