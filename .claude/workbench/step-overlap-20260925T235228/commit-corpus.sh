set -u
cd /home/user/thyrox
git add -N _references/claude-code-bin/2.1.282 .claude/jobs/binary-extract-2-1-282-20260926T003515 .claude/jobs/binary-extract-2-1-282-v2-20260926T003737 .claude/jobs/strings-2-1-282-20260926T003551 .claude/workbench/step-overlap-20260925T235228
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL='46802445+NestorMonroy@users.noreply.github.com' git -c user.name=jcg-admin -c user.email=169318663+jcg-admin@users.noreply.github.com -c commit.gpgsign=false commit -q -m 'Vendor the claude-code 2.1.282 corpus

The installed executable declares 2.1.282 in its payload and the corpus
stopped at 2.1.281; binary freshness reported it. The new build carries
all 2282 table entries in bunfs-root, the MANIFEST, the strings dump and
the README, the last two now written by extract itself (5ccdf8c2). The
dump matches GNU strings -n 4 by sha256, kept in the bench; 2.1.282 is
the dominant version literal in it, 2327 times against 148.

The first extraction, made before the fix, is kept as its job record.' -- _references/claude-code-bin/2.1.282 .claude/jobs/binary-extract-2-1-282-20260926T003515 .claude/jobs/binary-extract-2-1-282-v2-20260926T003737 .claude/jobs/strings-2-1-282-20260926T003551 .claude/workbench/step-overlap-20260925T235228 2>&1 | grep -E 'check_bench|check_cache|fuera|BLOQUE' | head -5
git log -1 --format='%h %s'
git push -q origin HEAD 2>&1 | tail -2
