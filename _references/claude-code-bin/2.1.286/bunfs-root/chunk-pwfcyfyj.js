// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Tt}from"/$bunfs/root/chunk-hbjpbz2q.js";function r(o){return o?.aborted===!0}var f=["take_in"];class l{visitors=new Map}var a=new Tt(()=>new l);function d(o){try{return o.pending()===!0}catch{return!1}}function foo(o){let e=a.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(d)}async function moo(o,e){let s=a.peek(o)?.visitors;if(s===void 0)return;let p=(async()=>{for(let n of f){let i=s.get(n);if(i!==void 0&&!r(e)&&d(i))try{await i.visit(e)}catch{}}})();if(r(e))return;let t=()=>{},u=new Promise((n)=>{t=()=>n()});e.addEventListener("abort",t,{once:!0});try{await Promise.race([p,u])}finally{e.removeEventListener("abort",t)}}
export{foo,moo};
