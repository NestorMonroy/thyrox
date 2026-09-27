// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ujt}from"/$bunfs/root/chunk-2j44ssk9.js";function U$(t,e){return(r)=>t((S)=>c(S,e,S[e],r(S[e])))}function TDt(t){return(e)=>t((r)=>{let S=e(r);return Object.is(S,r)?r:{...r,...S}})}function scn(t){return{getSnapshot:t.getSnapshot,getState:t.getState,setState:TDt(t.setState),subscribe:t.subscribe}}function xle(t,e,r){return{get:()=>t()[r],set:U$(e,r)}}function t1(t,e){return(r,S)=>({get:()=>r()[t]??e,set:(a)=>S((s)=>{let n=s[t]??e;return c(s,t,n,a(n))})})}function aIo(t){let e=t;return{get:()=>e,set:(r)=>{e=r(e)}}}function Ns(t,e){let r=t,S=new Set,a=e&&Ujt(e),s=()=>r;return{getSnapshot:s,getState:s,setState:(n)=>{let o=r,i=n(o);if(Object.is(i,o))return;r=i,a?.({newState:i,oldState:o});for(let u of S)u()},subscribe:(n)=>{let o=Ujt(n);return S.add(o),()=>S.delete(o)}}}function c(t,e,r,S){return Object.is(S,r)?t:{...t,[e]:S}}
export{U$,TDt,scn,xle,t1,aIo,Ns};
