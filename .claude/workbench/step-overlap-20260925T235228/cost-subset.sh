cd /home/user/thyrox
echo "== tests/agents/test-agent-store-sessions.sh"; timeout 120 bash tests/agents/test-agent-store-sessions.sh 2>&1 | tail -1
echo "== tests/agents/test-agent-store-transcript-path.sh"; timeout 120 bash tests/agents/test-agent-store-transcript-path.sh 2>&1 | tail -1
echo "== tests/agents/test-agent-store-type-source.sh"; timeout 120 bash tests/agents/test-agent-store-type-source.sh 2>&1 | tail -1
echo "== tests/agents/test-agent-store-usage-columns.sh"; timeout 120 bash tests/agents/test-agent-store-usage-columns.sh 2>&1 | tail -1
echo "== tests/agents/test-model-catalog.sh"; timeout 120 bash tests/agents/test-model-catalog.sh 2>&1 | tail -1
echo "== tests/agents/test-register-agent-session.sh"; timeout 120 bash tests/agents/test-register-agent-session.sh 2>&1 | tail -1
echo "== tests/agents/test_final_message_closing.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_final_message_closing.py 2>&1 | tail -1
echo "== tests/agents/test_model_catalog_paths.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_model_catalog_paths.py 2>&1 | tail -1
echo "== tests/agents/test_model_catalog_tokens.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_model_catalog_tokens.py 2>&1 | tail -1
echo "== tests/agents/test_payload_sin_transcript.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_payload_sin_transcript.py 2>&1 | tail -1
echo "== tests/agents/test_register_session.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_register_session.py 2>&1 | tail -1
echo "== tests/agents/test_stop_reason_provenance.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_stop_reason_provenance.py 2>&1 | tail -1
echo "== tests/agents/test_store_home.py"; PYTHONPATH=src timeout 120 python3 tests/agents/test_store_home.py 2>&1 | tail -1
echo "== tests/hooks/test-hook-error-log.sh"; timeout 120 bash tests/hooks/test-hook-error-log.sh 2>&1 | tail -1
echo "== tests/paths/test_child_env.py"; PYTHONPATH=src timeout 120 python3 tests/paths/test_child_env.py 2>&1 | tail -1
echo "== tests/session/test_transcripts_home.py"; PYTHONPATH=src timeout 120 python3 tests/session/test_transcripts_home.py 2>&1 | tail -1
echo "== tests/session/test_user_wiring.py"; PYTHONPATH=src timeout 120 python3 tests/session/test_user_wiring.py 2>&1 | tail -1
echo "== tests/store/test_agent_sessions.py"; PYTHONPATH=src timeout 120 python3 tests/store/test_agent_sessions.py 2>&1 | tail -1
echo "== tests/task/test_task_ids.py"; PYTHONPATH=src timeout 120 python3 tests/task/test_task_ids.py 2>&1 | tail -1
echo "== tests/task/test_task_source_citas.py"; PYTHONPATH=src timeout 120 python3 tests/task/test_task_source_citas.py 2>&1 | tail -1
echo "== tests/transcript/test_closing.py"; PYTHONPATH=src timeout 120 python3 tests/transcript/test_closing.py 2>&1 | tail -1
echo "== tests/transcript/test_model.py"; PYTHONPATH=src timeout 120 python3 tests/transcript/test_model.py 2>&1 | tail -1
echo "== tests/verify/test_step_report.py"; PYTHONPATH=src timeout 120 python3 tests/verify/test_step_report.py 2>&1 | tail -1
