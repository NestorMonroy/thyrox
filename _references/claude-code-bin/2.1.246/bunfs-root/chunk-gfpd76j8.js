// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{vy as S}from"/$bunfs/root/_223.js";import"/$bunfs/root/_500.js";import"/$bunfs/root/_537.js";import{nPb as P,pPb as se}from"/$bunfs/root/_581.js";import{Pyc as q,_yc as pe}from"/$bunfs/root/_679.js";import"/$bunfs/root/_680.js";import"/$bunfs/root/_681.js";import{$Dc as H,aEc as V,sEc as ce}from"/$bunfs/root/_700.js";import{IPc as G,KPc as de}from"/$bunfs/root/_715.js";import"/$bunfs/root/_766.js";import"/$bunfs/root/_810.js";import"/$bunfs/root/_818.js";import"/$bunfs/root/_819.js";import{mgd as F,ugd as ie}from"/$bunfs/root/_820.js";import"/$bunfs/root/_821.js";import"/$bunfs/root/_822.js";import"/$bunfs/root/_823.js";import"/$bunfs/root/_824.js";import"/$bunfs/root/_825.js";import"/$bunfs/root/_826.js";import"/$bunfs/root/_827.js";import"/$bunfs/root/_828.js";import"/$bunfs/root/_829.js";import{rud as c,wud as le}from"/$bunfs/root/_830.js";import"/$bunfs/root/_831.js";import{Dvd as u,Hvd as U,dwd as oe}from"/$bunfs/root/_832.js";import"/$bunfs/root/_833.js";import"/$bunfs/root/_834.js";import"/$bunfs/root/_835.js";import"/$bunfs/root/_836.js";import"/$bunfs/root/_837.js";le();pe();import{relative as ue}from"path";se();var te=/&(?!(?:#\d{1,7}|#[Xx][0-9a-fA-F]{1,6}|\w+);)/g,re=/^<input (?:checked="" )?disabled="" type="checkbox"> ?/;function k(e){return e.replace(te,"&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}function O(e){let n=e.renderImage??((a,s)=>k(a||s));return new P({gfm:!0,renderer:{html(a){return k(a.text)},text(a){if("tokens"in a&&a.tokens)return this.parser.parseInline(a.tokens);if(a.type==="text"&&a.escaped){let s=a.text.match(re);if(s)return s[0]+k(a.text.slice(s[0].length))}return k(a.text)},link(a){let s=this.parser.parseInline(a.tokens);return e.renderLink(a.href,s,a.title)},image(a){return n(a.text,a.href)}}})}de();ie();oe();ce();var ge=O({renderLink(e,n,a){let s=e.trim();if(!/^(?:https?:|mailto:|#)/i.test(s))return n;let i=a?` title="${r(a)}"`:"";return`<a href="${r(s)}"${i} rel="noopener">${n}</a>`},renderImage(e,n){return`<code>[image: ${k(e||n)}]</code>`}});function me(){let e=new Map;return(n)=>{let a=e.get(n);if(a!==void 0)return a;let s;try{s=ge.parse(L(n),{async:!1})}catch{s=`<pre>${r(n)}</pre>`}let i=`<div class="md">${s}</div>`;return e.set(n,i),i}}function p(e){let n=Math.round(e*1000)/10;if(e<1&&n>=100)n=99.9;return Number.isInteger(n)?`${n}%`:`${n.toFixed(1)}%`}function W(e){return`$${e.toFixed(2)}`}function fe(e){let n=e.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return n?`${n[1]} ${n[2]} UTC`:e}function I(e,n,a){let s=Number.isFinite(e)?e:0,i=Math.max(0,Math.min(100,s*100)),l=a!==void 0&&Number.isFinite(a)?`<i class="tick" style="left:${Math.max(0,Math.min(100,a*100)).toFixed(1)}%"></i>`:"";return`<span class="meter ${n}" aria-hidden="true"><span style="width:${i.toFixed(1)}%"></span>${l}</span>`}function A(e){if(e>0)return{cls:"delta-pos",arrow:"\u2191",sign:"+"};if(e<0)return{cls:"delta-neg",arrow:"\u2193",sign:""};return{cls:"delta-zero",arrow:"\xB7",sign:""}}function he(e){let{cls:n,arrow:a,sign:s}=A(e);return`<span class="delta ${n}">${a} ${s}${(e*100).toFixed(1)} pts</span>`}var K='<span class="star" title="Includes runs that errored or hit the cost ceiling \u2014 see \u201CHow to read this report\u201D">*</span>',xe=20000,D=4000,ve={manifest_invalid:!0,disabled_by_default:!0,will_not_load:!0,identity_unverified:!1,archive_not_probed:!1},be={manifest_invalid:"manifest is invalid \u2014 ran without it",disabled_by_default:"defaultEnabled: false \u2014 ran without it",identity_unverified:"identity not verified",archive_not_probed:"archive \u2014 identity not probed",will_not_load:"will not load"};function X(e){return e.suite.plugins.length>0?e.suite.plugins.map((n)=>{let a=$e.test(n.name)?n.name:F(G(L(n.name),80));return n.version!==void 0&&we.test(n.version)?`${a} v${n.version}`:a}).join(", "):"Eval suite"}var $e=/^[0-9A-Za-z._@/-]{1,80}$/,we=/^[0-9A-Za-z._+-]{1,40}$/;function ke(e){let n=e.passed?'<span class="chip chip-pass">\u2713 pass</span>':'<span class="chip chip-fail">\u2717 fail</span>',a=e.weight!==1?`<span class="muted">\xD7${r(String(e.weight))}</span>`:"",s=e.withOnly?'<span class="badge">plugin-fired indicator</span>':"",i=e.judgeVotes&&e.judgeVotes.length>1?`<div class="kv"><span>Judge votes</span><span class="votes">${e.judgeVotes.map((g)=>g?"\u2713":"\u2717").join(" ")}</span></div>`:"",l=e.evidence?`<div class="kv"><span>Evidence (what the judge was shown; for an image, a description of what was sent)</span></div><pre class="evidence">${r(Ae(e.evidence))}</pre>`:"";return`<details class="grader"${e.passed?"":" open"}>
<summary>${n} <span class="grader-name">${r(e.name)}</span> ${a} ${s}</summary>
<div class="grader-body">
<p class="explanation">${r(e.explanation)}</p>
${i}${l}
</div>
</details>`}function ye(e,n,a){let s=e.error?`<div class="run-error"><span class="chip chip-fail">\u2717 run error</span> <span class="explanation">${r(e.error)}</span></div>`:"",i=e.skippedPaidGraders?'<div class="note">\u26A0 Cost ceiling hit during this run \u2014 LLM/baseline graders were marked fail without judging; the run still counts toward the averages with the score shown.</div>':"",l=e.aborted?`<div class="run-error"><span class="chip chip-fail">\u2717 aborted by mock</span> <span class="explanation">${r(e.aborted.server)}/${r(e.aborted.tool)}: ${r(e.aborted.reason)}</span></div>`:"",g=e.mocks?`<details class="mocks"><summary>Mocked: ${e.mocks.servers.map((d)=>`${r(d.server)}${d.kind==="standalone"?" (standalone)":""} \u2014 ${d.tools.map((x)=>`${r(x.tool)}=${x.responder}`).join(", ")}`).join("; ")} \xB7 ${e.mocks.calls.total} ${u(e.mocks.calls.total,"call")}${e.mocks.calls.errors?`, ${e.mocks.calls.errors} ${u(e.mocks.calls.errors,"tool error")}`:""}</summary>${e.mocks.calls.unmocked.length?`<div class="note">Called but not mocked: ${e.mocks.calls.unmocked.map((d)=>`${r(d.tool)} \xD7${d.count}`).join(", ")}</div>`:""}${e.mocks.warnings.map((d)=>`<div class="note">${r(d)}</div>`).join("")}</details>`:"";return`<div class="run">
<div class="run-head">
<span class="run-title">Run ${n+1}</span>
${I(e.score,a)}
<span class="num">${p(e.score)}</span>
<span class="muted num">${e.turns} turns \xB7 ${W(e.costUsd)}${e.startedAt?` \xB7 ${r(e.startedAt.slice(11,19))} UTC`:""}</span>
</div>
${s}${l}${i}${g}
<div class="graders">${e.graders.map(ke).join(`
`)}</div>
</div>`}function C(e,n,a,s,i){let l=a!==void 0?`${I(a,n)}
<span class="num">${p(a)}</span>
<span class="muted num">${p(s??0)} of runs perfect</span>`:'<span class="muted">aggregate not comparable \u2014 cost ceiling hit mid-arm</span>';return`<section class="arm">
<div class="arm-head">
<span class="arm-label">${r(e)}</span>
${l}
</div>
${i.map((g,d)=>ye(g,d,n)).join(`
`)}
</section>`}function Re(e){let n=Object.entries(e);if(n.length===0)return"";return`<div class="config">${n.map(([a,s])=>`<div class="kv"><span>${r(a)}</span><code>${r(F(s)??"")}</code></div>`).join("")}</div>`}function Ee(e,n){return`<div class="grader-def">
<div class="grader-def-head"><span class="grader-name">${r(e.name)}</span><span class="badge">${r(e.type)}</span>${e.weight!==1?`<span class="muted">weight \xD7${r(String(e.weight))}</span>`:""}</div>
${e.graderMarkdown?n(e.graderMarkdown):Re(e.config)}
</div>`}function Me(e,n,a,s){let i=(e.arms.without?.length??0)>0,l=`<details class="section" open>
<summary>Prompt</summary>
${a(e.promptMarkdown)}
</details>`,g=`<details class="section" open>
<summary>Graders \u2014 what "good" means for this case</summary>
${e.graders.map((o)=>Ee(o,a)).join(`
`)}
</details>`,d=`<details class="section" open>
<summary>Results</summary>
${i?C("With plugin","m-accent",e.aggregates.score,e.aggregates.passRate,e.arms.with)+C("Baseline (no plugin)","m-base",e.aggregates.scoreWithout,e.aggregates.passRateWithout,e.arms.without??[]):C("Runs","m-accent",e.aggregates.score,e.aggregates.passRate,e.arms.with)}
</details>`,x=c(e.arms.with,(o)=>o.error!==null),m=c(e.arms.with,(o)=>o.skippedPaidGraders&&o.error===null),y=e.aggregates.delta!==void 0?e.arms.without??[]:[],b=x+c(y,(o)=>o.error!==null),h=m+c(y,(o)=>o.skippedPaidGraders&&o.error===null),w=[b>0?`<span class="flag">\u26A0 ${b} ${u(b,"run")} errored</span>`:"",h>0?`<span class="flag">\u26A0 ${h} ${u(h,"run")} unjudged (cost ceiling)</span>`:""].join("");return`<article class="case${(e.aggregates.delta??0)<0?" case-regressed":""}" id="case-${n+1}">
<div class="case-head">
<h2>${r(e.name)}</h2>
<span class="muted mono">${r(e.dir)}</span>
<span class="spacer"></span>
${w}
${e.aggregates.delta!==void 0?he(e.aggregates.delta):""}
${i?'<span class="muted">with plugin</span>':""}
${I(e.aggregates.score,"m-accent",s)}
<span class="num case-score">${p(e.aggregates.score)}${x+m>0?K:""}</span>
</div>
${(e.advisories??[]).map((o)=>`<div class="note">\u26A0 ${r(o)}</div>`).join(`
`)}
${d}
${l}
${g}
</article>`}var z="--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;",B="--plane:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--hairline:rgba(255,255,255,.10);--grid:#2c2c2a;--inset:rgba(255,255,255,.05);--accent:#3987e5;--base-fill:#898781;--delta-good:#0ca30c;--good:#0ca30c;--warning:#fab219;--critical:#e06c6c;",Se=`<style>
:root{${z}
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){:root{${B}color-scheme:dark}}
:root[data-theme="dark"]{${B}color-scheme:dark}
:root[data-theme="light"]{${z}color-scheme:light}
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
  :root,:root[data-theme="dark"],:root[data-theme="light"]{${z}color-scheme:light}
  body{background:#fff}
  .toolbar{display:none}
  .case,.run,.grader-def{break-inside:avoid}
  pre.evidence{max-height:none}
}
</style>`,_e=`<script>
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
</script>`;function je(e){let n=me(),{cases:a,aggregates:s,suite:i}=e,l=a.filter((t)=>t.aggregates.scoreWithout!==void 0),g=X(e),d=a.reduce((t,f)=>t+f.arms.with.length+(f.arms.without?.length??0),0),x=e.partial?`<div class="banner"><span class="chip-warn">\u26A0 Partial results</span><span>${e.partialReason==="cost_ceiling"?"The --max-cost-usd ceiling was hit before every case finished.":e.partialReason==="auth_failed"?"A run could not authenticate (or the credential was rejected before any run), so the suite stopped before every case finished.":"The run was interrupted before every case finished."}</span></div>`:"",m=s.meanDelta,y=i.ablation==="with-without",b=a.flatMap((t)=>t.arms.with),h=c(b,(t)=>t.error!==null),w=c(b,(t)=>t.skippedPaidGraders&&t.error===null),R=h+w>0,o=a.filter((t)=>t.aggregates.delta!==void 0).flatMap((t)=>t.arms.without??[]),E=h+c(o,(t)=>t.error!==null),M=w+c(o,(t)=>t.skippedPaidGraders&&t.error===null),Z=E+M>0?`<div class="banner"><span class="chip-warn">\u26A0 Averages include non-judgments</span><span>${[E>0?`${E} ${u(E,"run")} errored`:"",M>0?`${M} ${u(M,"run")} force-failed at the cost ceiling`:""].filter(Boolean).join("; ")} \u2014 their scores count toward the averages shown without a complete judgment.</span></div>`:"",v=a.filter((t)=>t.aggregates.delta!==void 0),J=m!==void 0&&v.length>0?(()=>{let{cls:t,arrow:f,sign:_}=A(m),T=c(v,(j)=>(j.aggregates.delta??0)>0),N=c(v,(j)=>(j.aggregates.delta??0)<0),ne=v.length-T-N;return`<p class="verdict">Plugin effect: <span class="delta ${t}">${f} ${_}${(m*100).toFixed(1)} pts</span> vs baseline \u2014 improved ${T} \xB7 flat ${ne} \xB7 regressed ${N} of ${v.length} ${u(v.length,"case")}.</p>`})():"",Y=m!==void 0?(()=>{let{cls:t,arrow:f,sign:_}=A(m);return`<div class="tile"><span class="label">Ablation \u0394</span><span class="value num ${t}">${f==="\xB7"?"":`${f} `}${_}${(m*100).toFixed(1)}</span><span class="sub">score points vs baseline, ${v.length} of ${a.length} ${u(a.length,"case")}</span></div>`})():"",Q=l.length>0?`${Y}
<div class="tile"><span class="label">Baseline score</span><span class="value num">${p(S(l.map((t)=>t.aggregates.scoreWithout??0)))}</span><span class="sub">without the plugin</span></div>`:"",ee=`<details class="section legend">
<summary>How to read this report</summary>
<ul class="legend-list">
<li>A run's score is the weighted fraction of its graders that passed; a "perfect" run passed every grader.</li>
<li>A case's score is the mean of its runs; a case passes when its score is at or above the ${p(i.threshold)} threshold (the tick on each case bar).</li>
<li>The suite score is the mean of the per-case scores.</li>
<li>Judge votes are independent samples of the LLM judge; the majority decides pass or fail.</li>
${y?`<li>"With plugin" and "Baseline" runs are identical except for the plugin being loaded; \u0394 is the with-plugin score minus the baseline score.${e.cases.some((t)=>(t.arms.without?.length??0)===0)?" Cases that show no baseline ran a single arm (nothing to strip, or a replay case) \u2014 their scores are absolute.":""}</li>`:"<li><strong>No baseline arm was run</strong> (ablation off) \u2014 this report shows absolute scores only and cannot say whether the plugin caused them. Re-run with <code>--ablation with-without</code> to measure the plugin\u2019s effect.</li>"}
${R?"<li>Scores marked with * include runs that errored or hit the cost ceiling (LLM graders force-failed); those runs count toward the means without a complete judgment.</li>":""}
</ul>
</details>`,ae=`<div class="wrap">
<header>
<div class="eyebrow">Plugin eval report</div>
<h1>${r(g)}</h1>
${J}
<div class="meta">
${i.plugins.map((t)=>`<span class="mono">${r(ue(i.root,t.path)||".")}${t.problem===void 0?"":` <span class="chip ${ve[t.problem]?"chip-fail":"chip-warn"}">${r(be[t.problem])}</span>`}</span>`).join(`
`)}
<span>Claude Code v${r(e.claudeVersion)}</span>
<span class="num">${r(fe(e.startedAt))}</span>
<span class="num">${q(e.durationSeconds*1000,{hideTrailingZeros:!0})}</span>
<span class="num">${W(e.costUsd)}</span>
<span class="num">${d} runs</span>
${i.pluginId?`<span class="mono">${r(i.pluginId)}</span>`:""}
${i.modelOverride?`<span>model ${r(i.modelOverride)}</span>`:""}
<span>judge ${r(i.judgeModel??"default")}</span>
<span class="num">threshold ${p(i.threshold)}</span>
${i.caseFilter||i.tagFilters?.length?`<span>filtered: ${[i.caseFilter?`--case ${r(i.caseFilter)}`:"",...(i.tagFilters??[]).map((t)=>`--tag ${r(t)}`)].filter(Boolean).join(" ")}</span>`:""}
</div>
</header>
${x}${Z}
<section class="tiles">
<div class="tile hero"><span class="label">Suite score${y?" \xB7 with plugin":""}</span><span class="value">${p(s.overallScore)}${R?K:""}</span><span class="sub">mean of per-case scores${R?` \xB7 * includes ${h+w} ${u(h+w,"run")} without a complete judgment`:""}</span></div>
${Q}
<div class="tile"><span class="label">Cases</span><span class="value num">${s.casesTotal}</span><span class="sub">${s.casesPassed} of ${s.casesTotal} \u2265 ${p(i.threshold)} threshold</span></div>
<div class="tile"><span class="label">Perfect runs</span><span class="value num">${p(s.overallPassRate)}</span><span class="sub">runs where every grader passed</span></div>
</section>
${ee}
${a.length>0?`<div class="toolbar"><button type="button" data-act="expand">Expand all</button><button type="button" data-act="collapse">Collapse all</button></div>
${a.map((t,f)=>Me(t,f,n,i.threshold)).join(`
`)}`:'<p class="muted">No cases in this result file.</p>'}
<footer>Generated by <code>claude plugin eval</code> \xB7 schema v${e.schemaVersion} \xB7 scores are not comparable across different suites${Ce(e)}</footer>
</div>`;return`${Se}
${ae}
${_e}`}function Ce(e){let n=e.cases.some((s)=>{let i=S(s.arms.with.map((l)=>l.score));return Math.abs(i-s.aggregates.score)>0.005}),a=e.cases.length>0&&Math.abs(S(e.cases.map((s)=>s.aggregates.score))-e.aggregates.overallScore)>0.005;return n||a?' \xB7 <span class="flag">\u26A0 aggregates in this file do not match values recomputed from its runs</span>':""}function ze(e,n){return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eval report \u2014 ${r(X(e))}</title>
</head>
<body>
${n}
</body>
</html>
`}function qe(e){return ze(e,je(e))}function Ae(e){return U(e,xe-D,D,(n)=>`
[\u2026${n} more chars \u2014 full text in aggregate-result.json\u2026]
`)}function r(e){return H(L(e))}var Fe=new RegExp(`[${V}\u2028\u2029]|[^\\P{Cc}\\n\\t]`,"gu");function L(e){return e.replace(Fe," ")}export{Ae as boundEvidenceForDisplay,X as evalReportTitle,je as renderEvalReportFragment,qe as renderEvalReportHtml,ze as wrapReportDocument};
