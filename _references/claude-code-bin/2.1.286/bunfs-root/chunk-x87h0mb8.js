// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,Es}from"/$bunfs/root/chunk-hbjpbz2q.js";import{bt,b,ae}from"/$bunfs/root/chunk-6w550002.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{dirname as u}from"path";function s(){}async function p(n,t){let i=ae();try{await i.appendFile(n,t)}catch{await i.mkdir(u(n)).catch(s),await i.appendFile(n,t)}}class c{pendingWrite=Promise.resolve();cleanupRegistered=!1;append(n,t){if(this.pendingWrite=this.pendingWrite.then(p.bind(null,n,t)).catch(s),!this.cleanupRegistered)this.cleanupRegistered=!0,bt(()=>this.flush())}flush(){return this.pendingWrite}}var f=new V(()=>new c);function g(){return Es(f)}function te(n,t,i){let r=m();if(!r)return;let o;try{o=e(n,t,l(i))}catch{o=e(n,t,{diagnostics_payload_failed:!0})}g().append(r,o)}function l(n){try{return(typeof n==="function"?n():n)??{}}catch{return{diagnostics_payload_failed:!0}}}function e(n,t,i){let r={timestamp:new Date().toISOString(),level:n,event:t,data:i};return b(r)+`
`}function bSe(){return g().flush()}function m(){return a.CLAUDE_CODE_DIAGNOSTICS_FILE}async function Myt(n,t,i){let r=Date.now();te("info",`${n}_started`);try{let o=await t(),d=i?i(o):{};return te("info",`${n}_completed`,{duration_ms:Date.now()-r,...d}),o}catch(o){throw te("error",`${n}_failed`,{duration_ms:Date.now()-r}),o}}
export{te,bSe,Myt};
