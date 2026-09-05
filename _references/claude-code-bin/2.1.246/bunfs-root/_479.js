// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{$8a as P,I8a as I,K8a as H,_8a as f}from"/$bunfs/root/_481.js";import{jcb as T,kcb as S}from"/$bunfs/root/_493.js";import{mcb as c,ocb as O}from"/$bunfs/root/_494.js";import{OBb as g,SBb as N,YBb as y,dCb as F}from"/$bunfs/root/_562.js";import{nSb as b,uSb as u,ySb as D}from"/$bunfs/root/_593.js";import{Pcd as p,Rcd as x}from"/$bunfs/root/_814.js";import{fwd as s,nwd as K}from"/$bunfs/root/_833.js";import{xxd as m}from"/$bunfs/root/_837.js";function d(t,e,o){let i=I(),n=i?y(t,e,i.bindings):void 0,r=n===void 0,a=i?"action_not_found":"no_context",_=u(!1);if(b(()=>{if(r&&!_.current)_.current=!0,p("tengu_keybinding_fallback_used",{action:t,context:s(e),fallback:o,reason:s(a)})},[r,t,e,o,a]),n===void 0)return o;return n===null?"":g(n)}var l=m(()=>{D();x();K();H();N();F()});function k(Q){let Y=T(5),{action:U,context:W,fallback:X,description:E,parens:R,bold:A}=Q,C=d(U,W,X),h;if(Y[0]!==A||Y[1]!==C||Y[2]!==E||Y[3]!==R)h=c(f,{chord:C,action:E,parens:R,bold:A}),Y[0]=A,Y[1]=C,Y[2]=E,Y[3]=R,Y[4]=h;else h=Y[4];return h}var v=m(()=>{l();P();O();S()});
export{d as y8a,l as z8a,k as A8a,v as B8a};
