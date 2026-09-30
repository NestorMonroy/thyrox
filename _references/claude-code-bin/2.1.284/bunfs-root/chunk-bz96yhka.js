// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
class aQn{now(){return Date.now()}monotonicNow(){return performance.now()}setTimeout(t,r,e){let o=setTimeout(t,r);if(e?.unref)o.unref();return()=>clearTimeout(o)}}var poe=new aQn;function Z(t,r,e){return new Promise((o,n)=>{if(r?.aborted){if(e?.throwOnAbort||e?.abortError)n(e.abortError?.()??Error("aborted"));else o();return}let i=(e?.clock??poe).setTimeout(()=>{r?.removeEventListener("abort",m),o()},t,{unref:e?.unref});function m(){if(i(),e?.throwOnAbort||e?.abortError)n(e.abortError?.()??Error("aborted"));else o()}r?.addEventListener("abort",m,{once:!0})})}var u=60000;function MY({baseMs:t,capMs:r=u,attempt:e,floorMs:o=0,random:n=Math.random}){let i=Math.min(r,t*2**Math.max(0,e)),m=Math.min(o,i);return Math.floor(m+n()*(i-m))}function a(t,r){t(Error(r))}function It(t,r,e){let o,n=new Promise((i,m)=>{o=setTimeout(a,r,m,e)});return Promise.race([t,n]).finally(()=>{if(o!==void 0)clearTimeout(o)})}var c=(t,r)=>{let e=setTimeout(t,r);return()=>clearTimeout(e)};function tt(t,r,e=c){let o=()=>{},n=new Promise((i)=>{o=e(()=>i(void 0),r)});return Promise.race([t,n]).finally(o)}async function cd(t,r,e){let o=()=>{t.catch(()=>{})};if(r.aborted)throw o(),e();let n=()=>{};try{return await Promise.race([t,new Promise((i,m)=>{n=()=>m(e()),r.addEventListener("abort",n,{once:!0})})])}catch(i){throw o(),i}finally{r.removeEventListener("abort",n)}}
export{aQn,poe,Z,MY,It,tt,cd};
