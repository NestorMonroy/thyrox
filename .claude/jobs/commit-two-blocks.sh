set -u
cd /home/user/thyrox
bash .claude/jobs/commit-loop.sh .claude/jobs/msg-combined.txt .env.example src/lib/toolchain.sh tests/lib/test-toolchain-redis.sh src/packages/shared-state src/packages/app-host src/packages/local-observability/src < /dev/null
