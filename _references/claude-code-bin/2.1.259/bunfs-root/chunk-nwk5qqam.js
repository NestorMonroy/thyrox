// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ve}from"/$bunfs/root/chunk-ptdm1fhw.js";import{hn}from"/$bunfs/root/chunk-x1rrg5j2.js";import"/$bunfs/root/chunk-jdw11prg.js";import"/$bunfs/root/chunk-56nvyfje.js";import"/$bunfs/root/chunk-1mrhsd7s.js";import{L}from"/$bunfs/root/chunk-x722nt0q.js";import{be}from"/$bunfs/root/chunk-kn2qhfka.js";import"/$bunfs/root/chunk-55w4bsdv.js";import"/$bunfs/root/chunk-9fysw8jv.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import"/$bunfs/root/chunk-m7w5m1w6.js";import{E,Lt}from"/$bunfs/root/chunk-058caznt.js";import"/$bunfs/root/chunk-97tbrkcc.js";import"/$bunfs/root/chunk-fzpv8ev5.js";import"/$bunfs/root/chunk-xmrr4sh8.js";import"/$bunfs/root/chunk-ras23w04.js";import"/$bunfs/root/chunk-6rkpsn9e.js";import"/$bunfs/root/chunk-ck0tqv1m.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import"/$bunfs/root/chunk-spz20jb6.js";import"/$bunfs/root/chunk-616tsvrd.js";import"/$bunfs/root/chunk-n8g979s0.js";import"/$bunfs/root/chunk-mxy52vze.js";import"/$bunfs/root/chunk-zk8esmth.js";import"/$bunfs/root/chunk-bx79h7g8.js";import"/$bunfs/root/chunk-k1wkanbv.js";import"/$bunfs/root/chunk-7y5wjz4e.js";import"/$bunfs/root/chunk-vdqz95a3.js";import"/$bunfs/root/chunk-5dw4kvcq.js";import"/$bunfs/root/chunk-gxyczd8c.js";import"/$bunfs/root/chunk-h96shwz8.js";import"/$bunfs/root/chunk-gzwhm5vd.js";import"/$bunfs/root/chunk-nwzn6gxv.js";import"/$bunfs/root/chunk-enjww0fp.js";import"/$bunfs/root/chunk-mzmfq60a.js";import"/$bunfs/root/chunk-ye42pw2j.js";import"/$bunfs/root/chunk-0dkpd8qq.js";import"/$bunfs/root/chunk-67nd7etf.js";import"/$bunfs/root/chunk-7xxnrgeg.js";import"/$bunfs/root/chunk-rahwxqh8.js";import"/$bunfs/root/chunk-m0a16ehy.js";import"/$bunfs/root/chunk-rjxafr3h.js";import"/$bunfs/root/chunk-1v541dwj.js";import"/$bunfs/root/chunk-21dppk21.js";import"/$bunfs/root/chunk-edmcaynh.js";import"/$bunfs/root/chunk-a7a5sap3.js";import"/$bunfs/root/chunk-7r03n5n9.js";import"/$bunfs/root/chunk-35w62chd.js";import"/$bunfs/root/chunk-9pd12rac.js";import"/$bunfs/root/chunk-8trhjkwe.js";import"/$bunfs/root/chunk-xfn8hpdj.js";import"/$bunfs/root/chunk-8mbwgjdd.js";import"/$bunfs/root/chunk-wxd1scze.js";import"/$bunfs/root/chunk-77152aqa.js";import"/$bunfs/root/chunk-33da912m.js";import"/$bunfs/root/chunk-x67fwt53.js";import"/$bunfs/root/chunk-5t2g7ar8.js";import"/$bunfs/root/chunk-pwdby7t2.js";import"/$bunfs/root/chunk-vv5g97a8.js";import"/$bunfs/root/chunk-a0qeq8pm.js";import"/$bunfs/root/chunk-9qgz04yg.js";import"/$bunfs/root/chunk-b5ax9mbm.js";import"/$bunfs/root/chunk-4z2eqcrq.js";import"/$bunfs/root/chunk-b3pxzdmn.js";import"/$bunfs/root/chunk-ta3hhm0z.js";import"/$bunfs/root/chunk-2yqsfgga.js";import"/$bunfs/root/chunk-trntcdrz.js";import"/$bunfs/root/chunk-nmde69vm.js";import"/$bunfs/root/chunk-3r19kwqx.js";import"/$bunfs/root/chunk-55t63zqr.js";import"/$bunfs/root/chunk-j2rxdvy0.js";import"/$bunfs/root/chunk-0xd0k64r.js";import"/$bunfs/root/chunk-b4cswg8c.js";import"/$bunfs/root/chunk-a3w4apvy.js";import{ET,z7}from"/$bunfs/root/chunk-31k5d81d.js";import{na,ake,qoe,Zg,Qw}from"/$bunfs/root/chunk-96acb4pv.js";import"/$bunfs/root/chunk-3e1zwnk7.js";import{ga}from"/$bunfs/root/chunk-zp04wyav.js";import"/$bunfs/root/chunk-zc7jwbz1.js";import"/$bunfs/root/chunk-50etkfry.js";import"/$bunfs/root/chunk-c6eb44np.js";import"/$bunfs/root/chunk-nc8ww32a.js";import"/$bunfs/root/chunk-my1n9ey3.js";import"/$bunfs/root/chunk-v10h0yg2.js";import{ke}from"/$bunfs/root/chunk-qyvz15br.js";import{readFileSync as S}from"fs";import{join as u}from"path";var g=ke("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=ke("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");var re=g;function m(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return L("tengu_kairos_loop_persistent",!1)}function v(){return m()?y:g}function w(){s("tengu_kairos_loop_persistent_activated",{variant:m()})}function h(e=!1){if(!z7())return"";let o=!e&&m()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${ET} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function b(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${na} from this tick.${h()}`}var f=`

If a ${ga} is armed (check ${Qw}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${ga} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${na} with \`stop: true\` and ${Zg} the monitor (use ${Qw} to find its task ID if no longer in context).`;function x(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${na} tool (not a recurring cron). To keep the loop alive, call ${na} again at the end of this turn with \`prompt\` set to the literal sentinel \`${qoe}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h()}`}function I(e){return e===ake||e===qoe}function P(e,t){if(!I(t))return null;w();let o=t===qoe?x():b();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${v()}

---

${o}`}var k="__autonomous_preamble__",C="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${na} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${na} tool (not a recurring cron). To keep the loop alive, call ${na} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${na} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${na} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h()}`}var l=25000;function _(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function T(){return c(u(hn(),".claude","loop.md"))??c(u(be(),"loop.md"))}function c(e){let t;try{t=S(e,"utf-8")}catch(n){if(Lt(n)||E(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:_(o)}}async function D(e){if(!e)return T();let t=c(u(hn(),".claude","loop.md"));if(t)return t;let o=u(be(),"loop.md"),n=await e.read([ve.state("loop-file")]);if(!n.ok)return c(o);let i=n.value.items[0];if(!i.found)return null;let r=Buffer.from(i.value.buffer,i.value.byteOffset,i.value.byteLength).toString("utf-8").trim();if(r.length===0)return null;return{path:o,content:_(r)}}function p(e){return e===C||e===d}function q(e,t){if(!p(t))return null;return A(e,t,T())}async function W(e,t,o){if(!p(t))return null;return A(e,t,await D(o))}function A(e,t,o){let n=t===d;if(o){let r=n?M():F();if(e.lastLoopFileDelivered===o.content)return r;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${r}`}w();let i=n?N():b();if(e.lastLoopFileDelivered===k||e.autonomousPreambleDelivered)return i;return e.lastLoopFileDelivered=k,e.autonomousPreambleDelivered=!0,`${v()}

---

${i}`}function se(e){return I(e)||p(e)}function ae(e,t){return P(e,t)??q(e,t)??t}async function he(e,t,o){return P(e,t)??await W(e,t,o)??t}export{re as AUTONOMOUS_LOOP_PREAMBLE,d as LOOP_FILE_DYNAMIC_SENTINEL,C as LOOP_FILE_SENTINEL,v as getAutonomousLoopPreamble,I as isAutonomousLoopSentinel,se as isLoopDefaultSentinel,p as isLoopFileSentinel,m as isLoopPersistentPreambleEnabled,w as logAutonomousLoopActivation,T as readLoopFile,D as readLoopFileAsync,P as resolveAutonomousLoopFire,ae as resolveLoopDefaultFire,he as resolveLoopDefaultFireAsync,q as resolveLoopFileFire,W as resolveLoopFileFireAsync};
