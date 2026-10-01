// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Tt}from"/$bunfs/root/chunk-bxhyh54r.js";import{ee}from"/$bunfs/root/chunk-vqpmen5t.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{j1}from"/$bunfs/root/chunk-7y7h3m02.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var tA=new Tt(()=>new n);function mm(r){let e=tA.of(r);return e.hostedWorker||j1()&&e.transportPersists!==!1}function Po(r){return mm(r)||tA.of(r).bridgeMayBeLive()}function FCr(r,e){return mm(r)?UCr(e):e}function UCr(r){return r.map((e)=>({name:e.name,status:e.status}))}function BCr(r,e){return mm(r)?[]:e}function I1n(r,e,s,i="last"){try{if(!mm(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return u(ee(o)),[e]}}function p3(r,e,s){return mm(r)?s:e}
export{tA,mm,Po,FCr,UCr,BCr,I1n,p3};
