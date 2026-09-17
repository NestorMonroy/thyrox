// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ut}from"/$bunfs/root/chunk-ja309z9r.js";import{de}from"/$bunfs/root/chunk-3btyksgt.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{zL}from"/$bunfs/root/chunk-27bj2wbx.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var $A=new Ut(()=>new n);function Z_(r){let e=$A.of(r);return e.hostedWorker||zL()&&e.transportPersists!==!1}function Ao(r){return Z_(r)||$A.of(r).bridgeMayBeLive()}function CKn(r,e){return Z_(r)?RKn(e):e}function RKn(r){return r.map((e)=>({name:e.name,status:e.status}))}function xKn(r,e){return Z_(r)?[]:e}function Odn(r,e,s,i="last"){try{if(!Z_(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return d(de(o)),[e]}}function uW(r,e,s){return Z_(r)?s:e}
export{$A,Z_,Ao,CKn,RKn,xKn,Odn,uW};
