// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{f6a as ce,i5a as x}from"/$bunfs/root/_468.js";import{O0c as de,z0c as y}from"/$bunfs/root/_753.js";import{Ped as S,Qed as q}from"/$bunfs/root/_817.js";import{Red as N}from"/$bunfs/root/_818.js";import{bfd as m}from"/$bunfs/root/_819.js";import{Rfd as E,Ufd as C,Wfd as le,qgd as R,ugd as L}from"/$bunfs/root/_820.js";import{nud as v,pud as re}from"/$bunfs/root/_829.js";import{rud as P,wud as D}from"/$bunfs/root/_830.js";import{Gud as A,zvd as se}from"/$bunfs/root/_831.js";import{xxd as I}from"/$bunfs/root/_837.js";function c(n,t){if(n.length<=t)return n;let e=t-1,i=n.charCodeAt(e-1);if(i>=55296&&i<=56319)e--;return n.slice(0,e)+"\u2026"}function w(n,t){let e=null,i=0,r=0;while(r<t){let s=n.indexOf("```",r),u=n.indexOf("~~~",r),p=s===-1?u:u===-1?s:Math.min(s,u);if(p===-1||p>=t)break;let o=n[p],l=p-1,f=0;while(l>=0&&n[l]===" "&&f<3)l--,f++;let b=l<0||n[l]===`
`,g=3;r=p+3;while(n[r]===o)r++,g++;if(!b)continue;if(e===null)e=o,i=g;else if(e===o&&g>=i)e=null,i=0}return e!==null}function ke(n,t="",e){if(e==="dlp_request_denied")return{state:"failed",needs:"API error"};switch(n){case"authentication_failed":return{state:"blocked",needs:"login required \u2014 run /login"};case"oauth_org_not_allowed":return{state:"blocked",needs:"org disabled OAuth \u2014 use API key or ask admin"};case"account_on_hold":return{state:"blocked",needs:"account on hold \u2014 see detail"};case"billing_error":return{state:"blocked",needs:"usage limit reached \u2014 check plan"};case"rate_limit":return{state:"blocked",needs:"rate limited \u2014 wait and retry"};case"overloaded":return{state:"blocked",needs:"API overloaded \u2014 wait and retry"};case"server_error":return{state:"blocked",needs:"API unavailable \u2014 retry"};case"invalid_request":return/\b(too long|too large|exceeds|token limit|prompt is too long)\b/i.test(t)?{state:"blocked",needs:"request too large \u2014 /compact or trim"}:{state:"blocked",needs:"invalid API request \u2014 see detail"};case"max_output_tokens":return null;case void 0:return{state:"blocked",needs:"API error \u2014 see detail"};case"unknown":default:return{state:"failed",needs:"API error"}}}function K(n,t,e){let i;for(let[r,s]of[["failed",U],["blocked",M],["blocked",W],["blocked",G]])for(let u of t.matchAll(s)){if(w(n,e+u.index))continue;if(!i||u.index>i.index)i={state:r,capture:u[1].trim(),index:u.index,end:u.index+u[0].length}}return i}function ve(n){let t=n.trim();if(!t)return"empty";if(w(t,t.length))return"code-fence";let e=t.slice(-800),i=t.length-e.length;for(let s of e.matchAll(/(?:^|\n)\s*result:\s*\S/gi))if(!w(t,i+s.index))return"result-line";for(let s of e.matchAll(/(?:^|\n)\s*failed:\s*\S/gi))if(!w(t,i+s.index))return"failed-line";if(/[?\uFF1F]\s*$/.test(t))return"trailing-q";let r=t.slice(-200);if(/(?:^|\n)\s*(?:[-*\u2022]|\d+\.|[|])\s/.test(r))return"list-or-table";return"declarative"}function ye(n){let t=n.trim();if(!t)return null;let e=t.slice(-800),i;for(let a of e.matchAll(/(?:^|\n)\s*result:\s*(.+?)\s*(?:\n|$)/gi))if(!w(t,t.length-e.length+a.index))i=a;let r=e,s=t.length-e.length;if(i){let a=i.index+i[0].length;r=e.slice(a),s=t.length-e.length+a}let u=K(t,r,s);if(i&&!u){let a=c(i[1],d);if([...r.matchAll(/(?:^|\n)\s*next:\s*\S/gi)].some((O)=>!w(t,s+O.index)))return{branch:"result-then-next",state:"working",tempo:"idle",detail:a,output:{result:a}};return{branch:"result-marker",state:"done",tempo:"idle",detail:a,output:{result:a}}}if(u?.state==="failed")return{branch:"failed-marker",state:"failed",tempo:"idle",detail:c(u.capture,d),output:{}};if(u?.state==="blocked"){let a=r.slice(u.end);if(P(a.split(/\n\s*\n/),(h)=>h.trim().length>0)>=3)return null;if(!/\bnothing (?:needed|required) from you\b|\bno(?: user)? action (?:needed|required)\b/i.test(r)){let h=c(u.capture,d);return{branch:"blocked-marker",state:"blocked",tempo:"blocked",needs:h,detail:h}}if(i){let h=c(i[1],d);return{branch:"blocked-disclaimed",state:"done",tempo:"idle",detail:h,output:{result:h}}}return null}if(/[?\uFF1F]\s*$/.test(e)&&e.replace(/[?\uFF1F\s]+$/,"").length>=4){let a=Math.max(e.lastIndexOf(`
`),e.lastIndexOf(". "),e.lastIndexOf("! "),e.lastIndexOf("? ",e.length-2));if(!w(t,t.length-e.length+a)){let h=c(e.slice(a+1).trim(),d);if(z.test(h))return null;return{branch:"trailing-q",state:"blocked",tempo:"blocked",needs:h,detail:h}}}let p=Math.max(0,e.lastIndexOf(". "),e.lastIndexOf("! "),e.lastIndexOf("? "),e.lastIndexOf(`
`)),o=e.slice(p).replace(/^[.!?\s]+/,""),l=w(t,t.length-e.length+p),f=/\b(?:waiting (?:for|on)|pending)\s+(?:the\s+)?(?:CI|build|tests?|reviewer|deploy(?:ment)?|workflow|checks?|rollout|merge queue)\b/i.exec(o);if(f&&!l)return{branch:"wait-external",state:"working",tempo:"idle",detail:c(f[0],d),output:{}};let b=/\b(?:awaiting|waiting (?:for|on)|pending)\s+(?:your\s+(?:feedback|input|decision|response|approval|direction|guidance|go-ahead)|you\b|the user\b)/i.exec(o);if(b&&!l){let a=c(o.slice(b.index).trim(),d);return{branch:"awaiting-user",state:"blocked",tempo:"blocked",needs:a,detail:a}}let g=/\b(please (?:run|provide|confirm|clarify|choose|let me know)|let me know (?:which|what|how|when)|which (?:option|approach|one)|should I (?:proceed|continue|use))\b/i.exec(o);if(g&&!l){let a=c(o.slice(g.index).trim(),d);return{branch:"ask-verb",state:"blocked",tempo:"blocked",needs:a,detail:a}}if(!l&&/\b(not logged in|please run \/login|authentication failed|invalid api key|oauth token (?:expired|revoked)|credit balance (?:is )?too low|usage limit reached|mcp (?:server )?(?:authentication|auth|authorization|unauthorized)|mcp (?:server )?(?:credential|token) (?:missing|expired|invalid)|401 unauthorized|403 forbidden|token (?:has )?expired|bad credentials|gh auth login|gcloud auth login|aws (?:sso )?login)\b/i.test(o))return{branch:"auth-prose",state:"blocked",tempo:"blocked",needs:c(o,d),detail:"authentication required"};if(!l&&V.test(o)&&!X.test(o))return{branch:"working-verb",state:"working",tempo:"active",detail:c(o,d),output:{}};if(!l&&Y.test(o))return{branch:"agents-status",state:"working",tempo:"idle",detail:c(o,d)};if(!l&&J.test(o))return{branch:"will-check-back",state:"working",tempo:"idle",detail:c(o,d)};if(!l&&Z.test(o)){let a=c(o,d);return{branch:"cant-proceed",state:"blocked",tempo:"blocked",detail:a,needs:a}}if(!l&&Q.test(o))return{branch:"giving-up",state:"failed",tempo:"idle",detail:c(o,d)};if(!l&&ee.test(o)){let a=c(o,d);return{branch:"pushed-committed",state:"done",tempo:"idle",detail:a,output:{result:a}}}if(!l&&te.test(o))return{branch:"ready-for",state:"done",tempo:"idle",detail:c(o,d)};if(!l&&ne.test(o)){let a=c(o,d);return{branch:"verdict-marker",state:"done",tempo:"idle",detail:a,output:{result:a}}}if(!l&&ie.test(o)){let a=c(o,d);return{branch:"please-do-x",state:"blocked",tempo:"blocked",detail:a,needs:a}}if(!l&&oe.test(o)){let a=c(o,d);return{branch:"stopping-here",state:"blocked",tempo:"blocked",detail:a,needs:a}}return null}function xe(n){let t=n.split(`
`).map((e)=>e.trim()).findLast(Boolean);return{branch:"heuristic",state:"working",tempo:"idle",detail:t?c(t,d):"\u2014"}}function Re(n){let{tail:t,prev:e,latestAsk:i,toolSummary:r,minsInState:s}=n;return`Current state: ${e} (for ${s}m)
Tool calls so far: ${r||"none"}${i?`
User's most recent ask: "${i}"`:""}

Assistant message tail (last ${t.length} chars):
${t}`}function Se(n){let t=n.replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,""),e=t.indexOf("{"),i=t.lastIndexOf("}");if(e<0||i<0)return null;let r;try{r=R(t.slice(e,i+1))}catch{return null}let s=B().safeParse(r);return s.success?s.data:null}function k(n){return typeof n==="string"&&n?n:void 0}function Pe(n,t,e){let i=k(n.state),r=i&&Object.hasOwn(j,i)?i:e?.state??t,s=k(n.tempo),u=H.has(r)?"idle":s==="active"||s==="idle"||s==="blocked"?s:e?.tempo??"active",p={},o=n.output??e?.output;if(o&&typeof o==="object")for(let[f,b]of Object.entries(o)){let g=k(b);if(g&&Object.hasOwn(F,f))p[f]=c(g,d)}let l=k(n.needs)??(u==="blocked"?e?.needs:void 0);return{state:r,detail:k(n.detail)??e?.detail??"",tempo:u,needs:l,output:p,branch:e?.branch}}var B,j,F,d=800,be=2000,H,U,M,W,G,z,V,X,Y,J,Z,Q,ee,te,ne,ie,oe,Ie=`A user kicked off a Claude Code agent to do a coding task and walked away. Read the tail of what the agent just said and decide which of four states it's in, so the system knows whether to notify the user.

The classification drives a phone notification: "blocked" pings the user to come back; everything else doesn't. So the question you're really answering is: does the user need to come back right now, and if not, is the work finished or still going? A false "blocked" is an annoying interruption for nothing. A false "done" or "working" when the agent is actually stuck waiting on the user means the work sits idle until they happen to check.

THE FOUR STATES

  "done" \u2014 the agent answered the ask or delivered the thing, and isn't planning to do anything else unprompted. This is the most common end-of-turn state in interactive sessions. There doesn't have to be a PR, commit, or file \u2014 if the user asked a question and the tail is the answer (not a plan to find one), that's done. Explanations, analyses, recommendations, "here's what I found", "the cause is X", "no change needed", and "files at <path>" closings are all done.

  "working" \u2014 the agent intends to keep going without being asked: it said "now let me\u2026", "next I'll\u2026", "running\u2026", "checking\u2026", or it's waiting on something it kicked off (CI, build, subagent, deploy, timer). Look for explicit forward intent or a named external wait.

  "blocked" \u2014 the agent cannot continue without the user. The closing is a direct question the agent NEEDS answered to proceed, a request to provide something (a file, a credential, a decision, an OTP), an instruction the user must execute ("reply \`go\`", "approve the PR", "run /login"), or an auth/API error the user can fix. Test: would the user replying or acting unblock it?

  "failed" \u2014 the agent gave up because the task is structurally impossible as framed: wrong repo, the feature doesn't exist, the premise is false, every approach exhausted with nothing the user could hand over to unblock it. Rare. If the agent names a specific missing resource, that's "blocked", not "failed" \u2014 the user CAN unblock it.

THE HARD BOUNDARIES

Done vs working: a closing that explains, summarizes, reports findings, or shows what was changed \u2014 without saying it's about to do more \u2014 is "done". Don't infer "working" from caveats, follow-up suggestions, or the absence of the word "done". Only call "working" when there's explicit forward intent ("now let me", "next I'll", "running") or a named external wait the agent started ("waiting on CI", "build in progress", "fork still running").

Done vs blocked \u2014 optional offers vs gates: after delivering, agents often close with an offer to do more: "let me know if you want X", "if you'd like, I can also Y", "ping me and I'll Z", "say the word and I'll update", "want me to dig into that?", "tell me the IDs and I'll re-home", "happy to do the latter if you want", "shall I also\u2026?". These are "done" \u2014 the deliverable shipped; the offer is extra. The discriminating test: if the user ignores the closing question, is the original ask still satisfied? Yes \u2192 done. No \u2192 blocked.

The exception is when the question is about WHETHER or HOW to ship the work the user asked for \u2014 which PR to put it in, apply it or not, push or hold, which approach to take. Then the deliverable isn't landed without the answer, so that's "blocked". "Found the fix. Want me to add it to this PR or open a new one?" \u2192 blocked (delivery isn't decided). "Fixed it in this PR. Want me to also clean up the old helper while I'm here?" \u2192 done (delivery is complete; the extra is tangential).

Working vs done vs blocked \u2014 when the closing mentions waiting on something: the discriminator is whether the AGENT ITSELF will do more.
  \u2022 Agent says it will act ("I'll report when X lands", "next check in 5 min", "shepherding CI", "will re-poll", "checking back", "N agents in flight \u2014 I'll consolidate") \u2192 "working". The agent owns the next step, regardless of what it's waiting on.
  \u2022 Agent won't act, and there's a user-addressed gate with no re-poll ("reply \`go\` to merge", "awaiting your approval", "which approach do you want?") \u2192 "blocked". Only the user can move it forward.
  \u2022 Agent won't act, and the wait is on a third party or passive trigger ("auto-merge armed, awaiting stamp", "posted to #stamps", "CI will run") \u2192 "done". The agent's part is over; whatever happens next happens without it.
A closing with both ("Awaiting your \`go\`. Next check in 20m") is "working" \u2014 the agent will re-check on its own; \`go\` is an optional accelerator, not a hard gate.

Stickiness: you're told the previous state. Don't move done\u2192working or failed\u2192working unless the agent explicitly restarted. Moving working\u2192done is the normal end-of-turn outcome \u2014 lean "done" when the closing is declarative with no future-tense plan.

EXPLICIT MARKERS \u2014 these are unambiguous, treat them as ground truth:
  \u2022 "No response requested." / "No action needed." / "Nothing needed from you." \u2192 done
  \u2022 "result: <text>" on its own line \u2192 done (and <text> is output.result)
  \u2022 "Next check in <time>" / "Shepherding CI" / "I'll report when X lands" / "checking back" \u2192 working
  \u2022 "Reply \`go\` to <verb>" / "Awaiting your \`go\`" (with no re-poll mentioned) \u2192 blocked
  \u2022 "Giving up." / "The task is not actionable." \u2192 failed
  \u2022 "blocked: <reason>" / "I'm blocked: <reason>" on its own line \u2192 blocked

API/AUTH/INFRA ERRORS \u2192 always "blocked" (transient or user-fixable), never "failed". Set needs to the fix. Covers:
  \u2022 Anthropic API: "401", "Invalid API key", "Please run /login", "rate limited", "overloaded", "529", "credit balance too low", "usage limit reached"
  \u2022 MCP servers: "OAuth token expired/revoked", "vault credential missing", "MCP authentication failed", "MCP unauthorized"
  \u2022 External services: "gh auth login", "gcloud auth login", "aws sso login", "bad credentials", "token expired", GitLab/GitHub PAT errors, Stripe/Slack 401
  \u2022 Any prose naming a specific re-auth or re-login step

OTHER DISAMBIGUATION:
  \u2022 Agent hit an error but is retrying or investigating ("let me try again", "checking the logs") \u2192 "working"
  \u2022 Agent stopped and names a SPECIFIC missing thing the user could supply (file, env var, credential, OTP, path, decision) \u2192 "blocked", even if phrased as "can't proceed" or "stopping here"
  \u2022 Scope notes, caveats, or FYIs after a delivered finding ("note: Y is untested", "out of scope but worth flagging") \u2192 "done"
  \u2022 A summary of options or a recommendation ("B is the right call", "I'd take option 1") with no question \u2192 "done" (the recommendation IS the deliverable)
  \u2022 Imperative to the user that's a recommendation, not a gate ("Ship the seek + scale.", "Run the migration when ready.") \u2192 "done" \u2014 the agent isn't waiting on it

EXAMPLES (tail \u2192 classification)

"Reading config files to understand the setup."
\u2192 {"state":"working","detail":"reading config files to map the setup","tempo":"active","output":{}}

"Found it in auth.ts:88. Now let me check if the same pattern appears elsewhere."
\u2192 {"state":"working","detail":"found pattern at auth.ts:88; scanning for other occurrences","tempo":"active","output":{}}

"Waiting for CI to finish (~8 min)."
\u2192 {"state":"working","detail":"waiting on CI (~8 min)","tempo":"idle","output":{}}

"CI green on PR #31030. Reply \`go\` to merge."
\u2192 {"state":"blocked","detail":"PR #31030 CI green; awaiting user go-ahead to merge","tempo":"blocked","needs":"reply \`go\` to merge","output":{}}
  (no agent re-poll; only the user's \`go\` moves it forward \u2192 blocked)

"Awaiting your \`go\`. Next check in 20m."
\u2192 {"state":"working","detail":"PR awaiting go-ahead; agent re-checking in 20m","tempo":"idle","output":{}}
  (agent will re-poll on its own; \`go\` is an optional accelerator \u2192 working)

"Auto-merge armed on PR #4821. Posted to #stamps. Awaiting stamp."
\u2192 {"state":"done","detail":"PR #4821 auto-merge armed; posted to #stamps","tempo":"idle","output":{"result":"PR #4821 ready, auto-merge armed"}}
  (GitHub merges, not the agent; agent's part is over \u2192 done)

"Babysit tick \u2014 PR #40689. All CI green, threads resolved. Awaiting human approval. Next check via cron in ~5 min."
\u2192 {"state":"working","detail":"PR #40689 green, awaiting approval; next cron check ~5 min","tempo":"idle","output":{}}
  ("next check via cron" = agent will re-poll \u2192 working)

"Here's how the auth flow works: the token is validated in middleware.ts:42 before each request."
\u2192 {"state":"done","detail":"auth flow: token validated in middleware.ts:42 per request","tempo":"idle","output":{"result":"token validated in middleware.ts:42"}}
  (answered a question \u2014 no PR/commit/file required for "done")

"Indentation is now consistent at all four call sites (RepoPicker, both EnvironmentPicker sites, BranchPicker, SessionView). CI's swift-format should find nothing left to reflow."
\u2192 {"state":"done","detail":"indentation fixed at 4 call sites; swift-format clean","tempo":"idle","output":{"result":"indentation consistent across RepoPicker/EnvironmentPicker/BranchPicker/SessionView"}}

"At 30-40k rows there's no hint that gets you there without a new index \u2014 and at that point the column is strictly cheaper than a (session_uuid, source, sequence_num DESC) index."
\u2192 {"state":"done","detail":"dedicated column beats a composite index at 30-40k rows","tempo":"idle","output":{"result":"recommend dedicated column over composite index"}}
  (pure analysis closing, no question, no forward intent \u2014 done)

"No response requested."
\u2192 {"state":"done","detail":"completed; no response requested","tempo":"idle","output":{}}

"Both PRs remain bot-clean. Continue your e2e test on the restarted localhost:4000 (now pointed at local CCR)."
\u2192 {"state":"done","detail":"both PRs bot-clean; localhost:4000 restarted on local CCR","tempo":"idle","output":{}}
  ("Continue your test" is advice TO the user, not the agent's plan \u2192 done)

"Both subagents updated to use \`ack_seq\`. They're still running \u2014 I'll report PR URLs when each completes."
\u2192 {"state":"working","detail":"2 subagents running with ack_seq rename; will report PR URLs","tempo":"idle","output":{}}
  ("I'll report when each completes" = agent will act on results \u2192 working)

"Searching internal knowledge for the org ID \u2014 I'll report back when the search completes."
\u2192 {"state":"working","detail":"searching internal KB for org ID","tempo":"active","output":{}}

"Wrote the chart to plots/venn.png; script is at scripts/venn.R."
\u2192 {"state":"done","detail":"venn chart written to plots/venn.png + scripts/venn.R","tempo":"idle","output":{"result":"plots/venn.png + scripts/venn.R"}}

"Fixed the regex; tests pass. If you want, I can also open a follow-up PR to clean up the old helper."
\u2192 {"state":"done","detail":"regex fixed in parser.ts, all tests green","tempo":"idle","output":{"result":"regex fixed, tests pass"}}
  (deliverable shipped; offer is tangential extra \u2192 done)

"Throughput drop confirmed \u2014 ~16K/min notifications being dropped from pod capacity. Ship the seek + scale. Want me to dig into the upstream volume change too?"
\u2192 {"state":"done","detail":"~16K/min notif drop confirmed; recommend seek+scale","tempo":"idle","output":{"result":"~16K/min drop, pod capacity \u2014 ship seek+scale"}}
  (finding + recommendation delivered; trailing question is optional extra \u2192 done)

"Not applied \u2014 say the word and I'll update both widgets."
\u2192 {"state":"done","detail":"widget query change drafted; not applied pending go-ahead","tempo":"idle","output":{}}
  ("say the word and I'll" = optional offer \u2192 done)

"B is the right call \u2014 it lands in the table the chart already reads, and avoids the migration."
\u2192 {"state":"done","detail":"recommend option B: reuses the table, avoids the migration","tempo":"idle","output":{"result":"recommendation: option B"}}

"PR opened: https://github.com/acme/repo/pull/123\\nresult: fixed auth race in auth.ts, PR #123"
\u2192 {"state":"done","detail":"opened PR #123: fixed auth race","tempo":"idle","output":{"result":"fixed auth race in auth.ts, PR #123"}}

"I found the bug in auth.ts:42. Want me to fix it or just report?"
\u2192 {"state":"blocked","detail":"found null-check bug at auth.ts:42; awaiting fix-vs-report","tempo":"blocked","needs":"fix it or just report?","output":{}}
  (agent has NOT delivered the fix; can't proceed without the answer \u2192 blocked)

"Found the fix \u2014 it's a 3-line change to the retry handler. Want me to add it to this PR or open a new one?"
\u2192 {"state":"blocked","detail":"3-line retry-handler fix ready; awaiting which PR","tempo":"blocked","needs":"add to this PR or open a new one?","output":{}}
  (question is about HOW to ship the asked-for work \u2192 blocked)

"Added the analytics enum + conditional at the .withScreenAnalyticsLogging call site. Want me to also add the missing screen tag for the empty-state view while I'm here? It's a ~5-line change."
\u2192 {"state":"done","detail":"analytics enum + conditional added at the logging call site","tempo":"idle","output":{"result":"analytics logging wired at SessionView"}}
  (asked-for work delivered; the "while I'm here" extra is tangential \u2192 done)

"I can't proceed \u2014 the repo requires GITHUB_TOKEN and it's not set."
\u2192 {"state":"blocked","detail":"missing GITHUB_TOKEN; cannot clone","tempo":"blocked","needs":"set GITHUB_TOKEN env var","output":{}}

"Can't run the tests \u2014 needs the openapi.yaml file which isn't in this checkout. Stopping here."
\u2192 {"state":"blocked","detail":"missing openapi.yaml; cannot run tests","tempo":"blocked","needs":"provide config/openapi.yaml","output":{}}
  ("stopping" + names a specific missing resource \u2192 blocked, not failed)

"API Error: 401 Invalid API key \xB7 Please run /login"
\u2192 {"state":"blocked","detail":"API auth failed (401)","tempo":"blocked","needs":"run /login","output":{}}

"The build is broken on main and I can't reproduce locally. Giving up."
\u2192 {"state":"failed","detail":"cannot reproduce build failure; logs uninformative","tempo":"idle","output":{}}
  (no specific resource would unblock; exhausted approaches \u2192 failed)

CONTRASTIVE PAIRS \u2014 same surface shape, different state

  "Tests pass. Let me know if you also want the docs updated."  \u2192 done
  "Tests written but I haven't run them. Let me know which env to use."  \u2192 blocked
  (first: deliverable shipped, offer is extra. second: deliverable not verified, needs the env to proceed)

  "Waiting for CI (~8 min)."  \u2192 working
  "CI green. Awaiting your \`go\` to merge."  \u2192 blocked
  (first: only external wait. second: user gate)

  "Want me to also clean up the old helper?"  \u2192 done
  "Want me to apply this fix or just report it?"  \u2192 blocked
  (first: tangential extra after delivery. second: how to deliver the asked-for work)

  "I'll re-pull metrics when the timer fires and confirm it drained."  \u2192 working
  "I'll re-pull metrics once you confirm the timer fired."  \u2192 blocked
  (first: agent owns the next step. second: user owns it)

OUTPUT \u2014 respond with ONLY this JSON, no code fences:
{"state":"<working|blocked|done|failed>","detail":"<one line, \u226464 chars>","tempo":"<active|idle|blocked>","needs":"<when blocked: the exact ask; omit otherwise>","output":{"result":"<one-sentence deliverable headline, \u2264180 chars; omit when working>"}}

"detail" is what shows on the user's phone lock screen and as the one-line status column in a session list \u2014 write it like a colleague's Slack message: name the concrete thing (file, function, error, number, finding) and what happened to it. "fixed auth race in middleware.ts, tests green" not "completed task"; "waiting on CI for #4821" not "working"; "confirmed 16K/min drop from pod capacity" not "investigated issue". Hard budget: about 64 characters (ten words). It is the HEADLINE, not the report \u2014 the concrete noun and what happened to it; no parentheticals, no URLs, no second clause of explanation. Everything else belongs in output.result, which may run longer. "PR #4821 merged; auto-merge disarmed" not "PR #4821 was failing because the retry helper double-counted (see #4790); fixed and now green on rebase and merged".

"tempo": "active" = computing; "idle" = waiting on external (CI, timer, reviewer); "blocked" = waiting on user.

"needs": when blocked, the exact action the user should take, copied as closely as possible from the tail \u2014 they'll act on this text without reading the transcript. Omit otherwise.

"output.result": one-sentence headline naming a finished deliverable (direct answer, URL/path the agent produced, command the user should run). If the tail has \`result:\` on its own line, that line IS the result. Omit ({}) when still working, or when it would just restate the state.
`;var ae=I(()=>{N();D();q();L();B=S(()=>m.object({state:m.string().nullish(),detail:m.string().nullish(),tempo:m.string().nullish(),needs:m.string().nullish(),output:m.record(m.string(),m.unknown()).nullish()})),j={working:"actively progressing on the task \u2014 narrating plans, calling tools, or writing code; no pending question for the user",blocked:'the last message ends on a direct question or explicit request for the user ("want me to\u2026?", "which do you prefer?", "approve this?", "needs input: \u2026") \u2014 nothing will happen until the user replies',done:'the task the user asked for is fully delivered and there is no further work the agent plans to do \u2014 not just a progress update, not "almost done", not "let me know what you think"',failed:"the agent has given up or hit something unrecoverable \u2014 missing credential, broken build it cannot fix, wrong repo, task impossible as framed; distinct from blocked (user can unblock) and done (succeeded)"},F={result:"one short sentence naming the finished deliverable \u2014 no sub-clauses or bullet summaries"},H=new Set(["done","failed","stopped"]);U=/(?:^|\n)\s*failed\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,M=/(?:^|\n)\s*needs input\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,W=/(?:^|\n)\s*blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,G=/\bI'?m blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;z=/\b(?:want|like) me to\b|\b(?:shall|should) I also\b/i,V=/^(?:(?:Now|Next|Then|Alright|OK|Okay|Right|Good|First|Also),?\s+)?(?:Let me (?!know\b)|(?:I(?:'?ll| will) |I'?m going to |Going to )(?!need\b|require\b|wait\b|leave\b|hold\b|skip\b|stop\b)|Proceeding |Moving (?:on|to)\b|Continuing |Starting |Trying |Checking |Looking |Searching |Reading |Investigating |Running |Re-?running |Building |Rebuilding |Installing |Fetching |Applying |Fixing |Patching |Updating |Adding |Removing |Deleting |Importing |Refactoring |Rewriting |Writing |Grepping |Scanning |Wrapping |Switching |Testing |Verifying |Regenerating |Pushing |Pulling |Reviewing |Examining |Loading |Compiling |Parsing |Analyzing |Tracing |Exploring )/i,X=/\b(?:once |when |after |until |as soon as )(?:you|it|the|that|this|they)\b|\bagain in\b|\bcheck back\b|\bin ~?\d+\s*(?:s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:ours?|rs?)?)\b|\bthen\.?\s*$|\bwhichever you\b|\bhold(?:ing)? for your\b|\b(?:to|and) wait for\b|\bgive it (?:more |some )?time\b|\bif (?:you(?:'d| want| prefer| need|'re)?|that(?:'s| helps| works)?|useful|needed|helpful|desired)\b|\b(?:isn'?t|not|won'?t) going to work\b/i,Y=/^(?:(?:\*\*)?[1-9]\d* (?:agent|cron|task|fork|job|worker|PR|check)s? (?:in flight|remaining|active|still (?:running|working)|pending|running|launched)\b|(?:Continuous )?(?:[Ll]oop|[Cc]rons?|[Bb]abysit) (?:active|healthy|continuing|running|will keep|continues)\b|Waiting for (?:the )?(?:agent|cron|task|fork|worker|job|remaining|them)s?\b|Agents? will report back\b|Waiting\.?$)/,J=/^(?:I will|I'll|Will) (?:check back|re-?check|poll|look again|retry|re-?run|try again) (?:(?:when|once|after|until) (?!your?\b)|in\b|again\b)/i,Z=/^I (?:can(?:'?t|not)|am unable to) (?:proceed|continue|make (?:any )?progress|complete|fix this)\b/i,Q=/^(?:Giving up|I(?:'m| am) giving up|The task is not actionable)\b/i,ee=/^(?:Pushed (?:to `|`[0-9a-f]{7,})|Committed as `?[0-9a-f]{7,}\b|Commit: `?[0-9a-f]{7,}\b|(?:Opened|Created) PR #?\d)/,te=/^Ready (?:for review|to (?:upload|merge|ship|land))\b/,ne=/^VERDICT: (?:PASS|FAIL)\b/,ie=/^Please (?:start|run|provide|grant|export|add|install|configure|give me|paste|point me|set (?:the |up |`?[A-Z][A-Z0-9_]+\b))/,oe=/^(?:Stopping here|I've stopped here|Parked (?:the|this) branch|Paused here)(?:\.|$| \u2014| -| until| pending| since| because)/i});import{mkdir as T}from"fs/promises";import{join as ue}from"path";async function qe(n,t){if(v()&&t!==void 0&&y(n)){await _(t,{namespace:"job",jobId:n});return}await T(x(n),{recursive:!0})}async function De(n,t){if(v()&&t!==void 0&&y(n)){await _(t,he(n));return}await T(ue(x(n),"tmp"),{recursive:!0})}function he(n){return{namespace:"job",jobId:n,relPath:["tmp"]}}async function _(n,t){let e=await n.ensureScope(t);if(!e.ok){let i=E(e.error);throw Object.assign(new A(`job folder not made (${C(e.error)})`,"job folder not made"),i!==void 0?{code:i}:{})}}var pe=I(()=>{le();re();de();se();ce()});
export{d as o0a,be as p0a,c as q0a,ke as r0a,ve as s0a,ye as t0a,xe as u0a,Ie as v0a,Re as w0a,Se as x0a,Pe as y0a,ae as z0a,qe as A0a,De as B0a,pe as C0a};
