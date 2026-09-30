// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
function dC({attempt:t,baseMs:r,capMs:e=1/0,factor:o=2,jitter:n={kind:"none"},random:m=Math.random}){let i=Math.min(e,r*o**(t-1));switch(n.kind){case"none":return i;case"proportional":return i+m()*n.ratio*i;case"symmetric":return Math.max(0,i+i*n.ratio*(2*m()-1));case"full":{let a=Math.min(n.floorMs??0,i);return a+m()*(i-a)}}}class F7n{now(){return Date.now()}monotonicNow(){return performance.now()}setTimeout(t,r,e){let o=setTimeout(t,r);if(e?.unref)o.unref();return()=>clearTimeout(o)}}var tQ=new F7n;function Z(t,r,e){return new Promise((o,n)=>{if(r?.aborted){if(e?.throwOnAbort||e?.abortError)n(e.abortError?.()??Error("aborted"));else o();return}let m=(e?.clock??tQ).setTimeout(()=>{r?.removeEventListener("abort",i),o()},t,{unref:e?.unref});function i(){if(m(),e?.throwOnAbort||e?.abortError)n(e.abortError?.()??Error("aborted"));else o()}r?.addEventListener("abort",i,{once:!0})})}var u=60000;function Gj({baseMs:t,capMs:r=u,attempt:e,floorMs:o=0,random:n=Math.random}){return Math.floor(dC({attempt:Math.max(0,e)+1,baseMs:t,capMs:r,jitter:{kind:"full",floorMs:o},random:n}))}function c(t,r){t(Error(r))}function It(t,r,e){let o,n=new Promise((m,i)=>{o=setTimeout(c,r,i,e)});return Promise.race([t,n]).finally(()=>{if(o!==void 0)clearTimeout(o)})}var s=(t,r)=>{let e=setTimeout(t,r);return()=>clearTimeout(e)};function it(t,r,e=s){let o=()=>{},n=new Promise((m)=>{o=e(()=>m(void 0),r)});return Promise.race([t,n]).finally(o)}async function Tp(t,r,e){let o=()=>{t.catch(()=>{})};if(r.aborted)throw o(),e();let n=()=>{};try{return await Promise.race([t,new Promise((m,i)=>{n=()=>i(e()),r.addEventListener("abort",n,{once:!0})})])}catch(m){throw o(),m}finally{r.removeEventListener("abort",n)}}
export{dC,F7n,tQ,Z,Gj,It,it,Tp};
