// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Vhn,qhn,QBt,I1o,l2r,P1o,Emt}from"/$bunfs/root/chunk-n0qz83r1.js";import{execFile as d}from"child_process";class i{promise=null;start(){if(this.promise)return;this.promise=zhn()}reset(){this.promise=null}}var a=new i;function c(e){if(!e)return{status:"ok",exitCode:0,errno:null,signal:null};let t=e,n=typeof t.signal==="string"&&t.signal?t.signal:null;if(typeof t.code==="string")return{status:"spawn_error",exitCode:null,errno:t.code,signal:null};if(t.killed===!0)return{status:"timeout",exitCode:null,errno:null,signal:n};if(n)return{status:"killed",exitCode:null,errno:null,signal:n};return{status:"exited",exitCode:typeof t.code==="number"?t.code:null,errno:null,signal:null}}function R(e,t,n){let s=Date.now();return new Promise((o)=>{try{d(e,t,{encoding:"utf-8",timeout:I1o,windowsHide:!0,...n!==void 0&&{maxBuffer:n}},(u,r)=>{o({stdout:r??"",...c(u),durationMs:Date.now()-s})})}catch(u){let r=u.code;o({stdout:"",status:"spawn_error",exitCode:null,errno:typeof r==="string"?r:null,signal:null,durationMs:Date.now()-s})}})}function l(e){return{status:e.status,exitCode:e.exitCode,errno:e.errno,signal:e.signal,durationMs:e.durationMs}}function m(e){return e.status==="spawn_error"&&e.errno==="ERR_CHILD_PROCESS_STDIO_MAXBUFFER"}function zhn(){return(async()=>{if(Emt())return f(P1o);return{plistStdouts:null,hklmStdout:null,hkcuStdout:null,outcomes:{hklm:null,hkcu:null}}})()}async function f(e){let t=(o)=>R(e,["query",o,"/v",QBt],l2r),[n,s]=await Promise.all([t(Vhn),t(qhn)]);return{plistStdouts:null,hklmStdout:n.status==="ok"?n.stdout:null,...m(n)&&{hklmUnreadReason:`the value exceeds ${l2r/1048576} MiB`},hkcuStdout:s.status==="ok"?s.stdout:null,outcomes:{hklm:l(n),hkcu:l(s)}}}function r2r(){a.start()}function o2r(){return a.promise}
export{zhn,r2r,o2r};
