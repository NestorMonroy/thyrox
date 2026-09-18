// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Re}from"/$bunfs/root/chunk-z0202m3z.js";import"/$bunfs/root/chunk-4cmy5sqz.js";import"/$bunfs/root/chunk-tep8see7.js";import{gn}from"/$bunfs/root/chunk-ja309z9r.js";import"/$bunfs/root/chunk-p7hrkaq4.js";import{k,Bt}from"/$bunfs/root/chunk-3btyksgt.js";import"/$bunfs/root/chunk-64dkx51v.js";import"/$bunfs/root/chunk-akpzg2yh.js";import"/$bunfs/root/chunk-g5h2a16k.js";import{I}from"/$bunfs/root/chunk-27bj2wbx.js";import{we}from"/$bunfs/root/chunk-53a5hn9r.js";import"/$bunfs/root/chunk-w8gsn0hm.js";import"/$bunfs/root/chunk-ecxh3hga.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import"/$bunfs/root/chunk-hxy982f9.js";import"/$bunfs/root/chunk-r2c9k9kh.js";import"/$bunfs/root/chunk-yy7a4xwv.js";import"/$bunfs/root/chunk-b565vq97.js";import"/$bunfs/root/chunk-1jxsqt67.js";import"/$bunfs/root/chunk-pc40tvt4.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import"/$bunfs/root/chunk-marw4shk.js";import"/$bunfs/root/chunk-1mz51xz6.js";import"/$bunfs/root/chunk-y669ewnb.js";import"/$bunfs/root/chunk-mw9kp8vw.js";import"/$bunfs/root/chunk-b5k761bj.js";import"/$bunfs/root/chunk-hf9yhhhe.js";import"/$bunfs/root/chunk-hk70qp2z.js";import"/$bunfs/root/chunk-dz2zqf8q.js";import"/$bunfs/root/chunk-tjpyqt9m.js";import"/$bunfs/root/chunk-deawgr1z.js";import"/$bunfs/root/chunk-da71yq24.js";import"/$bunfs/root/chunk-ztn29w9x.js";import"/$bunfs/root/chunk-q77993h4.js";import"/$bunfs/root/chunk-e5k4mpe1.js";import"/$bunfs/root/chunk-esk1bxsv.js";import"/$bunfs/root/chunk-1nwhka6x.js";import"/$bunfs/root/chunk-m0am9fba.js";import"/$bunfs/root/chunk-7xhd9gmf.js";import"/$bunfs/root/chunk-qk2a968b.js";import"/$bunfs/root/chunk-af9dczt1.js";import"/$bunfs/root/chunk-dnseeje8.js";import"/$bunfs/root/chunk-w3jka8th.js";import"/$bunfs/root/chunk-6ab20r20.js";import"/$bunfs/root/chunk-sw4c8z6t.js";import"/$bunfs/root/chunk-71zbyxdf.js";import"/$bunfs/root/chunk-ebvrj09e.js";import"/$bunfs/root/chunk-4jd7d9ec.js";import"/$bunfs/root/chunk-qfxegd6m.js";import"/$bunfs/root/chunk-gg61tmje.js";import"/$bunfs/root/chunk-h1nnaadz.js";import"/$bunfs/root/chunk-a8zb1cc5.js";import"/$bunfs/root/chunk-j7xqd34f.js";import"/$bunfs/root/chunk-7q5pgenh.js";import"/$bunfs/root/chunk-zsdbd62x.js";import"/$bunfs/root/chunk-zbq9bkhj.js";import"/$bunfs/root/chunk-4s3p78tq.js";import"/$bunfs/root/chunk-55cbxff7.js";import"/$bunfs/root/chunk-hv6090k5.js";import"/$bunfs/root/chunk-b1ctzpp7.js";import"/$bunfs/root/chunk-843kre03.js";import"/$bunfs/root/chunk-tbpkh1zy.js";import"/$bunfs/root/chunk-3x88vsy7.js";import"/$bunfs/root/chunk-4qm801kz.js";import"/$bunfs/root/chunk-p8ybpsqa.js";import"/$bunfs/root/chunk-8jxxned0.js";import"/$bunfs/root/chunk-x31r83nz.js";import"/$bunfs/root/chunk-20q5babf.js";import"/$bunfs/root/chunk-mtq3m0rn.js";import"/$bunfs/root/chunk-hmpvwkgc.js";import"/$bunfs/root/chunk-n8xje69s.js";import{OI,Pse}from"/$bunfs/root/chunk-r1wjj1fa.js";import"/$bunfs/root/chunk-5t7y9tec.js";import{za,iNe,Jfe,wg,nb}from"/$bunfs/root/chunk-vmwrshes.js";import{Pa}from"/$bunfs/root/chunk-7cwe8h1d.js";import"/$bunfs/root/chunk-dphd06tg.js";import"/$bunfs/root/chunk-1tx1d40g.js";import"/$bunfs/root/chunk-8nk4yw0p.js";import"/$bunfs/root/chunk-dde73rk7.js";import"/$bunfs/root/chunk-jwwerfky.js";import"/$bunfs/root/chunk-pdqfh5em.js";import"/$bunfs/root/chunk-p6031f67.js";import"/$bunfs/root/chunk-ssw4v7fk.js";import"/$bunfs/root/chunk-c113sjy3.js";import"/$bunfs/root/chunk-kardmssy.js";import"/$bunfs/root/chunk-0pqqmh0e.js";import"/$bunfs/root/chunk-hyjn4arn.js";import{Ce}from"/$bunfs/root/chunk-3z5w4bh8.js";import{readFileSync as E}from"fs";import{join as u}from"path";var p=Ce("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=Ce("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");function g(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return I("tengu_kairos_loop_persistent",!1)}function w(){return g()?y:p}function b(){i("tengu_kairos_loop_persistent_activated",{variant:g()})}function h(e=!1){if(!Pse())return"";let o=!e&&g()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${OI} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function L(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${za} from this tick.${h()}`}var m=`

If a ${Pa} is armed (check ${nb}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${Pa} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${za} with \`stop: true\` and ${wg} the monitor (use ${nb} to find its task ID if no longer in context).`;function x(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${za} tool (not a recurring cron). To keep the loop alive, call ${za} again at the end of this turn with \`prompt\` set to the literal sentinel \`${Jfe}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}function P(e){return e===iNe||e===Jfe}function _(e,t){if(!P(t))return null;b();let o=t===Jfe?x():L();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${w()}

---

${o}`}var v="__autonomous_preamble__",C="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${za} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${za} tool (not a recurring cron). To keep the loop alive, call ${za} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${za} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${za} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}var l=25000;function T(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function A(){return c(u(gn(),".claude","loop.md"))??c(u(we(),"loop.md"))}function c(e){let t;try{t=E(e,"utf-8")}catch(n){if(Bt(n)||k(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:T(o)}}async function D(e){if(!e)return A();let t=c(u(gn(),".claude","loop.md"));if(t)return t;let o=u(we(),"loop.md"),n=await e.read([Re.state("loop-file")]);if(!n.ok)return c(o);let r=n.value.items[0];if(!r.found)return null;let s=Buffer.from(r.value.buffer,r.value.byteOffset,r.value.byteLength).toString("utf-8").trim();if(s.length===0)return null;return{path:o,content:T(s)}}function f(e){return e===C||e===d}function q(e,t){if(!f(t))return null;return O(e,t,A())}async function W(e,t,o){if(!f(t))return null;return O(e,t,await D(o))}function O(e,t,o){let n=t===d;if(o){let s=n?M():F();if(e.lastLoopFileDelivered===o.content)return s;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${s}`}b();let r=n?N():L();if(e.lastLoopFileDelivered===v||e.autonomousPreambleDelivered)return r;return e.lastLoopFileDelivered=v,e.autonomousPreambleDelivered=!0,`${w()}

---

${r}`}function re(e){return P(e)||f(e)}function se(e,t){return _(e,t)??q(e,t)??t}async function ae(e,t,o){return _(e,t)??await W(e,t,o)??t}export{d as LOOP_FILE_DYNAMIC_SENTINEL,C as LOOP_FILE_SENTINEL,w as getAutonomousLoopPreamble,re as isLoopDefaultSentinel,f as isLoopFileSentinel,b as logAutonomousLoopActivation,D as readLoopFileAsync,se as resolveLoopDefaultFire,ae as resolveLoopDefaultFireAsync};
