// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Qt}from"/$bunfs/root/chunk-x1rrg5j2.js";import{he}from"/$bunfs/root/chunk-058caznt.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{h}from"/$bunfs/root/chunk-6rkpsn9e.js";import{grr}from"/$bunfs/root/chunk-4796xb9w.js";class n{active=void 0;transportPersists=void 0;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var Vw=new Qt(()=>new n);function gA(r){return grr()&&Vw.of(r).transportPersists!==!1}function Eo(r){return gA(r)||Vw.of(r).bridgeMayBeLive()}function fSn(r,e){if(!gA(r))return e;return e.map((s)=>({name:s.name,status:s.status}))}function ier(r,e){return gA(r)?[]:e}function Pqt(r,e,s,i="last"){try{if(!gA(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return h(he(o)),[e]}}function sP(r,e,s){return gA(r)?s:e}
export{Vw,gA,Eo,fSn,ier,Pqt,sP};
