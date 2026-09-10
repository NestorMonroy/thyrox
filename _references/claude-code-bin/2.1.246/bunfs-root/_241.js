// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jcb as v,kcb as D}from"/$bunfs/root/_493.js";import{mcb as u,ocb as c}from"/$bunfs/root/_494.js";import{eSb as A,lSb as i,sSb as M,uSb as l,ySb as C}from"/$bunfs/root/_593.js";import{xxd as P,yxd as a}from"/$bunfs/root/_837.js";function V(E){let s=v(4),{children:d}=E,y;if(s[0]===a)y=[],s[0]=y;else y=s[0];let t=l(y),x;if(s[1]===a)x={getDenials:()=>t.current,recordDenial:(K)=>{t.current=[K,...t.current.slice(0,p-1)]},removeDenial:(S)=>{t.current=t.current.filter((k)=>k!==S)}},s[1]=x;else x=s[1];let q=x,R;if(s[2]!==d)R=u(n.Provider,{value:q,children:d}),s[2]=d,s[3]=R;else R=s[3];return R}function N(){let g=i(n);if(!g){throw ReferenceError("useAutoModeDenials cannot be called outside of an <AutoModeDenialsProvider /> (mounted by <AppStateProvider />)")}return g}var n,p=20;var b=P(()=>{C();c();D();n=A(null)});
export{V as $z,N as aA,b as bA};
