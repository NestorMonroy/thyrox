// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{zt}from"/$bunfs/root/chunk-k6vqz9fa.js";import{ge}from"/$bunfs/root/chunk-06whp1c5.js";import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import{ier}from"/$bunfs/root/chunk-vtpn3xjv.js";class o{active=void 0;transportPersists=void 0;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var DE=new zt(()=>new o);function $E(r){return ier()&&DE.of(r).transportPersists!==!1}function lo(r){return $E(r)||DE.of(r).bridgeMayBeLive()}function f_n(r,e){if(!$E(r))return e;return e.map((t)=>({name:t.name,status:t.status}))}function tJn(r,e){return $E(r)?[]:e}function rVt(r,e,t,i="last"){try{if(!$E(r))return i==="first"?[e,...t]:[...t,e];for(let s of t)n(`error_during_execution detail: ${s}`,{level:"error"});return[e]}catch(s){return h(ge(s)),[e]}}function CL(r,e,t){return $E(r)?t:e}
export{DE,$E,lo,f_n,tJn,rVt,CL};
