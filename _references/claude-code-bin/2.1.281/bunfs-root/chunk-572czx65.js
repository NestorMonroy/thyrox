// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ot}from"/$bunfs/root/chunk-cqc88nqm.js";import{se}from"/$bunfs/root/chunk-2bj5eqbj.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{OU}from"/$bunfs/root/chunk-b7h8pwnv.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var JC=new Ot(()=>new n);function Ag(r){let e=JC.of(r);return e.hostedWorker||OU()&&e.transportPersists!==!1}function bo(r){return Ag(r)||JC.of(r).bridgeMayBeLive()}function Jpr(r,e){return Ag(r)?Qpr(e):e}function Qpr(r){return r.map((e)=>({name:e.name,status:e.status}))}function Zpr(r,e){return Ag(r)?[]:e}function NPn(r,e,s,i="last"){try{if(!Ag(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return u(se(o)),[e]}}function mK(r,e,s){return Ag(r)?s:e}
export{JC,Ag,bo,Jpr,Qpr,Zpr,NPn,mK};
