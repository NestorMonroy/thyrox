// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Lt}from"/$bunfs/root/chunk-nvht7ckf.js";import{te}from"/$bunfs/root/chunk-ern0s5ks.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{k1}from"/$bunfs/root/chunk-1ay853f5.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var KR=new Lt(()=>new n);function Cg(r){let e=KR.of(r);return e.hostedWorker||k1()&&e.transportPersists!==!1}function Io(r){return Cg(r)||KR.of(r).bridgeMayBeLive()}function Kkr(r,e){return Cg(r)?Ykr(e):e}function Ykr(r){return r.map((e)=>({name:e.name,status:e.status}))}function Xkr(r,e){return Cg(r)?[]:e}function QFn(r,e,s,i="last"){try{if(!Cg(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return d(te(o)),[e]}}function w3(r,e,s){return Cg(r)?s:e}
export{KR,Cg,Io,Kkr,Ykr,Xkr,QFn,w3};
