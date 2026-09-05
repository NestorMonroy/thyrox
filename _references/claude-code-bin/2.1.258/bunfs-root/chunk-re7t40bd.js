// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ae}from"/$bunfs/root/chunk-fkh93x1w.js";import{mn}from"/$bunfs/root/chunk-b1z7jvb2.js";import"/$bunfs/root/chunk-ycrs8y50.js";import"/$bunfs/root/chunk-y7x1gsy0.js";import"/$bunfs/root/chunk-td0fv71w.js";import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{Se}from"/$bunfs/root/chunk-0sa7g6pk.js";import"/$bunfs/root/chunk-ffgkv432.js";import"/$bunfs/root/chunk-cw80kq1q.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import"/$bunfs/root/chunk-twjxwmnx.js";import{E,Lt}from"/$bunfs/root/chunk-xtc2dmbe.js";import"/$bunfs/root/chunk-mrh5xd2h.js";import"/$bunfs/root/chunk-5nyank6v.js";import"/$bunfs/root/chunk-pz607n7v.js";import"/$bunfs/root/chunk-ctshp37x.js";import"/$bunfs/root/chunk-hfch6q45.js";import"/$bunfs/root/chunk-wv4b4ave.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import"/$bunfs/root/chunk-krz8ngz3.js";import"/$bunfs/root/chunk-rfwkkcpg.js";import"/$bunfs/root/chunk-5wwsf42p.js";import"/$bunfs/root/chunk-b6yvqj2q.js";import"/$bunfs/root/chunk-650bcxer.js";import"/$bunfs/root/chunk-tdsxb2n6.js";import"/$bunfs/root/chunk-5nbfs0gy.js";import"/$bunfs/root/chunk-br7qz22q.js";import"/$bunfs/root/chunk-zmhk2tm0.js";import"/$bunfs/root/chunk-9d3jb7ss.js";import"/$bunfs/root/chunk-pewb9akp.js";import"/$bunfs/root/chunk-t5j5p2ne.js";import"/$bunfs/root/chunk-d89fbdxm.js";import"/$bunfs/root/chunk-478fqyzs.js";import"/$bunfs/root/chunk-gvnmfkwa.js";import"/$bunfs/root/chunk-64kpb0yv.js";import"/$bunfs/root/chunk-1ce1rf2k.js";import"/$bunfs/root/chunk-n6xww8f0.js";import"/$bunfs/root/chunk-0300m3ak.js";import"/$bunfs/root/chunk-6tm4k51s.js";import"/$bunfs/root/chunk-m7yvwazd.js";import"/$bunfs/root/chunk-zmtb7sjc.js";import"/$bunfs/root/chunk-7y3dpmev.js";import"/$bunfs/root/chunk-2gy6qgxb.js";import"/$bunfs/root/chunk-0bwkdgd7.js";import"/$bunfs/root/chunk-21p4p57y.js";import"/$bunfs/root/chunk-8qtdp828.js";import"/$bunfs/root/chunk-qa9rwvaj.js";import"/$bunfs/root/chunk-e45krqw9.js";import"/$bunfs/root/chunk-vvp6yg1e.js";import"/$bunfs/root/chunk-bmjyz6e1.js";import"/$bunfs/root/chunk-cnazfz7b.js";import"/$bunfs/root/chunk-8gx3t4ng.js";import"/$bunfs/root/chunk-j956zzb7.js";import"/$bunfs/root/chunk-8p7g3f8s.js";import"/$bunfs/root/chunk-6x6tyk1n.js";import"/$bunfs/root/chunk-bdjm18ys.js";import"/$bunfs/root/chunk-1c73sb2f.js";import"/$bunfs/root/chunk-0wc7a0ya.js";import"/$bunfs/root/chunk-g60xv35x.js";import"/$bunfs/root/chunk-1yhkg7x0.js";import"/$bunfs/root/chunk-mt21y33a.js";import"/$bunfs/root/chunk-rb08vpfw.js";import"/$bunfs/root/chunk-1azd6qmg.js";import"/$bunfs/root/chunk-tsnan5t5.js";import"/$bunfs/root/chunk-g9d7r5bw.js";import"/$bunfs/root/chunk-39bh7dex.js";import"/$bunfs/root/chunk-7npsafxm.js";import"/$bunfs/root/chunk-5cm9g8n5.js";import"/$bunfs/root/chunk-g790ebfk.js";import"/$bunfs/root/chunk-n91qqthe.js";import"/$bunfs/root/chunk-6jmn7bz7.js";import"/$bunfs/root/chunk-dkdapnb4.js";import{lT,a7}from"/$bunfs/root/chunk-nyhxvrjg.js";import{wa,MAe,Kre,l_,Fw}from"/$bunfs/root/chunk-8s4f9eej.js";import"/$bunfs/root/chunk-hztyj1zw.js";import{ca}from"/$bunfs/root/chunk-trewd6vn.js";import"/$bunfs/root/chunk-jvfbjppn.js";import"/$bunfs/root/chunk-vy72srn2.js";import"/$bunfs/root/chunk-kr0dzw6h.js";import"/$bunfs/root/chunk-kssh590p.js";import"/$bunfs/root/chunk-e979sk69.js";import"/$bunfs/root/chunk-dwwp0b8c.js";import{ve}from"/$bunfs/root/chunk-6zavqkd2.js";import{readFileSync as S}from"fs";import{join as u}from"path";var g=ve("/$bunfs/root/loopAutonomousPreamble-07qcyhv4.md");var y=ve("/$bunfs/root/loopAutonomousPreamblePersistent-3zqtkrvg.md");var re=g;function m(){if(a.CLAUDE_CODE_LOOP_PERSISTENT)return!0;return L("tengu_kairos_loop_persistent",!1)}function v(){return m()?y:g}function w(){s("tengu_kairos_loop_persistent_activated",{variant:m()})}function h(e=!1){if(!a7())return"";let o=!e&&m()?"newly blocked on a decision you won't make alone, you're ending the loop":"newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";return`

Use ${lT} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`}function b(){return`# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${wa} from this tick.${h()}`}var f=`

If a ${ca} is armed (check ${Fw}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${ca} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. To stop the loop, call ${wa} with \`stop: true\` and ${l_} the monitor (use ${Fw} to find its task ID if no longer in context).`;function x(){return`# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${wa} tool (not a recurring cron). To keep the loop alive, call ${wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${Kre}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h()}`}function I(e){return e===MAe||e===Kre}function P(e,t){if(!I(t))return null;w();let o=t===Kre?x():b();if(e.autonomousPreambleDelivered||e.lastLoopFileDelivered!==null)return o;return e.autonomousPreambleDelivered=!0,`${v()}

---

${o}`}var k="__autonomous_preamble__",C="<<loop.md>>",d="<<loop.md-dynamic>>";function F(){return`# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${wa} from this tick.${h(!0)}`}function M(){return`# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${wa} tool (not a recurring cron). To keep the loop alive, call ${wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h(!0)}`}function N(){return`# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${wa} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${wa} again at the end of this turn with \`prompt\` set to the literal sentinel \`${d}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${f}${h()}`}var l=25000;function _(e){if(e.length<=l)return e;let t=e.lastIndexOf(`
`,l);return`${e.slice(0,t>0?t:l)}

> WARNING: loop.md was truncated to ${l} bytes. Keep the task list concise.`}function T(){return c(u(mn(),".claude","loop.md"))??c(u(Se(),"loop.md"))}function c(e){let t;try{t=S(e,"utf-8")}catch(n){if(Lt(n)||E(n)==="EISDIR")return null;throw n}let o=t.trim();if(o.length===0)return null;return{path:e,content:_(o)}}async function D(e){if(!e)return T();let t=c(u(mn(),".claude","loop.md"));if(t)return t;let o=u(Se(),"loop.md"),n=await e.read([Ae.state("loop-file")]);if(!n.ok)return c(o);let i=n.value.items[0];if(!i.found)return null;let r=Buffer.from(i.value.buffer,i.value.byteOffset,i.value.byteLength).toString("utf-8").trim();if(r.length===0)return null;return{path:o,content:_(r)}}function p(e){return e===C||e===d}function q(e,t){if(!p(t))return null;return A(e,t,T())}async function W(e,t,o){if(!p(t))return null;return A(e,t,await D(o))}function A(e,t,o){let n=t===d;if(o){let r=n?M():F();if(e.lastLoopFileDelivered===o.content)return r;return e.lastLoopFileDelivered=o.content,`# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${r}`}w();let i=n?N():b();if(e.lastLoopFileDelivered===k||e.autonomousPreambleDelivered)return i;return e.lastLoopFileDelivered=k,e.autonomousPreambleDelivered=!0,`${v()}

---

${i}`}function se(e){return I(e)||p(e)}function ae(e,t){return P(e,t)??q(e,t)??t}async function he(e,t,o){return P(e,t)??await W(e,t,o)??t}export{re as AUTONOMOUS_LOOP_PREAMBLE,d as LOOP_FILE_DYNAMIC_SENTINEL,C as LOOP_FILE_SENTINEL,v as getAutonomousLoopPreamble,I as isAutonomousLoopSentinel,se as isLoopDefaultSentinel,p as isLoopFileSentinel,m as isLoopPersistentPreambleEnabled,w as logAutonomousLoopActivation,T as readLoopFile,D as readLoopFileAsync,P as resolveAutonomousLoopFire,ae as resolveLoopDefaultFire,he as resolveLoopDefaultFireAsync,q as resolveLoopFileFire,W as resolveLoopFileFireAsync};
