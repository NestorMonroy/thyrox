# commit-ratchet-158

## Qué se lanzó

```
bash -c GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL='46802445+NestorMonroy@users.noreply.github.com' git -c user.name=jcg-admin -c user.email=169318663+jcg-admin@users.noreply.github.com -c commit.gpgsign=false commit -q -m 'Lower the CLI ratchet to 158

Step 148 ported the modules hooks.ts imports, and both CLI projects
now measure 158, three under the 161 set when the ports were saved.
Lowering it keeps those three from coming back.' -- .claude/baselines/cli_typecheck_baseline.txt .claude/jobs/commit-step-148-20260925T224443 2>&1 | gawk '/check-cli-typecheck: tsconfig/'; git log -1 --format='%h %s'; git push -q origin HEAD
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
