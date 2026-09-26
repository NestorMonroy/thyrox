// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{o_,Tt,zp}from"/$bunfs/root/chunk-wbbthbh9.js";import{B}from"/$bunfs/root/chunk-ynhka9xd.js";import{Ha}from"/$bunfs/root/chunk-fygnhkwb.js";import{vkt,ISe}from"/$bunfs/root/chunk-c9jscxk0.js";import{A,J,nk,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();function hO(){let[o,e]=nk((r)=>r+1,0);return A(()=>zp(e),[]),o}function q$(o){return hO(),o()}D();function P_n(o,e){return vkt(o)??vkt(e)??o_()}function dJ(o){return Tt(P_n(o.mainLoopModelForSession,o.mainLoopModel))}function fne(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=hO(),s=Ha();return J(()=>ISe(e,o),[e,o,r,s])}function izt(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=hO(),s=Ha();return J(()=>P_n(e,o),[e,o,r,s])}function zc(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=hO(),s=Ha();return J(()=>dJ({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,s])}
export{hO,q$,P_n,dJ,fne,izt,zc};
