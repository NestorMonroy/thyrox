// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Ot}from"/$bunfs/root/chunk-ga02wneq.js";import{Mt}from"/$bunfs/root/chunk-zwm3fybx.js";var d=["take_in","publish"];class l{visitors=new Map}var r=new Mt(()=>new l);function a(o){try{return o.pending()===!0}catch{return!1}}function cGr(o){let e=r.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(a)}async function dGr(o,e){let t=r.peek(o)?.visitors;if(t===void 0)return;let p=(async()=>{for(let i of d){let n=t.get(i);if(n!==void 0&&!Ot(e)&&a(n))try{await n.visit(e)}catch{}}})();if(Ot(e))return;let s=()=>{},c=new Promise((i)=>{s=()=>i()});e.addEventListener("abort",s,{once:!0});try{await Promise.race([p,c])}finally{e.removeEventListener("abort",s)}}function y6n(o,e,t){r.of(t).visitors.set(o,e)}
export{cGr,dGr,y6n};
