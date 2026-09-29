// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Dt}from"/$bunfs/root/chunk-45s965ek.js";import{Ht}from"/$bunfs/root/chunk-d37h8mav.js";var d=["take_in","publish"];class l{visitors=new Map}var r=new Ht(()=>new l);function a(o){try{return o.pending()===!0}catch{return!1}}function EZr(o){let e=r.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(a)}async function kZr(o,e){let t=r.peek(o)?.visitors;if(t===void 0)return;let p=(async()=>{for(let i of d){let n=t.get(i);if(n!==void 0&&!Dt(e)&&a(n))try{await n.visit(e)}catch{}}})();if(Dt(e))return;let s=()=>{},c=new Promise((i)=>{s=()=>i()});e.addEventListener("abort",s,{once:!0});try{await Promise.race([p,c])}finally{e.removeEventListener("abort",s)}}function Vor(o,e,t){r.of(t).visitors.set(o,e)}
export{EZr,kZr,Vor};
