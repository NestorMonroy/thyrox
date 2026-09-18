// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Re}from"/$bunfs/root/chunk-vtbas3eg.js";import"/$bunfs/root/chunk-q7rz8cer.js";import"/$bunfs/root/chunk-aw1peprz.js";import{gn,So}from"/$bunfs/root/chunk-4qqe0nh4.js";import"/$bunfs/root/chunk-h401nbms.js";import{E,Dt}from"/$bunfs/root/chunk-d5d0zdsy.js";import"/$bunfs/root/chunk-gytndg57.js";import"/$bunfs/root/chunk-t2x4z9pb.js";import"/$bunfs/root/chunk-gfewy5rb.js";import{I}from"/$bunfs/root/chunk-xbd48fav.js";import{ve}from"/$bunfs/root/chunk-6ghkw3jc.js";import"/$bunfs/root/chunk-dtjhjxgx.js";import"/$bunfs/root/chunk-j47jt515.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import"/$bunfs/root/chunk-ebf04mp3.js";import"/$bunfs/root/chunk-4bbpt7sc.js";import"/$bunfs/root/chunk-q4s29khb.js";import"/$bunfs/root/chunk-gh1pqen9.js";import"/$bunfs/root/chunk-5hm0m2yf.js";import"/$bunfs/root/chunk-4m9qp5rm.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import"/$bunfs/root/chunk-epe8zpsz.js";import"/$bunfs/root/chunk-fx21fm70.js";import"/$bunfs/root/chunk-hj17majf.js";import"/$bunfs/root/chunk-rawgb24z.js";import"/$bunfs/root/chunk-ayvre55m.js";import"/$bunfs/root/chunk-qwxqekf7.js";import"/$bunfs/root/chunk-g8rhxhbp.js";import"/$bunfs/root/chunk-tmptt1gv.js";import"/$bunfs/root/chunk-74cchpjf.js";import"/$bunfs/root/chunk-kstt0hst.js";import"/$bunfs/root/chunk-nbfvjj3w.js";import"/$bunfs/root/chunk-we8g6eyq.js";import"/$bunfs/root/chunk-q8sknw7e.js";import"/$bunfs/root/chunk-hbrq69f0.js";import"/$bunfs/root/chunk-1d5n9rp4.js";import"/$bunfs/root/chunk-2m8hwn4j.js";import"/$bunfs/root/chunk-v49f6nqy.js";import"/$bunfs/root/chunk-4vqqdm2s.js";import"/$bunfs/root/chunk-75n2g1wh.js";import"/$bunfs/root/chunk-cwfdaz1m.js";import"/$bunfs/root/chunk-hxth9wj3.js";import"/$bunfs/root/chunk-f28b90f9.js";import"/$bunfs/root/chunk-xm6nmg9g.js";import"/$bunfs/root/chunk-g7fm0c2g.js";import"/$bunfs/root/chunk-sdtzs6xq.js";import"/$bunfs/root/chunk-cbmfm0r3.js";import"/$bunfs/root/chunk-y8as26ve.js";import"/$bunfs/root/chunk-8syy9k0k.js";import"/$bunfs/root/chunk-d7rqjcan.js";import"/$bunfs/root/chunk-shccf1t1.js";import"/$bunfs/root/chunk-mfr7w3xb.js";import"/$bunfs/root/chunk-01m22vhx.js";import"/$bunfs/root/chunk-grv4vgbv.js";import"/$bunfs/root/chunk-ffayvr1z.js";import"/$bunfs/root/chunk-gw27mnrz.js";import"/$bunfs/root/chunk-w1amg5qp.js";import"/$bunfs/root/chunk-5r15hsfa.js";import"/$bunfs/root/chunk-anxhwx8e.js";import"/$bunfs/root/chunk-3dnrd59g.js";import"/$bunfs/root/chunk-c1c3wvmj.js";import"/$bunfs/root/chunk-hca13bkw.js";import"/$bunfs/root/chunk-jk1ewzz0.js";import"/$bunfs/root/chunk-j5h14mgz.js";import"/$bunfs/root/chunk-6geqjj5f.js";import"/$bunfs/root/chunk-w21br88b.js";import"/$bunfs/root/chunk-cf542jqn.js";import"/$bunfs/root/chunk-kxr4eyfb.js";import"/$bunfs/root/chunk-2pr871ag.js";import"/$bunfs/root/chunk-jm0yd08m.js";import"/$bunfs/root/chunk-tvb857x1.js";import{cP,Hie}from"/$bunfs/root/chunk-hd1jrhjx.js";import"/$bunfs/root/chunk-zyap15je.js";import{Wa,J$e,pge,Og,ub}from"/$bunfs/root/chunk-dw8665vp.js";import{$a}from"/$bunfs/root/chunk-3byy4936.js";import"/$bunfs/root/chunk-9aqjzvk8.js";import"/$bunfs/root/chunk-rj4mppbb.js";import"/$bunfs/root/chunk-1b1s2j3n.js";import"/$bunfs/root/chunk-2whpjj9f.js";import"/$bunfs/root/chunk-0ahj7yw0.js";import"/$bunfs/root/chunk-sdq4073e.js";import"/$bunfs/root/chunk-grjqv34j.js";import"/$bunfs/root/chunk-afr02rb5.js";import"/$bunfs/root/chunk-a1neaaad.js";import"/$bunfs/root/chunk-wd2wq1kn.js";import"/$bunfs/root/chunk-3w3bqp9x.js";import"/$bunfs/root/chunk-pvbbfbpd.js";import{Ce}from"/$bunfs/root/chunk-sr6jf0k1.js";import{readFileSync as S}from"fs";import{join as u}from"path";var p=Ce("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=Ce("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");function g(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return I("tengu_kairos_loop_persistent",!1)}function v(){return g()?y:p}function w(){i("tengu_kairos_loop_persistent_activated",{variant:g()})}function h(e=!1){if(!Hie())return"";let o=!e&&g()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${cP} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function b(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Wa} from this tick.${h()}`}var m=`

If a ${$a} is armed (check ${ub}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${$a} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${Wa} with \`stop: true\` and ${Og} the monitor (use ${ub} to find its task ID if no longer in context).`;function C(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Wa} tool (not a recurring cron). To keep the loop alive, call ${Wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${pge}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}function L(e){return e===J$e||e===pge}function P(e,t){if(!L(t))return null;w();let o=t===pge?C():b();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${v()}

---

${o}`}var k="__autonomous_preamble__",x="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Wa} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Wa} tool (not a recurring cron). To keep the loop alive, call ${Wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${Wa} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${Wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}var l=25000;function _(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function T(){return c(u(So()??gn(),".claude","loop.md"))??c(u(ve(),"loop.md"))}function c(e){let t;try{t=S(e,"utf-8")}catch(n){if(Dt(n)||E(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:_(o)}}async function D(e){if(!e)return T();let t=c(u(So()??gn(),".claude","loop.md"));if(t)return t;let o=u(ve(),"loop.md"),n=await e.read([Re.state("loop-file")]);if(!n.ok)return c(o);let r=n.value.items[0];if(!r.found)return null;let s=Buffer.from(r.value.buffer,r.value.byteOffset,r.value.byteLength).toString("utf-8").trim();if(s.length===0)return null;return{path:o,content:_(s)}}function f(e){return e===x||e===d}function q(e,t){if(!f(t))return null;return A(e,t,T())}async function j(e,t,o){if(!f(t))return null;return A(e,t,await D(o))}function A(e,t,o){let n=t===d;if(o){let s=n?M():F();if(e.lastLoopFileDelivered===o.content)return s;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${s}`}w();let r=n?N():b();if(e.lastLoopFileDelivered===k||e.autonomousPreambleDelivered)return r;return e.lastLoopFileDelivered=k,e.autonomousPreambleDelivered=!0,`${v()}

---

${r}`}function re(e){return L(e)||f(e)}function se(e,t){return P(e,t)??q(e,t)??t}async function ae(e,t,o){return P(e,t)??await j(e,t,o)??t}export{d as LOOP_FILE_DYNAMIC_SENTINEL,x as LOOP_FILE_SENTINEL,v as getAutonomousLoopPreamble,re as isLoopDefaultSentinel,f as isLoopFileSentinel,w as logAutonomousLoopActivation,D as readLoopFileAsync,se as resolveLoopDefaultFire,ae as resolveLoopDefaultFireAsync};
