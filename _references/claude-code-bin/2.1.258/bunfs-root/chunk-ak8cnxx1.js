// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{et,C}from"/$bunfs/root/chunk-xtc2dmbe.js";import{Ec}from"/$bunfs/root/chunk-yhcbwxdv.js";import{sl}from"/$bunfs/root/chunk-c9jfjhy5.js";function u(i,r,o,n="connection",a){let e=()=>a?.aborted?new et(`${n} for '${o}' aborted`):new C(`${n} for '${o}' timed out connecting`,"MCP lazy dial timed out connecting");if(r.aborted)return i.catch(()=>{}),Promise.reject(a?.aborted?new et(`${n} for '${o}' aborted before connect`):new C(`${n} for '${o}' aborted before connect`,"MCP lazy dial aborted before connect"));return new Promise((t,s)=>{let c=()=>s(e());r.addEventListener("abort",c,{once:!0}),i.then((l)=>{r.removeEventListener("abort",c),t(l)},(l)=>{r.removeEventListener("abort",c),s(l)})})}async function Lbe(i,r){let o=r.timeoutMs??Ec(),{signal:n,cleanup:a}=sl(r.signal,{timeoutMs:o,refTimer:!0});try{return await u(i,n,r.serverName,r.context,r.signal)}finally{a()}}var ahr=5000,lhr=300000;function Cin(i){let r=i?.baseHoldMs??ahr,o=i?.maxHoldMs??lhr,n=new Map,a=(e,t)=>{let s=n.get(e);return s!==void 0&&t<s.holdUntil};return{shouldSkip(e,t=Date.now()){return a(e,t)},recordFailure(e,t=Date.now()){if(a(e,t))return;let c=(n.get(e)?.count??0)+1,l=Math.min(o,r*2**(c-1));n.set(e,{count:c,holdUntil:t+l})},recordSuccess(e){n.delete(e)},holdUntil(e){return n.get(e)?.holdUntil}}}
export{Lbe,ahr,lhr,Cin};
