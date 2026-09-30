// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{jt}from"/$bunfs/root/chunk-hf9yhhhe.js";import{Rt}from"/$bunfs/root/chunk-q1g12e58.js";import{re,Ot,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function Cv(c,o,t=1000,i=0,m){let e=Rt(),n=()=>jt(Math.max(0,(m??Date.now())-c-i)),a=re((l)=>{if(!o)return()=>{};let r,u=()=>{try{l()}finally{r=e.setTimeout(u,t)}};return r=e.setTimeout(u,t),()=>r()},[o,t,e]);return Ot(a,n,n)}
export{Cv};
