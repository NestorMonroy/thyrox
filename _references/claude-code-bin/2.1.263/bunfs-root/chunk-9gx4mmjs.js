// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{R,RRe}from"/$bunfs/root/chunk-kqpqzcmv.js";import{Pt}from"/$bunfs/root/chunk-z4h5ym44.js";import{mq}from"/$bunfs/root/chunk-kfgah04j.js";import"/$bunfs/root/chunk-06whp1c5.js";import"/$bunfs/root/chunk-1m0n2kwr.js";import"/$bunfs/root/chunk-te0qwtpy.js";import"/$bunfs/root/chunk-k6vqz9fa.js";import"/$bunfs/root/chunk-8a7jwk3w.js";import"/$bunfs/root/chunk-m3vzz9tz.js";import"/$bunfs/root/chunk-r8601mcq.js";import{S}from"/$bunfs/root/chunk-mh9y4c2z.js";import"/$bunfs/root/chunk-jmxayrtv.js";import"/$bunfs/root/chunk-w8jp0t25.js";import{go,p3t}from"/$bunfs/root/chunk-8q8hj6xj.js";import{axe}from"/$bunfs/root/chunk-4h8zz7nq.js";import{Vn}from"/$bunfs/root/chunk-v7vff0yy.js";import{z}from"/$bunfs/root/chunk-k7tq93j1.js";import"/$bunfs/root/chunk-yqdggex4.js";import{relative as Y}from"path";var Z=/&(?!(?:#\d{1,7}|#[Xx][0-9a-fA-F]{1,6}|\w+);)/g,J=/^<input (?:checked="" )?disabled="" type="checkbox"> ?/;function b(e){return e.replace(Z,"&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}function N(e){let s=e.renderImage??((a,n)=>b(a||n));return new mq({gfm:!0,renderer:{html(a){return b(a.text)},text(a){if("tokens"in a&&a.tokens)return this.parser.parseInline(a.tokens);if(a.type==="text"&&a.escaped){let n=a.text.match(J);if(n)return n[0]+b(a.text.slice(n[0].length))}return b(a.text)},link(a){let n=this.parser.parseInline(a.tokens);return e.renderLink(a.href,n,a.title)},image(a){return s(a.text,a.href)}}})}var Q=N({renderLink(e,s,a){let n=e.trim();if(!/^(?:https?:|mailto:|#)/i.test(n))return s;let i=a?` title="${r(a)}"`:"";return`<a href="${r(n)}"${i} rel="noopener">${s}</a>`},renderImage(e,s){return`<code>[image: ${b(e||s)}]</code>`}});function ee(){let e=new Map;return(s)=>{let a=e.get(s);if(a!==void 0)return a;let n;try{n=Q.parse(I(s),{async:!1})}catch{n=`<pre>${r(s)}</pre>`}let i=`<div class="md">${n}</div>`;return e.set(s,i),i}}function c(e){let s=Math.round(e*1000)/10;if(e<1&&s>=100)s=99.9;return Number.isInteger(s)?`${s}%`:`${s.toFixed(1)}%`}function D(e){return`$${e.toFixed(2)}`}function ae(e){let s=e.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return s?`${s[1]} ${s[2]} UTC`:e}function F(e,s,a){let n=Number.isFinite(e)?e:0,i=Math.max(0,Math.min(100,n*100)),l=a!==void 0&&Number.isFinite(a)?`<i class="tick" style="left:${Math.max(0,Math.min(100,a*100)).toFixed(1)}%"></i>`:"";return`<span class="meter ${s}" aria-hidden="true"><span style="width:${i.toFixed(1)}%"></span>${l}</span>`}function A(e){if(e>0)return{cls:"delta-pos",arrow:"\u2191",sign:"+"};if(e<0)return{cls:"delta-neg",arrow:"\u2193",sign:""};return{cls:"delta-zero",arrow:"\xB7",sign:""}}function se(e){let{cls:s,arrow:a,sign:n}=A(e);return`<span class="delta ${s}">${a} ${n}${(e*100).toFixed(1)} pts</span>`}var B='<span class="star" title="Includes runs that errored or hit the cost ceiling \u2014 see \u201CHow to read this report\u201D">*</span>',ne=20000,P=4000,te={manifest_invalid:!0,disabled_by_default:!0,will_not_load:!0,identity_unverified:!1,archive_not_probed:!1},re={manifest_invalid:"manifest is invalid \u2014 ran without it",disabled_by_default:"defaultEnabled: false \u2014 ran without it",identity_unverified:"identity not verified",archive_not_probed:"archive \u2014 identity not probed",will_not_load:"will not load"};function U(e){return e.suite.plugins.length>0?e.suite.plugins.map((s)=>{let a=ie.test(s.name)?s.name:S(Vn(I(s.name),80));return s.version!==void 0&&oe.test(s.version)?`${a} v${s.version}`:a}).join(", "):"Eval suite"}var ie=/^[0-9A-Za-z._@/-]{1,80}$/,oe=/^[0-9A-Za-z._+-]{1,40}$/;function le(e){let s=e.passed?'<span class="chip chip-pass">\u2713 pass</span>':'<span class="chip chip-fail">\u2717 fail</span>',a=e.weight!==1?`<span class="muted">\xD7${r(String(e.weight))}</span>`:"",n=e.withOnly?'<span class="badge">plugin-fired indicator</span>':"",i=e.judgeVotes&&e.judgeVotes.length>1?`<div class="kv"><span>Judge votes</span><span class="votes">${e.judgeVotes.map((p)=>p?"\u2713":"\u2717").join(" ")}</span></div>`:"",l=e.evidence?`<div class="kv"><span>Evidence (what the judge was shown; for an image, a description of what was sent)</span></div><pre class="evidence">${r(he(e.evidence))}</pre>`:"";return`<details class="grader"${e.passed?"":" open"}>
<summary>${s} <span class="grader-name">${r(e.name)}</span> ${a} ${n}</summary>
<div class="grader-body">
<p class="explanation">${r(e.explanation)}</p>
${i}${l}
</div>
</details>`}function de(e,s,a){let n=e.error?`<div class="run-error"><span class="chip chip-fail">\u2717 run error</span> <span class="explanation">${r(e.error)}</span></div>`:"",i=e.skippedPaidGraders?'<div class="note">\u26A0 Cost ceiling hit during this run \u2014 LLM/baseline graders were marked fail without judging; the run still counts toward the averages with the score shown.</div>':"",l=e.aborted?`<div class="run-error"><span class="chip chip-fail">\u2717 aborted by mock</span> <span class="explanation">${r(e.aborted.server)}/${r(e.aborted.tool)}: ${r(e.aborted.reason)}</span></div>`:"",p=e.mocks?`<details class="mocks"><summary>Mocked: ${e.mocks.servers.map((d)=>`${r(d.server)}${d.kind==="standalone"?" (standalone)":""} \u2014 ${d.tools.map((f)=>`${r(f.tool)}=${f.responder}`).join(", ")}`).join("; ")} \xB7 ${e.mocks.calls.total} ${R(e.mocks.calls.total,"call")}${e.mocks.calls.errors?`, ${e.mocks.calls.errors} ${R(e.mocks.calls.errors,"tool error")}`:""}${e.mocks.calls.replay&&e.mocks.calls.replay.hits+e.mocks.calls.replay.misses>0?` \xB7 replay ${e.mocks.calls.replay.hits} hit / ${e.mocks.calls.replay.misses} live`:""}</summary>${e.mocks.calls.unmocked.length?`<div class="note">Called but not mocked: ${e.mocks.calls.unmocked.map((d)=>`${r(d.tool)} \xD7${d.count}`).join(", ")}</div>`:""}${e.mocks.warnings.map((d)=>`<div class="note">${r(d)}</div>`).join("")}</details>`:"";return`<div class="run">
<div class="run-head">
<span class="run-title">Run ${s+1}</span>
${F(e.score,a)}
<span class="num">${c(e.score)}</span>
<span class="muted num">${e.turns} turns \xB7 ${D(e.costUsd)}${e.startedAt?` \xB7 ${r(e.startedAt.slice(11,19))} UTC`:""}</span>
</div>
${n}${l}${i}${p}
<div class="graders">${e.graders.map(le).join(`
`)}</div>
</div>`}function j(e,s,a,n,i){let l=a!==void 0?`${F(a,s)}
<span class="num">${c(a)}</span>
<span class="muted num">${c(n??0)} of runs perfect</span>`:'<span class="muted">aggregate not comparable \u2014 cost ceiling hit mid-arm</span>';return`<section class="arm">
<div class="arm-head">
<span class="arm-label">${r(e)}</span>
${l}
</div>
${i.map((p,d)=>de(p,d,s)).join(`
`)}
</section>`}function ce(e){let s=Object.entries(e);if(s.length===0)return"";return`<div class="config">${s.map(([a,n])=>`<div class="kv"><span>${r(a)}</span><code>${r(S(n)??"")}</code></div>`).join("")}</div>`}function pe(e,s){return`<div class="grader-def">
<div class="grader-def-head"><span class="grader-name">${r(e.name)}</span><span class="badge">${r(e.type)}</span>${e.weight!==1?`<span class="muted">weight \xD7${r(String(e.weight))}</span>`:""}</div>
${e.graderMarkdown?s(e.graderMarkdown):ce(e.config)}
</div>`}function ue(e,s,a,n){let i=(e.arms.without?.length??0)>0,l=`<details class="section" open>
<summary>Prompt</summary>
${a(e.promptMarkdown)}
</details>`,p=`<details class="section" open>
<summary>Graders \u2014 what "good" means for this case</summary>
${e.graders.map((o)=>pe(o,a)).join(`
`)}
</details>`,d=`<details class="section" open>
<summary>Results</summary>
${i?j("With plugin","m-accent",e.aggregates.score,e.aggregates.passRate,e.arms.with)+j("Baseline (no plugin)","m-base",e.aggregates.scoreWithout,e.aggregates.passRateWithout,e.arms.without??[]):j("Runs","m-accent",e.aggregates.score,e.aggregates.passRate,e.arms.with)}
</details>`,f=z(e.arms.with,(o)=>o.error!==null),u=z(e.arms.with,(o)=>o.skippedPaidGraders&&o.error===null),w=e.aggregates.delta!==void 0?e.arms.without??[]:[],x=f+z(w,(o)=>o.error!==null),m=u+z(w,(o)=>o.skippedPaidGraders&&o.error===null),v=[x>0?`<span class="flag">\u26A0 ${x} ${R(x,"run")} errored</span>`:"",m>0?`<span class="flag">\u26A0 ${m} ${R(m,"run")} unjudged (cost ceiling)</span>`:""].join("");return`<article class="case${(e.aggregates.delta??0)<0?" case-regressed":""}" id="case-${s+1}">
<div class="case-head">
<h2>${r(e.name)}</h2>
<span class="muted mono">${r(e.dir)}</span>
<span class="spacer"></span>
${v}
${e.aggregates.delta!==void 0?se(e.aggregates.delta):""}
${i?'<span class="muted">with plugin</span>':""}
${F(e.aggregates.score,"m-accent",n)}
<span class="num case-score">${c(e.aggregates.score)}${f+u>0?B:""}</span>
</div>
${(e.advisories??[]).map((o)=>`<div class="note">\u26A0 ${r(o)}</div>`).join(`
`)}
${d}
${l}
${p}
</article>`}var C="--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;",O="--plane:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--hairline:rgba(255,255,255,.10);--grid:#2c2c2a;--inset:rgba(255,255,255,.05);--accent:#3987e5;--base-fill:#898781;--delta-good:#0ca30c;--good:#0ca30c;--warning:#fab219;--critical:#e06c6c;",ge=`<style>
:root{${C}
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){:root{${O}color-scheme:dark}}
:root[data-theme="dark"]{${O}color-scheme:dark}
:root[data-theme="light"]{${C}color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--plane);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-text-size-adjust:100%}
.wrap{max-width:880px;margin:0 auto;padding:40px 24px 64px;display:flex;flex-direction:column;gap:20px}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
header h1{margin:2px 0 0;font-size:24px;font-weight:600;line-height:1.25;text-wrap:balance}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;color:var(--ink-2);font-size:13px}
.meta .num{font-variant-numeric:tabular-nums lining-nums}
.banner{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;
  border:1px solid var(--hairline);background:var(--surface);font-size:13px}
.banner .chip-warn{color:var(--warning);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:14px 16px;
  display:flex;flex-direction:column;gap:4px}
.tile .label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.tile .value{font-size:26px;font-weight:600;font-variant-numeric:tabular-nums lining-nums;line-height:1.1}
.tile.hero .value{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:48px}
.tile .sub{font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.tile .value.delta-pos{color:var(--delta-good)}
.tile .value.delta-neg{color:var(--critical)}
.toolbar{display:flex;gap:8px;justify-content:flex-end}
.toolbar button{font:12px system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink-2);
  background:var(--surface);border:1px solid var(--hairline);border-radius:6px;padding:4px 10px;cursor:pointer}
.toolbar button:hover{color:var(--ink)}
.toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.case{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:18px 20px;
  display:flex;flex-direction:column;gap:10px}
.case-regressed{border-left:3px solid var(--critical)}
.verdict{margin:6px 0 0;font-size:15px}
.verdict .delta{font-size:15px}
.flag{font-size:11px;font-weight:600;color:var(--warning);white-space:nowrap}
.star{color:var(--warning);font-size:.45em;vertical-align:super;line-height:0;cursor:help}
.legend summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}
.legend-list{margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--ink-2)}
.case-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.case-head h2{margin:0;font-size:16px;font-weight:600}
.case-head .spacer{flex:1}
.case-score{font-size:15px;font-weight:600}
.mono{font:12px "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.num{font-variant-numeric:tabular-nums lining-nums}
.muted{color:var(--ink-3);font-size:12px}
.meter{display:inline-block;position:relative;width:120px;height:6px;border-radius:4px;background:var(--grid);
  vertical-align:middle}
.meter>span{display:block;height:100%;border-radius:4px;max-width:100%}
.meter .tick{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink-3);border-radius:1px}
.m-accent>span{background:var(--accent)}
.m-base>span{background:var(--base-fill)}
.delta{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.delta-pos{color:var(--delta-good)}
.delta-neg{color:var(--critical)}
.delta-zero{color:var(--ink-3)}
details.section{border-top:1px solid var(--grid);padding-top:10px}
details.section>summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;color:var(--ink-2);list-style-position:outside;margin-left:2px}
details.section>summary:hover{color:var(--ink)}
details.section[open]>summary{margin-bottom:8px}
.md{display:flex;flex-direction:column;gap:8px;background:var(--inset);border-radius:8px;
  padding:12px 14px;overflow-wrap:break-word}
.md>:first-child{margin-top:0}
.md h1,.md h2,.md h3,.md h4,.md h5,.md h6{margin:4px 0 0;font-size:1em;font-weight:600;line-height:1.3}
.md p,.md ul,.md ol,.md blockquote,.md table,.md pre,.md hr{margin:0}
.md ul,.md ol{display:flex;flex-direction:column;gap:4px;padding-left:20px}
.md blockquote{border-left:2px solid var(--hairline);padding-left:10px;color:var(--ink-2)}
.md :not(pre)>code{background:var(--inset);padding:1px 4px;border-radius:4px;
  font:.92em "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.md pre{background:var(--inset);border:1px solid var(--hairline);padding:10px 12px;border-radius:6px;
  overflow-x:auto;font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.md pre code{background:none;padding:0;font:inherit}
.md table{width:100%;border-collapse:collapse}
.md th,.md td{padding:5px 8px;text-align:left;vertical-align:top;border-bottom:1px solid var(--grid)}
.md th{font-weight:600;color:var(--ink-2)}
.md a{color:var(--accent);text-decoration:none}
.md a:hover{text-decoration:underline}
.grader-def{display:flex;flex-direction:column;gap:6px;padding:8px 0}
.grader-def+.grader-def{border-top:1px solid var(--grid)}
.grader-def-head{display:flex;align-items:baseline;gap:8px}
.grader-name{font:13px "SF Mono",ui-monospace,Menlo,Consolas,monospace;font-weight:600}
.badge{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);
  border:1px solid var(--hairline);border-radius:999px;padding:1px 8px}
.config{display:flex;flex-direction:column;gap:2px;background:var(--inset);border-radius:8px;padding:10px 14px}
.config code{font:12px "SF Mono",ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.arm{display:flex;flex-direction:column;gap:8px;padding:6px 0}
.arm+.arm{border-top:1px dashed var(--grid);margin-top:4px;padding-top:12px}
.arm-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.arm-label{font-size:13px;font-weight:600}
.run{border:1px solid var(--grid);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.run-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.run-title{font-size:12px;font-weight:600;color:var(--ink-2)}
.run-error .explanation{color:var(--ink-2)}
.note{font-size:12px;color:var(--ink-2)}
.graders{display:flex;flex-direction:column;gap:4px}
details.grader{border-radius:6px}
details.grader>summary{cursor:pointer;display:flex;align-items:baseline;gap:8px;padding:3px 4px;
  border-radius:6px;list-style:none}
details.grader>summary::-webkit-details-marker{display:none}
details.grader>summary::before{content:'\u25B8';font-size:10px;color:var(--ink-3);flex:none;
  transition:transform .12s ease}
details.grader[open]>summary::before{transform:rotate(90deg)}
details.grader>summary:hover{background:var(--inset)}
details.grader>summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.grader-body{padding:6px 8px 8px 24px;display:flex;flex-direction:column;gap:6px}
.chip{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;white-space:nowrap}
.chip-pass{color:var(--good);border:1px solid currentColor}
.chip-fail{color:var(--critical);border:1px solid currentColor}
.chip.chip-warn{color:var(--warning);border:1px solid currentColor}
.explanation{margin:0;font-size:13px;color:var(--ink-2);white-space:pre-wrap;overflow-wrap:break-word}
.kv{display:flex;gap:8px;font-size:12px;color:var(--ink-3)}
.votes{font-variant-numeric:tabular-nums;letter-spacing:.1em}
pre.evidence{margin:0;background:var(--inset);border:1px solid var(--hairline);border-radius:6px;
  padding:8px 10px;overflow-x:auto;max-height:320px;
  font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:break-word}
footer{color:var(--ink-3);font-size:12px;text-align:center;padding-top:8px}
@media (prefers-reduced-motion:no-preference){
  details.grader>summary,.toolbar button{transition:background .12s ease,color .12s ease}
}
@media (prefers-reduced-motion:reduce){
  details.grader>summary::before{transition:none}
}
@media print{
  :root,:root[data-theme="dark"],:root[data-theme="light"]{${C}color-scheme:light}
  body{background:#fff}
  .toolbar{display:none}
  .case,.run,.grader-def{break-inside:avoid}
  pre.evidence{max-height:none}
}
</style>`,me=`<script>
document.addEventListener('DOMContentLoaded',function(){
  var bar=document.querySelector('.toolbar');
  if(!bar)return;
  bar.addEventListener('click',function(e){
    var b=e.target&&e.target.closest('button');
    if(!b)return;
    var open=b.dataset.act==='expand';
    document.querySelectorAll('details.section, details.grader').forEach(function(d){d.open=open});
  });
});
// Collapsed details vanish from print/PDF; these pages are share artifacts.
window.addEventListener('beforeprint',function(){
  document.querySelectorAll('details').forEach(function(d){
    if(!d.open){d.dataset.printOpened='1';d.open=true}
  });
});
window.addEventListener('afterprint',function(){
  document.querySelectorAll('details[data-print-opened]').forEach(function(d){
    d.open=false;delete d.dataset.printOpened;
  });
});
</script>`;function Ce(e){let s=ee(),{cases:a,aggregates:n,suite:i}=e,l=a.filter((t)=>t.aggregates.scoreWithout!==void 0),p=U(e),d=a.reduce((t,g)=>t+g.arms.with.length+(g.arms.without?.length??0),0),f=e.partial?`<div class="banner"><span class="chip-warn">\u26A0 Partial results</span><span>${e.partialReason==="cost_ceiling"?"The --max-cost-usd ceiling was hit before every case finished.":e.partialReason==="auth_failed"?"A run could not authenticate (or the credential was rejected before any run), so the suite stopped before every case finished.":"The run was interrupted before every case finished."}</span></div>`:"",u=n.meanDelta,w=i.ablation==="with-without",x=a.flatMap((t)=>t.arms.with),m=z(x,(t)=>t.error!==null),v=z(x,(t)=>t.skippedPaidGraders&&t.error===null),k=m+v>0,o=a.filter((t)=>t.aggregates.delta!==void 0).flatMap((t)=>t.arms.without??[]),y=m+z(o,(t)=>t.error!==null),E=v+z(o,(t)=>t.skippedPaidGraders&&t.error===null),G=y+E>0?`<div class="banner"><span class="chip-warn">\u26A0 Averages include non-judgments</span><span>${[y>0?`${y} ${R(y,"run")} errored`:"",E>0?`${E} ${R(E,"run")} force-failed at the cost ceiling`:""].filter(Boolean).join("; ")} \u2014 their scores count toward the averages shown without a complete judgment.</span></div>`:"",h=a.filter((t)=>t.aggregates.delta!==void 0),H=u!==void 0&&h.length>0?(()=>{let{cls:t,arrow:g,sign:M}=A(u),L=z(h,(_)=>(_.aggregates.delta??0)>0),T=z(h,(_)=>(_.aggregates.delta??0)<0),X=h.length-L-T;return`<p class="verdict">Plugin effect: <span class="delta ${t}">${g} ${M}${(u*100).toFixed(1)} pts</span> vs baseline \u2014 improved ${L} \xB7 flat ${X} \xB7 regressed ${T} of ${h.length} ${R(h.length,"case")}.</p>`})():"",V=u!==void 0?(()=>{let{cls:t,arrow:g,sign:M}=A(u);return`<div class="tile"><span class="label">Ablation \u0394</span><span class="value num ${t}">${g==="\xB7"?"":`${g} `}${M}${(u*100).toFixed(1)}</span><span class="sub">score points vs baseline, ${h.length} of ${a.length} ${R(a.length,"case")}</span></div>`})():"",q=l.length>0?`${V}
<div class="tile"><span class="label">Baseline score</span><span class="value num">${c(axe(l.map((t)=>t.aggregates.scoreWithout??0)))}</span><span class="sub">without the plugin</span></div>`:"",W=`<details class="section legend">
<summary>How to read this report</summary>
<ul class="legend-list">
<li>A run's score is the weighted fraction of its graders that passed; a "perfect" run passed every grader.</li>
<li>A case's score is the mean of its runs; a case passes when its score is at or above the ${c(i.threshold)} threshold (the tick on each case bar).</li>
<li>The suite score is the mean of the per-case scores.</li>
<li>Judge votes are independent samples of the LLM judge; the majority decides pass or fail.</li>
${w?`<li>"With plugin" and "Baseline" runs are identical except for the plugin being loaded; \u0394 is the with-plugin score minus the baseline score.${e.cases.some((t)=>(t.arms.without?.length??0)===0)?" Cases that show no baseline ran a single arm (nothing to strip, or a replay case) \u2014 their scores are absolute.":""}</li>`:"<li><strong>No baseline arm was run</strong> (ablation off) \u2014 this report shows absolute scores only and cannot say whether the plugin caused them. Re-run with <code>--ablation with-without</code> to measure the plugin\u2019s effect.</li>"}
${k?"<li>Scores marked with * include runs that errored or hit the cost ceiling (LLM graders force-failed); those runs count toward the means without a complete judgment.</li>":""}
</ul>
</details>`,K=`<div class="wrap">
<header>
<div class="eyebrow">Plugin eval report</div>
<h1>${r(p)}</h1>
${H}
<div class="meta">
${i.plugins.map((t)=>`<span class="mono">${r(Y(i.root,t.path)||".")}${t.problem===void 0?"":` <span class="chip ${te[t.problem]?"chip-fail":"chip-warn"}">${r(re[t.problem])}</span>`}</span>`).join(`
`)}
<span>Claude Code v${r(e.claudeVersion)}</span>
<span class="num">${r(ae(e.startedAt))}</span>
<span class="num">${Pt(e.durationSeconds*1000,{hideTrailingZeros:!0})}</span>
<span class="num">${D(e.costUsd)}</span>
<span class="num">${d} runs</span>
${i.pluginId?`<span class="mono">${r(i.pluginId)}</span>`:""}
${i.modelOverride?`<span>model ${r(i.modelOverride)}</span>`:""}
<span>judge ${r(i.judgeModel??"default")}</span>
<span class="num">threshold ${c(i.threshold)}</span>
${i.caseFilter||i.tagFilters?.length?`<span>filtered: ${[i.caseFilter?`--case ${r(i.caseFilter)}`:"",...(i.tagFilters??[]).map((t)=>`--tag ${r(t)}`)].filter(Boolean).join(" ")}</span>`:""}
</div>
</header>
${f}${G}
<section class="tiles">
<div class="tile hero"><span class="label">Suite score${w?" \xB7 with plugin":""}</span><span class="value">${c(n.overallScore)}${k?B:""}</span><span class="sub">mean of per-case scores${k?` \xB7 * includes ${m+v} ${R(m+v,"run")} without a complete judgment`:""}</span></div>
${q}
<div class="tile"><span class="label">Cases</span><span class="value num">${n.casesTotal}</span><span class="sub">${n.casesPassed} of ${n.casesTotal} \u2265 ${c(i.threshold)} threshold</span></div>
<div class="tile"><span class="label">Perfect runs</span><span class="value num">${c(n.overallPassRate)}</span><span class="sub">runs where every grader passed</span></div>
</section>
${W}
${a.length>0?`<div class="toolbar"><button type="button" data-act="expand">Expand all</button><button type="button" data-act="collapse">Collapse all</button></div>
${a.map((t,g)=>ue(t,g,s,i.threshold)).join(`
`)}`:'<p class="muted">No cases in this result file.</p>'}
<footer>Generated by <code>claude plugin eval</code> \xB7 schema v${e.schemaVersion} \xB7 scores are not comparable across different suites${fe(e)}</footer>
</div>`;return`${ge}
${K}
${me}`}function fe(e){let s=e.cases.some((n)=>{let i=axe(n.arms.with.map((l)=>l.score));return Math.abs(i-n.aggregates.score)>0.005}),a=e.cases.length>0&&Math.abs(axe(e.cases.map((n)=>n.aggregates.score))-e.aggregates.overallScore)>0.005;return s||a?' \xB7 <span class="flag">\u26A0 aggregates in this file do not match values recomputed from its runs</span>':""}function ze(e,s){return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eval report \u2014 ${r(U(e))}</title>
</head>
<body>
${s}
</body>
</html>
`}function he(e){return RRe(e,ne-P,P,(s)=>`
[\u2026${s} more chars \u2014 full text in aggregate-result.json\u2026]
`)}function r(e){return go(I(e))}var xe=new RegExp(`[${p3t}\u2028\u2029]|[^\\P{Cc}\\n\\t]`,"gu");function I(e){return e.replace(xe," ")}export{U as evalReportTitle,Ce as renderEvalReportFragment,ze as wrapReportDocument};
