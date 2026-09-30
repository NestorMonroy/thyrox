cd /home/user/thyrox
for t in tests/agents/test_register_session.py tests/agents/test_stop_reason_provenance.py tests/transcript/test_closing.py tests/store/test_agent_sessions.py tests/store/test_store_home.py; do echo "== $t"; PYTHONPATH=src python3 $t 2>&1 | tail -1; done
for t in tests/store/test-agent-store-usage-columns.sh tests/agents/test-register-agent-session.sh; do echo "== $t"; bash $t 2>&1 | tail -1; done
