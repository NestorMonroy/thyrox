// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ht}from"/$bunfs/root/chunk-5t3x93y6.js";import{Lt}from"/$bunfs/root/chunk-nvht7ckf.js";var d=["take_in","publish"];class l{visitors=new Map}var r=new Lt(()=>new l);function a(o){try{return o.pending()===!0}catch{return!1}}function IXr(o){let e=r.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(a)}async function PXr(o,e){let t=r.peek(o)?.visitors;if(t===void 0)return;let p=(async()=>{for(let i of d){let n=t.get(i);if(n!==void 0&&!Ht(e)&&a(n))try{await n.visit(e)}catch{}}})();if(Ht(e))return;let s=()=>{},c=new Promise((i)=>{s=()=>i()});e.addEventListener("abort",s,{once:!0});try{await Promise.race([p,c])}finally{e.removeEventListener("abort",s)}}function Itr(o,e,t){r.of(t).visitors.set(o,e)}
export{IXr,PXr,Itr};
