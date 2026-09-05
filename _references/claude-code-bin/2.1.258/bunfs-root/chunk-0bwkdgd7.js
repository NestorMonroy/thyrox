// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{VAt,qAt,GBe,Jsr,aTn,WBe}from"/$bunfs/root/chunk-2gy6qgxb.js";import{execFile as a}from"child_process";class i{promise=null;start(){if(this.promise)return;this.promise=zAt()}reset(){this.promise=null}}var Xsr=new i;function rEr(t){if(!t)return{status:"ok",exitCode:0,errno:null,signal:null};let e=t,o=typeof e.signal==="string"&&e.signal?e.signal:null;if(typeof e.code==="string")return{status:"spawn_error",exitCode:null,errno:e.code,signal:null};if(e.killed===!0)return{status:"timeout",exitCode:null,errno:null,signal:o};if(o)return{status:"killed",exitCode:null,errno:null,signal:o};return{status:"exited",exitCode:typeof e.code==="number"?e.code:null,errno:null,signal:null}}function l(t,e){let o=Date.now();return new Promise((s)=>{try{a(t,e,{encoding:"utf-8",timeout:Jsr,windowsHide:!0},(n,u)=>{s({stdout:u??"",...rEr(n),durationMs:Date.now()-o})})}catch(n){let u=n.code;s({stdout:"",status:"spawn_error",exitCode:null,errno:typeof u==="string"?u:null,signal:null,durationMs:Date.now()-o})}})}function r(t){return{status:t.status,exitCode:t.exitCode,errno:t.errno,signal:t.signal,durationMs:t.durationMs}}function zAt(){return(async()=>{if(WBe()){let[t,e]=await Promise.all([l(aTn,["query",VAt,"/v",GBe]),l(aTn,["query",qAt,"/v",GBe])]);return{plistStdouts:null,hklmStdout:t.status==="ok"?t.stdout:null,hkcuStdout:e.status==="ok"?e.stdout:null,outcomes:{hklm:r(t),hkcu:r(e)}}}return{plistStdouts:null,hklmStdout:null,hkcuStdout:null,outcomes:{hklm:null,hkcu:null}}})()}function iTn(){Xsr.start()}function sTn(){return Xsr.promise}
export{Xsr,rEr,zAt,iTn,sTn};
