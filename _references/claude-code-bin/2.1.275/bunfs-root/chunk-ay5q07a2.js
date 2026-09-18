// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{_y,Rt,Vp}from"/$bunfs/root/chunk-xbd48fav.js";import{B}from"/$bunfs/root/chunk-3m04gsj3.js";import{ha}from"/$bunfs/root/chunk-kw3ea85f.js";import{vdt,Efe}from"/$bunfs/root/chunk-q2gh92k2.js";import{A,X,iP,D}from"/$bunfs/root/chunk-347kpssc.js";D();function bI(){let[o,e]=iP((r)=>r+1,0);return A(()=>Vp(e),[]),o}function SI(o){return bI(),o()}D();function EXt(o,e){return vdt(o)??vdt(e)??_y()}function cue(o){return Rt(EXt(o.mainLoopModelForSession,o.mainLoopModel))}function Bne(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=bI(),i=ha();return X(()=>Efe(e,o),[e,o,r,i])}function YCt(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=bI(),i=ha();return X(()=>EXt(e,o),[e,o,r,i])}function Jl(){let o=B((n)=>n.mainLoopModel),e=B((n)=>n.mainLoopModelForSession),r=bI(),i=ha();return X(()=>cue({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i])}
export{bI,SI,EXt,cue,Bne,YCt,Jl};
