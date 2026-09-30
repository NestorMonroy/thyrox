// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ly,xt,Np}from"/$bunfs/root/chunk-27bj2wbx.js";import{B}from"/$bunfs/root/chunk-52363y4x.js";import{fa}from"/$bunfs/root/chunk-4d3xwd1n.js";import{pct,dpe}from"/$bunfs/root/chunk-ayyj05ne.js";import{A,X,yH,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function Dx(){let[o,e]=yH((r)=>r+1,0);return A(()=>Np(e),[]),o}function Lx(o){return Dx(),o()}L();function U5t(o,e){return pct(o)??pct(e)??ly()}function S_e(o){return xt(U5t(o.mainLoopModelForSession,o.mainLoopModel))}function Nte(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=Dx(),i=fa();return X(()=>dpe(e,o),[e,o,r,i])}function uAt(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=Dx(),i=fa();return X(()=>U5t(e,o),[e,o,r,i])}function Wl(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=Dx(),i=fa();return X(()=>S_e({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i])}
export{Dx,Lx,U5t,S_e,Nte,uAt,Wl};
