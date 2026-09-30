// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{mNo,Py,Ot,Ku}from"/$bunfs/root/chunk-f74xvn8g.js";import{B}from"/$bunfs/root/chunk-tcenmmfc.js";import{Fa}from"/$bunfs/root/chunk-tdp58r6s.js";import{Fxt,jEe}from"/$bunfs/root/chunk-qazw855w.js";import{A,Y,DS,D}from"/$bunfs/root/chunk-bqbammwz.js";D();function vI(){let[o,e]=DS((r)=>r+1,0);return A(()=>Ku(e),[]),o}function kU(o){return vI(),o()}D();function t(){let[o,e]=DS((r)=>r+1,0);return A(()=>mNo(e),[]),o}function Lkn(o,e){return Fxt(o)??Fxt(e)??Py()}function _Q(o){return Ot(Lkn(o.mainLoopModelForSession,o.mainLoopModel))}function Uoe(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=vI(),s=t(),i=Fa();return Y(()=>jEe(e,o),[e,o,r,i,s])}function Bqt(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=vI(),s=t(),i=Fa();return Y(()=>Lkn(e,o),[e,o,r,i,s])}function rd(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=vI(),s=t(),i=Fa();return Y(()=>_Q({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i,s])}
export{vI,kU,Lkn,_Q,Uoe,Bqt,rd};
