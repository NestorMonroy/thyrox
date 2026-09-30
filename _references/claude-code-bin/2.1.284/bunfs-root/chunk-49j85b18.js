// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ht}from"/$bunfs/root/chunk-d37h8mav.js";import{te}from"/$bunfs/root/chunk-31aa9k3a.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{z1}from"/$bunfs/root/chunk-hf1cte62.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var gx=new Ht(()=>new n);function $g(r){let e=gx.of(r);return e.hostedWorker||z1()&&e.transportPersists!==!1}function Do(r){return $g(r)||gx.of(r).bridgeMayBeLive()}function hRr(r,e){return $g(r)?yRr(e):e}function yRr(r){return r.map((e)=>({name:e.name,status:e.status}))}function _Rr(r,e){return $g(r)?[]:e}function ujn(r,e,s,i="last"){try{if(!$g(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return d(te(o)),[e]}}function J5(r,e,s){return $g(r)?s:e}
export{gx,$g,Do,hRr,yRr,_Rr,ujn,J5};
