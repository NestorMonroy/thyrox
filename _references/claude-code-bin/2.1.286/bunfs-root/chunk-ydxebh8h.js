// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Tt}from"/$bunfs/root/chunk-hbjpbz2q.js";import{ee}from"/$bunfs/root/chunk-ctczby4m.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{bj}from"/$bunfs/root/chunk-vqc3jzpc.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var ZE=new Tt(()=>new n);function Am(r){let e=ZE.of(r);return e.hostedWorker||bj()&&e.transportPersists!==!1}function Lo(r){return Am(r)||ZE.of(r).bridgeMayBeLive()}function CHr(r,e){return Am(r)?RHr(e):e}function RHr(r){return r.map((e)=>({name:e.name,status:e.status}))}function xHr(r,e){return Am(r)?[]:e}function x2n(r,e,s,i="last"){try{if(!Am(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return d(ee(o)),[e]}}function z3(r,e,s){return Am(r)?s:e}
export{ZE,Am,Lo,CHr,RHr,xHr,x2n,z3};
