// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import"/$bunfs/root/chunk-4cmy5sqz.js";import"/$bunfs/root/chunk-tep8see7.js";import{Pg}from"/$bunfs/root/chunk-ja309z9r.js";import"/$bunfs/root/chunk-p7hrkaq4.js";import"/$bunfs/root/chunk-3btyksgt.js";import"/$bunfs/root/chunk-64dkx51v.js";import"/$bunfs/root/chunk-akpzg2yh.js";import"/$bunfs/root/chunk-g5h2a16k.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import"/$bunfs/root/chunk-marw4shk.js";import{po,Et,St}from"/$bunfs/root/chunk-27bj2wbx.js";import"/$bunfs/root/chunk-53a5hn9r.js";import"/$bunfs/root/chunk-w8gsn0hm.js";import"/$bunfs/root/chunk-ecxh3hga.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import"/$bunfs/root/chunk-hxy982f9.js";import"/$bunfs/root/chunk-r2c9k9kh.js";import"/$bunfs/root/chunk-yy7a4xwv.js";import"/$bunfs/root/chunk-b565vq97.js";import"/$bunfs/root/chunk-1jxsqt67.js";import"/$bunfs/root/chunk-pc40tvt4.js";import"/$bunfs/root/chunk-1mz51xz6.js";import"/$bunfs/root/chunk-y669ewnb.js";import"/$bunfs/root/chunk-mw9kp8vw.js";import"/$bunfs/root/chunk-b5k761bj.js";import"/$bunfs/root/chunk-hf9yhhhe.js";import"/$bunfs/root/chunk-hk70qp2z.js";import"/$bunfs/root/chunk-dz2zqf8q.js";import"/$bunfs/root/chunk-z0202m3z.js";import"/$bunfs/root/chunk-tjpyqt9m.js";import"/$bunfs/root/chunk-deawgr1z.js";import"/$bunfs/root/chunk-da71yq24.js";import"/$bunfs/root/chunk-ztn29w9x.js";import"/$bunfs/root/chunk-q77993h4.js";import"/$bunfs/root/chunk-e5k4mpe1.js";import"/$bunfs/root/chunk-esk1bxsv.js";import"/$bunfs/root/chunk-1nwhka6x.js";import"/$bunfs/root/chunk-m0am9fba.js";import"/$bunfs/root/chunk-7xhd9gmf.js";import"/$bunfs/root/chunk-qk2a968b.js";import"/$bunfs/root/chunk-af9dczt1.js";import"/$bunfs/root/chunk-dnseeje8.js";import"/$bunfs/root/chunk-w3jka8th.js";import"/$bunfs/root/chunk-6ab20r20.js";import"/$bunfs/root/chunk-sw4c8z6t.js";import"/$bunfs/root/chunk-71zbyxdf.js";import"/$bunfs/root/chunk-ebvrj09e.js";import"/$bunfs/root/chunk-4jd7d9ec.js";import"/$bunfs/root/chunk-qfxegd6m.js";import"/$bunfs/root/chunk-gg61tmje.js";import"/$bunfs/root/chunk-h1nnaadz.js";import"/$bunfs/root/chunk-a8zb1cc5.js";import"/$bunfs/root/chunk-j7xqd34f.js";import"/$bunfs/root/chunk-7q5pgenh.js";import{Fn}from"/$bunfs/root/chunk-zsdbd62x.js";import"/$bunfs/root/chunk-zbq9bkhj.js";import"/$bunfs/root/chunk-4s3p78tq.js";import"/$bunfs/root/chunk-55cbxff7.js";import"/$bunfs/root/chunk-hv6090k5.js";import"/$bunfs/root/chunk-b1ctzpp7.js";import"/$bunfs/root/chunk-843kre03.js";import"/$bunfs/root/chunk-tbpkh1zy.js";import"/$bunfs/root/chunk-3x88vsy7.js";import"/$bunfs/root/chunk-4qm801kz.js";import"/$bunfs/root/chunk-p8ybpsqa.js";import"/$bunfs/root/chunk-8jxxned0.js";import"/$bunfs/root/chunk-x31r83nz.js";import"/$bunfs/root/chunk-20q5babf.js";import"/$bunfs/root/chunk-mtq3m0rn.js";import"/$bunfs/root/chunk-rd9ewfjy.js";import"/$bunfs/root/chunk-5xbnwfdz.js";import{$Rn}from"/$bunfs/root/chunk-8x6cvqa9.js";import{Yt}from"/$bunfs/root/chunk-vh7s70pn.js";import{vs}from"/$bunfs/root/chunk-0nmnbsyf.js";import"/$bunfs/root/chunk-hmpvwkgc.js";import"/$bunfs/root/chunk-n8xje69s.js";import{OI,Pse}from"/$bunfs/root/chunk-r1wjj1fa.js";import{Vg,Xv,Ise,YR}from"/$bunfs/root/chunk-86afwa53.js";import"/$bunfs/root/chunk-fxzv2sj0.js";import{Mo}from"/$bunfs/root/chunk-193rctk4.js";import"/$bunfs/root/chunk-vg82hr0a.js";import"/$bunfs/root/chunk-hfkkcqwq.js";import"/$bunfs/root/chunk-2xnqb2qr.js";import"/$bunfs/root/chunk-7x6cw1x6.js";import"/$bunfs/root/chunk-hhj7f7ny.js";import"/$bunfs/root/chunk-btr0wq16.js";import"/$bunfs/root/chunk-gx4tznbd.js";import"/$bunfs/root/chunk-dq7a6ndq.js";import"/$bunfs/root/chunk-n29cr8a6.js";import"/$bunfs/root/chunk-yczma5hw.js";import"/$bunfs/root/chunk-fqhxwpnv.js";import"/$bunfs/root/chunk-nyqa6452.js";import"/$bunfs/root/chunk-37z9d217.js";import"/$bunfs/root/chunk-ybsac87j.js";import"/$bunfs/root/chunk-58xqqga9.js";import{s$}from"/$bunfs/root/chunk-epmfknm4.js";import{pke,qK,gBt}from"/$bunfs/root/chunk-5t7y9tec.js";import{za,iNe,Jfe,wg,nb}from"/$bunfs/root/chunk-vmwrshes.js";import{LBt}from"/$bunfs/root/chunk-t13sjz5v.js";import"/$bunfs/root/chunk-5m06752x.js";import"/$bunfs/root/chunk-6ghchght.js";import"/$bunfs/root/chunk-ydpmpkaw.js";import"/$bunfs/root/chunk-3a3evbfh.js";import"/$bunfs/root/chunk-sfvasbd0.js";import{Pa}from"/$bunfs/root/chunk-7cwe8h1d.js";import"/$bunfs/root/chunk-jw365kym.js";import"/$bunfs/root/chunk-s1wr7p75.js";import"/$bunfs/root/chunk-dphd06tg.js";import"/$bunfs/root/chunk-1tx1d40g.js";import"/$bunfs/root/chunk-8nk4yw0p.js";import"/$bunfs/root/chunk-dde73rk7.js";import"/$bunfs/root/chunk-jwwerfky.js";import"/$bunfs/root/chunk-pdqfh5em.js";import"/$bunfs/root/chunk-p6031f67.js";import"/$bunfs/root/chunk-ssw4v7fk.js";import"/$bunfs/root/chunk-c113sjy3.js";import"/$bunfs/root/chunk-kardmssy.js";import"/$bunfs/root/chunk-0pqqmh0e.js";import"/$bunfs/root/chunk-hyjn4arn.js";var s=import.meta.require("/$bunfs/root/chunk-wdf1aqfz.js"),N="10m";function y(){return Pse()?` Before you stop, send a one-line outcome via ${OI} \u2014 the user may be away and waiting to hear it's done. Skip this if you're stopping because the user just told you to; they're already here.`:""}var m=/^\d+[smhd]$/,p=/^every\s+(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*$/i;function T(e){let o=e[1],t=e[2].toLowerCase();if(t.startsWith("s"))return`${o}s`;if(t.startsWith("h"))return`${o}h`;if(t.startsWith("d"))return`${o}d`;return`${o}m`}var I="| Interval pattern      | Cron expression     | Notes                                    |\n|-----------------------|---------------------|------------------------------------------|\n| `Nm` where N \u2264 59   | `*/N * * * *`     | every N minutes                          |\n| `Nm` where N \u2265 60   | `0 */H * * *`     | round to hours (H = N/60, must divide 24)|\n| `Nh` where N \u2264 23   | `0 */N * * *`     | every N hours                            |\n| `Nd`                | `0 0 */N * *`     | every N days at midnight local           |\n| `Ns`                | treat as `ceil(N/60)m` | cron minimum granularity is 1 minute  |\n\n**If the interval doesn't cleanly divide its unit** (e.g. `7m` \u2192 `*/7 * * * *` gives uneven gaps at :56\u2192:00; `90m` \u2192 1.5h which cron can't express), pick the nearest clean interval and tell the user what you rounded to before scheduling.";function E(){if(!a.CLAUDE_CODE_REMOTE&&!Et()&&Fn()&&St()&&Yt("allow_remote_sessions")&&Yt(s$)&&Pg().length===0)return`
## Offer cloud first

Before any scheduling step, check whether EITHER is true:
- the parsed interval (rule 1 or 2) is **\u226560 minutes**, or
- regardless of which rule matched, the original input uses daily phrasing ("every morning", "daily", "every day", "each night", "every weekday")

If either is true, call ${vs} first:
- \`question\`: "This loop stops when you close this session. Set it up as a cloud schedule instead so it keeps running?"
- \`header\`: "Schedule"
- \`options\`: \`[{label: "Cloud schedule (recommended)", description: "Runs in Anthropic's cloud even after you close this session"}, {label: "This session only", description: "Runs in this terminal until you exit"}]\`

If they pick **Cloud schedule**: do NOT call ${Vg}. Invoke the \`schedule\` skill directly via the ${po} tool with \`args\` set to their original input verbatim (e.g. \`${po}({skill: "schedule", args: "every morning tell me a joke"})\`), then follow that skill's instructions to completion. Do NOT tell the user to run /schedule themselves. **Then stop \u2014 do not continue to any section below** (no ${Vg}, no ${za}, no "execute the prompt now").
If they pick **This session only**:
- If the trigger was a parsed \u226560-minute interval (rule 1 or 2): continue below with that interval.
- If the trigger was daily phrasing only (rule 3, no parsed interval): do NOT call ${Vg}. Explain that a daily-cadence loop won't fire before this session closes, so there's nothing useful to schedule locally \u2014 suggest they either pick Cloud schedule, or re-run \`/loop\` with an explicit shorter interval (e.g. \`/loop 1h <prompt>\`) if they want a session loop. Then stop.
If neither trigger condition was met: continue below.
`;return""}function A(){if(!a.CLAUDE_CODE_REMOTE&&!Et()&&Fn()&&St()&&Yt("allow_remote_sessions")&&Yt(s$)){if(Pg().length>0)return` End the confirmation with this exact line on its own, italicized: ${"`_Runs until you close this session \xB7 For durable cloud-based loops, use /schedule_`"}`;return` Only if you did NOT show the cloud-offer ${vs} above (i.e., neither trigger condition applied), end the confirmation with this exact line on its own, italicized: ${"`_Runs until you close this session \xB7 For durable cloud-based loops, use /schedule_`"}. If the user already answered that question, omit this line.`}return""}function L(){return`Usage: /loop [interval] <prompt>

Run a prompt or slash command on a recurring interval \u2014 or with no interval, let the model self-pace based on the task.

Intervals: Ns, Nm, Nh, Nd (e.g. 5m, 30m, 2h, 1d). Minimum granularity is 1 minute.
If no interval is specified, the model picks a delay between iterations based on what it's doing.

Examples:
  /loop 5m /babysit-prs
  /loop 30m check the deploy
  /loop 1h /standup 1
  /loop check the deploy          (dynamic \u2014 model picks delays)
  /loop check the deploy every 20m`}function g(){return qK()?`arm one now with \`timeout_ms: ${pke()}\``:"arm one now with `persistent: true`"}function w(e){if(qK())return`A monitor expires after at most ${gBt(pke())} and tells you; on later ${e} call ${nb} first and re-arm only if no monitor for it is still running.`;return e==="iterations"?`Arm once; on later iterations call ${nb} first and skip this step if a monitor is already running.`:`Arm once; on later ticks call ${nb} first and skip if a monitor is already running.`}function S(e){let o=`The user wants you to self-pace. Decide what makes the next iteration worth running \u2014 a passage of time, or an observable event.

1. **Run the parsed prompt now.** If it's a slash command, invoke it via the Skill tool; otherwise act on it directly.
2. **If the next run is gated on an event** (CI finishing, a log line matching, a file changing, a PR comment) and no ${Pa} is already running for it: ${g()}. Its events arrive as \`<task-notification>\` messages and wake this loop immediately \u2014 you do not wait for the ${za} deadline. ${w("iterations")}
3. **Briefly confirm**: that you're self-pacing, whether a ${Pa} is the primary wake signal, that you ran the task now, and what fallback delay you're about to pick. Write this as text *before* calling ${za} \u2014 the turn ends as soon as that tool returns.
4. **Then, as the last action of this turn, decide whether the loop continues.** If the task needs another iteration, call ${za} with:
   - \`delaySeconds\`: with a ${Pa} armed this is the **fallback heartbeat** \u2014 how long to wait if no event fires (lean 1200\u20131800s; idle ticks more frequent than the task needs are pure overhead). Without a ${Pa} this is the cadence \u2014 pick based on what you observed. Read the tool's own description for cache-aware delay guidance.
   - \`reason\`: one short sentence on why you picked that delay.
   - \`prompt\`: the full original /loop input verbatim, prefixed with \`/loop \` so the next firing re-enters this skill and continues the loop. For example, if the user typed \`/loop check the deploy\`, pass \`/loop check the deploy\` as the prompt.
   - \`noop\`: \`true\` if this tick changed nothing ("still waiting", "quiet hold"); \`false\` if it did something worth keeping. Consecutive \`noop: true\` ticks collapse in the terminal.
   If it doesn't need another iteration, stop instead (step 6) \u2014 re-arming is a per-turn choice, not a default.
5. **If you were woken by a \`<task-notification>\`** rather than this prompt: handle the event in the context of the loop task, then make the same decision. If the loop should continue, call ${za} again with the same \`prompt\` and the same 1200\u20131800s \`delaySeconds\` from step 4 (the ${Pa} remains the wake signal; the new wakeup is only the fallback heartbeat). If the event means the work is finished, stop (step 6).
6. **To stop the loop** \u2014 the task is complete, further iterations can't make progress, or the user asked you to stop \u2014 call ${za} with \`stop: true\` (no other fields) and ${wg} any ${Pa} you armed (use ${nb} to find the task ID if it is no longer in context). Stopping is the loop's normal ending \u2014 the user can restart it anytime with /loop.${y()}`;return`# /loop \u2014 schedule a recurring or self-paced prompt

Parse the input below into \`[interval] <prompt\u2026>\` and schedule it.

## Parsing (in priority order)

1. **Leading token**: if the first whitespace-delimited token matches \`^\\d+[smhd]$\` (e.g. \`5m\`, \`2h\`), that's the interval; the rest is the prompt.
2. **Trailing "every" clause**: otherwise, if the input ends with \`every <N><unit>\` or \`every <N> <unit-word>\` (e.g. \`every 20m\`, \`every 5 minutes\`, \`every 2 hours\`), extract that as the interval and strip it from the prompt. Only match when what follows "every" is a time expression \u2014 \`check every PR\` has no interval.
3. **No interval**: otherwise, the entire input is the prompt and you'll self-pace dynamically (see "Dynamic mode" below).

If the resulting prompt is empty, show usage \`/loop [interval] <prompt>\` and stop.

Examples:
- \`5m /babysit-prs\` \u2192 interval \`5m\`, prompt \`/babysit-prs\` (rule 1)
- \`check the deploy every 20m\` \u2192 interval \`20m\`, prompt \`check the deploy\` (rule 2)
- \`run tests every 5 minutes\` \u2192 interval \`5m\`, prompt \`run tests\` (rule 2)
- \`check the deploy\` \u2192 no interval \u2192 dynamic mode, prompt \`check the deploy\` (rule 3)
- \`check every PR\` \u2192 no interval \u2192 dynamic mode, prompt \`check every PR\` (rule 3 \u2014 "every" not followed by time)
- \`5m\` \u2192 empty prompt \u2192 show usage
${E()}
## Fixed-interval mode (rules 1 and 2)

Convert the interval to a cron expression:

${I}

Then:
1. Call ${Vg} with: \`cron\` (the expression above), \`prompt\` (the parsed prompt verbatim), \`recurring: true\`.
2. Briefly confirm: what's scheduled, the cron expression, the human-readable cadence, that recurring tasks auto-expire after ${Ise} days, and that the user can cancel sooner with ${Xv} (include the job ID).${A()}
3. **Then immediately execute the parsed prompt now** \u2014 don't wait for the first cron fire. If it's a slash command, invoke it via the Skill tool; otherwise act on it directly.

## Dynamic mode (rule 3 \u2014 no interval)

${o}

## Input

${e}`}var f=(e,o,t)=>{let r=e?`## Loop tasks (from ${e.path})`:"## Autonomous-loop instructions (for the immediate execution and every fire)",n;if(e)n=e.content;else s.logAutonomousLoopActivation(),n=s.getAutonomousLoopPreamble();let l=e?"the loop.md tasks":"the autonomous check";if(o){let c=e?s.LOOP_FILE_DYNAMIC_SENTINEL:Jfe,O=e?`# /loop \u2014 loop.md tasks with dynamic pacing

The user invoked \`/loop\` with no prompt and no interval and has a loop-tasks file at \`${e.path}\`. Run those tasks now, then self-pace the next iteration via ${za} \u2014 no cron.`:`# /loop \u2014 autonomous default with dynamic pacing

The user invoked \`/loop\` with no prompt and no interval. Run the autonomous check now, then self-pace the next iteration via ${za} \u2014 no cron.`,b=e?`that you're running tasks from \`${e.path}\` in dynamic-pacing mode, that you ran the first tick now`:"that this is the autonomous default in dynamic-pacing mode, that you ran the check now",_=`1. **Run ${l} now**, following the instructions inlined below.
2. **If the next tick is gated on an event** (CI finishing, a PR comment, a log line) and no ${Pa} is already running for it: ${g()}. Its events wake this loop immediately \u2014 you do not wait for the ${za} deadline. ${w("ticks")}
3. **Briefly confirm**: ${b}, whether a ${Pa} is the primary wake signal, and what fallback delay you're about to pick. Write this as text *before* calling ${za} \u2014 the turn ends as soon as that tool returns.
4. **Then, as the last action of this turn, decide whether the loop continues.** If the next check is worth running, call ${za} with:
   - \`delaySeconds\`: with a ${Pa} armed this is the fallback heartbeat (lean 1200\u20131800s). Without one, pick based on what you observed this turn \u2014 quiet branch? wait longer. Lots in flight? wait shorter. Read the tool's own description for cache-aware delay guidance.
   - \`reason\`: one short sentence on why you picked that delay.
   - \`prompt\`: the literal string \`${c}\` \u2014 the dynamic-mode sentinel expands at fire time to the full instructions (first fire / first fire post-compact / loop.md edited) or a dynamic-pacing-specific short reminder (subsequent fires). Do not pass the full instructions; that is handled automatically.
   - \`noop\`: \`true\` if this tick changed nothing ("still waiting", "quiet hold"); \`false\` if it did something worth keeping. Consecutive \`noop: true\` ticks collapse in the terminal.
   If it isn't, stop instead (step 6) \u2014 re-arming is a per-turn choice, not a default.
5. **If woken by a \`<task-notification>\`** rather than this prompt: handle the event, then make the same decision. If the loop should continue, call ${za} again with \`${c}\` and the same 1200\u20131800s \`delaySeconds\` (the ${Pa} remains the wake signal; the new wakeup is only the fallback heartbeat). If the event means the work is finished, stop (step 6).
6. **To stop the loop** \u2014 the task is complete, further iterations can't make progress, or the user asked you to stop \u2014 call ${za} with \`stop: true\` (no other fields) and ${wg} any ${Pa} you armed (use ${nb} to find the task ID if it is no longer in context). Stopping is the loop's normal ending \u2014 the user can restart it anytime with /loop.${y()}`;return`${O}

## Action

${_}

${r}

${n}`}let h=e?s.LOOP_FILE_SENTINEL:iNe,u=e?`# /loop \u2014 schedule loop.md tasks

The user invoked \`/loop\` with no prompt (input was empty or just the interval \`${t}\`) and has a loop-tasks file at \`${e.path}\`. Schedule a recurring cron that runs those tasks each tick, then run the first tick immediately.`:`# /loop \u2014 schedule the autonomous default

The user invoked \`/loop\` with no prompt (input was empty or just the interval \`${t}\`). Schedule the autonomous-loop default and then run the first autonomous check immediately.`,k=e?"it expands at fire time to the full loop.md contents on first delivery (and whenever loop.md has been edited since last fire), and to a short reminder on subsequent unchanged fires. The long instructions stay in the cached message-prefix.":"it expands at fire time to the full autonomous-loop instructions on first delivery, and to a short reminder on subsequent fires (the long instructions stay in the cached message-prefix).",v=e?`what's scheduled, the cron expression, the human-readable cadence, that it's running tasks from \`${e.path}\`, that recurring tasks auto-expire after ${Ise} days, and that the user can cancel sooner with ${Xv} (include the job ID).`:`what's scheduled, the cron expression, the human-readable cadence, that recurring tasks auto-expire after ${Ise} days, and that they can cancel sooner with ${Xv} (include the job ID). Mention this is the autonomous default and that the autonomous-loop instructions are baked in.`;return`${u}

## Action

1. Convert \`${t}\` to a 5-field cron expression. Supported suffixes: \`s\` \u2192 ceil to nearest minute, \`m\` (minutes), \`h\` (hours), \`d\` (days). Examples: \`5m\` \u2192 \`*/5 * * * *\`, \`1h\` \u2192 \`0 * * * *\`, \`1d\` \u2192 \`0 0 * * *\`. If the interval doesn't cleanly divide its unit, round to the nearest clean interval and tell the user what you rounded to.
2. Call ${Vg} with:
   - \`cron\`: the expression from step 1
   - \`prompt\`: the literal string \`${h}\` \u2014 ${k}
   - \`recurring\`: \`true\`
3. Briefly confirm: ${v}
4. **Then immediately run ${l} now**, following the instructions inlined below. Don't wait for the first cron fire.

${r}

${n}`};function Z(){Mo({name:LBt,menuDescription:"Repeat a prompt or command on an interval (e.g. /loop 5m /foo)",aliases:["proactive"],description:"Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo). Omit the interval to let the model self-pace.",whenToUse:'When the user wants to set up a recurring task, poll for status, or run something repeatedly on an interval (e.g. "check the deploy every 5 minutes", "keep running /babysit-prs"). Do NOT invoke for one-off tasks.',get argumentHint(){return"[interval] [prompt]"},userInvocable:!0,argsMayContainSlashCommands:!0,isEnabled:YR,async getPromptForCommand(e,o){let t=e.trim();if(!o.options?.isSkillPreload&&!o.options?.modelScheduledOrigin)i("tengu_loop_command",{has_args:t.length>0,is_interval_only:m.test(t)||p.test(t)});{let r=t.match(p),n=!t,l=m.test(t)||r!==null;if(n||l){let h=r?T(r):t||N,u=await s.readLoopFileAsync(o.storageV5);if(n){if(!o.options?.isSkillPreload&&!o.options?.modelScheduledOrigin)$Rn();return[{type:"text",text:f(u,!0,h)}]}return[{type:"text",text:f(u,!1,h)}]}}if(!t)return[{type:"text",text:L()}];if(!o.options?.isSkillPreload&&!o.options?.modelScheduledOrigin)$Rn();return[{type:"text",text:S(t)}]}})}export{Z as registerLoopSkill};
