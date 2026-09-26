#!/usr/bin/env bash
cd /home/user/thyrox
echo "== A sin admision por VRAM"; bash bin/replace_literal --old-file .claude/workbench/gpu-vram-20260926T204740/an1-old.txt --new-file .claude/workbench/gpu-vram-20260926T204740/an1-new.txt src/session/headless-pool.sh >/dev/null
bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"; cp .claude/workbench/gpu-vram-20260926T204740/headless-pool.pre-annulment.sh src/session/headless-pool.sh
echo "== B sin aplicar la anchura efectiva"; bash bin/replace_literal --old-file .claude/workbench/gpu-vram-20260926T204740/an2-old.txt --new-file .claude/workbench/gpu-vram-20260926T204740/an2-new.txt src/session/headless-pool.sh >/dev/null
bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"; cp .claude/workbench/gpu-vram-20260926T204740/headless-pool.pre-annulment.sh src/session/headless-pool.sh
echo "== restaurado"; git diff --quiet .claude/workbench/gpu-vram-20260926T204740/headless-pool.pre-annulment.sh 2>/dev/null; cmp src/session/headless-pool.sh .claude/workbench/gpu-vram-20260926T204740/headless-pool.pre-annulment.sh && echo identico
