// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{b7e,qye,Vye,dAn}from"/$bunfs/root/chunk-q8sknw7e.js";import{owr}from"/$bunfs/root/chunk-spmstjs4.js";import{Ot}from"/$bunfs/root/chunk-q2gh92k2.js";import{Nt}from"/$bunfs/root/chunk-4qqe0nh4.js";var S=["take_in","publish"];class l{visitors=new Map}var r=new Nt(()=>new l);function a(e){try{return e.pending()===!0}catch{return!1}}function mbr(e){let o=r.peek(e)?.visitors;return o!==void 0&&[...o.values()].some(a)}async function gbr(e,o){let t=r.peek(e)?.visitors;if(t===void 0)return;let p=(async()=>{for(let s of S){let n=t.get(s);if(n!==void 0&&!Ot(o)&&a(n))try{await n.visit(o)}catch{}}})();if(Ot(o))return;let i=()=>{},c=new Promise((s)=>{i=()=>s()});o.addEventListener("abort",i,{once:!0});try{await Promise.race([p,c])}finally{o.removeEventListener("abort",i)}}function UHn(e,o,t){r.of(t).visitors.set(e,o)}function TRt(e,o){return e===o||e.behavior==="ask"&&e.forcedByCaller===!0}function CRt(e){return e===b7e||e===qye||e===Vye||e===dAn||owr(e)}
export{mbr,gbr,UHn,TRt,CRt};
