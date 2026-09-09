// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ke}from"/$bunfs/root/chunk-4te7e7q8.js";import{cn}from"/$bunfs/root/chunk-t8q7n4ta.js";import"/$bunfs/root/chunk-a7esebzw.js";import"/$bunfs/root/chunk-m3k3498d.js";import"/$bunfs/root/chunk-rfvh2b8a.js";import{I}from"/$bunfs/root/chunk-btbsn9s4.js";import{Se}from"/$bunfs/root/chunk-qsnhycbm.js";import"/$bunfs/root/chunk-7tpgnqqk.js";import"/$bunfs/root/chunk-9f6zczff.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import"/$bunfs/root/chunk-wchdjfbm.js";import"/$bunfs/root/chunk-vkfaczp9.js";import{A,It}from"/$bunfs/root/chunk-vfrpernt.js";import"/$bunfs/root/chunk-fy3j7rz0.js";import"/$bunfs/root/chunk-xdb7bs7g.js";import"/$bunfs/root/chunk-xj9n0xxp.js";import"/$bunfs/root/chunk-jvycdhmw.js";import"/$bunfs/root/chunk-554z0m6d.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import"/$bunfs/root/chunk-dzyeyv65.js";import"/$bunfs/root/chunk-rkvsjmym.js";import"/$bunfs/root/chunk-aznf32zy.js";import"/$bunfs/root/chunk-kr1pab5n.js";import"/$bunfs/root/chunk-f80rn6zv.js";import"/$bunfs/root/chunk-ckb6ttfs.js";import"/$bunfs/root/chunk-zfc5b4tv.js";import"/$bunfs/root/chunk-zw6xpj0e.js";import"/$bunfs/root/chunk-ydsbq05f.js";import"/$bunfs/root/chunk-dm1d67j0.js";import"/$bunfs/root/chunk-me2q8h8a.js";import"/$bunfs/root/chunk-y4ms75k8.js";import"/$bunfs/root/chunk-nbea0zv9.js";import"/$bunfs/root/chunk-7pzst5bj.js";import"/$bunfs/root/chunk-hfjb09vk.js";import"/$bunfs/root/chunk-pwwpvrmd.js";import"/$bunfs/root/chunk-kgqcj5g2.js";import"/$bunfs/root/chunk-tmbmk9b2.js";import"/$bunfs/root/chunk-kcxa79n8.js";import"/$bunfs/root/chunk-52ssfc24.js";import"/$bunfs/root/chunk-491rtt4x.js";import"/$bunfs/root/chunk-navp2db5.js";import"/$bunfs/root/chunk-knsrg480.js";import"/$bunfs/root/chunk-3xt7t29s.js";import"/$bunfs/root/chunk-2070tacj.js";import"/$bunfs/root/chunk-3ekf0n3z.js";import"/$bunfs/root/chunk-drjqqtaw.js";import"/$bunfs/root/chunk-xe36t0b4.js";import"/$bunfs/root/chunk-3e67p3qb.js";import"/$bunfs/root/chunk-eqagbzpy.js";import"/$bunfs/root/chunk-qcm1ed8r.js";import"/$bunfs/root/chunk-5jacf3nm.js";import"/$bunfs/root/chunk-jxgr13c3.js";import"/$bunfs/root/chunk-0ym3442e.js";import"/$bunfs/root/chunk-mdw0rg7r.js";import"/$bunfs/root/chunk-zrfv45h3.js";import"/$bunfs/root/chunk-0j67j6vd.js";import"/$bunfs/root/chunk-fq2q5808.js";import"/$bunfs/root/chunk-xp524m8z.js";import"/$bunfs/root/chunk-p1db16q0.js";import"/$bunfs/root/chunk-p0vxsr5s.js";import"/$bunfs/root/chunk-140dp1v3.js";import"/$bunfs/root/chunk-1yfctqs9.js";import"/$bunfs/root/chunk-cqe7zrvv.js";import"/$bunfs/root/chunk-bhwge2fj.js";import"/$bunfs/root/chunk-f4p6rc3t.js";import"/$bunfs/root/chunk-1vw101nq.js";import"/$bunfs/root/chunk-9ea4hj0w.js";import"/$bunfs/root/chunk-fbrtdkc9.js";import"/$bunfs/root/chunk-397dhf32.js";import"/$bunfs/root/chunk-6mran53g.js";import"/$bunfs/root/chunk-02ngbnjg.js";import"/$bunfs/root/chunk-y1gw8jjw.js";import{OC,gQ}from"/$bunfs/root/chunk-kaq2je32.js";import"/$bunfs/root/chunk-nt17n1q1.js";import{Zi,UTe,fse,fb,wg}from"/$bunfs/root/chunk-cbe5jj8r.js";import{ua}from"/$bunfs/root/chunk-gsryksdx.js";import"/$bunfs/root/chunk-am3rm9m5.js";import"/$bunfs/root/chunk-ckzz2qym.js";import"/$bunfs/root/chunk-4wqcg6m9.js";import"/$bunfs/root/chunk-bx9qrqzr.js";import"/$bunfs/root/chunk-3pr6cedc.js";import"/$bunfs/root/chunk-q2svqtr6.js";import"/$bunfs/root/chunk-bs8xfxpn.js";import"/$bunfs/root/chunk-ntxvbhz9.js";import"/$bunfs/root/chunk-e5066x5s.js";import"/$bunfs/root/chunk-k9qk789z.js";import{Te}from"/$bunfs/root/chunk-7sg5wrey.js";import{readFileSync as E}from"fs";import{join as u}from"path";var p=Te("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=Te("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");function g(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return I("tengu_kairos_loop_persistent",!1)}function v(){return g()?y:p}function w(){i("tengu_kairos_loop_persistent_activated",{variant:g()})}function h(e=!1){if(!gQ())return"";let o=!e&&g()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${OC} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function b(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Zi} from this tick.${h()}`}var m=`

If a ${ua} is armed (check ${fb}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${ua} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${Zi} with \`stop: true\` and ${wg} the monitor (use ${fb} to find its task ID if no longer in context).`;function x(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Zi} tool (not a recurring cron). To keep the loop alive, call ${Zi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${fse}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}function L(e){return e===UTe||e===fse}function P(e,t){if(!L(t))return null;w();let o=t===fse?x():b();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${v()}

---

${o}`}var k="__autonomous_preamble__",C="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Zi} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Zi} tool (not a recurring cron). To keep the loop alive, call ${Zi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${Zi} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${Zi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}var l=25000;function _(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function T(){return c(u(cn(),".claude","loop.md"))??c(u(Se(),"loop.md"))}function c(e){let t;try{t=E(e,"utf-8")}catch(n){if(It(n)||A(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:_(o)}}async function D(e){if(!e)return T();let t=c(u(cn(),".claude","loop.md"));if(t)return t;let o=u(Se(),"loop.md"),n=await e.read([ke.state("loop-file")]);if(!n.ok)return c(o);let r=n.value.items[0];if(!r.found)return null;let s=Buffer.from(r.value.buffer,r.value.byteOffset,r.value.byteLength).toString("utf-8").trim();if(s.length===0)return null;return{path:o,content:_(s)}}function f(e){return e===C||e===d}function q(e,t){if(!f(t))return null;return O(e,t,T())}async function W(e,t,o){if(!f(t))return null;return O(e,t,await D(o))}function O(e,t,o){let n=t===d;if(o){let s=n?M():F();if(e.lastLoopFileDelivered===o.content)return s;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${s}`}w();let r=n?N():b();if(e.lastLoopFileDelivered===k||e.autonomousPreambleDelivered)return r;return e.lastLoopFileDelivered=k,e.autonomousPreambleDelivered=!0,`${v()}

---

${r}`}function re(e){return L(e)||f(e)}function se(e,t){return P(e,t)??q(e,t)??t}async function ae(e,t,o){return P(e,t)??await W(e,t,o)??t}export{d as LOOP_FILE_DYNAMIC_SENTINEL,C as LOOP_FILE_SENTINEL,v as getAutonomousLoopPreamble,re as isLoopDefaultSentinel,f as isLoopFileSentinel,w as logAutonomousLoopActivation,D as readLoopFileAsync,se as resolveLoopDefaultFire,ae as resolveLoopDefaultFireAsync};
