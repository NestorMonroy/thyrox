"""Escribe los quince contratos de tarea del lote desde una sola tabla.

Cada contrato declara los doce campos de ``template.md``; la tabla es la fuente
y los ``tasks/Txxx.md`` son su proyección, así un cambio de contrato es un
cambio de esta tabla y no quince ediciones sueltas.
"""
import json
import pathlib
import sys

WORKBENCH = pathlib.Path(sys.argv[1])
FIELDS = ("objective", "allowed", "reused", "invariants", "red", "implementation", "green",
          "annulment", "close", "out_of_scope")
LABELS = {"objective": "Objetivo", "allowed": "Archivos permitidos", "reused": "Mecanismos reutilizados",
          "invariants": "Invariantes", "red": "RED", "implementation": "Implementación mínima",
          "green": "GREEN", "annulment": "Anulación", "close": "Criterio de cierre",
          "out_of_scope": "Fuera de alcance"}

CONTRACTS = {
 "T001": ("Inventory existing learning capabilities", dict(
   objective="Medir qué capacidades de aprendizaje existen hoy, cuáles están cableadas en producción y cuáles faltan.",
   allowed="sólo el banco (`outputs/T001-*`)",
   reused="`git grep`, `bin/podman-execution-execute run --image` para leer versiones de Transformers dentro de una unidad",
   invariants="medir, no recordar; una capacidad sin `file:line` es `missing`",
   red="no aplica: es un inventario; su control es que cada fila cite su archivo",
   implementation="cuatro salidas de texto y una tabla capability | existing | production-wired | measured | missing",
   green="`outputs/T001-learning-map.txt` con la tabla completa",
   annulment="quitar una cita `file:line` de una fila la deja sin evidencia: el lector la rechaza",
   close="las cuatro salidas existen y cada fila cita su fuente",
   out_of_scope="implementar nada")),
 "T002": ("Record token telemetry per attempt", dict(
   objective="Cada intento del controlador lleva su uso de tokens medido, con procedencia, sin convertir lo desconocido en cero.",
   allowed="`src/learning/token_usage.py`, `tests/learning/test_token_usage.py`, `src/session/task_continuation.py` (sólo la fila de intento)",
   reused="el `result.usage` del stream-json de `thyrox -p` y el `message.usage` de su transcript (`probes/delegate.sh` ya los escribe)",
   invariants="usage ausente -> `usageAvailable=false` y campos `null`; nunca 0",
   red="fixture sin `result` y sin transcript -> el test exige `null`; antes del código no existe el módulo",
   implementation="`AttemptUsage` + `usage_from_stream` + `usage_from_transcript` + `attempt_usage` (resultado > transcript > no disponible)",
   green="`python3 tests/learning/test_token_usage.py` en una unidad",
   annulment="sustituir `None` por `0` en el caso ausente hace caer el caso `unavailable`",
   close="GREEN, anulación y `outputs/T002-token-schema.json`",
   out_of_scope="precio en USD de un proveedor sin tarifa declarada")),
 "T003": ("Version the experience schema", dict(
   objective="Un registro (S, A, R, S') versionado, sin secretos, que sirva al bandit, a la evaluación y al reward model.",
   allowed="`src/learning/experience.py`, `tests/learning/test_experience.py`",
   reused="`SECRET_NAME_PATTERN` de `task_continuation`",
   invariants="ninguna clave ni valor con forma de secreto; versión de esquema explícita",
   red="una experiencia con un campo `*_TOKEN` tiene que rehusarse",
   implementation="`Experience`, `SCHEMA_VERSION`, `to_record`/`from_record`, `assert_secret_free`",
   green="`tests/learning/test_experience.py`",
   annulment="retirar `assert_secret_free` hace caer el caso del secreto",
   close="GREEN y anulación",
   out_of_scope="almacenamiento (T005)")),
 "T004": ("Define the reward contract", dict(
   objective="Recompensa 1/0 decidida por compuertas duras; los costes se registran aparte y ordenan lexicográficamente.",
   allowed="`src/learning/reward.py`, `tests/learning/test_reward.py`",
   reused="el veredicto del verificador del ítem como autoridad",
   invariants="una tarea rechazada nunca recibe recompensa de éxito; una compuerta desconocida no es aprobada",
   red="compuerta `None` o `False` con verificador verde -> recompensa 0",
   implementation="`HARD_GATES`, `RewardOutcome`, `reward_for`, `ranking_key`",
   green="`tests/learning/test_reward.py`",
   annulment="hacer que `reward_for` mire sólo el verificador hace caer los casos de compuertas",
   close="GREEN y anulación",
   out_of_scope="recompensas densas o con forma")),
 "T005": ("Persist experiences in the agent store", dict(
   objective="Las experiencias se guardan y consultan en el store del proveedor, con versiones de política, recompensa y esquema.",
   allowed="`src/learning/experience_store.py`, `tests/learning/test_experience_store.py`",
   reused="el archivo SQLite de `agent_store` (nivel B, ADR-006); una tabla propia, no un archivo nuevo",
   invariants="consulta por taskClass, provider, model, action, accepted, tokens, cost, latency, periodo y policyVersion",
   red="consulta por `accepted=True` sobre un store con dos filas devuelve una",
   implementation="`ExperienceStore.append` y `ExperienceStore.query` con SQL parametrizado",
   green="`tests/learning/test_experience_store.py`",
   annulment="ignorar el filtro `policy_version` hace caer su caso",
   close="GREEN y anulación",
   out_of_scope="PostgreSQL (modo compartido)")),
 "T006": ("Choose candidates with a contextual bandit", dict(
   objective="Thompson sampling contextual sobre las posteriores Beta existentes, con eventos de política auditables.",
   allowed="`src/learning/contextual_bandit.py`, `tests/learning/test_contextual_bandit.py`",
   reused="`verify.tsc_schedule.posterior` y el conteo por clase de `task_continuation.candidate_counts`",
   invariants="sólo rasgos previos a la decisión; Claude nunca está en A(s); `learning_enabled=False` no mueve la posterior",
   red="con `learning_enabled=False` la posterior antes y después de una recompensa es igual",
   implementation="`DecisionContext`, `ContextualBandit.select`, `ContextualBandit.observe`, `PolicyEvent`",
   green="`tests/learning/test_contextual_bandit.py`",
   annulment="ignorar `learning_enabled` hace caer el caso congelado; quitar el filtro de Claude hace caer el suyo",
   close="GREEN y anulaciones",
   out_of_scope="MDP completo, TD, GRPO")),
 "T007": ("Wire the policy into candidate selection", dict(
   objective="El controlador elige candidato por la política; el verificador sigue siendo la única autoridad de aceptación.",
   allowed="`src/session/task_continuation.py`, `tests/session/test_task_continuation.py`",
   reused="`choose_candidate`, `append_log`, la fila de intento",
   invariants="la política no ve el DAG, ni los archivos permitidos, ni la red; sólo elige entre `item.candidates`",
   red="un intento registra `policyEvent` y experiencia; antes no",
   implementation="`choose_candidate` delega en el bandit y devuelve su evento; cada intento persiste experiencia, recompensa y uso",
   green="suites `test_task_continuation.py` y `test_continuation_frontier.py`",
   annulment="desconectar la persistencia hace caer el caso de experiencia",
   close="GREEN, anulación y suites hermanas verdes",
   out_of_scope="cambiar el plan P2-P5")),
 "T008": ("Classify ambiguous outcomes with Transformers", dict(
   objective="`ExecutionOutcomeClassifier` con backend `TransformersExecutionOutcomeClassifier`, consultado sólo ante evidencia ambigua.",
   allowed="`src/learning/outcome_classifier.py`, `src/learning/transformers_outcome_inference.py`, tests",
   reused="el gancho `THYROX_OUTCOME_CLASSIFIER_COMMAND` de `classify`; la imagen `thyrox-model-quantizer:dev` (transformers 4.57.6) por la primitiva",
   invariants="nunca concede éxito; registra implementación, versión, modelo, revisión, digest, tokenizer, device, ms, predicción, confianza, `source=learned`",
   red="sin backend, el caso `source=learned` falla",
   implementation="inferencia zero-shot NLI con un checkpoint pequeño fijado por revisión, dentro de una ExecutionUnit",
   green="inferencia real sobre evidencias ambiguas reales",
   annulment="retirar el backend -> `source` vuelve a `ambiguous-default`",
   close="inferencia real registrada y anulación",
   out_of_scope="entrenar el clasificador")),
 "T009": ("Adapt SWE-Gym instances into Thyrox tasks", dict(
   objective="Instancia SWE-Gym -> tarea normalizada, conservando id, repo, base commit, enunciado, tests y metadatos del parche.",
   allowed="`src/learning/dataset_adapters.py`, tests, `datasets/` del banco (subconjunto pequeño)",
   reused="datasets-server de Hugging Face en streaming (sin descargar el dataset entero)",
   invariants="registrar dataset, revisión, licencia, fuente, subconjunto y hashes; datos pesados fuera de git",
   red="una instancia sin `base_commit` se rehúsa",
   implementation="`fetch_rows`, `SweGymAdapter.to_task`, manifiesto del subconjunto",
   green="smoke set normalizado",
   annulment="dejar pasar un campo faltante hace caer su caso",
   close="subconjunto versionado con hashes",
   out_of_scope="ejecutar los tests de los repos de SWE-Gym")),
 "T010": ("Adapt SWE-smith samples without Docker", dict(
   objective="Muestra SWE-smith -> tarea normalizada -> verificador -> esquema de trayectoria, respetando la primitiva.",
   allowed="`src/learning/dataset_adapters.py`, tests, `datasets/`",
   reused="el adaptador de T009",
   invariants="nada de `docker` directo; si su verificación exige sus imágenes, queda como fixture de investigación",
   red="una muestra sin `image_name` declara su verificador como no ejecutable",
   implementation="`SweSmithAdapter.to_task` y la declaración de compatibilidad",
   green="smoke set normalizado y su veredicto de compatibilidad",
   annulment="aceptar una muestra sin repo hace caer su caso",
   close="adaptador y veredicto",
   out_of_scope="materializar imágenes de SWE-smith")),
 "T011": ("Qualify OpenHands LM 7B as an actor baseline", dict(
   objective="Medir tamaño, disco, RAM, formatos, cuantizaciones, contexto, licencia y digest antes de materializar nada.",
   allowed="`src/learning/actor_baseline.py`, tests, `outputs/T011-*`",
   reused="la API de modelos de Hugging Face; la admisión de disco existente",
   invariants="estados qualified / unqualified / resource_unavailable / artifact_not_materialized; nunca bloquea el lote",
   red="con disco insuficiente el estado es `resource_unavailable`, no un fallo",
   implementation="`assess_actor_baseline(model_info, host)`",
   green="evaluación real del repositorio publicado",
   annulment="ignorar el disco libre hace caer su caso",
   close="estado registrado con sus medidas",
   out_of_scope="descargar el modelo sin disco")),
 "T012": ("Run a real-model batch through the policy", dict(
   objective="Al menos 3 tareas reales de ingeniería, anchura >= 2, por frontera -> parallel_map -> GNU Parallel -> primitiva -> `thyrox -p` -> modelo real.",
   allowed="el banco (`plan.jsonl`, `probes/`), y los archivos que cada ítem declara",
   reused="`task_continuation run` con `--width 2` y worktrees",
   invariants="Claude = 0; max_active >= 2; dueños, contenedores y cgroups distintos; uso real; verificador; recompensa; experiencia; actualización de política",
   red="cada ítem trae su prueba roja antes de despachar",
   implementation="tres ítems pequeños con su `verify`",
   green="tres aceptados o bloqueados con causa, y las métricas pedidas",
   annulment="`--width 1` baja max_active a 1",
   close="métricas en `outputs/T012-*`",
   out_of_scope="tareas grandes")),
 "T013": ("Compare frozen and learning policies", dict(
   objective="Política congelada contra política que aprende sobre un conjunto fijo y versionado, con repeticiones.",
   allowed="el banco",
   reused="el lote de T012 y `learning_enabled`",
   invariants="tiempo de pared separado del consumo de tokens; `cacheReuseRatio` sólo con los dos valores medidos",
   red="no aplica: es una medición; su control es el conjunto fijo",
   implementation="repeticiones con `learning_enabled=false` y `true`",
   green="`evaluation-baseline.json`, `evaluation-learned.json`, `evaluation-comparison.md`",
   annulment="con la misma semilla y aprendizaje apagado las dos políticas eligen igual",
   close="comparación publicada con su n",
   out_of_scope="afirmar significancia con n pequeño")),
 "T014": ("Train a reward model with TRL RewardTrainer", dict(
   objective="Reward/value model pequeño en CPU con `AutoModelForSequenceClassification` + `RewardTrainer` sobre trayectorias Thyrox/SWE.",
   allowed="`src/learning/reward_model_training.py`, el banco (`models/`, `outputs/T014-*`)",
   reused="la imagen con transformers por la primitiva; TRL instalado en caché dentro de la unidad",
   invariants="registrar ejemplos, historia de pérdida, métrica de validación, revisiones, tiempo y pico de memoria del cgroup; rechazar predicción constante o pérdida 0 desde el inicio",
   red="un modelo de predicción constante se rechaza",
   implementation="pares elegido/rechazado desde experiencias y SWE-Gym; entrenamiento corto",
   green="entrenamiento real con métrica de validación",
   annulment="desactivar el chequeo de predicción constante hace caer su caso",
   close="modelo y métricas registradas",
   out_of_scope="usar el reward model para decidir aceptación")),
 "T015": ("Prove the batch end to end and report once", dict(
   objective="Prueba final e informe único con todas las métricas pedidas.",
   allowed="el banco",
   reused="todo lo anterior",
   invariants="cada cifra cita su archivo",
   red="no aplica",
   implementation="`outputs/final-report.md`",
   green="el informe existe y cita sus fuentes",
   annulment="no aplica",
   close="informe publicado",
   out_of_scope="nada nuevo")),
}

for task_id, (title, contract) in CONTRACTS.items():
    lines = [f"# {task_id} — {title}", ""]
    lines.append(f"- **Estado inicial medido:** `outputs/{task_id}-initial.txt`")
    for field in FIELDS:
        lines.append(f"- **{LABELS[field]}:** {contract[field]}")
    lines.append(f"- **Evidencia:** `outputs/{task_id}-red.log`, `-green.log`, `-annulment.log`, `-diff.txt`, `-units.jsonl`, `-telemetry.jsonl` cuando aplican")
    (WORKBENCH / "tasks" / f"{task_id}.md").write_text("\n".join(lines) + "\n")
print(json.dumps(sorted(CONTRACTS)))
