// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import"/$bunfs/root/chunk-jdw11prg.js";import"/$bunfs/root/chunk-1mrhsd7s.js";import"/$bunfs/root/chunk-kn2qhfka.js";import"/$bunfs/root/chunk-55w4bsdv.js";import"/$bunfs/root/chunk-9fysw8jv.js";import{Ll,a}from"/$bunfs/root/chunk-m92n5xra.js";import"/$bunfs/root/chunk-x1rrg5j2.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import"/$bunfs/root/chunk-m7w5m1w6.js";import"/$bunfs/root/chunk-058caznt.js";import"/$bunfs/root/chunk-97tbrkcc.js";import{b,cD}from"/$bunfs/root/chunk-fzpv8ev5.js";import"/$bunfs/root/chunk-xmrr4sh8.js";import"/$bunfs/root/chunk-ras23w04.js";import"/$bunfs/root/chunk-6rkpsn9e.js";import"/$bunfs/root/chunk-ck0tqv1m.js";import"/$bunfs/root/chunk-8mbwgjdd.js";import{Di}from"/$bunfs/root/chunk-gn1spzts.js";import"/$bunfs/root/chunk-9f9fskgc.js";import{Us,Cn}from"/$bunfs/root/chunk-spz20jb6.js";import{Zie,UP,G1}from"/$bunfs/root/chunk-x722nt0q.js";import"/$bunfs/root/chunk-1v541dwj.js";import"/$bunfs/root/chunk-bx79h7g8.js";import"/$bunfs/root/chunk-mzmfq60a.js";import"/$bunfs/root/chunk-616tsvrd.js";import"/$bunfs/root/chunk-5dw4kvcq.js";import"/$bunfs/root/chunk-ye42pw2j.js";import"/$bunfs/root/chunk-vdqz95a3.js";import"/$bunfs/root/chunk-n8g979s0.js";import"/$bunfs/root/chunk-mxy52vze.js";import"/$bunfs/root/chunk-zk8esmth.js";import"/$bunfs/root/chunk-k1wkanbv.js";import"/$bunfs/root/chunk-7y5wjz4e.js";import"/$bunfs/root/chunk-gxyczd8c.js";import"/$bunfs/root/chunk-h96shwz8.js";import"/$bunfs/root/chunk-ptdm1fhw.js";import"/$bunfs/root/chunk-gzwhm5vd.js";import"/$bunfs/root/chunk-nwzn6gxv.js";import"/$bunfs/root/chunk-enjww0fp.js";import"/$bunfs/root/chunk-0dkpd8qq.js";import"/$bunfs/root/chunk-67nd7etf.js";import"/$bunfs/root/chunk-7xxnrgeg.js";import"/$bunfs/root/chunk-rahwxqh8.js";import"/$bunfs/root/chunk-m0a16ehy.js";import"/$bunfs/root/chunk-rjxafr3h.js";import"/$bunfs/root/chunk-21dppk21.js";import"/$bunfs/root/chunk-edmcaynh.js";import"/$bunfs/root/chunk-wxd1scze.js";import"/$bunfs/root/chunk-77152aqa.js";import"/$bunfs/root/chunk-xfn8hpdj.js";import"/$bunfs/root/chunk-33da912m.js";import"/$bunfs/root/chunk-x67fwt53.js";import"/$bunfs/root/chunk-8trhjkwe.js";import"/$bunfs/root/chunk-4z2eqcrq.js";import"/$bunfs/root/chunk-b3pxzdmn.js";import"/$bunfs/root/chunk-pwdby7t2.js";import"/$bunfs/root/chunk-ta3hhm0z.js";import"/$bunfs/root/chunk-a0qeq8pm.js";import"/$bunfs/root/chunk-9qgz04yg.js";import"/$bunfs/root/chunk-vv5g97a8.js";import"/$bunfs/root/chunk-b5ax9mbm.js";import"/$bunfs/root/chunk-35w62chd.js";import"/$bunfs/root/chunk-2yqsfgga.js";import"/$bunfs/root/chunk-trntcdrz.js";import"/$bunfs/root/chunk-nmde69vm.js";import"/$bunfs/root/chunk-7r03n5n9.js";import"/$bunfs/root/chunk-9pd12rac.js";import"/$bunfs/root/chunk-a7a5sap3.js";import"/$bunfs/root/chunk-3r19kwqx.js";import"/$bunfs/root/chunk-55t63zqr.js";import"/$bunfs/root/chunk-5t2g7ar8.js";import"/$bunfs/root/chunk-0xd0k64r.js";import"/$bunfs/root/chunk-j2rxdvy0.js";import{F9}from"/$bunfs/root/chunk-frdbns5y.js";import"/$bunfs/root/chunk-wq7jsb8f.js";import{SL}from"/$bunfs/root/chunk-3by17dv3.js";import{Zce}from"/$bunfs/root/chunk-tbj45h7y.js";import"/$bunfs/root/chunk-jtegkk17.js";import"/$bunfs/root/chunk-npdpr5xp.js";import"/$bunfs/root/chunk-f1ybk250.js";import"/$bunfs/root/chunk-6dcxrmbt.js";import"/$bunfs/root/chunk-x05cyafz.js";import{_Pe}from"/$bunfs/root/chunk-v29ezwd0.js";import"/$bunfs/root/chunk-y0c7xssj.js";import"/$bunfs/root/chunk-7nw1s99d.js";import"/$bunfs/root/chunk-vckrj367.js";import"/$bunfs/root/chunk-zc7jwbz1.js";import"/$bunfs/root/chunk-50etkfry.js";import"/$bunfs/root/chunk-c6eb44np.js";import"/$bunfs/root/chunk-nc8ww32a.js";import"/$bunfs/root/chunk-my1n9ey3.js";import"/$bunfs/root/chunk-v10h0yg2.js";import{spawnSync as f}from"child_process";function l(e){let r=new URL(e).host;return`You are diagnosing a **self-hosted runner** deployment for Claude Code on the web. Work through the diagnostic categories below, gather evidence with the typed \`self_hosted_runner_*\` read tools (admin-API state, \`/healthz\`, \`/metrics\`, redacted log tail) and Bash for everything else, fix what you can, and escalate cleanly when you can't.

## Step 0 \u2014 Detect context

Figure out where you're running and what you can reach:

- **On the runner host?** \`self_hosted_runner_read_health\` returns \`{health:{\u2026}}\`. You can \`self_hosted_runner_tail_log\` the runner's \`--log-file\` directly, and \`self_hosted_runner_read_metrics\` gives a point-in-time gauge snapshot without parsing the log.
- **On an operator laptop?** \`self_hosted_runner_read_health\` returns \`{unreachable:true}\`, but \`kubectl\` / \`docker\` are available via Bash. Logs come via \`kubectl logs\` / \`docker logs\`.
- **Admin API access?** The typed admin-API tools throw "Not logged in" if there's no \`claude login\` OAuth session. Without it, you're limited to local evidence \u2014 say so, and tell the operator to run \`claude login\` if you need server-side state. (\`ANTHROPIC_API_KEY\` does **not** work for these endpoints \u2014 OAuth only.)

Ask the operator: **"What's the symptom?"** \u2014 or scan the runner log, \`/healthz\`, and admin API yourself to classify it into one of the nine categories below. If you can't classify it, gather everything non-destructively, generate the bundle (below), and present your best hypothesis alongside it.

## Diagnostic categories

Each row: **signature** (what the operator or logs show) \u2192 **check** \u2192 **root cause** \u2192 **fix**. Work the relevant category; cross-reference when a signature points elsewhere (e.g. \`alive_runner_count == 0\` in \xA75 \u2192 go to \xA71/\xA72).

### 1. Auth chain (4-token model: environment secret \u2192 runner_token \u2192 session_token \u2192 inference)

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| \`[runner:fatal] RegisterRunner auth failed \u2014 environment secret invalid or revoked\` | Bash \`curl -sS -H "Authorization: Bearer $(cat <environment-secret-file>)" "${e}/v1/code/runners/self-hosted/runners/register" -X POST -d '{}'\` | environment secret revoked or wrong | Re-issue via **Issue new key** on the environment's Configuration tab (Admin settings \u2192 Cloud environments); remount on the runner |
| \`RegisterRunner auth failed\` but secret was just minted | Decode the secret's \`ccr:org_id\` claim: \`sed 's/^sk-ant-[a-z]*-//' <secret-file> \\| cut -d. -f2 \\| tr '_-' '/+' \\| base64 -d 2>/dev/null \\| jq .\` | Secret issued by a *different* org | Use a secret minted from **this** org's environment |
| Runner fatal at startup before any network call: \`ENOENT\` / \`EACCES\` reading environment secret | \`ls -l <environment-secret-file> && cat <environment-secret-file> >/dev/null\` | Secret file unreadable, missing, or volume mount hung | Fix file perms / re-mount the secret volume |
| \`[runner:fatal] poll auth failed \u2014 token expired or revoked. Draining and exiting for clean restart.\` after running fine for a while | Check whether the runner restarted cleanly (orchestrator logs / pod restart count) | runner_token TTL hit or was revoked. Runner does **not** self-heal \u2014 it drains and exits cleanly so the orchestrator restarts it, which re-registers. | If the restart loop persists across fresh pods, the **environment secret** itself was revoked \u2192 re-issue |
| Child \`claude\` process fails calling the API | \`grep -i 'Authentication failed' <runner.log>\` | session_token isn't refreshing | Confirm runner version has the refresh logic; restart the runner |
| Model calls fail with \`403\` / \`authentication_error\` (session_token is fine) | Inference-token path; nothing operator-side to inspect | Inference auth misconfigured for the org | Escalate \u2014 this is org-level config on the Anthropic side |

### 2. Network

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| \`getaddrinfo ENOTFOUND ${r}\` | \`nslookup ${r}\` | DNS resolution broken | Fix resolver / \`/etc/resolv.conf\` / cluster DNS |
| \`connect ETIMEDOUT\` / \`ECONNREFUSED\` | \`curl -sI --max-time 5 ${e}/\` | Firewall blocks egress on 443 | Allow egress to \`${r}:443\` |
| \`ECONNRESET\` mid-poll | How long was the connection open before reset? | NAT / proxy idle-connection timeout dropping long-lived polls | Raise NAT/proxy idle timeouts |
| \`unable to verify the first certificate\` | \`openssl s_client -connect ${r}:443 </dev/null\` | Corporate TLS interception / missing CA | Install CA bundle; set \`NODE_EXTRA_CA_CERTS\` |
| \`curl\` from the host works but the runner process can't connect | Dump \`HTTPS_PROXY\` / \`HTTP_PROXY\` / \`NO_PROXY\` from the runner's env | Proxy env vars set (or missing) on the runner process only | Match proxy env between host and runner |
| \`404\` on every API path | \`echo $ANTHROPIC_BASE_URL\` \u2014 compare to expected \`${e}\` | \`ANTHROPIC_BASE_URL\` mis-set | Fix or unset \`ANTHROPIC_BASE_URL\` |
| \`Rate limited (429). Polling too frequently.\` on PollWork | Custom poll interval below 5s? Many replicas sharing one environment? | Backend rate-limiting | Restore default poll interval; reduce replica fan-out |
| Mid-run \`poll auth failed\` on an otherwise-healthy runner | \`date -u\` vs \`curl -sI ${e}/ \\| grep -i '^date:'\` | Runner clock skew throws off the 80%-TTL refresh schedule | Fix NTP on the host |

### 3. Runner lifecycle

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| Process exits 0; last log line \`account workload drained\` | \u2014 | Expected \u2014 runner was account-locked, that account's last session finished | Orchestrator should restart it |
| Process exits 0; last log line \`[runner:exit] idle <N>min with no work \u2014 exiting for autoscaler scale-down\` | \`--exit-if-unused-min\` value | Intended idle exit | Raise/remove \`--exit-if-unused-min\` |
| Process exits 0; last log line \`[runner:exit] retire time passed and no active sessions\` (preceded by \`[runner:retire] \u2026\` lines) | \`--retire-at\` / \`SELF_HOSTED_RUNNER_RETIRE_AT\` value vs the host's kill time | Intended retire exit \u2014 active sessions were released (parked, resumable) before the host's hard kill | Expected; if sessions are still dying at the host kill, move \`--retire-at\` earlier |
| Process exits 0; last log line \`[runner:exit] shutdown requested and every attached session has been released\` (preceded by \`Received shutdown signal, deferring drain \u2026\` / \`[runner:shutdown] \u2026\` lines) | \`--defer-shutdown-max-min\` (and \`--release-idle-session-min\`) vs the supervisor's stop timeout | Intended deferred-shutdown exit \u2014 on the first SIGTERM the runner kept serving attached sessions, released them (parked, resumable) as they went idle or at the ceiling, then exited | Expected; if instead the log just stops mid-deferral (no exit line) the supervisor SIGKILLed it \u2014 raise the stop timeout to at least M minutes + 75s (the post-ceiling grace; --drain-wait-sec + 15s if longer) + the shutdown budget \u2014 the runner prints this sum at startup when the flag is set (the guide's Shutdown timing) |
| \`kubectl describe pod\` \u2192 \`OOMKilled\` / exit 137 | Pod memory limit vs \`--capacity\` \xD7 child footprint | Runner + N child sessions exceeded the limit | Raise memory limit or lower \`--capacity\` |
| Pod evicted / restarted by liveness probe | \`kubectl get events\`; is \`/healthz\` reachable from the probe? | Liveness probe targets wrong port/path | Point probe at \`GET :{health-port}/healthz\` |
| Sessions killed mid-run during a deploy | \`terminationGracePeriodSeconds\` vs observed drain time | SIGTERM\u2192SIGKILL before drain finished | Raise \`terminationGracePeriodSeconds\` |

### 4. Session execution

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| \`failure_log\`: \`git clone failed: authentication\` | Runner image has git creds? | Git auth missing | Mount creds / inject via \`--exec-path\` wrapper |
| \`failure_log\`: \`command not found\` | \`which <tool>\` inside runner image | Tool missing | Install in the image |
| \`failure_log\`: \`ENOSPC\` | \`df -h\` on runner host | Disk full | Clean \`--base-dir\` / mount larger volume |
| Child \`claude\` exits immediately, no output | Inspect \`--exec-path\` wrapper | Wrapper broken | \`chmod +x\`; test standalone |
| Session aborted after N min wall-clock | \`--kill-session-after-min\` value | Max-lifetime watchdog fired on a single child session | Raise if too aggressive |
| \`[runner:session] <sid> no child output for <N> \u2014 releasing\` | \`--startup-timeout-min\` value (default 15) | Startup-timeout clock fired \u2014 child produced no output (slow MCP connect / large \`--resume\` hydration / no pending input) | Raise \`--startup-timeout-min\` or set \`0\` to disable |
| \`failure_log\`: \`Another runner has taken over this session\` (409) | Network blips / long pauses before? | Lease expired, another runner claimed it | Usually self-resolves |
| Session shows a **Failed** badge (with an attempt count and **Retry**) in the Activity tab's Sessions view (\`excluded_runner_ids\` length \u2265 3) | \`self_hosted_runner_list_sessions\` \u2192 check \`failure_log\` + \`excluded_runner_ids\` | Failed on 3 different runners \u2014 usually the session, not the infra | Investigate the session; if you've confirmed the infra is healthy and want to retry on a fresh runner, \`self_hosted_runner_requeue_session({session_id, runner_id})\` clears the block (pass the last runner in excluded_runner_ids as runner_id) |
| \`EACCES\` writing to base-dir | \`ls -ld $BASE_DIR\`; \`id\` | Wrong UID | Fix ownership or point \`--base-dir\` at a writable path |

### 5. Queue / placement

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| Sessions stay **Queued** forever; runners alive | \`get_pool\` \u2192 \`unplaceable_session_count > 0\`; \`list_runners\` \u2192 every \`locked_account_id\` set | All runners account-locked to *other* users | Scale up; or wait for locked runners to drain |
| Queued; \`available_capacity_total == 0\` | Runner \`--capacity\` vs \`active_sessions\` | At capacity | Scale up replicas or raise \`--capacity\` |
| Queued; \`pending_session_count == 0\` on this environment | List **all** environments and their \`pending_session_count\` | Session created against a *different* environment | Point user at the right environment |
| Queued; \`alive_runner_count == 0\` | \u2014 | No runners at all | Go to \xA71/\xA72/\xA73 |
| Queued (autoscaling environment); \`get_pool\` \u2192 \`circuit_broken_count > 0\` or \`backing_off_count > 0\` | \u2014 | spawn-runner hook failing \u2014 sessions are paused/backing off, not unplaceable | Go to \xA79 rows 6\u20137 |

### 6. Version / compatibility

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| \`runner version <X> is below minimum <Y>\` | \`claude --version\` vs server floor | Runner build too old | Update the self-hosted-runner build |
| Unexpected 400s / fields missing from responses | Runner version vs current release | Backend rolled forward past this runner | Update the build |

### 7. Observability gaps

| Signature | Fix |
|---|---|
| No \`--log-file\` set | Restart with \`--log-file /var/log/self-hosted-runner.log\` |
| \`/healthz\` unreachable | Check \`--health-port\`; open firewall |
| \`[runner:warn] /healthz listener failed on port <p>: EADDRINUSE\` | Set \`--health-port\` to a free port |
| \`/metrics\` not scraped | Point a \`PodMonitor\` at the pods; gauges: \`claude_code_self_hosted_runner_{capacity,active_sessions,locked_account,last_poll_age_seconds,info}\` |

### 8. Webhook

Webhook delivery is in design \u2014 Anthropic is gathering input from early-access operators on the payload shape before shipping. If you have requirements, share them with your account team. Until then, use \`self_hosted_runner_get_pool\` for queue depth.

### 9. Orchestrator (autoscaling)

If the operator runs \`claude self-hosted-runner orchestrator\` to consume spawn requests, probe its \`/healthz\` (default \`--health-port\` 8080; same port as the runner, so on a shared host check which process owns it). The endpoint **always returns 200** \u2014 read the body for state. From an operator laptop, port-forward first: \`kubectl port-forward deploy/<orchestrator> 8080\`.

\`\`\`bash
curl -s http://localhost:8080/healthz | jq .
\`\`\`

| Signature | Check | Root cause | Fix |
|---|---|---|---|
| \`/healthz\` unreachable (\`curl\` connection refused) | Is the orchestrator process up? \`--health-port\` set to something other than 8080, or \`0\`? | Process down, wrong port, or listener disabled | Start it / point at the right port |
| \`"connected": false\` | \`last_error\` field in the same body | Can't reach \`${r}\` (network/DNS/TLS \u2014 see \xA72) or environment secret rejected (see \xA71) | Fix per the referenced section; the orchestrator exits non-zero on 400/401/403/404/426 so a restart loop here means a permanent config/auth/version problem (400 = invalid request body, usually a flag mismatch) |
| \`"clock_skew_ms"\` \u2265 60000 (or \u2264 \u221260000) | \`date -u\` on the orchestrator host vs \`curl -sI ${e}/ \\| grep -i '^date:'\` | Host clock drifted; hooks that verify the work-order JWT \`exp\` will mis-fire | Fix NTP on the host |
| \`"last_poll_at"\` more than ~60s old while \`connected: true\` | Orchestrator log for the last \`dispatching N hint(s)\` line and matching hook completions; \`ps\`/\`kubectl exec\` for stuck \`spawn-runner\` children. (Backoff after poll errors flips \`connected: false\` first, so it appears on row 2 \u2014 not here.) | Poll loop wedged between successful polls on a slow/stuck \`spawn-runner\` hook (D-state on a hung mount, or a hook that doesn't return within \`--hook-timeout\`) | Kill the stuck hook; check \`hooksDir\` mount health; the orchestrator abandons a D-state child after \`--hook-timeout\` + 2\xD75s grace. Restart the orchestrator if the log shows no progress |
| \`"last_error"\` set (non-null) | Read the string \u2014 it's either \`spawn-runner hook failed: <stderr tail>\` or a poll failure (HTTP status or transport error) | Hook script failing / can't reach \`${r}\` | Fix the hook (run it by hand with a fake \`CLAUDE_RUNNER_ORDER_ID\`); for poll failures see \xA72 |
| \`"queue_counts.backing_off" > 0\` | \`self_hosted_runner_list_sessions\` \u2192 per-session \`spawn_last_error\` (sanitized hook stderr) | spawn-runner hook is failing intermittently; each session retries with exponential backoff | Fix the hook; sessions self-recover on the next retry |
| \`"queue_counts.circuit_broken" > 0\` | \`self_hosted_runner_list_sessions\` \u2192 per-session \`spawn_last_error\` | spawn-runner hook failed 5\xD7 (or returned non-retryable) for those sessions; they are **paused** and will not be re-offered | Fix the infra (k8s quota, image pull, hook exit code), then for each paused session: Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Sessions \u2192 **Retry**, or \`curl -X POST -H "Authorization: Bearer $OAUTH" "${e}/v1/code/runners/self-hosted/sessions/<session_id>/retry-spawn" -d '{}'\` |

When bundling for escalation, also capture \`orchestrator-healthz.json\` alongside the runner's \`healthz.json\`.

## Escalation \u2014 generate a diagnostic bundle

When you can't fix it, or the operator asks to escalate:

1. \`TS=$(date -u +%Y%m%dT%H%M%SZ); DIR=./runner-diag-$TS; mkdir -p "$DIR"\`
2. Collect (write \`"unreachable"\` / \`"unavailable"\` for anything you can't get):
   - \`healthz.json\` \u2014 \`/healthz\` output
   - \`metrics.txt\` \u2014 \`/metrics\` output
   - \`runner.log\` \u2014 last ~64 KB of the \`--log-file\` or \`kubectl logs --tail=1000\`
   - \`environment.json\`, \`runners.json\`, \`sessions.json\` \u2014 admin-API responses (if OAuth available)
   - \`versions.txt\` \u2014 \`claude --version\`; runner version from \`/healthz\`; \`uname -a\`
   - \`config-redacted.txt\` \u2014 the runner's flags / env, redacted
   - \`DIAGNOSIS.md\` \u2014 **your own write-up**: symptom, category, what you checked, best hypothesis
3. **Redact** \`runner.log\` and \`config-redacted.txt\` before bundling. Pipe each through:

   \`\`\`bash
   sed -E -e 's/((secret|key|token|password|credential)[^=: ]*[=: ]+)[^ ]+/\\1[REDACTED]/Ig' \\
          -e 's/sk-ant-[A-Za-z0-9_.-]+/[REDACTED]/g' \\
          -e 's/(Bearer )[^[:space:]]+/\\1[REDACTED]/Ig'
   \`\`\`

   **Review manually before sharing** \u2014 automated redaction is best-effort.
4. \`tar czf runner-diag-$TS.tar.gz -C . runner-diag-$TS && rm -rf "$DIR"\`
5. Tell the operator:

   > Diagnostic bundle: \`./runner-diag-<ts>.tar.gz\`
   > Please review it (open the tarball \u2014 no secrets should be present), then share it with Anthropic via your shared Slack Connect channel or account team.

**Never auto-upload customer logs.** The operator reviews and sends.`}var g=["Bash","Read","Write","TodoWrite","TaskCreate","TaskGet","TaskList","TaskUpdate","self_hosted_runner_get_pool","self_hosted_runner_list_runners","self_hosted_runner_list_sessions","self_hosted_runner_list_secrets","self_hosted_runner_read_health","self_hosted_runner_read_metrics","self_hosted_runner_tail_log","self_hosted_runner_requeue_session"].join(","),m="Start the self-hosted runner doctor wizard. Greet me, then ask me to describe the symptom or pick from the 8 diagnostic categories. Work through it one step at a time.";async function F(e,r){if(e.includes("--help")||e.includes("-h")){console.log(`Usage: claude self-hosted-runner doctor [args...]

Interactive wizard: diagnoses a self-hosted runner deployment. Walks the
diagnostic decision tree (auth chain, network, lifecycle, session
execution, queue, version, observability), gathers evidence
from /healthz, runner logs, and the admin API, fixes what it can, and
generates a redacted diagnostic bundle for escalation.

Any extra args are passed to the underlying Claude Code session.`);return}await _Pe(r),F9();let o=SL(r);if(Zie(o),M()&&o!==void 0){cD({storageV5:o}),UP(o);let[{composePolicyLimitsClient:n,primePolicyLimitsCache:d},{credentialsStoreFor:u},{primeFastPathCredentials:p}]=await Promise.all([import("/$bunfs/root/chunk-3v93bjem.js"),import("/$bunfs/root/chunk-c8eqqg1y.js"),import("/$bunfs/root/chunk-ndzgcak2.js")]);n({storageV5:o}),await p(u(o)),await d(o),await G1(o)}let s=l(Zce()),h=Ll()?[]:[process.argv[1]],c=e.length>0&&!e[0].startsWith("-")?[]:[m],i=[...h,...c,"--append-system-prompt",s,"--tools",g,"--permission-mode","default",...e];if(a.DEBUG)console.error("[self-hosted-runner:doctor] spawning:",b({argv:[process.execPath,...i.map((n)=>n===s?`<${s.length} chars>`:n)]}));let t=f(process.execPath,i,{stdio:"inherit"});if(t.error)return console.error(`[self-hosted-runner:doctor] failed to spawn child: ${t.error.message}`),await Cn("cli_self_hosted_doctor","spawn_failed"),Di(1);if(t.status!==null&&t.status!==0||t.signal)console.error(`[self-hosted-runner:doctor] child exited with status ${t.status??"(null)"}${t.signal?`, signal ${t.signal}`:""}`),await Cn("cli_self_hosted_doctor",t.signal?"child_signal":"child_nonzero");else await Us("cli_self_hosted_doctor");return console.error("[self-hosted-runner:doctor] To continue diagnosis, re-run `claude self-hosted-runner doctor` \u2014 resuming the session with `claude --resume`/`-c` will not re-enable the doctor tools."),Di(t.status!==null?t.status:1)}export{F as selfHostedRunnerDoctorMain};
