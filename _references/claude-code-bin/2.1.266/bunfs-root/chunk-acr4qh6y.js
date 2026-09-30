// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Gt}from"/$bunfs/root/chunk-t8q7n4ta.js";import{fe}from"/$bunfs/root/chunk-vfrpernt.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{Vkt}from"/$bunfs/root/chunk-tqrm5m16.js";class n{active=void 0;transportPersists=void 0;setActive(r){this.active=r,this.transportPersists=r?.persistsOutboundFrames}remoteBridgeLive=null;bridgeMayBeLive(){return this.remoteBridgeLive===null||this.remoteBridgeLive()}markLocalTransport(){this.transportPersists=!1}}var fk=new Gt(()=>new n);function mk(r){return Vkt()&&fk.of(r).transportPersists!==!1}function uo(r){return mk(r)||fk.of(r).bridgeMayBeLive()}function vvn(r,e){if(!mk(r))return e;return e.map((s)=>({name:s.name,status:s.status}))}function otr(r,e){return mk(r)?[]:e}function v4t(r,e,s,i="last"){try{if(!mk(r))return i==="first"?[e,...s]:[...s,e];for(let o of s)t(`error_during_execution detail: ${o}`,{level:"error"});return[e]}catch(o){return h(fe(o)),[e]}}function S0(r,e,s){return mk(r)?s:e}
export{fk,mk,uo,vvn,otr,v4t,S0};
