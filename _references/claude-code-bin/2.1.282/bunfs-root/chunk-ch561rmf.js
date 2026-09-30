// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
class i_t extends Error{label;timeoutMs;constructor(e,r){super(`${e} timed out after ${r}ms`);this.label=e;this.timeoutMs=r;this.name="BoundedTimeoutError"}}async function Ua(e,r,n){let t,o=new Promise((c,i)=>{t=setTimeout((s,u,m)=>s(new i_t(u,m)),Math.min(r,2147483647),i,n,r)});try{return await Promise.race([e,o])}finally{if(t)clearTimeout(t);e.catch(()=>{})}}var a_t=5000;function $h(e,r){return Ua(e,a_t,`[runner:stuck] fs op '${r}' (check TMPDIR mount health)`)}
export{i_t,Ua,a_t,$h};
