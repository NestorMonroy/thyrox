// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ux}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{HO}from"/$bunfs/root/chunk-ens8r62y.js";import{sP}from"/$bunfs/root/chunk-hztyj1zw.js";import{ca}from"/$bunfs/root/chunk-trewd6vn.js";var um="CronCreate",cS="CronDelete",Yre="CronList";var t=300000,i7=HO.recurringMaxAgeMs/86400000;function zv(){return!a.CLAUDE_CODE_DISABLE_CRON&&ux("tengu_kairos_cron",!0,t)}function Q8(){return ux("tengu_kairos_cron_durable",!0,t)}function vbn(e){return e?"Schedule a prompt to run at a future time \u2014 either recurring on a cron schedule, or once at a specific time. Pass durable: true to persist to .claude/scheduled_tasks.json; otherwise session-only.":"Schedule a prompt to run at a future time within this Claude session \u2014 either recurring on a cron schedule, or once at a specific time."}function kbn(e){return e?"true = persist to .claude/scheduled_tasks.json and survive restarts. false (default) = in-memory only, dies when this Claude session ends. Use true only when the user asks the task to survive across sessions.":"Has no effect \u2014 durable persistence is not available. All jobs are session-only (in-memory, gone when this Claude session ends)."}function Tbn(e){let o=e?`## Durability

By default (durable: false) the job lives only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits. Pass durable: true to write to .claude/scheduled_tasks.json so the job survives restarts. Only use durable: true when the user explicitly asks for the task to persist ("keep doing this every day", "set this up permanently"). Most "remind me in 5 minutes" / "check back in an hour" requests should stay session-only.`:`## Session-only

Jobs live only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits.`,s=e?"Durable jobs persist to .claude/scheduled_tasks.json and survive session restarts \u2014 on next launch they resume automatically. One-shot durable tasks that were missed while the REPL was closed are surfaced for catch-up. Session-only jobs die with the process. ":"";return`Schedule a prompt to be enqueued at a future time. Use for both recurring schedules and one-shot reminders.

Uses standard 5-field cron in the user's local timezone: minute hour day-of-month month day-of-week. "0 9 * * *" means 9am local \u2014 no timezone conversion needed.

## One-shot tasks (recurring: false)

For "remind me at X" or "at <time>, do Y" requests \u2014 fire once then auto-delete.
Pin minute/hour/day-of-month/month to specific values:
  "remind me at 2:30pm today to check the deploy" \u2192 cron: "30 14 <today_dom> <today_month> *", recurring: false
  "tomorrow morning, run the smoke test" \u2192 cron: "57 8 <tomorrow_dom> <tomorrow_month> *", recurring: false

## Recurring jobs (recurring: true, the default)

For "every N minutes" / "every hour" / "weekdays at 9am" requests:
  "*/5 * * * *" (every 5 min), "0 * * * *" (hourly), "0 9 * * 1-5" (weekdays at 9am local)

## Avoid the :00 and :30 minute marks when the task allows it

Every user who asks for "9am" gets \`0 9\`, and every user who asks for "hourly" gets \`0 *\` \u2014 which means requests from across the planet land on the API at the same instant. When the user's request is approximate, pick a minute that is NOT 0 or 30:
  "every morning around 9" \u2192 "57 8 * * *" or "3 9 * * *" (not "0 9 * * *")
  "hourly" \u2192 "7 * * * *" (not "0 * * * *")
  "in an hour or so, remind me to..." \u2192 pick whatever minute you land on, don't round

Only use minute 0 or 30 when the user names that exact time and clearly means it ("at 9:00 sharp", "at half past", coordinating with a meeting). When in doubt, nudge a few minutes early or late \u2014 the user will not notice, and the fleet will.

${o}
${sP()?`
## Not for live watching

${um} re-runs a prompt at fixed wall-clock intervals. To watch a log file, process, or command output and be notified the moment something changes, use the ${ca} tool instead \u2014 ${ca} streams events as they happen; cron polls on a schedule.
`:""}
## Runtime behavior

Jobs only fire while the REPL is idle (not mid-query). ${s}The scheduler adds a small deterministic jitter on top of whatever you pick: recurring tasks fire up to 10% of their period late (max 15 min); one-shot tasks landing on :00 or :30 fire up to 90 s early. Picking an off-minute is still the bigger lever.

Recurring tasks auto-expire after ${i7} days \u2014 they fire one final time, then are deleted. This bounds session lifetime. Tell the user about the ${i7}-day limit when scheduling recurring jobs.

Returns a job ID you can pass to ${cS}.`}var Cbn="Cancel a scheduled cron job by ID";function Ibn(e){return e?`Cancel a cron job previously scheduled with ${um}. Removes it from .claude/scheduled_tasks.json (durable jobs) or the in-memory session store (session-only jobs).`:`Cancel a cron job previously scheduled with ${um}. Removes it from the in-memory session store.`}var Rbn="List scheduled cron jobs";function xbn(e){return e?`List all cron jobs scheduled via ${um}, both durable (.claude/scheduled_tasks.json) and session-only.`:`List all cron jobs scheduled via ${um} in this session.`}
export{um,cS,Yre,i7,zv,Q8,vbn,kbn,Tbn,Cbn,Ibn,Rbn,xbn};
