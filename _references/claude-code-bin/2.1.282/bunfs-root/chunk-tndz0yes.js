// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Mt}from"/$bunfs/root/chunk-zwm3fybx.js";import{se}from"/$bunfs/root/chunk-dw9y6h6j.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{iB}from"/$bunfs/root/chunk-tsex6vh0.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var fR=new Mt(()=>new n);function Mg(r){let e=fR.of(r);return e.hostedWorker||iB()&&e.transportPersists!==!1}function vo(r){return Mg(r)||fR.of(r).bridgeMayBeLive()}function r_r(r,e){return Mg(r)?o_r(e):e}function o_r(r){return r.map((e)=>({name:e.name,status:e.status}))}function s_r(r,e){return Mg(r)?[]:e}function jMn(r,e,s,i="last"){try{if(!Mg(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return u(se(o)),[e]}}function YK(r,e,s){return Mg(r)?s:e}
export{fR,Mg,vo,r_r,o_r,s_r,jMn,YK};
