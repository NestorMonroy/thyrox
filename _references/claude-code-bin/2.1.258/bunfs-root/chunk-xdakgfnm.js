// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{on}from"/$bunfs/root/chunk-b1z7jvb2.js";import{he}from"/$bunfs/root/chunk-xtc2dmbe.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import{qZn}from"/$bunfs/root/chunk-gv00z408.js";class n{active=void 0;transportPersists=void 0;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var Pw=new on(()=>new n);function rA(r){return qZn()&&Pw.of(r).transportPersists!==!1}function bo(r){return rA(r)||Pw.of(r).bridgeMayBeLive()}function ayn(r,e){if(!rA(r))return e;return e.map((s)=>({name:s.name,status:s.status}))}function _Jn(r,e){return rA(r)?[]:e}function dzt(r,e,s,i="last"){try{if(!rA(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return h(he(o)),[e]}}function WL(r,e,s){return rA(r)?s:e}
export{Pw,rA,bo,ayn,_Jn,dzt,WL};
