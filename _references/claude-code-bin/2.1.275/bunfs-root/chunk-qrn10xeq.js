// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Nt}from"/$bunfs/root/chunk-4qqe0nh4.js";import{ue}from"/$bunfs/root/chunk-d5d0zdsy.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{pN}from"/$bunfs/root/chunk-xbd48fav.js";class n{active=void 0;transportPersists=void 0;hostedWorker=!1;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames,this.hostedWorker=r?.isHostedWorker===!0}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var uT=new Nt(()=>new n);function sv(r){let e=uT.of(r);return e.hostedWorker||pN()&&e.transportPersists!==!1}function lo(r){return sv(r)||uT.of(r).bridgeMayBeLive()}function m8n(r,e){return sv(r)?g8n(e):e}function g8n(r){return r.map((e)=>({name:e.name,status:e.status}))}function h8n(r,e){return sv(r)?[]:e}function hgn(r,e,s,i="last"){try{if(!sv(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return d(ue(o)),[e]}}function VW(r,e,s){return sv(r)?s:e}
export{uT,sv,lo,m8n,g8n,h8n,hgn,VW};
