// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{zy,kt,Dp}from"/$bunfs/root/chunk-5khn4tvf.js";import{U}from"/$bunfs/root/chunk-t7d01j86.js";import{Ca}from"/$bunfs/root/chunk-7tvm8x1t.js";import{xvt,xbe}from"/$bunfs/root/chunk-4n4g22z6.js";import{A,J,XC,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function KH(){let[o,e]=XC((r)=>r+1,0);return A(()=>Dp(e),[]),o}function A0(o){return KH(),o()}D();function $mn(o,e){return xvt(o)??xvt(e)??zy()}function mte(o){return kt($mn(o.mainLoopModelForSession,o.mainLoopModel))}function gte(){let o=U((n)=>n.mainLoopModel),e=U((n)=>n.mainLoopModelForSession),r=KH(),i=Ca();return J(()=>xbe(e,o),[e,o,r,i])}function NBt(){let o=U((n)=>n.mainLoopModel),e=U((n)=>n.mainLoopModelForSession),r=KH(),i=Ca();return J(()=>$mn(e,o),[e,o,r,i])}function Fc(){let o=U((n)=>n.mainLoopModel),e=U((n)=>n.mainLoopModelForSession),r=KH(),i=Ca();return J(()=>mte({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i])}
export{KH,A0,$mn,mte,gte,NBt,Fc};
