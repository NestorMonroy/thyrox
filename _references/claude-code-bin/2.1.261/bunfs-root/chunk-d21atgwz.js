// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ae}from"/$bunfs/root/chunk-y87vtd8k.js";import{sn}from"/$bunfs/root/chunk-annedm50.js";import"/$bunfs/root/chunk-dcawh0q4.js";import"/$bunfs/root/chunk-x7f60hk6.js";import"/$bunfs/root/chunk-91n3hqvz.js";import{I}from"/$bunfs/root/chunk-hyqdn9c0.js";import{Se}from"/$bunfs/root/chunk-fvzv4ke0.js";import"/$bunfs/root/chunk-84mvm17e.js";import"/$bunfs/root/chunk-8w57hkxq.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import"/$bunfs/root/chunk-49q43dms.js";import"/$bunfs/root/chunk-2y9gqtpa.js";import{A,Tt}from"/$bunfs/root/chunk-xzmtst7a.js";import"/$bunfs/root/chunk-y5pwxex8.js";import"/$bunfs/root/chunk-e0egp0nd.js";import"/$bunfs/root/chunk-py8dsda5.js";import"/$bunfs/root/chunk-e1njvp95.js";import"/$bunfs/root/chunk-020pptsa.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import"/$bunfs/root/chunk-vvf2tdhs.js";import"/$bunfs/root/chunk-jab6fkvt.js";import"/$bunfs/root/chunk-rdp33ner.js";import"/$bunfs/root/chunk-yahgjr75.js";import"/$bunfs/root/chunk-2a6tx3x8.js";import"/$bunfs/root/chunk-6pmy77t2.js";import"/$bunfs/root/chunk-tn96w8x6.js";import"/$bunfs/root/chunk-hsewrfs2.js";import"/$bunfs/root/chunk-z9pce9zb.js";import"/$bunfs/root/chunk-1a7p190e.js";import"/$bunfs/root/chunk-k79k92jg.js";import"/$bunfs/root/chunk-qezj5211.js";import"/$bunfs/root/chunk-n8m6z2zx.js";import"/$bunfs/root/chunk-9206rsny.js";import"/$bunfs/root/chunk-tcap6yb8.js";import"/$bunfs/root/chunk-q41p4zsw.js";import"/$bunfs/root/chunk-s0879eds.js";import"/$bunfs/root/chunk-d5174152.js";import"/$bunfs/root/chunk-2e0agwm9.js";import"/$bunfs/root/chunk-sh3w3snz.js";import"/$bunfs/root/chunk-znctvfkf.js";import"/$bunfs/root/chunk-q7wxr944.js";import"/$bunfs/root/chunk-qtjs85tq.js";import"/$bunfs/root/chunk-dem1zjh2.js";import"/$bunfs/root/chunk-xpat0ems.js";import"/$bunfs/root/chunk-82e9b5ex.js";import"/$bunfs/root/chunk-g2qb5pnr.js";import"/$bunfs/root/chunk-5fkqzxnf.js";import"/$bunfs/root/chunk-zzcvbc0w.js";import"/$bunfs/root/chunk-0ff9agk6.js";import"/$bunfs/root/chunk-hs05644q.js";import"/$bunfs/root/chunk-8xbkt625.js";import"/$bunfs/root/chunk-gxg8x291.js";import"/$bunfs/root/chunk-h3jmzymx.js";import"/$bunfs/root/chunk-52630dg1.js";import"/$bunfs/root/chunk-7mwy3xv6.js";import"/$bunfs/root/chunk-p3zwp1vp.js";import"/$bunfs/root/chunk-9rq9mz06.js";import"/$bunfs/root/chunk-stk161y4.js";import"/$bunfs/root/chunk-cef6a4eg.js";import"/$bunfs/root/chunk-f5wj6z2q.js";import"/$bunfs/root/chunk-ptxv38cr.js";import"/$bunfs/root/chunk-aerz4wsa.js";import"/$bunfs/root/chunk-abjvv046.js";import"/$bunfs/root/chunk-31tjt5p8.js";import"/$bunfs/root/chunk-nrkj245a.js";import"/$bunfs/root/chunk-2d61yeh9.js";import"/$bunfs/root/chunk-wdt4vs8t.js";import"/$bunfs/root/chunk-16w4y03y.js";import"/$bunfs/root/chunk-s1cxej39.js";import"/$bunfs/root/chunk-v1s99x6n.js";import"/$bunfs/root/chunk-0p1sxx9a.js";import{sT,KJ}from"/$bunfs/root/chunk-vt0zd707.js";import"/$bunfs/root/chunk-9p4sx0n9.js";import{Yi,XAe,Wre,Tw,rg}from"/$bunfs/root/chunk-v4myfqyj.js";import{ia}from"/$bunfs/root/chunk-49zcw8yz.js";import"/$bunfs/root/chunk-9p6et3p8.js";import"/$bunfs/root/chunk-7xd4r47e.js";import"/$bunfs/root/chunk-gfmykb9c.js";import"/$bunfs/root/chunk-e2976mv7.js";import"/$bunfs/root/chunk-4c991prk.js";import"/$bunfs/root/chunk-z3xbqh22.js";import"/$bunfs/root/chunk-mxg1ntkk.js";import"/$bunfs/root/chunk-4qz1hwvq.js";import{ve}from"/$bunfs/root/chunk-934z9d80.js";import{readFileSync as E}from"fs";import{join as u}from"path";var p=ve("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=ve("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");function g(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return I("tengu_kairos_loop_persistent",!1)}function v(){return g()?y:p}function w(){i("tengu_kairos_loop_persistent_activated",{variant:g()})}function h(e=!1){if(!KJ())return"";let o=!e&&g()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${sT} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function b(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Yi} from this tick.${h()}`}var m=`

If a ${ia} is armed (check ${Tw}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${ia} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${Yi} with \`stop: true\` and ${rg} the monitor (use ${Tw} to find its task ID if no longer in context).`;function x(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Yi} tool (not a recurring cron). To keep the loop alive, call ${Yi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${Wre}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}function L(e){return e===XAe||e===Wre}function P(e,t){if(!L(t))return null;w();let o=t===Wre?x():b();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${v()}

---

${o}`}var k="__autonomous_preamble__",C="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${Yi} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${Yi} tool (not a recurring cron). To keep the loop alive, call ${Yi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${Yi} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${Yi} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${m}${h()}`}var l=25000;function _(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function T(){return c(u(sn(),".claude","loop.md"))??c(u(Se(),"loop.md"))}function c(e){let t;try{t=E(e,"utf-8")}catch(n){if(Tt(n)||A(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:_(o)}}async function D(e){if(!e)return T();let t=c(u(sn(),".claude","loop.md"));if(t)return t;let o=u(Se(),"loop.md"),n=await e.read([Ae.state("loop-file")]);if(!n.ok)return c(o);let r=n.value.items[0];if(!r.found)return null;let s=Buffer.from(r.value.buffer,r.value.byteOffset,r.value.byteLength).toString("utf-8").trim();if(s.length===0)return null;return{path:o,content:_(s)}}function f(e){return e===C||e===d}function q(e,t){if(!f(t))return null;return O(e,t,T())}async function W(e,t,o){if(!f(t))return null;return O(e,t,await D(o))}function O(e,t,o){let n=t===d;if(o){let s=n?M():F();if(e.lastLoopFileDelivered===o.content)return s;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${s}`}w();let r=n?N():b();if(e.lastLoopFileDelivered===k||e.autonomousPreambleDelivered)return r;return e.lastLoopFileDelivered=k,e.autonomousPreambleDelivered=!0,`${v()}

---

${r}`}function re(e){return L(e)||f(e)}function se(e,t){return P(e,t)??q(e,t)??t}async function ae(e,t,o){return P(e,t)??await W(e,t,o)??t}export{d as LOOP_FILE_DYNAMIC_SENTINEL,C as LOOP_FILE_SENTINEL,v as getAutonomousLoopPreamble,re as isLoopDefaultSentinel,f as isLoopFileSentinel,w as logAutonomousLoopActivation,D as readLoopFileAsync,se as resolveLoopDefaultFire,ae as resolveLoopDefaultFireAsync};
